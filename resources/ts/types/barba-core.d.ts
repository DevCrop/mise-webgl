declare module "@barba/core" {
  interface PreventData {
    readonly href: string;
  }

  interface Transition {
    readonly name: string;
    leave(): void | Promise<void>;
    afterEnter(): void | Promise<void>;
  }

  interface BarbaOptions {
    readonly preventRunning?: boolean;
    readonly prevent?: (data: PreventData) => boolean;
    readonly transitions?: readonly Transition[];
  }

  export interface Barba {
    init(options?: BarbaOptions): void;
    destroy(): void;
  }

  const barba: Barba;
  export default barba;
}
