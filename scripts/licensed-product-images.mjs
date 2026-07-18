import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const categoriesPath = path.join(root, "frontend", "src", "lib", "categories.ts");
const subSubcategoriesPath = path.join(root, "frontend", "src", "lib", "sub-subcategories.ts");
const registryPath = path.join(root, "frontend", "src", "lib", "product-image-registry.ts");
const generatedRegistryPath = path.join(root, "frontend", "src", "lib", "licensed-product-image-entries.ts");
const assetRoot = path.join(root, "frontend", "src", "assets", "AgriConnect Images", "licensed");
const pilotRoot = path.join(root, "frontend", "src", "assets", "AgriConnect Images", "pilot-review");
const stateRoot = path.join(root, ".local", "state", "product-images", "licensed");
const responseRoot = path.join(stateRoot, "responses");
const progressPath = path.join(stateRoot, "progress.json");
const reportPath = path.join(stateRoot, "report.json");

const USER_AGENT = "AgriConnectLicensedProductImages/1.0 (https://agriconnect.group)";
const REQUEST_INTERVAL_MS = 1_000;
const MAX_ATTEMPTS = 5;
const MIN_SHORTEST_SIDE = 600;
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;
const INVENTORY_REVISION = 1;

const aliases = {
  "organic-spinach": ["spinach", "Spinacia oleracea", "palak"],
  "organic-bananas": ["banana", "bananas", "yellow banana", "Musa acuminata"],
  brinjal: ["eggplant", "aubergine"],
  capsicum: ["bell pepper", "sweet pepper"],
  "okra-bhindi": ["okra", "bhindi", "Abelmoschus esculentus"],
  "green-chilli": ["green chili", "green chilli pepper"],
  coriander: ["cilantro", "coriander leaves"],
  "bottle-gourd": ["calabash", "Lagenaria siceraria"],
  "bitter-gourd": ["bitter melon", "Momordica charantia"],
  "snake-gourd": ["Trichosanthes cucumerina"],
  "ridge-gourd": ["Luffa acutangula", "angled luffa"],
  "ash-gourd": ["winter melon", "Benincasa hispida"],
  "pointed-gourd": ["parwal", "Trichosanthes dioica"],
  "ivy-gourd": ["tindora", "Coccinia grandis"],
  drumstick: ["moringa pods", "Moringa oleifera pods"],
  "raw-banana": ["green banana", "cooking banana"],
  tapioca: ["cassava", "Manihot esculenta"],
  sapota: ["sapodilla", "chikoo", "Manilkara zapota"],
  muskmelon: ["cantaloupe", "Cucumis melo"],
  "custard-apple": ["sugar apple", "Annona squamosa"],
  jamun: ["java plum", "Syzygium cumini"],
  amla: ["Indian gooseberry", "Phyllanthus emblica"],
  litchi: ["lychee", "Litchi chinensis"],
  "star-fruit": ["carambola", "Averrhoa carambola"],
  rohu: ["Labeo rohita", "rohu fish"],
  catla: ["Catla catla", "catla fish"],
  "sundried-fish": ["sun dried fish", "dried fish"],
  "button-mushroom": ["Agaricus bisporus", "button mushrooms"],
  "oyster-mushroom": ["Pleurotus ostreatus", "oyster mushrooms"],
  shiitake: ["Lentinula edodes", "shiitake mushroom"],
  portobello: ["portobello mushroom", "Agaricus bisporus"],
  enoki: ["enoki mushroom", "Flammulina filiformis"],
};

const exclusionsBySlug = {
  "organic-spinach": ["malabar spinach", "chinese spinach"],
  "organic-bananas": ["plantain", "red banana", "raw banana", "banana wine", "banana bread", "banana chips", "banana cake", "banana smoothie", "plastic sticker"],
  banana: ["plantain", "red banana", "raw banana", "banana wine", "banana bread", "banana chips"],
  "raw-banana": ["yellow banana", "banana wine", "banana bread", "banana chips"],
  tuna: ["band", "album", "music", "guitar"],
  mint: ["coin", "currency", "building", "stamp"],
  dates: ["calendar", "meeting", "event"],
};

