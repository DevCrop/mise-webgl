/** @type {import("@stryker-mutator/api/core").StrykerOptions} */
const config = {
  mutate: [
    "src/clock/MiseClock.ts",
    "src/container/MiseContainer.ts",
    "src/container/MiseContainerBuilder.ts",
    "src/container/MiseToken.ts",
    "src/kernel/Drivers.ts",
    "src/kernel/FrameLoop.ts",
    "src/kernel/MiseHealthCheck.ts",
    "src/kernel/QualityManager.ts",
    "src/kernel/ResourceScope.ts",
    "src/kernel/SceneSelection.ts",
    "src/objects/MiseObjectHost.ts",
  ],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
    related: true,
  },
  inPlace: true,
  reporters: ["clear-text", "progress", "json"],
  thresholds: {
    high: 95,
    low: 95,
    break: 95,
  },
  concurrency: 2,
  timeoutMS: 10_000,
};

export default config;
