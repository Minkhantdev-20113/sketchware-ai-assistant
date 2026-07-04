"use client";

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  Database,
  Globe,
  Palette,
  RotateCcw,
  ScrollText,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { aiModelCatalog, aiProviders } from "@/lib/ai-models";
import type { AiProvider } from "@/lib/offline-store";
import { useOfflineStore } from "@/lib/offline-store";
import { colorPalettes } from "@/lib/settings/palettes";
import { fontOptions } from "@/lib/settings/fonts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SettingsTab =
  | "account"
  | "activity"
  | "ai"
  | "rules"
  | "usage"
  | "ui"
  | "network"
  | "cache";

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
  { id: "ai", label: "AI Providers", icon: <Brain className="h-4 w-4" /> },
  { id: "rules", label: "Custom Rules", icon: <ScrollText className="h-4 w-4" /> },
  { id: "usage", label: "Usage", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "ui", label: "UI", icon: <Palette className="h-4 w-4" /> },
  { id: "network", label: "Network", icon: <Globe className="h-4 w-4" /> },
  { id: "cache", label: "Cache", icon: <Database className="h-4 w-4" /> },
];

type SettingsDashboardProps = {
  user: {
    id: string;
    email?: string | null;
    username?: string | null;
  };
};

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-foreground"
    >
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2",
        props.className,
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2",
        props.className,
      )}
    />
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsDashboard({ user }: SettingsDashboardProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const {
    chats,
    settings,
    setSettings,
    restoreDefaultSettings,
    clearAllChats,
    clearLocalCache,
  } = useOfflineStore();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("account");
  const [username, setUsername] = React.useState(user.username ?? "");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  function notify(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 3500);
  }

  async function handleSaveProfile() {
    const trimmed = username.trim();
    if (!trimmed) {
      notify("Username cannot be empty.");
      return;
    }

    setIsBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: trimmed,
      updated_at: new Date().toISOString(),
    });
    setIsBusy(false);

    if (error) {
      notify(error.message);
      return;
    }

    notify("Profile updated.");
  }

  async function handleLogout() {
    setIsBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Delete your account and all chats permanently? This cannot be undone.",
    );
    if (!confirmed) return;

    setIsBusy(true);
    const supabase = createClient();

    await supabase.from("messages").delete().eq("user_id", user.id);
    await supabase.from("chats").delete().eq("user_id", user.id);
    await supabase.from("user_settings").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);

    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      await supabase.auth.signOut();
      clearLocalCache();
      setIsBusy(false);
      notify("Account data deleted. Sign-in record may remain until auth cleanup.");
      router.replace("/auth");
      return;
    }

    clearLocalCache();
    setIsBusy(false);
    router.replace("/auth");
  }

  async function handleClearAllChats() {
    const confirmed = window.confirm("Clear all chats from cloud and local cache?");
    if (!confirmed) return;

    setIsBusy(true);
    const supabase = createClient();
    await supabase.from("messages").delete().eq("user_id", user.id);
    await supabase.from("chats").delete().eq("user_id", user.id);
    clearAllChats();
    setIsBusy(false);
    notify("All chats cleared.");
  }

  function handleExportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        username,
      },
      settings,
      chats,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sketchware-ai-export-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Export downloaded.");
  }

  function handleRestoreDefaults() {
    const confirmed = window.confirm(
      "Restore all settings to defaults? Theme mode will stay as-is.",
    );
    if (!confirmed) return;

    restoreDefaultSettings();
    notify("Settings restored to defaults.");
  }

  function handleClearCache() {
    const confirmed = window.confirm(
      "Clear local IndexedDB/Zustand cache? Cloud data stays intact.",
    );
    if (!confirmed) return;

    clearLocalCache();
    notify("Local cache cleared.");
    router.refresh();
  }

  function handleProviderChange(provider: AiProvider) {
    setSettings({
      aiProvider: provider,
      aiModel: aiModelCatalog[provider][0],
    });
  }

  const totalTokens =
    settings.usageStats.estimatedPromptTokens +
    settings.usageStats.estimatedCompletionTokens;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to chat">
              <Link href="/chat">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage account, AI, UI, and cache preferences
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_minmax(0,1fr)] md:px-6">
        <aside className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full justify-start"
            onClick={handleRestoreDefaults}
          >
            <RotateCcw className="h-4 w-4" />
            Restore Defaults
          </Button>
        </aside>

        <div className="space-y-4">
          {statusMessage ? (
            <div className="rounded-md border border-primary/30 bg-secondary px-4 py-3 text-sm text-secondary-foreground">
              {statusMessage}
            </div>
          ) : null}

          {activeTab === "account" ? (
            <SectionCard
              title="User Account Management"
              description="Update your profile or sign out of Sketchware AI."
            >
              <div className="flex items-center gap-4">
                <UserAvatar name={username || user.email} email={user.email} />
                <div>
                  <p className="font-medium">{username || "Sketchware user"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <FieldLabel htmlFor="username">Profile username</FieldLabel>
                  <TextInput
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <TextInput id="email" value={user.email ?? ""} disabled />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isBusy}
                >
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isBusy}
                >
                  Logout
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isBusy}
                >
                  Delete account
                </Button>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "activity" ? (
            <SectionCard
              title="Activity Management"
              description="Manage chat history and export your local/cloud data."
            >
              <p className="text-sm text-muted-foreground">
                You currently have {chats.length} cached chat
                {chats.length === 1 ? "" : "s"}.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleClearAllChats}
                  disabled={isBusy}
                >
                  Clear all chats
                </Button>
                <Button type="button" variant="outline" onClick={handleExportData}>
                  Export data
                </Button>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "ai" ? (
            <SectionCard
              title="AI Provider & Models Management"
              description="Choose providers/models and store your own API keys."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="ai-provider">Provider</FieldLabel>
                  <select
                    id="ai-provider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                    value={settings.aiProvider}
                    onChange={(event) =>
                      handleProviderChange(event.target.value as AiProvider)
                    }
                  >
                    {aiProviders.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="ai-model">Model</FieldLabel>
                  <select
                    id="ai-model"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                    value={settings.aiModel}
                    onChange={(event) =>
                      setSettings({ aiModel: event.target.value })
                    }
                  >
                    {aiModelCatalog[settings.aiProvider].map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="response-language">Response language</FieldLabel>
                  <select
                    id="response-language"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                    value={settings.responseLanguage}
                    onChange={(event) =>
                      setSettings({
                        responseLanguage: event.target.value as "en" | "my",
                      })
                    }
                  >
                    <option value="en">English</option>
                    <option value="my">Myanmar</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {aiProviders.map((provider) => (
                  <div key={provider}>
                    <FieldLabel htmlFor={`api-key-${provider}`}>
                      {provider} API key
                    </FieldLabel>
                    <TextInput
                      id={`api-key-${provider}`}
                      type="password"
                      value={settings.apiKeys[provider]}
                      onChange={(event) =>
                        setSettings({
                          apiKeys: {
                            ...settings.apiKeys,
                            [provider]: event.target.value,
                          },
                        })
                      }
                      placeholder={`Optional ${provider} key`}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "rules" ? (
            <SectionCard
              title="Custom Context / Rules"
              description="These rules are appended to every AI system prompt."
            >
              <TextArea
                value={settings.customRules}
                onChange={(event) =>
                  setSettings({ customRules: event.target.value })
                }
                placeholder="Example: Always mention Sketchware More Block steps. Prefer Firebase Realtime Database over Firestore."
              />
            </SectionCard>
          ) : null}

          {activeTab === "usage" ? (
            <SectionCard
              title="AI Usage Dashboard"
              description="Estimated token usage tracked locally and synced to Supabase."
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border bg-background p-4">
                  <p className="text-xs uppercase text-muted-foreground">Requests</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {settings.usageStats.totalRequests}
                  </p>
                </div>
                <div className="rounded-md border bg-background p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Prompt tokens
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {settings.usageStats.estimatedPromptTokens}
                  </p>
                </div>
                <div className="rounded-md border bg-background p-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Completion tokens
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {settings.usageStats.estimatedCompletionTokens}
                  </p>
                </div>
                <div className="rounded-md border bg-background p-4">
                  <p className="text-xs uppercase text-muted-foreground">Total</p>
                  <p className="mt-2 text-2xl font-semibold">{totalTokens}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Last request:{" "}
                {settings.usageStats.lastRequestAt
                  ? new Date(settings.usageStats.lastRequestAt).toLocaleString()
                  : "No AI requests yet"}
              </p>
            </SectionCard>
          ) : null}

          {activeTab === "ui" ? (
            <SectionCard
              title="UI Customization"
              description="Personalize colors, fonts, size, and motion."
            >
              <div>
                <FieldLabel>Color palette</FieldLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {colorPalettes.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setSettings({ colorPalette: palette.id })}
                      className={cn(
                        "rounded-md border p-3 text-left text-sm transition-colors",
                        settings.colorPalette === palette.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "hover:bg-accent",
                      )}
                    >
                      <span
                        className="mb-2 block h-8 rounded-md"
                        style={{
                          background: `hsl(${palette.light["--primary"]})`,
                        }}
                      />
                      {palette.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="font-family">Font family</FieldLabel>
                  <select
                    id="font-family"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                    value={settings.fontFamily}
                    onChange={(event) =>
                      setSettings({
                        fontFamily: event.target.value as typeof settings.fontFamily,
                      })
                    }
                  >
                    {fontOptions.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="theme-mode">Theme mode</FieldLabel>
                  <select
                    id="theme-mode"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
                    value={settings.theme}
                    onChange={(event) => {
                      const nextTheme = event.target.value as
                        | "system"
                        | "light"
                        | "dark";
                      setSettings({ theme: nextTheme });
                      setTheme(nextTheme);
                    }}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <FieldLabel htmlFor="font-size">
                  Font size: {settings.fontSize}px
                </FieldLabel>
                <input
                  id="font-size"
                  type="range"
                  min={13}
                  max={22}
                  step={1}
                  value={settings.fontSize}
                  onChange={(event) =>
                    setSettings({ fontSize: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <label className="mt-6 flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={settings.animationsEnabled}
                  onChange={(event) =>
                    setSettings({ animationsEnabled: event.target.checked })
                  }
                />
                Enable animations and transitions
              </label>
            </SectionCard>
          ) : null}

          {activeTab === "network" ? (
            <SectionCard
              title="Network Proxy Control"
              description="Use your own Cloudflare proxy URL instead of the server default."
            >
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={settings.customProxyEnabled}
                  onChange={(event) =>
                    setSettings({ customProxyEnabled: event.target.checked })
                  }
                />
                Enable custom Cloudflare proxy
              </label>
              <div className="mt-4">
                <FieldLabel htmlFor="custom-proxy-url">Proxy URL</FieldLabel>
                <TextInput
                  id="custom-proxy-url"
                  value={settings.customProxyUrl}
                  onChange={(event) =>
                    setSettings({ customProxyUrl: event.target.value })
                  }
                  placeholder="https://your-worker.workers.dev"
                  disabled={!settings.customProxyEnabled}
                />
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "cache" ? (
            <SectionCard
              title="Cache Management"
              description="Clear the local Zustand/IndexedDB cache stored in your browser."
            >
              <p className="text-sm text-muted-foreground">
                This removes offline chat cache and local settings snapshots. Cloud
                data in Supabase is not deleted unless you use Activity actions.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-6"
                onClick={handleClearCache}
              >
                Clear local cache
              </Button>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </main>
  );
}
