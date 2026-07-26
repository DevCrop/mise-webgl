import { expect, test } from "@playwright/test";

test("핵심 콘텐츠와 프로젝트 carousel을 제공한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".work-card")).toHaveCount(3);
  await expect(page.locator(".work-card").first()).toContainText("Aurora Field");
  await expect(page.getByRole("button", { name: "다음 프로젝트" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("가로 overflow 없이 현재 viewport에 맞는다", async ({ page }) => {
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("reduced motion에서 애니메이션을 최소화한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const behavior = await page.evaluate(() =>
    getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behavior).toBe("auto");
});

test("WebGL 실패 시에도 콘텐츠를 표시한다", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      contextId: string,
      options?: unknown,
    ): RenderingContext | null {
      if (contextId === "webgl" || contextId === "webgl2") return null;
      return original.call(this, contextId, options as never);
    };
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#webgl-canvas")).toHaveClass(/is-webgl-fallback/);
});
