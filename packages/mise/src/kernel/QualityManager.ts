import type { QualityTier } from "../Contracts.js";

const SAMPLE_WINDOW = 60;
const COOLDOWN_WINDOWS = 1;
const BACKGROUND_DELTA = 0.25;
const THRESHOLD_EPSILON = 1e-12;
const MIN_PIXEL_RATIO = 0.75;
const MOBILE_PIXEL_RATIO_CAP = 1.5;
const DESKTOP_PIXEL_RATIO_CAP = 2;
const MOBILE_DRAWING_BUFFER_BUDGET = 2_073_600;
const DESKTOP_DRAWING_BUFFER_BUDGET = 5_184_000;
const QUALITY_SCALE = {
  low: 0.5,
  medium: 0.75,
  high: 1,
} as const satisfies Record<QualityTier, number>;

export class QualityManager {
  private elapsed = 0;
  private samples = 0;
  private cooldown = 0;
  private currentTier: QualityTier = "high";

  get tier(): QualityTier {
    return this.currentTier;
  }

  pixelRatio(
    width: number,
    height: number,
    devicePixelRatio: number = window.devicePixelRatio,
    coarsePointer = false,
  ): number {
    const normalizedWidth = normalizeDimension(width);
    const normalizedHeight = normalizeDimension(height);
    const normalizedDeviceRatio = Number.isFinite(devicePixelRatio)
      && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
    const mobileViewport = coarsePointer
      || Math.min(normalizedWidth, normalizedHeight) <= 768;
    const ratioCap = mobileViewport
      ? MOBILE_PIXEL_RATIO_CAP
      : DESKTOP_PIXEL_RATIO_CAP;
    const pixelBudget = mobileViewport
      ? MOBILE_DRAWING_BUFFER_BUDGET
      : DESKTOP_DRAWING_BUFFER_BUDGET;
    const budgetRatio = Math.sqrt(
      pixelBudget / (normalizedWidth * normalizedHeight),
    );
    return QUALITY_SCALE[this.currentTier] * Math.min(
      Math.max(MIN_PIXEL_RATIO, normalizedDeviceRatio),
      ratioCap,
      budgetRatio,
    );
  }

  observeFrame(delta: number): boolean {
    if (!Number.isFinite(delta) || delta <= 0 || delta >= BACKGROUND_DELTA) {
      return false;
    }
    this.elapsed += delta;
    this.samples += 1;
    if (this.samples < SAMPLE_WINDOW) return false;

    const average = this.elapsed / this.samples;
    this.elapsed = 0;
    this.samples = 0;
    if (this.cooldown > 0) {
      this.cooldown -= 1;
      return false;
    }

    const nextTier = selectTier(this.currentTier, average);
    if (nextTier === this.currentTier) return false;
    this.currentTier = nextTier;
    this.cooldown = COOLDOWN_WINDOWS;
    return true;
  }
}

function normalizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function selectTier(current: QualityTier, average: number): QualityTier {
  switch (current) {
    case "high":
      return average > 0.022 + THRESHOLD_EPSILON ? "medium" : "high";
    case "medium":
      if (average > 0.03 + THRESHOLD_EPSILON) return "low";
      return average < 0.014 - THRESHOLD_EPSILON ? "high" : "medium";
    case "low":
      return average < 0.018 - THRESHOLD_EPSILON ? "medium" : "low";
  }
}
