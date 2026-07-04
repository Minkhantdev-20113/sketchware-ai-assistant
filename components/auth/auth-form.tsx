"use client";

import { Code2, Loader2, Mail } from "lucide-react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  isConfigured: boolean;
};

export function AuthForm({ isConfigured }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<AuthMode>("sign-in");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const nextPath = searchParams.get("next") || "/chat";

  async function ensureUserRows(userId: string, displayName: string) {
    const supabase = createClient();

    await supabase.from("profiles").upsert({
      id: userId,
      username: displayName,
      updated_at: new Date().toISOString(),
    });

    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        theme: "system",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setMessage("Add Supabase environment variables before signing in.");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setMessage("Passwords must match.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          await ensureUserRows(data.user.id, username || email.split("@")[0]);
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const displayName = username.trim() || email.split("@")[0];
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: displayName,
            full_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.session && data.user) {
        await ensureUserRows(data.user.id, displayName);
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setMessage("Check your email to confirm your account, then sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (!isConfigured) {
      setMessage("Add Supabase environment variables before using OAuth.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "OAuth sign in failed.");
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in to sync Sketchware Pro chats, messages, and settings.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={handleEmailAuth}>
        {mode === "sign-up" ? (
          <label className="grid gap-2 text-sm font-medium" htmlFor="username">
            Username
            <input
              id="username"
              className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Sketchware builder"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium" htmlFor="email">
          Email
          <input
            id="email"
            className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={6}
        />

        {mode === "sign-up" ? (
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            minLength={6}
          />
        ) : null}

        <Button disabled={isLoading || !isConfigured} type="submit">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {mode === "sign-in" ? "Sign in with email" : "Sign up with email"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OAuth
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading || !isConfigured}
          onClick={() => handleOAuth("google")}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            G
          </span>
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isLoading || !isConfigured}
          onClick={() => handleOAuth("github")}
        >
          <Code2 className="h-4 w-4" />
          GitHub
        </Button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          {message}
        </p>
      ) : null}

      {!isConfigured ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Supabase is not configured. Copy `.env.example` to `.env.local` and add your project URL and anon key.
        </p>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="mt-4 w-full"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setMessage("");
        }}
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </Button>
    </div>
  );
}
