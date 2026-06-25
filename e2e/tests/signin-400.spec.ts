/// <reference types="node" />
import { test, expect } from "@playwright/test";

test("displays API validation message on 400 during sign in", async ({
  page,
}) => {
  // intercept the signin network request and return 400 with JSON message
  await page.route("**/api/Users/signin", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Invalid credentials" }),
    });
  });

  const base = process.env.E2E_BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/signin`);
  await page.fill('input[type="email"]', "user@example.com");
  await page.fill('input[type="password"]', "wrongpassword");
  await page.click('button:has-text("Sign In")');

  // Expect the exact API message to be visible
  await expect(page.locator("text=Invalid credentials")).toBeVisible({
    timeout: 5000,
  });
});
