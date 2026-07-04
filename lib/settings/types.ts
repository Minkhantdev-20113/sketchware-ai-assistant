import type { AiProvider } from "@/lib/offline-store";

export type ColorPaletteId =
  | "sketchware-blue"
  | "ocean-teal"
  | "emerald-green"
  | "sunset-orange"
  | "royal-purple"
  | "rose-pink"
  | "slate-minimal"
  | "amber-gold"
  | "crimson-red"
  | "indigo-night";

export type FontFamilyId =
  | "system-ui"
  | "inter"
  | "roboto"
  | "segoe-ui"
  | "fira-code"
  | "jetbrains-mono"
  | "source-code-pro"
  | "cascadia-code"
  | "android-studio";

export type UsageStats = {
  totalRequests: number;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  lastRequestAt: string | null;
};

export type ProviderApiKeys = Record<AiProvider, string>;

export type AppSettings = {
  theme: "system" | "light" | "dark";
  aiProvider: AiProvider;
  aiModel: string;
  responseLanguage: "en" | "my";
  apiKeys: ProviderApiKeys;
  customRules: string;
  usageStats: UsageStats;
  colorPalette: ColorPaletteId;
  fontFamily: FontFamilyId;
  fontSize: number;
  animationsEnabled: boolean;
  customProxyEnabled: boolean;
  customProxyUrl: string;
};

export type StoredPreferences = Partial<
  Omit<AppSettings, "apiKeys" | "usageStats"> & {
    provider?: AiProvider;
    model?: string;
    aiProvider?: AiProvider;
    aiModel?: string;
    apiKeys?: Partial<ProviderApiKeys>;
    usageStats?: Partial<UsageStats>;
  }
>;