const globalExclusions = ["logo", "diagram", "chart", "map", "poster", "advertisement", "advertising", "package design", "label design", "book cover", "document", "pdf"];
const contextTerms = {
  vegetables: ["vegetable", "food", "plant", "produce", "leaf", "fruit"],
  fruits: ["fruit", "food", "produce", "plant"],
  dairy: ["dairy", "milk", "food", "egg", "yogurt", "butter", "cheese"],
  fish: ["fish", "seafood", "food", "catch"],
  spices: ["spice", "food", "seed", "powder", "pepper", "salt"],
  honey: ["honey", "bee", "beeswax", "pollen", "food"],
  mushrooms: ["mushroom", "fungus", "fungi", "food"],
  seeds: ["seed", "plant", "seedling", "sapling", "sucker"],
  fertilizers: ["fertilizer", "fertiliser", "compost", "manure", "agriculture", "granule"],
  "organic-produce": ["organic", "vegetable", "fruit", "produce", "food", "plant"],
};

const categoryFallbacks = {
  grains: "daily-needs", pulses: "daily-needs", oils: "daily-needs", vegetables: "daily-needs", fruits: "daily-needs", dairy: "daily-needs", meat: "daily-needs", fish: "daily-needs", spices: "daily-needs", "organic-produce": "daily-needs", packaged: "daily-needs", bakery: "daily-needs",
  honey: "specialty", mushrooms: "specialty", seeds: "inputs-tools", fertilizers: "inputs-tools",
};

const pilotSelections = {
  "organic-spinach": {
    file: path.join(pilotRoot, "organic-spinach", "organic-spinach-openverse-01.webp"),
    provider: "openverse", sourcePageUrl: "https://www.rawpixel.com/image/5927235/photo-image-public-domain-green-food",
    imageUrl: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXMxMDc4Ni1pbWFnZS1rd3Z5Z2ZnYy5qcGc.jpg",
    creator: "Unknown creator", creatorUrl: null, license: "CC0 1.0", licenseId: "cc0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", matchedAlias: "spinach",
  },
  "organic-bananas": {
    file: path.join(pilotRoot, "organic-bananas", "organic-bananas-openverse-03.jpg"),
    provider: "openverse", sourcePageUrl: "https://stocksnap.io/photo/bananas-fruits-D0C5D92CD9",
    imageUrl: "https://cdn.stocksnap.io/img-thumbs/960w/D0C5D92CD9.jpg",
    creator: "Ryan McGuire", creatorUrl: "https://www.gratisography.com", license: "CC0 1.0", licenseId: "cc0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", matchedAlias: "banana",
  },
};

let lastRequestAt = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => String(value ?? "").normalize("NFKD").toLowerCase().replace(/&/g, " and ").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (value) => normalize(value).replace(/\s+/g, "-");
const stripHtml = (value) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const tsString = (value) => JSON.stringify(value).replaceAll(" ", "\\u2028").replaceAll(" ", "\\u2029");

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await copyFile(temporary, filePath);
      await rm(temporary, { force: true });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 100);
    }
  }
  await rm(temporary, { force: true });
  throw lastError;
}

