export class QualityManager {
  private scale = 1;
  private elapsed = 0;
  private samples = 0;

  pixelRatio(
    width: number,
    height: number,
    devicePixelRatio = window.devicePixelRatio,
  ): number {
    const cap = Math.min(width, height) <= 768 ? 1.5 : 2;
    return Math.max(0.75, Math.min(devicePixelRatio, cap) * this.scale);
  }

  observeFrame(delta: number): boolean {
    if (delta <= 0) return false;
    this.elapsed += delta;
    this.samples += 1;
    if (this.samples < 60) return false;

    const average = this.elapsed / this.samples;
    this.elapsed = 0;
    this.samples = 0;
    if (average > 0.022 && this.scale > 0.75) {
      this.scale = 0.75;
      return true;
    }
    if (average < 0.014 && this.scale < 1) {
      this.scale = 1;
      return true;
    }
    return false;
  }
}
