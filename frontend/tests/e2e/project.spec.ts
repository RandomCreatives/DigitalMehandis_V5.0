import { test, expect } from "@playwright/test";

/**
 * Project & BBS E2E Tests
 *
 * Prerequisites:
 * - Backend running on http://localhost:8000
 * - Frontend running on http://localhost:3000
 * - PostgreSQL with fresh test data
 */

test.describe("Project & BBS workflow", () => {
  const testEmail = `e2e-bbs-${Date.now()}@ethioqs.test`;
  const testPassword = "Test@1234";

  test("create project, add BBS bars, import CSV, export Excel", async ({ page }) => {
    // 1. Register and login
    await page.goto("/auth/register");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.fill('input[type="text"]', "E2E BBS User");
    await page.click('button:has-text("Create Account")');
    await page.waitForURL("/dashboard", { timeout: 5000 });

    // 2. Create project
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder*="Project Name"]', "BBS E2E Project");
    await page.click('button:has-text("Create Project")');

    // Wait for project page (redirects to drawings by default)
    await page.waitForURL(/\/dashboard\/[a-f0-9-]+/, { timeout: 5000 });

    // 3. Navigate to BBS page
    await page.click('a:has-text("Bar Schedule")');
    await page.waitForURL(/\/dashboard\/[a-f0-9-]+\/bbs/, { timeout: 5000 });
    await expect(page.locator('text="Bar Bending Schedule"')).toBeVisible();

    // 4. Add a bar manually
    await page.fill('input[placeholder*="Member Name"]', "Footing F1");
    await page.fill('input[type="number"]').nth(0).fill("5"); // quantity
    await page.fill('input[type="number"]').nth(1).fill("2.5"); // clear length
    await page.click('button:has-text("Add Bar")');

    // 5. Bar should appear in table
    await expect(page.locator('text="Footing F1"')).toBeVisible();
    await expect(page.locator('text="B1"')).toBeVisible();

    // 6. Export Excel
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('button:has-text("Export Excel")'),
    ]);
    expect(download.suggestedFilename()).toMatch(/BBS.*\.xlsx/);

    // 7. Import CSV (using a sample CSV)
    const sampleCSV = `LOCATION,Bar Type,Bar dia,Bar shape,Bar Length,No. of,No. of,Total,LENGTH
,,(mm),,,Members,Bars,No.of Bars,6,8,10,12,14,16,20,24
SUB STRUCTURE,,,,,,,,,,,,,,,,
Footing Pad,,,,,,,,,,,,,,,,
F-3,Bottom bar,12,,1.5,2,10,20,,,,30,,,,,
`;
    await page.setInputFiles('input[type="file"]', {
      name: "sample_bbs.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCSV),
    });

    // Wait for import success message
    await expect(page.locator('text=/Imported/').or(page.locator('text=/imported/'))).toBeVisible({ timeout: 5000 });
  });

  test("BBS form shows direct cutting length preview", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("/dashboard", { timeout: 5000 });

    // Open first project
    await page.click('button:has-text("Open")');
    await page.waitForURL(/\/dashboard\/[a-f0-9-]+/, { timeout: 5000 });
    await page.click('a:has-text("Bar Schedule")');

    // Enter a direct cutting length
    await page.fill('input[placeholder*="Auto"]', "3.5");

    // Preview should show "(direct)" label
    await expect(page.locator('text="(direct)"')).toBeVisible();
  });
});
