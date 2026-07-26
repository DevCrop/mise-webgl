import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.join(projectRoot, ".release", "cafe24");
const webRoot = path.join(releaseRoot, "www");
const appRoot = path.join(releaseRoot, "app");

assertInsideProject(releaseRoot);
await rm(releaseRoot, { recursive: true, force: true });

await Promise.all([
  copyRequired("public/index.php", "www/index.php"),
  copyRequired("public/.htaccess", "www/.htaccess"),
  copyRequired("public/build", "www/build"),
  copyRequired("resources/data", "app/resources/data"),
  copyRequired("resources/views", "app/resources/views"),
]);

const optionalAssets = path.join(projectRoot, "public", "assets");
if (await exists(optionalAssets)) {
  await cp(optionalAssets, path.join(webRoot, "assets"), { recursive: true });
}

const deployFiles = (await listFiles(releaseRoot))
  .filter((file) => !["deploy.sftp", "manifest.sha256", "RELEASE.json"].includes(file))
  .sort((left, right) => {
    if (left === "www/index.php") return 1;
    if (right === "www/index.php") return -1;
    return left.localeCompare(right);
  });

const manifestLines = [];
for (const relativePath of deployFiles) {
  const contents = await readFile(path.join(releaseRoot, relativePath));
  const digest = createHash("sha256").update(contents).digest("hex");
  manifestLines.push(`${digest}  ${relativePath}`);
}

await writeFile(
  path.join(releaseRoot, "manifest.sha256"),
  `${manifestLines.join("\n")}\n`,
  "utf8",
);

const release = {
  schemaVersion: 1,
  sourceRevision: process.env.GITHUB_SHA ?? "local",
  php: "8.2",
  database: false,
  documentRoot: "www",
  applicationRoot: "app",
};
await writeFile(
  path.join(releaseRoot, "RELEASE.json"),
  `${JSON.stringify(release, null, 2)}\n`,
  "utf8",
);

const remoteDirectories = collectDirectories(deployFiles);
const sftpLines = [
  ...remoteDirectories.map((directory) => `-mkdir "${directory}"`),
  ...deployFiles.map(
    (relativePath) =>
      `put ".release/cafe24/${relativePath}" "${relativePath}"`,
  ),
];
await writeFile(
  path.join(releaseRoot, "deploy.sftp"),
  `${sftpLines.join("\n")}\n`,
  "utf8",
);

console.log(`Cafe24 package ready: ${releaseRoot}`);
console.log(`Files: ${deployFiles.length}`);

async function copyRequired(source, destination) {
  const absoluteSource = path.join(projectRoot, source);
  if (!(await exists(absoluteSource))) {
    throw new Error(`Required build input is missing: ${source}`);
  }

  const absoluteDestination = path.join(releaseRoot, destination);
  await mkdir(path.dirname(absoluteDestination), { recursive: true });
  await cp(absoluteSource, absoluteDestination, { recursive: true });
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, absolutePath));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
    }
  }

  return files;
}

function collectDirectories(files) {
  const directories = new Set(["app", "www"]);

  for (const file of files) {
    let directory = path.posix.dirname(file);
    while (directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }

  return [...directories].sort((left, right) => {
    const depthDifference = left.split("/").length - right.split("/").length;
    return depthDifference || left.localeCompare(right);
  });
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

function assertInsideProject(target) {
  const relative = path.relative(projectRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe release path: ${target}`);
  }
}
