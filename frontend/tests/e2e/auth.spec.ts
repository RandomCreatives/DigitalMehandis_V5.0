import { test, expect } from "@playwright/test";

/**
 * Auth E2E Tests
 * Run with: npx playwright test
 *
 * Prerequisites:
 * - Backend running on http://localhost:8000
 * - Frontend running on http://localhost:3000
 * - PostgreSQL with test data
 */

test.describe("Authentication flow", () => {
  test("register, login, and access dashboard", async ({ page }) => {
    const testEmail = `e2e-${Date.now()}@ethioqs.test`;
    const testPassword = "Test@1234";

    // Register
    await page.goto("/auth/register");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[type="text"]', "E2E User");
    await page.click('button:has-text("Create Account")');

    // Should redirect to dashboard after successful registration
    await page.waitForURL("/dashboard", { timeout: 5000 });
    await expect(page).toHaveURL("/dashboard");

    // Dashboard should show project list
    await expect(page.locator('text="Project Dashboard"')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', "fake@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button:has-text("Sign In")');

    // Error message should appear
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    // First login (using a pre-registered user for this test)
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "Test@1234");
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard", { timeout: 5000 });

    // Click logout
    await page.click('button:has-text("Sign Out")');

    // Should redirect to login
    await page.waitForURL("/auth/login", { timeout: 5000 });
    await expect(page).toHaveURL("/auth/login");
  });

  test("unauthenticated user cannot access dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login page
    await page.waitForURL("/auth/login", { timeout: 5000 });
    await expect(page).toHaveURL("/auth/login");
  });
});
