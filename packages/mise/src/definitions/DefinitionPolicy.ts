interface DefinitionLimits {
  readonly experiences: number;
  readonly identifierLength: number;
  readonly objectsPerScene: number;
  readonly pages: number;
  readonly scenesPerTrack: number;
  readonly selectorLength: number;
  readonly surfacesPerExperience: number;
  readonly tracksPerExperience: number;
  readonly viewsPerExperience: number;
}

export const DEFINITION_LIMITS: DefinitionLimits = Object.freeze({
  experiences: 64,
  identifierLength: 128,
  objectsPerScene: 256,
  pages: 64,
  scenesPerTrack: 64,
  selectorLength: 512,
  surfacesPerExperience: 8,
  tracksPerExperience: 32,
  viewsPerExperience: 32,
});

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function isSafeDefinitionId(value: string): boolean {
  return value.length <= DEFINITION_LIMITS.identifierLength
    && SAFE_IDENTIFIER.test(value);
}

export function isSafeSelector(value: string): boolean {
  return value.trim().length > 0
    && value.length <= DEFINITION_LIMITS.selectorLength
    && !CONTROL_CHARACTER.test(value);
}
