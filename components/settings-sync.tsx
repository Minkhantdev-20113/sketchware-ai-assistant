"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { useOfflineStore } from "@/lib/offline-store";
import { createClient } from "@/lib/supabase/client";
import {
  preferencesToSettings,
  settingsToPreferences,
} from "@/lib/settings/sync";
import type { StoredPreferences } from "@/lib/settings/types";

type SettingsSyncProps = {
  userId: string;
};

export function SettingsSync({ userId }: SettingsSyncProps) {
  const { theme, setTheme } = useTheme();
  const { settings, replaceSettings, setSettings } = useOfflineStore();
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_settings")
        .select("theme, model_preferences")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        const merged = preferencesToSettings(
          data.theme,
          data.model_preferences as StoredPreferences,
        );
        replaceSettings(merged);
        setTheme(merged.theme);
      }

      setLoaded(true);
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [replaceSettings, setTheme, userId]);

  React.useEffect(() => {
    if (!loaded) return;
    if (theme !== "system" && theme !== "light" && theme !== "dark") {
      return;
    }
    if (settings.theme !== theme) {
      setSettings({ theme });
    }
  }, [loaded, setSettings, settings.theme, theme]);

  React.useEffect(() => {
    if (!loaded) return;

    const timeout = window.setTimeout(() => {
      const supabase = createClient();
      void supabase.from("user_settings").upsert(
        {
          user_id: userId,
          theme: settings.theme,
          model_preferences: settingsToPreferences(settings),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [loaded, settings, userId]);

  return null;
}
