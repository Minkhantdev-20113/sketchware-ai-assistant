import { NextResponse, type NextRequest } from "next/server";

import { getDisplayName } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/chat";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const displayName = getDisplayName(
        user.user_metadata?.username || user.user_metadata?.full_name,
        user.email,
      );

      await supabase.from("profiles").upsert({
        id: user.id,
        username: displayName,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          theme: "system",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
