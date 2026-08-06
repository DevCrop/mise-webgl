import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/ko");
  await expect(page.locator("html")).toHaveAttribute("data-mise-ui", "ready");
});

test("renders one semantic Component shell", async ({ page }) => {
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("aside")).toHaveCount(2);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("[data-mise-component='docs-shell']")).toHaveCount(1);
  await expect(page.locator("[data-mise-controller]")).toHaveCount(6);
  await expect(page.locator("[data-mise-component='navigation-section']")).toHaveCount(5);
  await expect(page.locator("[data-mise-component='document-table']")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "1. 문서 지위" })).toBeVisible();
});

test("serves every visible document navigation route", async ({ page }) => {
  const hrefs = await page.locator("#primary-navigation a").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  for (const href of hrefs) {
    if (!href) throw new Error("MISE Docs navigation href is missing");
    const response = await page.goto(href);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("문서를 찾을 수 없습니다");
  }
});

test("supports tabs keyboard and visible focus", async ({ page }) => {
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#panel-typescript")).toBeHidden();
  await expect(page.locator("#panel-php")).toBeVisible();
  const outline = await tabs.nth(1).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});

test("updates disclosure, search dialog, theme, and copy state", async ({ page, context }) => {
  const disclosure = page.getByRole("button", { name: "탐색 접기" });
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#primary-navigation")).toBeHidden();

  const searchOpener = page.getByRole("button", { name: "문서 검색" });
  await searchOpener.click();
  const dialog = page.getByRole("dialog", { name: "문서 검색" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("searchbox").fill("SCSS");
  await expect(dialog.locator("[data-mise-search-item]:visible")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(searchOpener).toBeFocused();

  await page.getByRole("button", { name: "밝게" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mise-theme", "light");

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "복사" }).click();
  await expect(page.locator("[data-mise-component='code-block']")).toHaveAttribute("data-state", "copied");
});

test("keeps navigation and all tab panels without JavaScript", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("MISE Docs baseURL is missing");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/ko`);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("#primary-navigation")).toBeVisible();
  await expect(page.getByRole("tabpanel")).toHaveCount(2);
  await expect(page.getByRole("tabpanel").nth(0)).toBeVisible();
  await expect(page.getByRole("tabpanel").nth(1)).toBeVisible();
  await expect(page.locator(".mise-c-js-control").first()).toBeHidden();
  await context.close();
});

test("searches and copies a verified public Prompt", async ({ page, context }) => {
  await page.getByRole("button", { name: "문서 검색" }).click();
  await page.getByRole("searchbox").fill("Component 추가");
  const result = page.getByRole("link", { name: "MISE UI Component 추가" });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/ko\/prompts#prompt-mise\.ui\.implement\.component\.v1$/u);
  const card = page.locator("#prompt-mise\\.ui\\.implement\\.component\\.v1");
  await expect(card).toContainText("verified");
  await expect(card).toContainText("Controller.test.ts");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await card.getByRole("button", { name: "복사" }).click();
  await expect(card.locator("[data-mise-component='code-block']")).toHaveAttribute("data-state", "copied");
});
