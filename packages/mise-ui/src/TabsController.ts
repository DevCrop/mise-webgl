import {
  defineController,
  type MiseUiController,
  type MiseUiControllerDefinition,
} from "./Controller.js";

const TAB_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export const tabsController: MiseUiControllerDefinition = defineController({
  name: "tabs",
  create: createTabsController,
});

export function resolveTabIndex(key: string, current: number, total: number): number | null {
  if (!TAB_KEYS.has(key) || total < 1 || current < 0 || current >= total) return null;
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  const movement = key === "ArrowRight" ? 1 : -1;
  return (current + movement + total) % total;
}

function createTabsController(root: HTMLElement): MiseUiController {
  const tabs = [...root.querySelectorAll<HTMLElement>("[role='tab']")];
  const panels = [...root.querySelectorAll<HTMLElement>("[role='tabpanel']")];
  const tabState = tabs.map((tab) => ({
    selected: tab.getAttribute("aria-selected"),
    tabIndex: tab.getAttribute("tabindex"),
  }));
  const panelState = panels.map((panel) => panel.hidden);
  let abortController: AbortController | null = null;

  const activate = (activeTab: HTMLElement, moveFocus: boolean): void => {
    const panelId = activeTab.getAttribute("aria-controls");
    if (!panelId) return;
    for (const tab of tabs) {
      const selected = tab === activeTab;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== panelId;
    if (moveFocus) activeTab.focus();
  };

  const handleClick = (event: Event): void => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    activate(event.currentTarget, false);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    const current = tabs.indexOf(event.currentTarget);
    const nextIndex = resolveTabIndex(event.key, current, tabs.length);
    if (nextIndex === null) return;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    event.preventDefault();
    activate(nextTab, true);
  };

  return {
    dispose(): void {
      if (!abortController) return;
      abortController.abort();
      abortController = null;
      tabs.forEach((tab, index) => restoreAttribute(tab, "aria-selected", tabState[index]?.selected));
      tabs.forEach((tab, index) => restoreAttribute(tab, "tabindex", tabState[index]?.tabIndex));
      panels.forEach((panel, index) => {
        panel.hidden = panelState[index] ?? false;
      });
    },
    mount(): void {
      if (abortController) return;
      abortController = new AbortController();
      const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
      if (!selected) return;
      activate(selected, false);
      for (const tab of tabs) {
        tab.addEventListener("click", handleClick, { signal: abortController.signal });
        tab.addEventListener("keydown", handleKeydown, { signal: abortController.signal });
      }
    },
  };
}

function restoreAttribute(element: HTMLElement, name: string, value: string | null | undefined): void {
  if (value === null || value === undefined) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}
