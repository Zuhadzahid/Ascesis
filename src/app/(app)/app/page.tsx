import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CanvasClient } from "@/features/canvas/CanvasClient";
import { parseSnapshot } from "@/features/store/canvasSnapshot";
import type { WeekStart } from "@/lib/dates/core";

export const metadata = {
  title: "Your canvas · Ascesis",
};

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, week_starts_on, canvas_state")
    .eq("id", user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? "UTC";
  const weekStartsOn = (profile?.week_starts_on ?? 1) as WeekStart;
  const serverSnapshot = parseSnapshot(profile?.canvas_state);

  return (
    <CanvasClient
      userId={user.id}
      initialTimezone={timezone}
      weekStartsOn={weekStartsOn}
      serverSnapshot={serverSnapshot}
    />
  );
}
