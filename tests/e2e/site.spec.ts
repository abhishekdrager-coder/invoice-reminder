import { expect, test } from "@playwright/test";

test("homepage CTAs and protected route redirects work", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Start free", exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.goto("/");
  await page.getByRole("link", { name: "View pricing" }).click();
  await expect(page).toHaveURL(/#pricing$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Log in" }).last().click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("seo endpoints respond with expected content", async ({ page }) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  await expect(robots.text()).resolves.toContain("Sitemap:");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  await expect(sitemap.text()).resolves.toContain("/login");

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  await expect(manifest.text()).resolves.toContain("Invoice Copilot");
});

test("demo login reaches dashboard without Supabase configured", async ({ page }) => {
  await page.goto("/login");
  await page.waitForFunction(() => document.body.dataset.authReady === "true");
  await page.getByLabel("Email").fill("demo@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByText("Recent invoices")).toBeVisible();
  await expect(page.getByText("Demo mode")).toBeVisible();
});
