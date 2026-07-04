import { redirect } from "next/navigation";

import { ChatShell } from "@/components/chat/chat-shell";
import { getDisplayName } from "@/lib/avatar";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CachedChat, CachedMessage } from "@/lib/offline-store";

export default async function ChatPage() {
  if (!hasSupabaseConfig()) {
    redirect("/auth");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/chat");
  }

  const displayName = getDisplayName(
    user.user_metadata?.username || user.user_metadata?.full_name,
    user.email,
  );

  await supabase.from("profiles").upsert({
    id: user.id,
    username: displayName,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      theme: "system",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const { data: chatRows } = await supabase
    .from("chats")
    .select("id,title,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const chatIds = chatRows?.map((chat) => chat.id) ?? [];

  const { data: messageRows } =
    chatIds.length > 0
      ? await supabase
          .from("messages")
          .select("id,chat_id,role,content,created_at")
          .in("chat_id", chatIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const messagesByChat = new Map<string, CachedMessage[]>();

  for (const message of messageRows ?? []) {
    const cachedMessage: CachedMessage = {
      id: message.id,
      chatId: message.chat_id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    };

    messagesByChat.set(message.chat_id, [
      ...(messagesByChat.get(message.chat_id) ?? []),
      cachedMessage,
    ]);
  }

  const initialChats: CachedChat[] =
    chatRows?.map((chat) => ({
      id: chat.id,
      title: chat.title,
      updatedAt: chat.updated_at,
      messages: messagesByChat.get(chat.id) ?? [],
    })) ?? [];

  return (
    <ChatShell
      user={{
        id: user.id,
        email: user.email,
        username: displayName,
      }}
      initialChats={initialChats}
    />
  );
}
