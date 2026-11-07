import { test, expect } from "@playwright/test";
test("workspace presents the capture path and transcript fallback", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your meetings leave/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /share meeting tab/i })).toBeVisible();
  await page.getByRole("button", { name: /paste a transcript instead/i }).click();
  await expect(page.getByLabel("Meeting transcript")).toBeVisible();
});
