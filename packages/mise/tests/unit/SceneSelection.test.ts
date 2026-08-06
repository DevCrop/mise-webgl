import { describe, expect, it } from "vitest";
import type {
  DriveSample,
  DriveSpec,
  SimpleExperienceDefinition,
} from "../../src/Contracts.js";
import { selectScene } from "../../src/kernel/SceneSelection.js";

const inactive: DriveSample = {
  progress: 0,
  direction: 0,
  velocity: 0,
  active: false,
  demand: "idle",
};
const active: DriveSample = {
  ...inactive,
  active: true,
};

describe("selectScene", () => {
  it("selects the last active non-auto driver", () => {
    const definition = experience(
      custom("pointer", 0),
      scrollDrive(),
      custom("pointer", 2),
    );

    expect(selectScene(definition, [active, active, active], 1)).toBe(2);
    expect(selectScene(definition, [active, inactive, inactive], 2)).toBe(0);
  });

  it("does not use auto sample.active as an explicit selection", () => {
    const definition = experience(autoDrive(true), custom("pointer", 1));

    expect(selectScene(definition, [active, inactive], 1)).toBe(1);
    expect(selectScene(
      experience(custom("pointer", 0), custom("pointer", 1)),
      [{ ...inactive, progress: 1 }, inactive],
      0,
    )).toBe(0);
  });

  it("advances only a completed non-loop auto driver", () => {
    const samples = [
      { ...active, progress: 1 },
      inactive,
      inactive,
    ];

    expect(selectScene(
      experience(autoDrive(false), autoDrive(false), autoDrive(false)),
      samples,
      0,
    )).toBe(1);
    expect(selectScene(
      experience(autoDrive(true), autoDrive(false), autoDrive(false)),
      samples,
      0,
    )).toBe(0);
    expect(selectScene(
      experience(autoDrive(false), autoDrive(false), autoDrive(false)),
      [{ ...active, progress: 0.999 }, inactive, inactive],
      0,
    )).toBe(0);
  });

  it("clamps auto progression to the final Scene", () => {
    const definition = experience(autoDrive(false), autoDrive(false));

    expect(selectScene(
      definition,
      [inactive, { ...active, progress: 1 }],
      1,
    )).toBe(1);
  });

  it("gives an active non-auto candidate precedence over auto completion", () => {
    const definition = experience(
      autoDrive(false),
      custom("pointer", 1),
      scrollDrive(),
    );

    expect(selectScene(
      definition,
      [{ ...active, progress: 1 }, active, active],
      0,
    )).toBe(2);
  });
});

function experience(...drives: readonly DriveSpec[]): SimpleExperienceDefinition {
  return {
    id: "selection-fixture",
    scenes: drives.map((drive, index) => ({
      id: `scene-${index}`,
      drive,
      create: () => {
        throw new Error("Scene creation is outside selection policy.");
      },
    })),
  };
}

function autoDrive(loop: boolean): DriveSpec {
  return {
    kind: "auto",
    duration: 1,
    loop,
    reducedMotion: { mode: "complete" },
  };
}

function scrollDrive(): DriveSpec {
  return {
    kind: "scroll",
    trigger: "[data-fixture]",
    start: "top top",
    end: "bottom bottom",
  };
}

function custom(name: string, slot: number): DriveSpec {
  return {
    kind: `custom:${name}`,
    slot,
  };
}
