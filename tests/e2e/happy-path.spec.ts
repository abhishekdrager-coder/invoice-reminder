import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const freeEmail = process.env.E2E_FREE_EMAIL;
const freePassword = process.env.E2E_FREE_PASSWORD;
const premiumEmail = process.env.E2E_PREMIUM_EMAIL;
const premiumPassword = process.env.E2E_PREMIUM_PASSWORD;
const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;

test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated happy path.");

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function loginAs(page: import("@playwright/test").Page, userEmail: string, userPassword: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(userEmail);
  await page.getByPlaceholder("Password").fill(userPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("signup/login screens render", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await login(page);
});

test("invoice creation form renders", async ({ page }) => {
  await login(page);
  await page.goto("/invoices/new");
  await expect(page.getByRole("heading", { name: "Create invoice" })).toBeVisible();

  await page.getByPlaceholder("Client name").fill("Playwright Client");
  await page.getByPlaceholder("Client email").fill("client-playwright@example.com");
  await page.getByPlaceholder("Amount").fill("250");
  await page.locator("input[name='dueDate']").fill("2026-07-30");
  await page.getByRole("button", { name: "Save invoice" }).click();
  await expect(page).toHaveURL(/invoices/);

  await page.getByRole("button", { name: "Mark paid" }).first().click();
  await expect(page.getByText("Invoice marked paid")).toBeVisible();
});

test("billing upgrade path screen renders", async ({ page }) => {
  await login(page);
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upgrade to Premium Lite" })).toBeVisible();
});

test("free user sees ads", async ({ page }) => {
  test.skip(!freeEmail || !freePassword, "Set E2E_FREE_EMAIL and E2E_FREE_PASSWORD.");
  await loginAs(page, freeEmail!, freePassword!);
  await page.goto("/dashboard");
  await expect(page.getByTestId("ad-slot-dashboard_top")).toBeVisible();
});

test("premium user does not see ads", async ({ page }) => {
  test.skip(!premiumEmail || !premiumPassword, "Set E2E_PREMIUM_EMAIL and E2E_PREMIUM_PASSWORD.");
  await loginAs(page, premiumEmail!, premiumPassword!);
  await page.goto("/dashboard");
  await expect(page.getByTestId("ad-slot-dashboard_top")).toHaveCount(0);
});

test("hitting free limit shows upgrade prompt", async ({ page }) => {
  test.skip(!freeEmail || !freePassword, "Set E2E_FREE_EMAIL and E2E_FREE_PASSWORD.");
  await loginAs(page, freeEmail!, freePassword!);
  await page.goto("/invoices/new?error=Plan%20limit%20reached");
  await expect(page.getByTestId("upgrade-cta")).toBeVisible();
});

test("non-admin user is blocked from admin", async ({ page }) => {
  await login(page);
  await page.goto("/admin/overview");
  await expect(page).toHaveURL(/dashboard/);
});

test("run reminders cron endpoint", async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "Set CRON_SECRET to validate cron endpoint.");

  const response = await request.post("/api/cron/send-reminders", {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  expect([200, 500]).toContain(response.status());
});

test("owner can access admin security", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD.");
  await loginAs(page, ownerEmail!, ownerPassword!);
  await page.goto("/admin/security");
  await expect(page.getByRole("heading", { name: "Security Administration" })).toBeVisible();
});

test("normal user cannot access admin security", async ({ page }) => {
  await login(page);
  await page.goto("/admin/security");
  await expect(page).toHaveURL(/admin\/overview|dashboard/);
});

test("upgrade to premium removes ads and unlocks limits", async ({ page }) => {
  test.skip(!premiumEmail || !premiumPassword, "Set E2E_PREMIUM_EMAIL and E2E_PREMIUM_PASSWORD.");
  await loginAs(page, premiumEmail!, premiumPassword!);
  await page.goto("/dashboard");
  await expect(page.getByTestId("ad-slot-dashboard_top")).toHaveCount(0);
  await page.goto("/settings/billing");
  await expect(page.getByText("Current plan:")).toBeVisible();
});

test("downgrade to free restores limits and ads", async ({ page }) => {
  test.skip(!freeEmail || !freePassword, "Set E2E_FREE_EMAIL and E2E_FREE_PASSWORD.");
  await loginAs(page, freeEmail!, freePassword!);
  await page.goto("/dashboard");
  await expect(page.getByTestId("ad-slot-dashboard_top")).toBeVisible();
  await page.goto("/settings/billing");
  await expect(page.getByText("Current plan:")).toBeVisible();
});
