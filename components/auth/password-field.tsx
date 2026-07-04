"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function PasswordField({
  className,
  id,
  label,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const inputId = id ?? "password";

  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={inputId}>
      {label}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(
            "h-11 w-full rounded-md border bg-background px-3 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25",
            className,
          )}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </label>
  );
}
