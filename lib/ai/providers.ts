import type { AiProvider } from "@/lib/offline-store";

export function getProviderApiKey(provider: AiProvider) {
  switch (provider) {
    case "OpenRouter":
      return process.env.OPENROUTER_API_KEY;
    case "Gemini":
      return process.env.GEMINI_API_KEY;
    case "DeepSeek":
      return process.env.DEEPSEEK_API_KEY;
    case "Groq":
      return process.env.GROQ_API_KEY;
  }
}

export function getProviderBaseUrl(provider: AiProvider) {
  switch (provider) {
    case "OpenRouter":
      return "https://openrouter.ai/api/v1/chat/completions";
    case "Gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "DeepSeek":
      return "https://api.deepseek.com/chat/completions";
    case "Groq":
      return "https://api.groq.com/openai/v1/chat/completions";
  }
}
