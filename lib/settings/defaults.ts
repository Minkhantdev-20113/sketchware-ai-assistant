import { aiModelCatalog } from "@/lib/ai-models";
import type { AppSettings } from "@/lib/settings/types";

export const defaultSettings: AppSettings = {
  theme: "system",
  aiProvider: "OpenRouter",
  aiModel: aiModelCatalog.OpenRouter[0],
  responseLanguage: "en",
  apiKeys: {
    OpenRouter: "",
    Gemini: "",
    DeepSeek: "",
    Groq: "",
  },
  customRules: "",
  usageStats: {
    totalRequests: 0,
    estimatedPromptTokens: 0,
    estimatedCompletionTokens: 0,
    lastRequestAt: null,
  },
  colorPalette: "sketchware-blue",
  fontFamily: "system-ui",
  fontSize: 16,
  animationsEnabled: true,
  customProxyEnabled: false,
  customProxyUrl: "",
};

export function mergeSettings(partial?: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...partial,
    apiKeys: {
      ...defaultSettings.apiKeys,
      ...partial?.apiKeys,
    },
    usageStats: {
      ...defaultSettings.usageStats,
      ...partial?.usageStats,
    },
  };
}