async function throttledFetch(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const delay = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (delay) await sleep(delay);
    lastRequestAt = Date.now();
    try {
      const response = await fetch(url, { ...options, headers: { "User-Agent": USER_AGENT, ...(options.headers ?? {}) } });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status}`);
      lastError = new Error(`retryable HTTP ${response.status}`);
      const retryAfter = Number(response.headers.get("retry-after"));
      if (attempt < MAX_ATTEMPTS) await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 2 ** (attempt - 1) * 1_000);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(2 ** (attempt - 1) * 1_000);
    }
  }
  throw lastError ?? new Error("request failed");
}

function parseNamedBlocks(source, marker) {
  const section = source.split(marker)[1]?.split(/\nexport (?:const|function|interface)/)[0] ?? "";
  const matches = [...section.matchAll(/^  "([^"]+)": \[/gm)];
  return matches.map((match, index) => ({ key: match[1], body: section.slice(match.index, matches[index + 1]?.index ?? section.length) }));
}

function parseInventory(categoriesSource, subSubSource, registrySource) {
  const parentBySubcategory = new Map([...categoriesSource.matchAll(/\{ id: "([^"]+)", name: "[^"]+", parentId: "([^"]+)"/g)].map((match) => [match[1], match[2]]));
  const records = new Map();
  const add = (name, subcategoryId) => {
    const categoryId = parentBySubcategory.get(subcategoryId) ?? categoryFallbacks[subcategoryId];
    if (!name || !categoryId) return;
    const key = `${slugify(name)}|${categoryId}|${subcategoryId}`;
    records.set(key, { slug: slugify(name), name, categoryId, subcategoryId });
  };

  for (const block of parseNamedBlocks(subSubSource, "export const subSubcategoryData")) {
    for (const items of block.body.matchAll(/items:\s*\[([^\]]*)\]/g)) {
      for (const name of items[1].matchAll(/"([^"]+)"/g)) add(name[1], block.key);
    }
  }
  for (const block of parseNamedBlocks(categoriesSource, "export const categoryExamples")) {
    const array = block.body.match(/^  "[^"]+": \[([\s\S]*?)\n  \],?/m)?.[1] ?? "";
    for (const name of [...array.matchAll(/"([^"]+)"/g)].slice(0, 8)) add(name[1], block.key);
  }
  for (const block of parseNamedBlocks(categoriesSource, "export const productData")) {
    for (const match of block.body.matchAll(/\{ name: "([^"]+)"/g)) add(match[1], block.key);
  }

  const manualNames = new Set();
  const manualAliases = new Set();
  for (const match of registrySource.matchAll(/\{ slug: "[^"]+", name: "([^"]+)", aliases: \[([^\]]*)\]/g)) {
    manualNames.add(slugify(match[1]));
    for (const alias of match[2].matchAll(/"([^"]+)"/g)) manualAliases.add(slugify(alias[1]));
  }
  const eligible = [...records.values()].filter((product) => !manualNames.has(product.slug) && !manualAliases.has(product.slug)).sort((a, b) => (a.categoryId === "daily-needs" ? -1 : 0) - (b.categoryId === "daily-needs" ? -1 : 0) || a.categoryId.localeCompare(b.categoryId) || a.subcategoryId.localeCompare(b.subcategoryId) || a.name.localeCompare(b.name));
  const byCardName = new Map();
  for (const product of eligible) {
    const existing = byCardName.get(product.slug);
    if (existing) existing.contexts.push({ categoryId: product.categoryId, subcategoryId: product.subcategoryId });
    else byCardName.set(product.slug, { ...product, contexts: [{ categoryId: product.categoryId, subcategoryId: product.subcategoryId }] });
  }
  return [...byCardName.values()];
}

function acceptedLicense(value) {
  const key = normalize(value);
  if (["pdm", "public domain", "publicdomain"].includes(key)) return { id: "pdm", label: "Public Domain" };
  if (["cc0", "cc zero", "creative commons zero"].includes(key)) return { id: "cc0", label: "CC0" };
  if ((key === "by" || key.startsWith("cc by ") || key.startsWith("creative commons attribution ")) && !/(share alike| noncommercial| no derivatives|\bsa\b|\bnc\b|\bnd\b)/.test(key)) return { id: "by", label: String(value).trim() };
  return null;
}

function firstLink(html) {
  const match = String(html ?? "").match(/href=["']([^"']+)["']/i);
  const url = match?.[1]?.replaceAll("&amp;", "&").replaceAll("&#38;", "&");
  return url?.startsWith("//") ? `https:${url}` : url ?? null;
}

function scoreCandidate(candidate, product) {
  const title = normalize(candidate.title);
  const haystack = normalize([candidate.title, candidate.description, ...(candidate.tags ?? [])].join(" "));
  const approved = [product.name, ...(aliases[product.slug] ?? [])];
  const matched = approved.map((name) => ({ name, key: normalize(name) })).filter(({ key }) => key && (` ${title} `).includes(` ${key} `)).sort((a, b) => b.key.length - a.key.length)[0];
  if (!matched) return null;
  const exclusions = [...globalExclusions, ...(exclusionsBySlug[product.slug] ?? [])];
  if (exclusions.some((term) => haystack.includes(normalize(term)))) return null;
  const context = contextTerms[product.subcategoryId] ?? [normalize(product.subcategoryId)];
  const meaningfulWords = matched.key.split(" ").filter((word) => !["organic", "fresh", "products", "product"].includes(word));
  const contextMatch = context.some((term) => haystack.includes(normalize(term)));
  if (meaningfulWords.length === 1 && !contextMatch && title !== matched.key) return null;
  let score = matched.key === normalize(product.name) ? 100 : 85;
  if (title === matched.key) score += 12;
  if (contextMatch) score += 8;
  if (candidate.provider === "wikimedia") score += 2;
  return { score, matchedAlias: matched.name };
}

async function saveResponse(product, provider, query, payload) {
  const filePath = path.join(responseRoot, product.categoryId, product.slug, `${provider}-${sha256(query).slice(0, 12)}.json`);
  await atomicJson(filePath, { product, provider, query, retrievedAt: new Date().toISOString(), payload });
}

async function searchCommons(product) {
  const query = `${product.name} ${product.subcategoryId.replaceAll("-", " ")}`;
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", format: "json", formatversion: "2", origin: "*" });
  const payload = await (await throttledFetch(`https://commons.wikimedia.org/w/api.php?${params}`)).json();
  await saveResponse(product, "wikimedia", query, payload);
  return (payload.query?.pages ?? []).flatMap((page) => {
    const info = page.imageinfo?.[0]; const metadata = info?.extmetadata ?? {}; const license = acceptedLicense(metadata.LicenseShortName?.value);
    if (!info || !license || !["image/jpeg", "image/png", "image/webp"].includes(info.mime) || Math.min(Number(info.width), Number(info.height)) < MIN_SHORTEST_SIDE) return [];
    const creatorHtml = metadata.Artist?.value ?? metadata.Credit?.value ?? "Unknown creator";
    return [{ provider: "wikimedia", providerId: String(page.pageid), title: page.title?.replace(/^File:/, "") ?? product.name, description: stripHtml(metadata.ImageDescription?.value), tags: [stripHtml(metadata.Categories?.value)], imageUrl: info.url, sourcePageUrl: info.descriptionurl, creator: stripHtml(creatorHtml) || "Unknown creator", creatorUrl: firstLink(creatorHtml), license: license.label, licenseId: license.id, licenseUrl: metadata.LicenseUrl?.value || (license.id === "cc0" ? "https://creativecommons.org/publicdomain/zero/1.0/" : license.id === "pdm" ? "https://creativecommons.org/publicdomain/mark/1.0/" : null), width: Number(info.width), height: Number(info.height), mime: info.mime, query }];
  });
}

