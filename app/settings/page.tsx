import { redirect } from "next/navigation";

import { SettingsDashboard } from "@/components/settings/settings-dashboard";
import { SettingsSync } from "@/components/settings-sync";
import { getDisplayName } from "@/lib/avatar";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  if (!hasSupabaseConfig()) {
    redirect("/auth");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/settings");
  }

  const displayName = getDisplayName(
    user.user_metadata?.username || user.user_metadata?.full_name,
    user.email,
  );

  return (
    <>
      <SettingsSync userId={user.id} />
      <SettingsDashboard
        user={{
          id: user.id,
          email: user.email,
          username: displayName,
        }}
      />
    </>
  );
}
