import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const webDir = join(root, "web");
const binDir = join(root, "bin");
const apiBinary = join(binDir, process.platform === "win32" ? "attack-dev.exe" : "attack-dev");

console.log("Starting Go API and Bun dev server...");
console.log(`  Go API:    http://localhost:${process.env.PORT ?? "8080"}`);
console.log(`  Frontend:  http://localhost:${process.env.WEB_PORT ?? "5173"}`);

mkdirSync(binDir, { recursive: true });

console.log("Building dev API...");
const build = Bun.spawnSync(["go", "build", "-tags", "dev", "-o", apiBinary, "."], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
});
if (build.exitCode !== 0) {
  console.error("Go dev build failed. Not starting the dev servers.");
  process.exit(build.exitCode ?? 1);
}

const api = Bun.spawn([apiBinary], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "8080",
  },
});

const web = Bun.spawn([process.execPath, "--hot", "src/index.ts"], {
  cwd: webDir,
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    API_PROXY: process.env.API_PROXY ?? `http://localhost:${process.env.PORT ?? "8080"}`,
    WEB_PORT: process.env.WEB_PORT ?? "5173",
  },
});

let shuttingDown = false;

function shutdown(code: number) {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    api.kill();
  } catch {
    // already stopped
  }

  try {
    web.kill();
  } catch {
    // already stopped
  }

  setTimeout(() => process.exit(code), 150);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const result = await Promise.race([
  api.exited.then((code) => ({ name: "Go API", code })),
  web.exited.then((code) => ({ name: "Bun dev server", code })),
]);

if (result.code !== 0) {
  console.error(`${result.name} exited with code ${result.code}. Shutting down.`);
}

shutdown(result.code === 0 ? 1 : result.code);
