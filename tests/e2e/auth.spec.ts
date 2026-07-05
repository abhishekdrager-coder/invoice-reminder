import { expect, test } from "@playwright/test";

test("invalid login stays on /login with inline error", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Invalid email or password." }),
    });
  });

  await page.goto("/login");
  await page.waitForFunction(() => document.body.dataset.authReady === "true");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login\??$/);
  await expect(page.getByTestId("auth-error")).toContainText("Invalid email or password.");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("invalid signup stays on /signup with inline error", async ({ page }) => {
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "An account with this email already exists." }),
    });
  });

  await page.goto("/signup");
  await page.waitForFunction(() => document.body.dataset.authReady === "true");
  await page.getByLabel("Full name").fill("Test User");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/signup\??$/);
  await expect(page.getByTestId("auth-error")).toContainText("An account with this email already exists.");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("valid login reaches dashboard without runtime error page", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Welcome back.", redirectTo: "/dashboard" }),
    });
  });

  await page.route("**/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Dashboard</h1></body></html>",
    });
  });

  await page.goto("/login");
  await page.waitForFunction(() => document.body.dataset.authReady === "true");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
