import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const webDir = join(root, "web");

console.log("Running frontend tests...");
const webTests = Bun.spawn([process.execPath, "test"], {
  cwd: webDir,
  stdout: "inherit",
  stderr: "inherit",
});

const webCode = await webTests.exited;
if (webCode !== 0) {
  process.exit(webCode);
}

console.log("\nRunning Go tests...");
const goTests = Bun.spawn(["go", "test", "-tags", "dev", "./..."], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await goTests.exited);
