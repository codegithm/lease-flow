/// <reference types="node" />
import { test, expect } from "@playwright/test";

test("displays friendly message on server error during sign in", async ({
  page,
}) => {
  // intercept the signin network request and return 500
  await page.route("**/api/Users/signin", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "Internal Server Error",
    });
  });

  const base = process.env.E2E_BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/signin`);
  await page.fill('input[type="email"]', "user@example.com");
  await page.fill('input[type="password"]', "password");
  await page.click('button:has-text("Sign In")');

  // Expect a friendly toast message (from handleResponse for 500)
  await expect(page.locator("text=Server error")).toBeVisible({
    timeout: 5000,
  });
});