async function searchOpenverse(product) {
  const query = `${product.name} ${product.subcategoryId.replaceAll("-", " ")}`;
  const params = new URLSearchParams({ q: query, page_size: "20", category: "photograph" });
  const payload = await (await throttledFetch(`https://api.openverse.org/v1/images/?${params}`)).json();
  await saveResponse(product, "openverse", query, payload);
  return (payload.results ?? []).flatMap((item) => {
    const license = acceptedLicense(item.license);
    if (!license || !item.url || !item.foreign_landing_url || Math.min(Number(item.width), Number(item.height)) < MIN_SHORTEST_SIDE) return [];
    return [{ provider: "openverse", providerId: item.id, title: item.title ?? product.name, description: item.description ?? "", tags: (item.tags ?? []).map((tag) => typeof tag === "string" ? tag : tag.name).filter(Boolean), imageUrl: item.url, sourcePageUrl: item.foreign_landing_url, creator: item.creator || "Unknown creator", creatorUrl: item.creator_url || null, license: item.license_version ? `${license.label} ${item.license_version}` : license.label, licenseId: license.id, licenseUrl: item.license_url, width: Number(item.width), height: Number(item.height), mime: item.filetype ? `image/${item.filetype.replace("jpg", "jpeg")}` : null, query }];
  });
}

