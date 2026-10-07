import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/app/providers";
import { AppHeader } from "@/features/auth/AppHeader";
import { AppFooter } from "@/features/auth/AppFooter";

/**
 * Server-side guard for the whole /app area. The proxy also redirects, but we
 * re-check here because middleware alone must not be trusted for authorization.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    null;

  return (
    <Providers>
      <div className="flex h-dvh flex-col overflow-hidden">
        <AppHeader name={name} email={user.email ?? null} />
        <div className="relative min-h-0 flex-1">{children}</div>
        <AppFooter />
      </div>
    </Providers>
  );
}
