"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { applyColorPalette } from "@/lib/settings/palettes";
import { getFontStack } from "@/lib/settings/fonts";
import { useOfflineStore } from "@/lib/offline-store";

export function SettingsApplier() {
  const { resolvedTheme } = useTheme();
  const settings = useOfflineStore((state) => state.settings);

  React.useEffect(() => {
    const colorScheme =
      settings.theme === "system"
        ? resolvedTheme === "dark"
          ? "dark"
          : "light"
        : settings.theme;

    applyColorPalette(
      settings.colorPalette,
      colorScheme === "dark" ? "dark" : "light",
    );
  }, [resolvedTheme, settings.colorPalette, settings.theme]);

  React.useEffect(() => {
    document.body.style.fontFamily = getFontStack(settings.fontFamily);
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontFamily, settings.fontSize]);

  React.useEffect(() => {
    document.documentElement.classList.toggle(
      "no-animations",
      !settings.animationsEnabled,
    );
  }, [settings.animationsEnabled]);

  return null;
}
