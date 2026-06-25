/// <reference types="node" />
import { test, expect } from "@playwright/test";

test("sign in success shows welcome toast and navigates", async ({ page }) => {
  // Mock successful signin response
  await page.route("**/api/Users/signin", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "abc",
        name: "Test User",
        email: "user@example.com",
      }),
    });
  });

  const base = process.env.E2E_BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/signin`);
  await page.fill('input[type="email"]', "user@example.com");
  await page.fill('input[type="password"]', "password");
  await page.click('button:has-text("Sign In")');

  // Welcome toast shows
  await expect(page.locator("text=Welcome back!")).toBeVisible({
    timeout: 5000,
  });

  // Either navigated to dashboard or URL contains /dashboard
  await expect(page).toHaveURL(/.*dashboard.*/);
});
