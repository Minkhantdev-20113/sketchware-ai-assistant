"use client";

import { Cpu } from "lucide-react";

import { aiModelCatalog, aiProviders } from "@/lib/ai-models";
import type { AiProvider } from "@/lib/offline-store";
import { useOfflineStore } from "@/lib/offline-store";

export function ModelPicker() {
  const { settings, setSettings } = useOfflineStore();

  function handleProviderChange(provider: AiProvider) {
    setSettings({
      aiProvider: provider,
      aiModel: aiModelCatalog[provider][0],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1 text-sm shadow-sm">
      <Cpu className="h-4 w-4 text-primary" />
      <select
        className="h-9 bg-transparent text-sm outline-none"
        value={settings.aiProvider}
        onChange={(event) => handleProviderChange(event.target.value as AiProvider)}
        aria-label="AI provider"
      >
        {aiProviders.map((provider) => (
          <option key={provider} value={provider}>
            {provider}
          </option>
        ))}
      </select>
      <select
        className="h-9 max-w-[220px] bg-transparent text-sm outline-none"
        value={settings.aiModel}
        onChange={(event) => setSettings({ aiModel: event.target.value })}
        aria-label="AI model"
      >
        {aiModelCatalog[settings.aiProvider].map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
      <select
        className="h-9 bg-transparent text-sm outline-none"
        value={settings.responseLanguage}
        onChange={(event) =>
          setSettings({ responseLanguage: event.target.value as "en" | "my" })
        }
        aria-label="Response language"
      >
        <option value="en">English</option>
        <option value="my">Myanmar</option>
      </select>
    </div>
  );
}
