import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(root, "bin");
const binary = join(binDir, process.platform === "win32" ? "attack.exe" : "attack");

const webBuild = Bun.spawn([process.execPath, "run", "scripts/build-web.ts"], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

const webCode = await webBuild.exited;
if (webCode !== 0) {
  process.exit(webCode);
}

mkdirSync(binDir, { recursive: true });

console.log("Building Go binary...");
const goBuild = Bun.spawn(
  ["go", "build", "-trimpath", "-ldflags", "-s -w", "-o", binary, "."],
  {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  },
);

const goCode = await goBuild.exited;
if (goCode !== 0) {
  process.exit(goCode);
}

console.log(`\nBuilt ${binary}`);
