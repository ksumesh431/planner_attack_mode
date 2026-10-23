import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const webDir = join(root, "web");
const distDir = join(webDir, "dist");

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
