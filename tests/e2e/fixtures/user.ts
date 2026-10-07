import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * A fixture that creates a unique, already-confirmed user via the Supabase
 * admin API (service role, TEST ONLY) and logs it in through the UI with a
 * password. This keeps every e2e test independent of email delivery.
 */
export interface TestUser {
  email: string;
  password: string;
  id: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const test = base.extend<{ user: TestUser }>({
  user: async ({ page }, provide) => {
    const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = "test-password-123";

    const supabase = admin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "E2E Tester" },
    });
    if (error) throw error;
    const id = data.user!.id;

    // Log in through the UI.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/app**");

    await provide({ email, password, id });

    // Cleanup.
    await supabase.auth.admin.deleteUser(id);
  },
});

export { expect };
