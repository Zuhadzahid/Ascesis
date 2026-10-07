import { test, expect } from "./fixtures/user";
import { test as base } from "@playwright/test";

test("logs in and lands on the canvas", async ({ page, user }) => {
  // The `user` fixture already logged in and navigated to /app.
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByText("Ascesis")).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
});

test("signs out back to login", async ({ page }) => {
  await page.getByRole("button", { name: /E2E Tester|account/i }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login**");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

base("unauthenticated visit to /app redirects to login", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/login**");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
