import { defaultSettings, mergeSettings } from "@/lib/settings/defaults";
import type { AppSettings, StoredPreferences } from "@/lib/settings/types";
import type { AiProvider } from "@/lib/offline-store";

export function settingsToPreferences(settings: AppSettings): StoredPreferences {
  return {
    provider: settings.aiProvider,
    model: settings.aiModel,
    responseLanguage: settings.responseLanguage,
    apiKeys: settings.apiKeys,
    customRules: settings.customRules,
    usageStats: settings.usageStats,
    colorPalette: settings.colorPalette,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    animationsEnabled: settings.animationsEnabled,
    customProxyEnabled: settings.customProxyEnabled,
    customProxyUrl: settings.customProxyUrl,
  };
}

export function preferencesToSettings(
  theme: AppSettings["theme"],
  preferences: StoredPreferences | null | undefined,
): AppSettings {
  if (!preferences || typeof preferences !== "object") {
    return mergeSettings({ theme });
  }

  const provider = (preferences.provider ??
    preferences.aiProvider ??
    defaultSettings.aiProvider) as AiProvider;

  return mergeSettings({
    theme,
    aiProvider: provider,
    aiModel: preferences.model ?? preferences.aiModel ?? defaultSettings.aiModel,
    responseLanguage:
      preferences.responseLanguage ?? defaultSettings.responseLanguage,
    apiKeys: {
      ...defaultSettings.apiKeys,
      ...(preferences.apiKeys ?? {}),
    },
    customRules: preferences.customRules ?? defaultSettings.customRules,
    usageStats: {
      ...defaultSettings.usageStats,
      ...(preferences.usageStats ?? {}),
    },
    colorPalette: preferences.colorPalette ?? defaultSettings.colorPalette,
    fontFamily: preferences.fontFamily ?? defaultSettings.fontFamily,
    fontSize: preferences.fontSize ?? defaultSettings.fontSize,
    animationsEnabled:
      preferences.animationsEnabled ?? defaultSettings.animationsEnabled,
    customProxyEnabled:
      preferences.customProxyEnabled ?? defaultSettings.customProxyEnabled,
    customProxyUrl: preferences.customProxyUrl ?? defaultSettings.customProxyUrl,
  });
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}
