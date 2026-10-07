import { test, expect } from "./fixtures/user";

test.describe("tasks", () => {
  test("add, complete and delete a task", async ({ page }) => {
    // Add.
    await page.getByRole("button", { name: "Add task" }).first().click();
    const input = page.getByPlaceholder("What needs doing?");
    await input.fill("Complete WordPress website");
    await input.press("Enter");
    const card = page.getByText("Complete WordPress website");
    await expect(card).toBeVisible();

    // Complete.
    await card.hover();
    await page
      .getByRole("button", { name: "Mark complete" })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Mark incomplete" }).first(),
    ).toBeVisible();

    // Reload — it persisted.
    await page.reload();
    await expect(page.getByText("Complete WordPress website")).toBeVisible();

    // Delete.
    await page.getByText("Complete WordPress website").hover();
    await page.getByRole("button", { name: "Delete task" }).first().click();
    await expect(page.getByText("Complete WordPress website")).toHaveCount(0);
  });

  test("details persist across reload", async ({ page }) => {
    await page.getByRole("button", { name: "Add task" }).first().click();
    const input = page.getByPlaceholder("What needs doing?");
    await input.fill("Plan launch");
    await input.press("Enter");

    await page.getByText("Plan launch").click();
    const textarea = page.getByPlaceholder(/Add notes in markdown/);
    await textarea.fill("- [ ] draft copy\n- [x] pick date");
    // Trigger debounce flush by closing the panel.
    await page.getByRole("button", { name: "Close details" }).click();

    await page.reload();
    await expect(page.getByText("1/2")).toBeVisible();
  });

  test("switches between day, week and month views", async ({ page }) => {
    await page.getByRole("button", { name: "Month" }).click();
    await expect(page).toHaveURL(/view=month/);
    await page.getByRole("button", { name: "Day" }).click();
    await expect(page).toHaveURL(/view=day/);
    await page.getByRole("button", { name: "Week" }).click();
    await expect(page).toHaveURL(/view=week/);
  });
});