function detectImage(buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", mime: "image/png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer.length >= 12 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    let offset = 2;
    while (offset + 9 < buffer.length) { if (buffer[offset] !== 255) { offset += 1; continue; } const marker = buffer[offset + 1]; if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { extension: "jpg", mime: "image/jpeg", height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }; const length = buffer.readUInt16BE(offset + 2); if (length < 2) break; offset += 2 + length; }
  }
  if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" && buffer.toString("ascii", 12, 16) === "VP8X") return { extension: "webp", mime: "image/webp", width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  throw new Error("unsupported image signature");
}

async function download(candidate) {
  const response = await throttledFetch(candidate.imageUrl, { headers: { Accept: "image/jpeg,image/png,image/webp" } });
  if (Number(response.headers.get("content-length")) > MAX_DOWNLOAD_BYTES) throw new Error("image exceeds size limit");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_DOWNLOAD_BYTES) throw new Error("image exceeds size limit");
  const detected = detectImage(buffer);
  if (Math.min(detected.width, detected.height) < MIN_SHORTEST_SIDE) throw new Error("image dimensions below minimum");
  return { buffer, ...detected, checksum: sha256(buffer) };
}

async function loadProgress(inventory) {
  try {
    const progress = JSON.parse(await readFile(progressPath, "utf8"));
    if (progress.inventoryRevision === INVENTORY_REVISION && progress.inventoryHash === sha256(JSON.stringify(inventory))) return progress;
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  return { version: 1, inventoryRevision: INVENTORY_REVISION, inventoryHash: sha256(JSON.stringify(inventory)), updatedAt: null, products: Object.fromEntries(inventory.map((product) => [product.slug, { product, status: "pending", attempts: 0, duplicateCandidatesPrevented: 0, errors: [] }])) };
}

function canonicalUrl(value) { try { const url = new URL(value); url.hash = ""; return url.toString(); } catch { return value; } }

async function processProduct(record, usedSources, usedChecksums) {
  if (["downloaded", "no_compliant_result", "uncertain", "duplicate_prevented", "failed_request"].includes(record.status)) return;
  const product = record.product;
  if (pilotSelections[product.slug]) {
    try {
      const selected = pilotSelections[product.slug]; const buffer = await readFile(selected.file); const detected = detectImage(buffer); const checksum = sha256(buffer);
      const output = path.join(assetRoot, product.categoryId, `${product.slug}.${detected.extension}`); await mkdir(path.dirname(output), { recursive: true }); await copyFile(selected.file, output);
      record.status = "downloaded"; record.selected = { ...selected, query: "approved pilot candidate", title: product.name, matchedAlias: selected.matchedAlias, relativePath: path.relative(path.join(root, "frontend", "src", "assets"), output).replaceAll("\\", "/"), width: detected.width, height: detected.height, mime: detected.mime, sha256: checksum, bytes: buffer.length, retrievedAt: new Date().toISOString(), promotedFromPilot: true };
      usedSources.add(canonicalUrl(selected.sourcePageUrl)); usedChecksums.add(checksum); return;
    } catch (error) { record.status = "failed_request"; record.errors.push({ provider: "pilot", message: error.message }); return; }
  }

  let candidates = [];
  try { candidates = await searchCommons(product); record.attempts += 1; } catch (error) { record.errors.push({ provider: "wikimedia", message: error.message }); }
  let ranked = candidates.map((candidate) => ({ candidate, match: scoreCandidate(candidate, product) })).filter((item) => item.match).sort((a, b) => b.match.score - a.match.score);
  if (ranked.length === 0) {
    try { candidates = await searchOpenverse(product); record.attempts += 1; } catch (error) { record.errors.push({ provider: "openverse", message: error.message }); }
    ranked = candidates.map((candidate) => ({ candidate, match: scoreCandidate(candidate, product) })).filter((item) => item.match).sort((a, b) => b.match.score - a.match.score);
  }
  ranked = ranked.filter(({ candidate }) => { const key = canonicalUrl(candidate.sourcePageUrl); if (usedSources.has(key)) { record.duplicateCandidatesPrevented += 1; return false; } return true; });
  if (ranked.length === 0) { record.status = record.errors.length >= 2 ? "failed_request" : "no_compliant_result"; return; }
  const { candidate, match } = ranked[0];
  try {
    const downloaded = await download(candidate); record.attempts += 1;
    if (usedChecksums.has(downloaded.checksum)) { record.status = "duplicate_prevented"; record.duplicateCandidatesPrevented += 1; return; }
    const output = path.join(assetRoot, product.categoryId, `${product.slug}.${downloaded.extension}`); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, downloaded.buffer);
    record.status = "downloaded"; record.selected = { ...candidate, matchedAlias: match.matchedAlias, score: match.score, relativePath: path.relative(path.join(root, "frontend", "src", "assets"), output).replaceAll("\\", "/"), width: downloaded.width, height: downloaded.height, mime: downloaded.mime, sha256: downloaded.checksum, bytes: downloaded.buffer.length, retrievedAt: new Date().toISOString() };
    usedSources.add(canonicalUrl(candidate.sourcePageUrl)); usedChecksums.add(downloaded.checksum);
  } catch (error) { record.status = "failed_request"; record.errors.push({ provider: candidate.provider, message: error.message, sourcePageUrl: candidate.sourcePageUrl }); }
}

