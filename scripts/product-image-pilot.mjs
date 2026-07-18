import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(root, "frontend", "src", "assets", "AgriConnect Images", "pilot-review");
const stateRoot = path.join(root, ".local", "state", "product-images");
const responseRoot = path.join(stateRoot, "responses");
const progressPath = path.join(stateRoot, "pilot-progress.json");
const galleryPath = path.join(reviewRoot, "index.html");

const USER_AGENT = "AgriConnectProductImageDownloader/1.0 (https://agriconnect.group)";
const REQUEST_INTERVAL_MS = 1_000;
const MAX_ATTEMPTS = 5;
const MAX_CANDIDATES = 3;
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MIN_SHORTEST_SIDE = 600;
const SEARCH_REVISION = 5;

const products = [
  {
    slug: "organic-spinach",
    name: "Organic Spinach",
    category: "Daily Needs",
    subcategory: "Organic Produce",
    aliases: ["Organic Spinach", "spinach", "Spinacia oleracea", "palak"],
    searchContext: "leaf vegetable",
    requiredTerms: ["spinach", "spinacia", "palak"],
    excludedTerms: ["malabar spinach", "chinese spinach"],
  },
  {
    slug: "organic-bananas",
    name: "Organic Bananas",
    category: "Daily Needs",
    subcategory: "Organic Produce",
    aliases: ["Organic Bananas", "banana", "bananas", "yellow banana", "Musa acuminata", "Musa"],
    searchContext: "fruit",
    requiredTerms: ["banana", "bananas", "musa"],
    excludedTerms: ["plantain", "raw banana", "red banana", "fruit salad", "watermelon", "pineapple", "plastic sticker", "plastic stickers", "banana wine", "banana juice", "banana chips", "banana bread", "banana cake", "banana smoothie"],
  },
];

let lastRequestAt = 0;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalizeText = (value) => String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const stripHtml = (value) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function atomicWriteJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function loadProgress() {
  try {
    const progress = JSON.parse(await readFile(progressPath, "utf8"));
    if (progress.searchRevision === SEARCH_REVISION) return progress;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return {
    version: 1,
    searchRevision: SEARCH_REVISION,
    updatedAt: null,
    products: Object.fromEntries(products.map((product) => [product.slug, { status: "pending", candidates: [], errors: [] }])),
  };
}

async function throttledFetch(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const delay = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (delay) await sleep(delay);
    lastRequestAt = Date.now();
    try {
      const response = await fetch(url, {
        ...options,
        headers: { Accept: "application/json,image/*;q=0.9,*/*;q=0.1", "User-Agent": USER_AGENT, ...(options.headers ?? {}) },
      });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status} for ${url}`);
      const retryAfter = Number(response.headers.get("retry-after"));
      lastError = new Error(`Retryable HTTP ${response.status} for ${url}`);
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : (2 ** (attempt - 1)) * 1_000 + Math.floor(Math.random() * 250));
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep((2 ** (attempt - 1)) * 1_000 + Math.floor(Math.random() * 250));
    }
  }
  throw lastError ?? new Error(`Request failed for ${url}`);
}

function acceptedLicense(shortName) {
  const value = normalizeText(shortName);
  if (["pdm", "public domain", "publicdomain"].includes(value)) return { id: "pdm", label: "Public Domain" };
  if (["cc0", "cc zero", "creative commons zero"].includes(value)) return { id: "cc0", label: "CC0" };
  if ((value === "by" || value.startsWith("cc by ") || value.startsWith("creative commons attribution ")) && !/( share alike| sa| noncommercial| nc| no derivatives| nd)/.test(value)) {
    return { id: "by", label: String(shortName).trim() };
  }
  return null;
}

function relevantToProduct(candidate, product) {
  const title = normalizeText(candidate.title);
  const haystack = normalizeText([candidate.title, candidate.description, ...(candidate.tags ?? [])].join(" "));
  if (!product.requiredTerms.some((term) => title.includes(normalizeText(term)))) return false;
  if (product.excludedTerms.some((term) => haystack.includes(normalizeText(term)))) return false;
  return true;
}

function firstLink(html) {
  const match = String(html ?? "").match(/href=["']([^"']+)["']/i);
  if (!match) return undefined;
  const url = match[1].replaceAll("&amp;", "&").replaceAll("&#38;", "&");
  return url.startsWith("//") ? `https:${url}` : url;
}

async function saveRawResponse(product, provider, queryIndex, query, payload) {
  const filePath = path.join(responseRoot, product.slug, `${provider}-${String(queryIndex + 1).padStart(2, "0")}-${sha256(query).slice(0, 10)}.json`);
  await atomicWriteJson(filePath, { provider, product: product.name, query, retrievedAt: new Date().toISOString(), payload });
}

async function searchCommons(product, alias, queryIndex) {
  const query = `${alias} ${product.searchContext}`;
  const parameters = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const response = await throttledFetch(`https://commons.wikimedia.org/w/api.php?${parameters}`);
  const payload = await response.json();
  await saveRawResponse(product, "wikimedia", queryIndex, query, payload);
  return (payload?.query?.pages ?? []).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    const license = acceptedLicense(metadata.LicenseShortName?.value);
    if (!info || !license) return [];
    const creatorHtml = metadata.Artist?.value ?? metadata.Credit?.value ?? "Unknown creator";
    return [{
      provider: "wikimedia",
      providerId: String(page.pageid),
      matchedAlias: alias,
      query,
      title: page.title?.replace(/^File:/, "") ?? alias,
      description: stripHtml(metadata.ImageDescription?.value),
      tags: [],
      imageUrl: info.url,
      sourcePageUrl: info.descriptionurl,
      creator: stripHtml(creatorHtml) || "Unknown creator",
      creatorUrl: firstLink(creatorHtml) ?? null,
      license: license.label,
      licenseId: license.id,
      licenseUrl: metadata.LicenseUrl?.value || (license.id === "cc0" ? "https://creativecommons.org/publicdomain/zero/1.0/" : license.id === "pdm" ? "https://creativecommons.org/publicdomain/mark/1.0/" : undefined),
      width: Number(info.width),
      height: Number(info.height),
      mime: info.mime,
    }];
  });
}

