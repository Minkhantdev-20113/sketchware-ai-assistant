export type AiProvider = "OpenRouter" | "Gemini" | "DeepSeek" | "Groq";

export interface Env {
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  GROQ_API_KEY?: string;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProxyRequest = {
  provider?: AiProvider;
  model?: string;
  stream?: boolean;
  targetUrl?: string;
  messages?: ChatMessage[];
};

const ALLOWED_TARGET_URLS: Record<AiProvider, string> = {
  OpenRouter: "https://openrouter.ai/api/v1/chat/completions",
  Gemini:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  DeepSeek: "https://api.deepseek.com/chat/completions",
  Groq: "https://api.groq.com/openai/v1/chat/completions",
};

const AI_PROVIDERS = Object.keys(ALLOWED_TARGET_URLS) as AiProvider[];

function isAiProvider(value: string): value is AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function resolveApiKey(
  env: Env,
  provider: AiProvider,
  forwardedKey: string | null,
) {
  if (forwardedKey?.trim()) {
    return forwardedKey.trim();
  }

  switch (provider) {
    case "OpenRouter":
      return env.OPENROUTER_API_KEY;
    case "Gemini":
      return env.GEMINI_API_KEY;
    case "DeepSeek":
      return env.DEEPSEEK_API_KEY;
    case "Groq":
      return env.GROQ_API_KEY;
  }
}

function buildUpstreamHeaders(provider: AiProvider, apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (provider === "OpenRouter") {
    headers["HTTP-Referer"] = "https://sketchware-ai-assistant.app";
    headers["X-Title"] = "Sketchware AI Assistant";
  }

  return headers;
}

function validateRequest(payload: ProxyRequest, headerProvider: string | null) {
  const provider = payload.provider ?? headerProvider;

  if (!provider || !isAiProvider(provider)) {
    return { error: "Unsupported or missing AI provider.", status: 400 };
  }

  if (!payload.model?.trim()) {
    return { error: "Missing model.", status: 400 };
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return { error: "Missing messages.", status: 400 };
  }

  const expectedTargetUrl = ALLOWED_TARGET_URLS[provider];
  if (payload.targetUrl && payload.targetUrl !== expectedTargetUrl) {
    return {
      error: "targetUrl does not match the allowed provider endpoint.",
      status: 400,
    };
  }

  return {
    provider,
    model: payload.model.trim(),
    targetUrl: expectedTargetUrl,
    messages: payload.messages,
    stream: payload.stream !== false,
  };
}

async function handleChatRequest(request: Request, env: Env) {
  let payload: ProxyRequest;

  try {
    payload = (await request.json()) as ProxyRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON request body." }, 400);
  }

  const validated = validateRequest(
    payload,
    request.headers.get("X-AI-Provider"),
  );

  if ("error" in validated) {
    return jsonResponse({ error: validated.error }, validated.status);
  }

  const apiKey = resolveApiKey(
    env,
    validated.provider,
    request.headers.get("X-Provider-Api-Key"),
  );

  if (!apiKey) {
    return jsonResponse(
      {
        error: `Missing API key for ${validated.provider}. Set a Worker secret or send X-Provider-Api-Key.`,
      },
      401,
    );
  }

  const upstream = await fetch(validated.targetUrl, {
    method: "POST",
    headers: buildUpstreamHeaders(validated.provider, apiKey),
    body: JSON.stringify({
      model: request.headers.get("X-AI-Model") ?? validated.model,
      messages: validated.messages,
      stream: validated.stream,
    }),
  });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return new Response(
      errorText || `Upstream provider failed with status ${upstream.status}.`,
      {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") ??
            "text/plain; charset=utf-8",
        },
      },
    );
  }

  if (!upstream.body) {
    return jsonResponse({ error: "Upstream provider returned no stream." }, 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Accept, X-AI-Provider, X-AI-Model, X-Provider-Api-Key",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    try {
      return await handleChatRequest(request, env);
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown Cloudflare proxy error.",
        },
        500,
      );
    }
  },
};
