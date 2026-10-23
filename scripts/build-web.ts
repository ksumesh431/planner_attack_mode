import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const webDir = join(root, "web");
const distDir = join(webDir, "dist");
const publicDir = join(webDir, "public");

const compressible = new Set([".js", ".css", ".html", ".svg", ".json", ".txt", ".xml"]);
const minimumSize = 1024;

console.log("Cleaning frontend output...");
rmSync(distDir, { recursive: true, force: true });

console.log("Building frontend...");
const build = Bun.spawn([process.execPath, "run", "build"], {
  cwd: webDir,
  stdout: "inherit",
  stderr: "inherit",
});

const buildCode = await build.exited;
if (buildCode !== 0) {
  process.exit(buildCode);
}

// Files that must keep stable names (manifest, service worker, icons) are
// copied after the bundler runs.
if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true });
  console.log("Copied public assets.");
}

// Bun resolves every <link> in index.html as a build input. The manifest and
// touch icon live in the public directory, so inject them after bundling.
const indexPath = join(distDir, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const pwaLinks = [
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
  '<script src="/register-sw.js" defer></script>',
].join("\n    ");
if (!indexHtml.includes("<!-- PWA_LINKS -->")) {
  throw new Error("index.html is missing the PWA_LINKS placeholder");
}
writeFileSync(indexPath, indexHtml.replace("<!-- PWA_LINKS -->", pwaLinks));

// Precompress text assets at build time so the server can serve them with no
// per-request CPU cost.
console.log("Precompressing assets...");
let compressed = 0;

for (const file of walk(distDir)) {
  if (!compressible.has(extname(file))) continue;

  const contents = readFileSync(file);
  if (contents.byteLength < minimumSize) continue;

  const brotli = brotliCompressSync(contents, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: contents.byteLength,
    },
  });

  writeFileSync(`${file}.br`, brotli);
  writeFileSync(`${file}.gz`, gzipSync(contents, { level: 9 }));
  compressed += 1;
}

console.log(`Precompressed ${compressed} asset${compressed === 1 ? "" : "s"}.`);

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}