async function searchOpenverse(product, alias, queryIndex) {
  const query = `${alias} ${product.searchContext}`;
  const parameters = new URLSearchParams({ q: query, page_size: "12", category: "photograph" });
  const response = await throttledFetch(`https://api.openverse.org/v1/images/?${parameters}`);
  const payload = await response.json();
  await saveRawResponse(product, "openverse", queryIndex, query, payload);
  return (payload?.results ?? []).flatMap((item) => {
    const license = acceptedLicense(item.license);
    if (!license) return [];
    return [{
      provider: "openverse",
      providerId: item.id,
      matchedAlias: alias,
      query,
      title: item.title ?? alias,
      description: item.description ?? "",
      tags: (item.tags ?? []).map((tag) => typeof tag === "string" ? tag : tag.name).filter(Boolean),
      imageUrl: item.url,
      sourcePageUrl: item.foreign_landing_url,
      creator: item.creator || "Unknown creator",
      creatorUrl: item.creator_url || null,
      license: item.license_version ? `${license.label} ${item.license_version}` : license.label,
      licenseId: license.id,
      licenseUrl: item.license_url,
      width: Number(item.width),
      height: Number(item.height),
      mime: item.filetype ? `image/${item.filetype.replace("jpg", "jpeg")}` : undefined,
      source: item.source,
    }];
  });
}

function detectImage(buffer, contentType) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: "png", mime: "image/png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 255) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { extension: "jpg", mime: "image/jpeg", height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { extension: "webp", mime: "image/webp", width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  throw new Error(`Unsupported or invalid image signature (${contentType || "unknown content type"})`);
}

async function downloadCandidate(candidate) {
  const response = await throttledFetch(candidate.imageUrl, { headers: { Accept: "image/jpeg,image/png,image/webp" } });
  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error("Image exceeds the 10 MB limit");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD_BYTES) throw new Error("Image exceeds the 10 MB limit");
  const detected = detectImage(buffer, response.headers.get("content-type"));
  if (Math.min(detected.width, detected.height) < MIN_SHORTEST_SIDE) throw new Error(`Image is smaller than ${MIN_SHORTEST_SIDE}px on its shortest side`);
  return { buffer, ...detected, checksum: sha256(buffer) };
}