async function listFiles(directory) { try { const entries = await readdir(directory, { withFileTypes: true }); const files = []; for (const entry of entries) { const value = path.join(directory, entry.name); if (entry.isDirectory()) files.push(...await listFiles(value)); else if (entry.isFile()) files.push(value); } return files; } catch (error) { if (error.code === "ENOENT") return []; throw error; } }

async function validateAndGenerate(progress, registrySource) {
  const downloaded = Object.values(progress.products).filter((record) => record.status === "downloaded");
  const sources = new Set(); const checksums = new Set(); const expected = new Set();
  for (const record of downloaded) {
    const selected = record.selected; const absolute = path.resolve(root, "frontend", "src", "assets", selected.relativePath); const allowed = path.resolve(assetRoot, record.product.categoryId);
    if (!absolute.startsWith(`${allowed}${path.sep}`)) throw new Error(`asset escaped category folder: ${absolute}`);
    const buffer = await readFile(absolute); const detected = detectImage(buffer);
    if (sha256(buffer) !== selected.sha256 || Math.min(detected.width, detected.height) < MIN_SHORTEST_SIDE) throw new Error(`validation failed: ${record.product.name}`);
    if (!["pdm", "cc0", "by"].includes(selected.licenseId) || !selected.sourcePageUrl || !selected.licenseUrl || !selected.creator) throw new Error(`incomplete provenance: ${record.product.name}`);
    const source = canonicalUrl(selected.sourcePageUrl); if (sources.has(source) || checksums.has(selected.sha256)) throw new Error(`duplicate final image: ${record.product.name}`); sources.add(source); checksums.add(selected.sha256); expected.add(absolute);
  }
  for (const file of await listFiles(assetRoot)) if (/\.(?:jpe?g|png|webp)$/i.test(file) && !expected.has(path.resolve(file))) throw new Error(`unregistered licensed image: ${file}`);

  const manualKeys = new Set([...registrySource.matchAll(/\{ slug: "([^"]+)"/g)].map((match) => match[1]));
  for (const record of downloaded) if (manualKeys.has(record.product.slug)) throw new Error(`would overwrite manual mapping: ${record.product.name}`);

  const imports = downloaded.map((record, index) => `import licensedImage${index} from "@assets/${record.selected.relativePath}";`).join("\n");
  const rows = downloaded.map((record, index) => `  { slug: ${tsString(record.product.slug)}, name: ${tsString(record.product.name)}, aliases: [], categoryId: ${tsString(record.product.categoryId)}, subcategoryId: ${tsString(record.product.subcategoryId)}, localAssetPath: licensedImage${index}, attribution: { source: "licensed", label: ${tsString(`${record.selected.creator} · ${record.selected.license}`)}, url: ${tsString(record.selected.sourcePageUrl)}, creator: ${tsString(record.selected.creator)}, creatorUrl: ${record.selected.creatorUrl ? tsString(record.selected.creatorUrl) : "undefined"}, license: ${tsString(record.selected.license)}, licenseUrl: ${tsString(record.selected.licenseUrl)}, checksum: ${tsString(record.selected.sha256)} } },`).join("\n");
  const generated = `// Generated by scripts/licensed-product-images.mjs. Do not edit manually.\n${imports}\n\nexport const licensedProductImageEntries = [\n${rows}\n] as const;\n`;
  await writeFile(generatedRegistryPath, generated, "utf8");
  return downloaded;
}

async function main() {
  const [categoriesSource, subSubSource, registrySource] = await Promise.all([readFile(categoriesPath, "utf8"), readFile(subSubcategoriesPath, "utf8"), readFile(registryPath, "utf8")]);
  const inventory = parseInventory(categoriesSource, subSubSource, registrySource);
  if (process.argv.includes("--inventory")) { console.log(JSON.stringify({ eligible: inventory.length, byCategory: Object.groupBy(inventory, (product) => product.categoryId), products: inventory }, null, 2)); return; }
  await mkdir(responseRoot, { recursive: true }); await mkdir(assetRoot, { recursive: true });
  const progress = await loadProgress(inventory);
  const usedSources = new Set(); const usedChecksums = new Set();
  for (const record of Object.values(progress.products)) if (record.status === "downloaded") { usedSources.add(canonicalUrl(record.selected.sourcePageUrl)); usedChecksums.add(record.selected.sha256); }
  let completed = 0;
  for (const record of Object.values(progress.products)) { await processProduct(record, usedSources, usedChecksums); progress.updatedAt = new Date().toISOString(); await atomicJson(progressPath, progress); completed += 1; if (completed % 20 === 0) console.log(`processed ${completed}/${inventory.length}`); }
  const downloaded = await validateAndGenerate(progress, registrySource);
  const counts = Object.values(progress.products).reduce((result, record) => { result[record.status] = (result[record.status] ?? 0) + 1; return result; }, {});
  const report = { completedAt: new Date().toISOString(), eligible: inventory.length, counts, duplicatesPrevented: Object.values(progress.products).reduce((sum, record) => sum + record.duplicateCandidatesPrevented, 0), downloaded: downloaded.map((record) => ({ product: record.product, selected: record.selected })), skipped: Object.values(progress.products).filter((record) => record.status !== "downloaded") };
  await atomicJson(reportPath, report); console.log(JSON.stringify({ report: reportPath, ...report }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
