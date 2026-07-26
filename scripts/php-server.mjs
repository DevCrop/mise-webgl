import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const requestedHost = process.argv.at(-1)?.startsWith("--host=")
  ? process.argv.at(-1)?.slice("--host=".length)
  : "localhost:8080";

const candidates = [
  process.env.PHP_BINARY,
  process.platform === "win32" ? "C:\\xampp\\php\\php.exe" : undefined,
  "php",
].filter(Boolean);

const phpBinary =
  candidates.find((candidate) => candidate === "php" || existsSync(candidate)) ?? "php";

const server = spawn(phpBinary, ["-S", requestedHost, "-t", "public"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

server.on("error", (error) => {
  console.error(`[portfolio] php.server_failed: ${error.message}`);
  process.exitCode = 1;
});

server.on("exit", (code) => {
  process.exitCode = code ?? 0;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
