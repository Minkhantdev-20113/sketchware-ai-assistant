"use client";

import { Check, Clipboard, Languages, Paperclip } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import type { CachedMessage } from "@/lib/offline-store";
import { useOfflineStore } from "@/lib/offline-store";
import { cn } from "@/lib/utils";

type MessageListProps = {
  chatId: string;
  messages: CachedMessage[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function translateFallback(content: string, target: "en" | "my") {
  if (target === "en") {
    return content.replace(
      "\n\nမြန်မာဘာသာပြန်ချက် မရှိသေးပါ။",
      "",
    );
  }

  return `${content}\n\nမြန်မာဘာသာပြန်ချက် မရှိသေးပါ။`;
}

function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const normalizedLanguage =
    language === "sketchware" || language === "java" ? "java" : language || "text";
  const isJava = normalizedLanguage === "java";

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-3 overflow-hidden rounded-md border bg-background">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {isJava ? "Java / Sketchware" : normalizedLanguage}
          </span>
          {isJava ? (
            <span className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
              Sketchware add source directly
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          Copy Code
        </Button>
      </div>
      <SyntaxHighlighter
        language={normalizedLanguage}
        style={oneLight}
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.875rem",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          const value = String(children).replace(/\n$/, "");

          if (match) {
            return <CodeBlock language={match[1]} value={value} />;
          }

          return (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-sm"
              {...rest}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc pl-5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal pl-5">{children}</ol>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function MessageList({ chatId, messages }: MessageListProps) {
  const updateMessage = useOfflineStore((state) => state.updateMessage);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold">Start a Sketchware chat</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Send a prompt, attach source files, or ask for Java and block logic
            help. Enter creates a new line; the send button submits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const displayLanguage = message.language ?? "en";
        const displayContent =
          message.translations?.[displayLanguage] ?? message.content;

        return (
          <article
            key={message.id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-md border px-4 py-3 text-sm leading-6 shadow-sm md:max-w-[76%]",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground",
              )}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownMessage content={displayContent} />
              )}

              {message.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((file) => (
                    <span
                      key={file.id}
                      className={cn(
                        "inline-flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-xs",
                        isUser
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div
                className={cn(
                  "mt-3 flex flex-wrap items-center gap-2 text-xs",
                  isUser ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                <span>{formatTime(message.createdAt)}</span>
                {!isUser ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      const nextLanguage = displayLanguage === "en" ? "my" : "en";
                      updateMessage(chatId, message.id, {
                        language: nextLanguage,
                        translations: {
                          ...message.translations,
                          [nextLanguage]:
                            message.translations?.[nextLanguage] ??
                            translateFallback(message.content, nextLanguage),
                        },
                      });
                    }}
                  >
                    <Languages className="h-3.5 w-3.5" />
                    Translate {displayLanguage === "en" ? "Myanmar" : "English"}
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
