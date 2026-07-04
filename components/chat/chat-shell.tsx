"use client";

import {
  Code2,
  Edit3,
  Menu,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageList } from "@/components/chat/message-list";
import { ModelPicker } from "@/components/chat/model-picker";
import { SettingsSync } from "@/components/settings-sync";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import { getDisplayName } from "@/lib/avatar";
import type { CachedAttachment, CachedChat } from "@/lib/offline-store";
import { useOfflineStore } from "@/lib/offline-store";
import { estimateTokens } from "@/lib/settings/sync";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ChatShellProps = {
  user: {
    id: string;
    email?: string | null;
    username?: string | null;
  };
  initialChats: CachedChat[];
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatShell({ user, initialChats }: ChatShellProps) {
  const displayName = getDisplayName(user.username, user.email);
  const {
    chats,
    cacheChats,
    hydrated,
    selectedChatId,
    searchQuery,
    settings,
    addMessage,
    createLocalChat,
    deleteChat,
    renameChat,
    selectChat,
    setSearchQuery,
    togglePinChat,
    updateMessage,
    upsertChat,
    setSettings,
  } = useOfflineStore();
  const [isSending, setIsSending] = React.useState(false);
  const visibleChats = hydrated && chats.length > 0 ? chats : initialChats;
  const activeChat =
    visibleChats.find((chat) => chat.id === selectedChatId) ??
    visibleChats[0] ??
    null;
  const filteredChats = visibleChats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  React.useEffect(() => {
    if (initialChats.length > 0) {
      cacheChats(initialChats);
    }
  }, [cacheChats, initialChats]);

  React.useEffect(() => {
    if (!selectedChatId && visibleChats[0]) {
      selectChat(visibleChats[0].id);
    }
  }, [selectChat, selectedChatId, visibleChats]);

  async function handleCreateChat() {
    const localChat = createLocalChat();

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("chats")
        .insert({
          title: localChat.title,
          user_id: user.id,
          created_at: localChat.createdAt,
          updated_at: localChat.updatedAt,
        })
        .select("id,title,created_at,updated_at")
        .single();

      if (error) throw error;

      upsertChat({
        id: data.id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: [],
      });
      selectChat(data.id);
    } catch {
      selectChat(localChat.id);
    }
  }

  async function handleSendMessage(
    content: string,
    attachments: CachedAttachment[],
  ) {
    if (!activeChat || isSending) return;

    setIsSending(true);

    const now = new Date().toISOString();
    let chatForMessage = activeChat;
    let chatId = activeChat.id;
    const userMessage = {
      id: `local-${crypto.randomUUID()}`,
      chatId,
      role: "user" as const,
      content,
      attachments,
      createdAt: now,
    };
    const assistantMessage = {
      id: `local-${crypto.randomUUID()}`,
      chatId,
      role: "assistant" as const,
      content: "",
      language: settings.responseLanguage,
      createdAt: new Date(Date.now() + 500).toISOString(),
    };

    try {
      const supabase = createClient();

      if (activeChat.id.startsWith("local-")) {
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .insert({
            title: content.slice(0, 42) || activeChat.title,
            user_id: user.id,
            updated_at: now,
          })
          .select("id,title,created_at,updated_at")
          .single();

        if (chatError) throw chatError;
        chatId = chat.id;
        chatForMessage = {
          ...activeChat,
          id: chat.id,
          title: chat.title,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
        };
        deleteChat(activeChat.id);
        upsertChat(chatForMessage);
        selectChat(chat.id);
      }

      const syncedUserMessage = { ...userMessage, chatId };
      const syncedAssistantMessage = { ...assistantMessage, chatId };

      addMessage(chatId, syncedUserMessage);
      addMessage(chatId, syncedAssistantMessage);

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          user_id: user.id,
          role: "user",
          content,
          created_at: now,
        })
        .select("id,chat_id,role,content,created_at")
        .single();

      if (userMessageError) throw userMessageError;

      updateMessage(chatId, userMessage.id, {
        id: savedUserMessage.id,
        chatId: savedUserMessage.chat_id,
        role: savedUserMessage.role,
        content: savedUserMessage.content,
        createdAt: savedUserMessage.created_at,
        attachments,
      });

      const requestMessages = [
        ...chatForMessage.messages.slice(-12).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user" as const,
          content:
            attachments.length > 0
              ? `${content}\n\nAttached files: ${attachments.map((file) => file.name).join(", ")}`
              : content,
        },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.aiProvider,
          model: settings.aiModel,
          responseLanguage: settings.responseLanguage,
          providerApiKey: settings.apiKeys[settings.aiProvider],
          customRules: settings.customRules,
          customProxyEnabled: settings.customProxyEnabled,
          customProxyUrl: settings.customProxyUrl,
          messages: requestMessages,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "AI stream failed to start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event
            .split(/\r?\n/)
            .find((item) => item.startsWith("data:"));
          if (!line) continue;

          const payload = JSON.parse(line.replace(/^data:\s*/, ""));

          if (payload.type === "delta") {
            assistantContent += payload.delta;
            updateMessage(chatId, assistantMessage.id, {
              content: assistantContent,
            });
          }

          if (payload.type === "error") {
            throw new Error(payload.error);
          }
        }
      }

      const finalContent =
        assistantContent ||
        "The AI provider returned an empty response through the Cloudflare proxy.";

      updateMessage(chatId, assistantMessage.id, {
        content: finalContent,
      });

      const { data: savedAssistantMessage, error: assistantMessageError } =
        await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            user_id: user.id,
            role: "assistant",
            content: finalContent,
            created_at: assistantMessage.createdAt,
          })
          .select("id,chat_id,role,content,created_at")
          .single();

      if (assistantMessageError) throw assistantMessageError;

      updateMessage(chatId, assistantMessage.id, {
        id: savedAssistantMessage.id,
        chatId: savedAssistantMessage.chat_id,
        role: savedAssistantMessage.role,
        content: savedAssistantMessage.content,
        createdAt: savedAssistantMessage.created_at,
      });

      const promptText = requestMessages.map((message) => message.content).join("\n");
      setSettings({
        usageStats: {
          totalRequests: settings.usageStats.totalRequests + 1,
          estimatedPromptTokens:
            settings.usageStats.estimatedPromptTokens +
            estimateTokens(promptText),
          estimatedCompletionTokens:
            settings.usageStats.estimatedCompletionTokens +
            estimateTokens(finalContent),
          lastRequestAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The AI request failed. Check your Cloudflare proxy and provider settings.";

      if (chatId) {
        updateMessage(chatId, assistantMessage.id, {
          content: `AI request failed.\n\n${message}`,
        });
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteChat(chatId: string) {
    deleteChat(chatId);
    if (!chatId.startsWith("local-")) {
      const supabase = createClient();
      await supabase.from("chats").delete().eq("id", chatId).eq("user_id", user.id);
    }
  }

  async function handleRenameChat(chat: CachedChat) {
    const title = window.prompt("Rename chat", chat.title)?.trim();
    if (!title) return;

    renameChat(chat.id, title);
    if (!chat.id.startsWith("local-")) {
      const supabase = createClient();
      await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", chat.id)
        .eq("user_id", user.id);
    }
  }

  function SidebarContent() {
    return (
      <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Code2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Sketchware AI</p>
            <p className="truncate text-xs text-muted-foreground">
              {settings.aiProvider} / {settings.aiModel}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <Button className="w-full justify-start" size="sm" onClick={handleCreateChat}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats"
            />
          </label>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group rounded-md",
                activeChat?.id === chat.id && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                onClick={() => selectChat(chat.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{chat.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatTimestamp(chat.updatedAt)}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1 px-2 pb-2 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => togglePinChat(chat.id)}
                  aria-label={chat.pinned ? "Unpin chat" : "Pin chat"}
                  title={chat.pinned ? "Unpin chat" : "Pin chat"}
                >
                  {chat.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRenameChat(chat)}
                  aria-label="Rename chat"
                  title="Rename chat"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDeleteChat(chat.id)}
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t p-4">
          <UserAvatar name={displayName} email={user.email} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <main className="flex min-h-screen bg-background">
      <SettingsSync userId={user.id} />
      <div className="hidden w-80 shrink-0 border-r lg:block">
        <SidebarContent />
      </div>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open chat history"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-base font-semibold md:text-lg">
                {activeChat?.title ?? "Sketchware Pro Assistant"}
              </h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                User messages right, AI responses left, Java blocks ready for Sketchware
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ModelPicker />
            <Button asChild variant="ghost" size="icon" aria-label="Open settings">
              <Link href="/settings" title="Settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              {activeChat ? (
                <MessageList chatId={activeChat.id} messages={activeChat.messages} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div>
                    <h2 className="text-2xl font-semibold">No chats yet</h2>
                    <Button className="mt-4" onClick={handleCreateChat}>
                      <Plus className="h-4 w-4" />
                      New chat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t bg-background px-4 py-4 md:px-6">
            <ChatInput isSending={isSending} onSend={handleSendMessage} />
          </div>
        </div>
      </section>
    </main>
  );
}
