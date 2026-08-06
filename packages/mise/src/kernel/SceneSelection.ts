import type {
  DriveSample,
  SceneDefinition,
} from "../Contracts.js";

export function selectScene(
  experience: { readonly scenes: readonly SceneDefinition[] },
  samples: readonly DriveSample[],
  current: number,
): number {
  let selected = -1;
  for (let index = 0; index < samples.length; index += 1) {
    if (
      experience.scenes[index]!.drive.kind !== "auto"
      && samples[index]!.active
    ) selected = index;
  }
  if (selected >= 0) return selected;

  const currentDrive = experience.scenes[current]!.drive;
  if (
    currentDrive.kind === "auto"
    && !currentDrive.loop
    && samples[current]!.progress >= 1
  ) {
    return Math.min(current + 1, samples.length - 1);
  }
  return current;
}
