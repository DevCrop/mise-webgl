import type { ReducedMotionState } from "../Contracts.js";

export class ReducedMotionPreference implements ReducedMotionState {
  private mounted = false;
  private readonly handleChange = (): void => this.onChange();

  constructor(
    private readonly query: MediaQueryList,
    private readonly onChange: () => void,
  ) {}

  get active(): boolean {
    return this.query.matches;
  }

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.query.addEventListener("change", this.handleChange);
  }

  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.query.removeEventListener("change", this.handleChange);
  }
}
