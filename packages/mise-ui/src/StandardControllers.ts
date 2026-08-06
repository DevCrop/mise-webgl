import {
  defineController,
  type MiseUiController,
  type MiseUiControllerDefinition,
} from "./Controller.js";

export const disclosureController: MiseUiControllerDefinition = defineController({
  name: "disclosure",
  create: createDisclosureController,
});

export const dialogController: MiseUiControllerDefinition = defineController({
  name: "dialog",
  create: createDialogController,
});

export const copyController: MiseUiControllerDefinition = defineController({
  name: "copy",
  create: createCopyController,
});

export const searchController: MiseUiControllerDefinition = defineController({
  name: "search",
  create: createSearchController,
});

export const themeController: MiseUiControllerDefinition = defineController({
  name: "theme",
  create: createThemeController,
});

export const tocController: MiseUiControllerDefinition = defineController({
  name: "toc",
  create: createTocController,
});

export function matchesSearch(query: string, candidate: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") return true;
  return normalizeSearchText(candidate).includes(normalizedQuery);
}

export interface FocusReturn {
  capture(target: { focus(): void }): void;
  restore(): void;
}

export function createFocusReturn(): FocusReturn {
  let target: { focus(): void } | null = null;
  return {
    capture(nextTarget): void {
      target = nextTarget;
    },
    restore(): void {
      const previous = target;
      target = null;
      previous?.focus();
    },
  };
}

function createDisclosureController(root: HTMLElement): MiseUiController {
  const trigger = root.querySelector<HTMLElement>("[aria-controls]");
  const panel = root.querySelector<HTMLElement>("[data-mise-disclosure-panel]");
  const originalExpanded = trigger?.getAttribute("aria-expanded") ?? null;
  const originalHidden = panel?.hidden ?? false;
  let abortController: AbortController | null = null;

  const setExpanded = (expanded: boolean): void => {
    trigger?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (panel) panel.hidden = !expanded;
  };
  const toggle = (): void => setExpanded(trigger?.getAttribute("aria-expanded") !== "true");

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      restoreAttribute(trigger, "aria-expanded", originalExpanded);
      if (panel) panel.hidden = originalHidden;
    },
    mount(): void {
      if (abortController || !trigger || !panel) return;
      abortController = new AbortController();
      setExpanded(trigger.getAttribute("aria-expanded") === "true");
      trigger.addEventListener("click", toggle, { signal: abortController.signal });
    },
  };
}

function createDialogController(root: HTMLElement): MiseUiController {
  const dialog = root.querySelector<HTMLDialogElement>("dialog");
  const openers = [...root.querySelectorAll<HTMLElement>("[data-mise-dialog-open]")];
  const closers = [...root.querySelectorAll<HTMLElement>("[data-mise-dialog-close]")];
  let abortController: AbortController | null = null;
  const focusReturn = createFocusReturn();

  const open = (event: Event): void => {
    if (!(event.currentTarget instanceof HTMLElement) || !dialog) return;
    focusReturn.capture(event.currentTarget);
    dialog.showModal();
    const focusTarget = dialog.querySelector<HTMLElement>("[autofocus]")
      ?? dialog.querySelector<HTMLElement>("button, a, input");
    focusTarget?.focus();
  };
  const close = (): void => dialog?.close();
  const restoreFocus = (): void => focusReturn.restore();

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      if (dialog?.open) dialog.close();
      restoreFocus();
    },
    mount(): void {
      if (abortController || !dialog) return;
      abortController = new AbortController();
      for (const opener of openers) opener.addEventListener("click", open, { signal: abortController.signal });
      for (const closer of closers) closer.addEventListener("click", close, { signal: abortController.signal });
      dialog.addEventListener("close", restoreFocus, { signal: abortController.signal });
    },
  };
}

function createCopyController(root: HTMLElement): MiseUiController {
  const button = root.querySelector<HTMLElement>("[data-mise-copy-button]");
  const source = root.querySelector<HTMLElement>("[data-mise-copy-source]");
  let abortController: AbortController | null = null;

  const copy = async (): Promise<void> => {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard || !source) {
      root.dataset["state"] = "error";
      return;
    }
    try {
      await clipboard.writeText(source.textContent ?? "");
      root.dataset["state"] = "copied";
    } catch {
      root.dataset["state"] = "error";
    }
  };

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      delete root.dataset["state"];
    },
    mount(): void {
      if (abortController || !button || !source) return;
      abortController = new AbortController();
      button.addEventListener("click", copy, { signal: abortController.signal });
    },
  };
}

function createSearchController(root: HTMLElement): MiseUiController {
  const input = root.querySelector<HTMLInputElement>("[data-mise-search-input]");
  const items = [...root.querySelectorAll<HTMLElement>("[data-mise-search-item]")];
  const originalHidden = items.map((item) => item.hidden);
  let abortController: AbortController | null = null;

  const update = (): void => {
    const query = input?.value ?? "";
    for (const item of items) {
      const candidate = item.dataset["searchText"] ?? item.textContent ?? "";
      item.hidden = !matchesSearch(query, candidate);
    }
  };

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      items.forEach((item, index) => {
        item.hidden = originalHidden[index] ?? false;
      });
    },
    mount(): void {
      if (abortController || !input) return;
      abortController = new AbortController();
      input.addEventListener("input", update, { signal: abortController.signal });
      update();
    },
  };
}

function createThemeController(root: HTMLElement): MiseUiController {
  const buttons = [...root.querySelectorAll<HTMLElement>("[data-mise-theme-value]")];
  const originalTheme = root.dataset["miseTheme"];
  let abortController: AbortController | null = null;

  const select = (event: Event): void => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    const theme = event.currentTarget.dataset["miseThemeValue"];
    if (theme !== "light" && theme !== "dark") return;
    root.dataset["miseTheme"] = theme;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", button === event.currentTarget ? "true" : "false");
    }
  };

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      restoreDataset(root, "miseTheme", originalTheme);
    },
    mount(): void {
      if (abortController) return;
      abortController = new AbortController();
      for (const button of buttons) button.addEventListener("click", select, { signal: abortController.signal });
    },
  };
}

function createTocController(root: HTMLElement): MiseUiController {
  const headings = [...root.querySelectorAll<HTMLElement>("[data-mise-heading][id]")];
  const links = [...root.querySelectorAll<HTMLAnchorElement>("[data-mise-toc-link]")];
  let observer: IntersectionObserver | null = null;

  const activate = (id: string): void => {
    for (const link of links) {
      const current = link.hash === `#${id}`;
      if (current) link.setAttribute("aria-current", "location");
      if (!current) link.removeAttribute("aria-current");
    }
  };
  const observe = (entries: IntersectionObserverEntry[]): void => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!(visible?.target instanceof HTMLElement)) return;
    activate(visible.target.id);
  };

  return {
    dispose(): void {
      observer?.disconnect();
      observer = null;
    },
    mount(): void {
      if (observer || typeof IntersectionObserver === "undefined") return;
      observer = new IntersectionObserver(observe, { rootMargin: "-20% 0px -70%" });
      for (const heading of headings) observer.observe(heading);
    },
  };
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function restoreAttribute(
  element: HTMLElement | null,
  name: string,
  value: string | null,
): void {
  if (!element) return;
  if (value === null) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}

function restoreDataset(element: HTMLElement, name: string, value: string | undefined): void {
  if (value === undefined) {
    delete element.dataset[name];
    return;
  }
  element.dataset[name] = value;
}
