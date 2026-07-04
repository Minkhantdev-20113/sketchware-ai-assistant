import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function AuthPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_480px]">
      <section className="hidden flex-col justify-between border-r bg-secondary/50 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">
            S
          </div>
          <span className="font-semibold">Sketchware AI Assistant</span>
        </div>

        <div className="max-w-xl">
          <h1 className="text-5xl font-semibold tracking-normal">
            Android app building help, tuned for Sketchware Pro.
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Save chat history, sync settings, and keep previous solutions
            available locally for offline reference.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="font-semibold lg:hidden">Sketchware AI</div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <Suspense
            fallback={
              <div className="w-full max-w-md rounded-md border bg-card p-5 shadow-sm">
                <div className="h-7 w-40 rounded-md bg-muted" />
                <div className="mt-3 h-4 w-64 rounded-md bg-muted" />
              </div>
            }
          >
            <AuthForm isConfigured={hasSupabaseConfig()} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
