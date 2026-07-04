"use client";

import { Paperclip, Send, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { CachedAttachment } from "@/lib/offline-store";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  isSending: boolean;
  onSend: (content: string, attachments: CachedAttachment[]) => void;
};

export function ChatInput({ isSending, onSend }: ChatInputProps) {
  const [prompt, setPrompt] = React.useState("");
  const [attachments, setAttachments] = React.useState<CachedAttachment[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [prompt]);

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      createdAt: new Date().toISOString(),
    }));

    setAttachments((current) => [...current, ...files]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();

    if (!content && attachments.length === 0) {
      return;
    }

    onSend(content, attachments);
    setPrompt("");
    setAttachments([]);
  }

  return (
    <form
      className={cn(
        "mx-auto max-w-4xl rounded-md border bg-card p-2 shadow-sm transition-colors",
        isDragging && "border-primary bg-secondary/60",
      )}
      onSubmit={handleSubmit}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file) => (
            <span
              key={file.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((item) => item.id !== file.id),
                  )
                }
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              addFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach files"
          title="Attach files"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <textarea
          ref={textareaRef}
          className="min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Ask about Sketchware blocks, Java, Firebase, or Android errors..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.stopPropagation();
            }
          }}
          rows={1}
        />
        <Button
          size="icon"
          aria-label="Send message"
          disabled={isSending || (!prompt.trim() && attachments.length === 0)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
