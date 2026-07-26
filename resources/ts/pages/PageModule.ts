export type PageId = "home";

export interface PageModule {
  mount(root: HTMLElement): Promise<void> | void;
  leave(): Promise<void>;
  dispose(): void;
}
