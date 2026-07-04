"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { defaultSettings, mergeSettings } from "@/lib/settings/defaults";
import type { AppSettings } from "@/lib/settings/types";

export type AiProvider = "OpenRouter" | "Gemini" | "DeepSeek" | "Groq";
export type CachedSettings = AppSettings;

export type CachedAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
};

export type CachedMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  language?: "en" | "my";
  translations?: Partial<Record<"en" | "my", string>>;
  attachments?: CachedAttachment[];
};

export type CachedChat = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt?: string;
  pinned?: boolean;
  messages: CachedMessage[];
};

type OfflineState = {
  chats: CachedChat[];
  selectedChatId: string | null;
  searchQuery: string;
  settings: CachedSettings;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  cacheChats: (chats: CachedChat[]) => void;
  selectChat: (chatId: string) => void;
  createLocalChat: (title?: string) => CachedChat;
  upsertChat: (chat: CachedChat) => void;
  renameChat: (chatId: string, title: string) => void;
  deleteChat: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  setSearchQuery: (query: string) => void;
  addMessage: (chatId: string, message: CachedMessage) => void;
  updateMessage: (
    chatId: string,
    messageId: string,
    updates: Partial<CachedMessage>,
  ) => void;
  setSettings: (settings: Partial<CachedSettings>) => void;
  replaceSettings: (settings: CachedSettings) => void;
  restoreDefaultSettings: () => void;
  clearAllChats: () => void;
  clearLocalCache: () => void;
};

const welcomeDate = new Date().toISOString();

function sortChats(chats: CachedChat[]) {
  return [...chats].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

function makeLocalChat(title = "New Sketchware chat"): CachedChat {
  const now = new Date().toISOString();

  return {
    id: `local-${crypto.randomUUID()}`,
    title,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    messages: [],
  };
}

function createWelcomeChat(): CachedChat {
  return {
    id: "local-welcome",
    title: "Welcome to Sketchware AI",
    createdAt: welcomeDate,
    updatedAt: welcomeDate,
    pinned: true,
    messages: [
      {
        id: "local-welcome-message",
        chatId: "local-welcome",
        role: "assistant",
        language: "en",
        translations: {
          en: "Ask about Sketchware Pro blocks, Java, Firebase, Android UI, or build errors. Cached chats remain visible offline.\n\n```java\n// Sketchware add source directly\nIntent intent = new Intent(MainActivity.this, SecondActivity.class);\nstartActivity(intent);\n```",
          my: "Sketchware Pro blocks, Java, Firebase, Android UI, build errors တွေအကြောင်း မေးနိုင်ပါတယ်။ အရင် chat တွေကို offline ဖြစ်နေရင်လည်း cache ထဲကနေ ကြည့်နိုင်ပါတယ်။\n\n```java\n// Sketchware add source directly\nIntent intent = new Intent(MainActivity.this, SecondActivity.class);\nstartActivity(intent);\n```",
        },
        content:
          "Ask about Sketchware Pro blocks, Java, Firebase, Android UI, or build errors. Cached chats remain visible offline.\n\n```java\n// Sketchware add source directly\nIntent intent = new Intent(MainActivity.this, SecondActivity.class);\nstartActivity(intent);\n```",
        createdAt: welcomeDate,
      },
    ],
  };
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      chats: [createWelcomeChat()],
      selectedChatId: "local-welcome",
      searchQuery: "",
      settings: defaultSettings,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      cacheChats: (chats) =>
        set((state) => ({
          chats: sortChats(chats),
          selectedChatId:
            state.selectedChatId ?? chats[0]?.id ?? state.selectedChatId,
        })),
      selectChat: (chatId) => set({ selectedChatId: chatId }),
      createLocalChat: (title) => {
        const chat = makeLocalChat(title);
        set((state) => ({
          chats: sortChats([chat, ...state.chats]),
          selectedChatId: chat.id,
        }));
        return chat;
      },
      upsertChat: (chat) =>
        set((state) => ({
          chats: sortChats([
            chat,
            ...state.chats.filter((existing) => existing.id !== chat.id),
          ]),
          selectedChatId: state.selectedChatId ?? chat.id,
        })),
      renameChat: (chatId, title) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, title, updatedAt: new Date().toISOString() }
              : chat,
          ),
        })),
      deleteChat: (chatId) =>
        set((state) => {
          const chats = state.chats.filter((chat) => chat.id !== chatId);
          return {
            chats,
            selectedChatId:
              state.selectedChatId === chatId
                ? chats[0]?.id ?? null
                : state.selectedChatId,
          };
        }),
      togglePinChat: (chatId) =>
        set((state) => ({
          chats: sortChats(
            state.chats.map((chat) =>
              chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat,
            ),
          ),
        })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      addMessage: (chatId, message) =>
        set((state) => ({
          chats: sortChats(
            state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    updatedAt: message.createdAt,
                    messages: [...chat.messages, message],
                  }
                : chat,
            ),
          ),
        })),
      updateMessage: (chatId, messageId, updates) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((message) =>
                    message.id === messageId
                      ? { ...message, ...updates }
                      : message,
                  ),
                }
              : chat,
          ),
        })),
      setSettings: (settings) =>
        set((state) => ({
          settings: mergeSettings({ ...state.settings, ...settings }),
        })),
      replaceSettings: (settings) => set({ settings: mergeSettings(settings) }),
      restoreDefaultSettings: () =>
        set((state) => ({
          settings: mergeSettings({
            ...defaultSettings,
            theme: state.settings.theme,
          }),
        })),
      clearAllChats: () =>
        set({
          chats: [],
          selectedChatId: null,
        }),
      clearLocalCache: () => {
        localStorage.removeItem("sketchware-ai-cache");
        set({
          chats: [createWelcomeChat()],
          selectedChatId: "local-welcome",
          searchQuery: "",
          settings: defaultSettings,
        });
      },
    }),
    {
      name: "sketchware-ai-cache",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.replaceSettings(state.settings);
          state.setHydrated(true);
        }
      },
      partialize: (state) => ({
        chats: state.chats,
        selectedChatId: state.selectedChatId,
        searchQuery: state.searchQuery,
        settings: state.settings,
      }),
    },
  ),
);

export const OFFLINE_CACHE_KEY = "sketchware-ai-cache";
