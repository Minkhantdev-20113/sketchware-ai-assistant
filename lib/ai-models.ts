import type { AiProvider } from "@/lib/offline-store";

export const aiModelCatalog: Record<AiProvider, string[]> = {
  OpenRouter: [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "deepseek/deepseek-r1:free",
  ],
  Gemini: [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp",
  ],
  DeepSeek: [
    "deepseek-chat",
    "deepseek-reasoner",
  ],
  Groq: [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "gemma2-9b-it",
  ],
};

export const aiProviders = Object.keys(aiModelCatalog) as AiProvider[];
