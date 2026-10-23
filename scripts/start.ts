import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const binary = join(root, "bin", process.platform === "win32" ? "attack.exe" : "attack");

if (!existsSync(binary)) {
  console.error(`Missing ${binary}. Run \`bun run build\` first.`);
  process.exit(1);
}

console.log(`Starting ${binary}...`);

const server = Bun.spawn([binary], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});

function shutdown() {
  try {
    server.kill();
  } catch {
    // already stopped
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.exit(await server.exited);
