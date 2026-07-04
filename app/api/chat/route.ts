import { NextRequest } from "next/server";

import { aiModelCatalog } from "@/lib/ai-models";
import { getProviderApiKey, getProviderBaseUrl } from "@/lib/ai/providers";
import { buildSketchwareSystemPrompt } from "@/lib/ai/system-prompt";
import type { AiProvider } from "@/lib/offline-store";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  provider: AiProvider;
  model: string;
  responseLanguage: "en" | "my";
  messages: ChatMessage[];
  providerApiKey?: string;
  customRules?: string;
  customProxyEnabled?: boolean;
  customProxyUrl?: string;
};

const encoder = new TextEncoder();

function isAiProvider(value: string): value is AiProvider {
  return value in aiModelCatalog;
}

function sse(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function extractDelta(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const data = value as {
    choices?: Array<{ delta?: { content?: string }; text?: string }>;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    delta?: string;
    content?: string;
    text?: string;
  };

  return (
    data.choices?.[0]?.delta?.content ??
    data.choices?.[0]?.text ??
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    data.delta ??
    data.content ??
    data.text ??
    ""
  );
}

function parseSsePayload(line: string) {
  const value = line.replace(/^data:\s*/, "").trim();

  if (!value || value === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
}

export async function POST(request: NextRequest) {
  let payload: ChatRequest;

  try {
    payload = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const proxyUrl =
    payload.customProxyEnabled && payload.customProxyUrl?.trim()
      ? payload.customProxyUrl.trim()
      : process.env.CLOUDFLARE_AI_PROXY_URL;

  if (!proxyUrl) {
    return Response.json(
      {
        error:
          "Missing Cloudflare proxy URL. Enable a custom proxy in Settings or add CLOUDFLARE_AI_PROXY_URL to .env.local.",
      },
      { status: 500 },
    );
  }

  if (!isAiProvider(payload.provider)) {
    return Response.json({ error: "Unsupported AI provider." }, { status: 400 });
  }

  if (!aiModelCatalog[payload.provider].includes(payload.model)) {
    return Response.json({ error: "Unsupported model for provider." }, { status: 400 });
  }

  const systemPrompt = buildSketchwareSystemPrompt({
    provider: payload.provider,
    model: payload.model,
    responseLanguage: payload.responseLanguage,
    customRules: payload.customRules,
  });

  const upstreamBody = {
    provider: payload.provider,
    model: payload.model,
    stream: true,
    targetUrl: getProviderBaseUrl(payload.provider),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...payload.messages.map((message) => ({
        role: message.role,
        content:
          message.role === "user"
            ? `Sketchware Pro query: ${message.content}`
            : message.content,
      })),
    ],
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const providerApiKey =
          payload.providerApiKey?.trim() || getProviderApiKey(payload.provider);
        const upstream = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "X-AI-Provider": payload.provider,
            "X-AI-Model": payload.model,
            ...(providerApiKey ? { "X-Provider-Api-Key": providerApiKey } : {}),
          },
          body: JSON.stringify(upstreamBody),
        });

        if (!upstream.ok) {
          const errorText = await upstream.text();
          controller.enqueue(
            sse({
              type: "error",
              error:
                errorText ||
                `Cloudflare proxy request failed with status ${upstream.status}.`,
            }),
          );
          controller.close();
          return;
        }

        if (!upstream.body) {
          controller.enqueue(
            sse({ type: "error", error: "Cloudflare proxy returned no stream." }),
          );
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const parsed = parseSsePayload(line);
            if (!parsed) continue;

            const delta = extractDelta(parsed);
            if (delta) {
              controller.enqueue(sse({ type: "delta", delta }));
            }
          }
        }

        if (buffer.trim()) {
          const parsed = parseSsePayload(buffer);
          const delta = extractDelta(parsed);
          if (delta) {
            controller.enqueue(sse({ type: "delta", delta }));
          }
        }

        controller.enqueue(sse({ type: "done" }));
        controller.close();
      } catch (error) {
        controller.enqueue(
          sse({
            type: "error",
            error:
              error instanceof Error
                ? error.message
                : "Unknown AI streaming error.",
          }),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
