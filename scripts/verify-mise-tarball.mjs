import { execFile } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, ".release", "mise-fixture");
const fixtureRelative = path.relative(root, fixture).replaceAll("\\", "/");

if (fixtureRelative !== ".release/mise-fixture") {
  throw new Error("Refusing to replace an unexpected MISE fixture path.");
}

const tarballDirectory = path.join(root, ".release", "npm");
const dogfoodFixtureDirectory = path.join(
  root,
  "scripts",
  "fixtures",
  "mise-dogfood",
);
const tarballs = (await readdir(tarballDirectory))
  .filter((name) => name.endsWith(".tgz"))
  .sort();
if (tarballs.length !== 1) {
  throw new Error("MISE fixture requires exactly one package tarball.");
}

await rm(fixture, { force: true, recursive: true });
await mkdir(fixture, { recursive: true });

const localDependency = (relativePath) =>
  pathToFileURL(path.join(root, relativePath)).href;
const packageJson = {
  name: "mise-tarball-fixture",
  private: true,
  version: "0.0.0",
  type: "module",
  dependencies: {
    "mise-webgl": pathToFileURL(
      path.join(tarballDirectory, tarballs[0]),
    ).href,
    three: localDependency("node_modules/three"),
  },
  devDependencies: {
    "@types/three": localDependency("node_modules/@types/three"),
    "lil-gui": localDependency("node_modules/lil-gui"),
    sass: localDependency("node_modules/sass"),
    typescript: localDependency("node_modules/typescript"),
    vite: localDependency("node_modules/vite"),
  },
};
const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    skipLibCheck: true,
    noEmit: true,
    lib: ["ES2022", "DOM"],
  },
  include: ["*.ts"],
};
const consumer = `import { Camera, Scene } from "three";
import {
  auto,
  createMiseLogger,
  defineExperience,
  defineProvider,
  defineScene,
  type FrameControl,
  type LogSink,
  type ResourceOwner,
} from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";
import { MiseClock } from "mise-webgl/clock";
import {
  MiseContainerBuilder,
  createMiseToken,
} from "mise-webgl/container";
import {
  DevInspector,
  type PlaygroundFolderDefinition,
} from "mise-webgl/playground";
import { BlenderModelLoader } from "mise-webgl/blender";

const sink: LogSink = { write: () => undefined };
createMiseLogger({ sink });

const frames: FrameControl = {
  subscribe: () => () => undefined,
  invalidate: () => undefined,
  acquireContinuous: () => () => undefined,
  acquireSuspension: () => () => undefined,
};
frames.invalidate();

const scene = defineScene({
  id: "fixture-scene",
  drive: auto({
    duration: 1,
    loop: false,
    reducedMotion: { mode: "complete" },
  }),
  create: ({ scope }: { readonly scope: ResourceOwner }) => ({
    scene: new Scene(),
    camera: new Camera(),
    mount: () => undefined,
    frame: () => "idle" as const,
    resize: () => undefined,
    dispose: () => scope.dispose(),
  }),
});
defineExperience({ id: "fixture", scenes: [scene] });
defineProvider({ register: () => undefined });
new ThreeRenderer(false);
new BlenderModelLoader();
new MiseClock().sample(0);
const token = createMiseToken<string>("fixture.label");
new MiseContainerBuilder().value(token, "MISE").compile()
  .createScope().resolve(token);
const playgroundFolders = [] satisfies readonly PlaygroundFolderDefinition[];
new DevInspector({ folders: playgroundFolders }).dispose();

// @ts-expect-error Kernel deep imports are blocked by the package export map.
await import("mise-webgl/kernel/FrameLoop");
`;
const [dogfoodApplication, dogfoodHtml] = await Promise.all([
  readFile(path.join(dogfoodFixtureDirectory, "ConsumerApp.ts"), "utf8"),
  readFile(path.join(dogfoodFixtureDirectory, "index.html"), "utf8"),
]);

await Promise.all([
  writeGenerated("package.json", `${JSON.stringify(packageJson, null, 2)}\n`),
  writeGenerated("tsconfig.json", `${JSON.stringify(tsconfig, null, 2)}\n`),
  writeGenerated("Consumer.ts", consumer),
  writeGenerated("ConsumerApp.ts", dogfoodApplication),
  writeGenerated("Css.d.ts", 'declare module "*.css";\n'),
  writeGenerated("index.html", dogfoodHtml),
  writeGenerated(
    "Consumer.scss",
    '@use "pkg:mise-webgl/styles.scss";\n',
  ),
]);

const npmCli = process.env["npm_execpath"];
if (!npmCli) throw new Error("npm_execpath is required to verify MISE.");
await run(process.execPath, [
  npmCli,
  "install",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--offline",
], {
  cwd: fixture,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
await run(process.execPath, [
  path.join(fixture, "node_modules", "typescript", "bin", "tsc"),
  "-p",
  "tsconfig.json",
  "--pretty",
  "false",
], {
  cwd: fixture,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
await run(process.execPath, [
  "--input-type=module",
  "--eval",
  "await import('mise-webgl'); await import('mise-webgl/blender'); await import('mise-webgl/clock'); await import('mise-webgl/container'); await import('mise-webgl/three'); await import('mise-webgl/playground');",
], {
  cwd: fixture,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});

await run(process.execPath, [
  path.join(fixture, "node_modules", "sass", "sass.js"),
  "--pkg-importer=node",
  "--no-source-map",
  "Consumer.scss",
  "Consumer.css",
], {
  cwd: fixture,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
const compiledCss = await readFile(path.join(fixture, "Consumer.css"), "utf8");
if (!compiledCss.includes("[data-mise-canvas]")) {
  throw new Error("MISE Sass fixture did not compile the surface contract.");
}

await run(process.execPath, [
  path.join(fixture, "node_modules", "vite", "bin", "vite.js"),
  "build",
  "--logLevel",
  "error",
], {
  cwd: fixture,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
const builtHtml = await readFile(path.join(fixture, "dist", "index.html"), "utf8");
if (!/assets\/[^"]+\.js/.test(builtHtml) || !/assets\/[^"]+\.css/.test(builtHtml)) {
  throw new Error("MISE dogfood Host did not emit hashed JavaScript and CSS.");
}
const surfaceHtml = await readFile(
  path.join(
    fixture,
    "node_modules",
    "mise-webgl",
    "html",
    "MiseSurface.html",
  ),
  "utf8",
);
for (const marker of ["data-mise-surface", "data-mise-canvas", "data-mise-fallback"]) {
  if (!surfaceHtml.includes(marker)) {
    throw new Error(`MISE HTML fixture is missing ${marker}.`);
  }
}

console.log(
  "MISE FIXTURE PASS install=offline types=NodeNext runtime=ESM "
  + "deep-import=blocked playground=optional-peer html=portable sass=pkg vite=host-build",
);

async function writeGenerated(name, value) {
  await writeFile(path.join(fixture, name), value, "utf8");
}