function canonicalSource(candidate) {
  try {
    const url = new URL(candidate.sourcePageUrl || candidate.imageUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return candidate.sourcePageUrl || candidate.imageUrl;
  }
}

async function discoverProduct(product, progress) {
  const record = progress.products[product.slug] ?? { status: "pending", candidates: [], errors: [] };
  const existingFilesArePresent = record.status === "candidates_ready" && record.candidates.length > 0 && await Promise.all(record.candidates.map(async (candidate) => {
    try { await readFile(path.join(reviewRoot, candidate.relativePath)); return true; } catch { return false; }
  })).then((values) => values.every(Boolean));
  if (existingFilesArePresent) return;

  record.status = "discovering";
  record.candidates = [];
  record.errors = [];
  progress.products[product.slug] = record;
  progress.updatedAt = new Date().toISOString();
  await atomicWriteJson(progressPath, progress);

  const pool = [];
  for (let index = 0; index < product.aliases.length; index += 1) {
    for (const provider of [searchCommons, searchOpenverse]) {
      try {
        pool.push(...await provider(product, product.aliases[index], index));
      } catch (error) {
        record.errors.push({ provider: provider === searchCommons ? "wikimedia" : "openverse", alias: product.aliases[index], message: error.message });
      }
    }
  }

  const seenSources = new Set();
  const seenChecksums = new Set();
  const outputDirectory = path.join(reviewRoot, product.slug);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const candidate of pool) {
    if (record.candidates.length >= MAX_CANDIDATES) break;
    if (!candidate.sourcePageUrl || !candidate.imageUrl || !candidate.licenseUrl) continue;
    if (!relevantToProduct(candidate, product)) continue;
    if (Number.isFinite(candidate.width) && Number.isFinite(candidate.height) && Math.min(candidate.width, candidate.height) < MIN_SHORTEST_SIDE) continue;
    const sourceKey = canonicalSource(candidate);
    if (seenSources.has(sourceKey)) continue;
    seenSources.add(sourceKey);
    try {
      const downloaded = await downloadCandidate(candidate);
      if (seenChecksums.has(downloaded.checksum)) continue;
      seenChecksums.add(downloaded.checksum);
      const candidateNumber = record.candidates.length + 1;
      const filename = `${product.slug}-${candidate.provider}-${String(candidateNumber).padStart(2, "0")}.${downloaded.extension}`;
      const absolutePath = path.join(outputDirectory, filename);
      await writeFile(absolutePath, downloaded.buffer);
      record.candidates.push({
        ...candidate,
        filename,
        relativePath: `${product.slug}/${filename}`,
        width: downloaded.width,
        height: downloaded.height,
        mime: downloaded.mime,
        bytes: downloaded.buffer.length,
        sha256: downloaded.checksum,
        watermarkReviewRequired: true,
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      record.errors.push({ provider: candidate.provider, sourcePageUrl: candidate.sourcePageUrl, message: error.message });
    }
  }

  record.status = record.candidates.length > 0 ? "candidates_ready" : record.errors.length > 0 ? "retryable_error" : "no_match";
  progress.updatedAt = new Date().toISOString();
  await atomicWriteJson(progressPath, progress);
}

function renderGallery(progress) {
  const sections = products.map((product) => {
    const record = progress.products[product.slug];
    const cards = (record?.candidates ?? []).map((candidate) => `
      <article class="card">
        <img src="./${escapeHtml(candidate.relativePath)}" alt="Candidate for ${escapeHtml(product.name)}">
        <div class="body">
          <h3>${escapeHtml(candidate.title)}</h3>
          <dl>
            <dt>Matched query</dt><dd>${escapeHtml(candidate.query)}</dd>
            <dt>Matched alias</dt><dd>${escapeHtml(candidate.matchedAlias)}</dd>
            <dt>Provider</dt><dd>${escapeHtml(candidate.provider)}</dd>
            <dt>Creator</dt><dd>${escapeHtml(candidate.creator)}</dd>
            <dt>Creator URL</dt><dd>${candidate.creatorUrl ? `<a href="${escapeHtml(candidate.creatorUrl.replaceAll("&amp;", "&"))}">Open creator page</a>` : "Not provided by source"}</dd>
            <dt>Licence</dt><dd><a href="${escapeHtml(candidate.licenseUrl)}">${escapeHtml(candidate.license)}</a></dd>
            <dt>Source</dt><dd><a href="${escapeHtml(candidate.sourcePageUrl)}">Open source page</a></dd>
            <dt>Original URL</dt><dd><a href="${escapeHtml(candidate.imageUrl)}">Open original image</a></dd>
            <dt>Dimensions</dt><dd>${candidate.width} &times; ${candidate.height}</dd>
            <dt>SHA-256</dt><dd><code>${escapeHtml(candidate.sha256)}</code></dd>
            <dt>Local file</dt><dd><code>${escapeHtml(candidate.relativePath)}</code></dd>
          </dl>
          <p class="warning">Manual review required: confirm visual relevance and check for watermarks before approval.</p>
        </div>
      </article>`).join("");
    return `<section><h2>${escapeHtml(product.name)}</h2><p>Status: <strong>${escapeHtml(record?.status ?? "pending")}</strong> &middot; ${record?.candidates?.length ?? 0} candidate(s)</p><div class="grid">${cards || "<p>No compliant candidate retained.</p>"}</div></section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AgriConnect Organic Produce Image Pilot</title><style>body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f6f7f4;color:#172018}main{max-width:1200px;margin:auto;padding:32px}h1,h2{color:#185b31}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.card{background:white;border:1px solid #dce4dc;border-radius:12px;overflow:hidden}.card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#eee}.body{padding:16px}dl{display:grid;grid-template-columns:110px 1fr;gap:6px 10px}dt{font-weight:700}dd{margin:0;overflow-wrap:anywhere}code{font-size:11px}.warning{padding:10px;background:#fff4d4;border-radius:8px}a{color:#1267a3}</style></head><body><main><h1>Organic Produce Image Pilot</h1><p>Read-only candidate gallery. No candidate is approved or mapped.</p>${sections}</main></body></html>`;
}

async function validate(progress) {
  const allowedRoots = products.map((product) => path.resolve(reviewRoot, product.slug));
  const seenSources = new Set();
  const seenChecksums = new Set();
  const candidatePaths = new Set();
  for (const product of products) {
    const record = progress.products[product.slug];
    if (!["candidates_ready", "no_match", "retryable_error"].includes(record.status)) throw new Error(`${product.name} ended in invalid status ${record.status}`);
    for (const candidate of record.candidates) {
      const absolutePath = path.resolve(reviewRoot, candidate.relativePath);
      if (!allowedRoots.some((allowedRoot) => absolutePath.startsWith(`${allowedRoot}${path.sep}`))) throw new Error(`Candidate escaped its review folder: ${absolutePath}`);
      candidatePaths.add(absolutePath);
      const buffer = await readFile(absolutePath);
      const detected = detectImage(buffer, candidate.mime);
      if (sha256(buffer) !== candidate.sha256) throw new Error(`Checksum mismatch for ${candidate.filename}`);
      if (Math.min(detected.width, detected.height) < MIN_SHORTEST_SIDE) throw new Error(`Dimension validation failed for ${candidate.filename}`);
      if (!["pdm", "cc0", "by"].includes(candidate.licenseId)) throw new Error(`Unaccepted licence for ${candidate.filename}`);
      for (const field of ["sourcePageUrl", "imageUrl", "creator", "license", "licenseUrl", "query", "matchedAlias"]) if (!candidate[field]) throw new Error(`Missing ${field} for ${candidate.filename}`);
      if (!Object.hasOwn(candidate, "creatorUrl")) throw new Error(`Missing creatorUrl field for ${candidate.filename}`);
      const sourceKey = canonicalSource(candidate);
      if (seenSources.has(sourceKey)) throw new Error(`Duplicate canonical source for ${candidate.filename}`);
      if (seenChecksums.has(candidate.sha256)) throw new Error(`Duplicate checksum for ${candidate.filename}`);
      seenSources.add(sourceKey);
      seenChecksums.add(candidate.sha256);
    }
  }

  const reviewFiles = await listFiles(reviewRoot);
  const reviewImages = reviewFiles.filter((filePath) => /\.(?:jpe?g|png|webp)$/i.test(filePath));
  for (const imagePath of reviewImages) {
    if (!allowedRoots.some((allowedRoot) => imagePath.startsWith(`${allowedRoot}${path.sep}`))) throw new Error(`Review image exists outside an allowed product folder: ${imagePath}`);
    if (!candidatePaths.has(path.resolve(imagePath))) throw new Error(`Unrecorded review image found: ${imagePath}`);
  }
  if (reviewImages.length !== candidatePaths.size) throw new Error("Candidate registry and review image counts differ");

  const stateFiles = await listFiles(stateRoot);
  for (const stateFile of stateFiles) {
    if (seenChecksums.has(sha256(await readFile(stateFile)))) throw new Error(`Candidate binary duplicated in local state: ${stateFile}`);
  }

  const gallery = await readFile(galleryPath, "utf8");
  if (/<(?:script|form|button|input)\b/i.test(gallery)) throw new Error("Gallery contains interactive or executable elements");
  for (const product of products) {
    for (const candidate of progress.products[product.slug].candidates) {
      for (const value of [product.name, candidate.relativePath, candidate.sourcePageUrl, candidate.imageUrl, candidate.creator, candidate.license, candidate.licenseUrl, candidate.query, candidate.matchedAlias, candidate.sha256]) {
        if (!gallery.includes(escapeHtml(value))) throw new Error(`Gallery is missing provenance for ${candidate.filename}`);
      }
    }
  }
}

async function main() {
  await mkdir(reviewRoot, { recursive: true });
  await mkdir(responseRoot, { recursive: true });
  const progress = await loadProgress();
  for (const record of Object.values(progress.products)) {
    for (const candidate of record.candidates ?? []) candidate.creatorUrl = candidate.creatorUrl?.replaceAll("&amp;", "&").replaceAll("&#38;", "&") ?? null;
  }
  for (const product of products) await discoverProduct(product, progress);
  await writeFile(galleryPath, renderGallery(progress), "utf8");
  await validate(progress);
  progress.validatedAt = new Date().toISOString();
  progress.updatedAt = progress.validatedAt;
  await atomicWriteJson(progressPath, progress);
  console.log(JSON.stringify({ gallery: galleryPath, products: Object.fromEntries(products.map((product) => [product.slug, progress.products[product.slug]])) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
