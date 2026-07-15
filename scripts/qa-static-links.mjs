import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const frontendRoot = join(root, "frontend", "src");
const routesSource = await readFile(join(frontendRoot, "app", "routes.tsx"), "utf8");
const routePatterns = [...routesSource.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]);

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

function matchesRoute(path) {
  const clean = path.split(/[?#]/)[0] || "/";
  return routePatterns.some((route) => {
    const expression = `^${route.replace(/:[^/]+/g, "[^/]+")}$`;
    return new RegExp(expression).test(clean);
  });
}

const internal = [];
const external = [];
let dynamicUnknown = 0;
for (const file of await sourceFiles(frontendRoot)) {
  const source = await readFile(file, "utf8");
  const label = relative(root, file);
  for (const match of source.matchAll(/(?:href|path|url)\s*[:=]\s*["']([^"']+)["']/g)) {
    if (match[1].startsWith("/")) internal.push({ file: label, value: match[1] });
    if (/^https?:\/\//.test(match[1])) external.push({ file: label, value: match[1] });
  }
  for (const match of source.matchAll(/setLocation\(\s*["']([^"']+)["']/g)) {
    if (match[1].startsWith("/")) internal.push({ file: label, value: match[1] });
  }
  for (const match of source.matchAll(/(?:href\s*=\s*\{|setLocation\()\s*`([^`]+)`/g)) {
    if (match[1].startsWith("/")) {
      if (match[1].startsWith("/${")) {
        dynamicUnknown += 1;
        continue;
      }
      internal.push({ file: label, value: match[1].replace(/\$\{[^}]+\}/g, "dynamic") });
    }
  }
}

const brokenInternal = internal.filter(({ value }) => !matchesRoute(value));
const malformedExternal = external.filter(({ value }) => {
  try { new URL(value); return false; } catch { return true; }
});

if (brokenInternal.length) {
  console.error("Unmatched internal routes:");
  brokenInternal.forEach(({ file, value }) => console.error(`- ${value} (${file})`));
}
if (malformedExternal.length) {
  console.error("Malformed external URLs:");
  malformedExternal.forEach(({ file, value }) => console.error(`- ${value} (${file})`));
}

console.log(`Checked ${routePatterns.length} route patterns, ${internal.length} literal internal links, and ${external.length} external URL references.`);
console.log(`Skipped ${dynamicUnknown} fully dynamic internal destination(s) for manual verification.`);
console.log("External availability is not claimed by this static check; verify it manually or through an approved CI network check.");
process.exitCode = brokenInternal.length || malformedExternal.length ? 1 : 0;
