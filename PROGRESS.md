# Project Progress

This file is the source of truth for the current project state. Update it at the end of every successful major task or phase.

## Project Overview & Tech Stack

- Project name: Sketchware AI Assistant
- Purpose: Build and maintain a professional AI chat assistant tailored for Sketchware Pro Android developers.
- Current status: Phase 5 settings dashboard complete with Supabase + local cache sync for account, activity, AI keys, custom rules, usage, UI, network proxy, restore defaults, and cache management.
- Current stack:
  - Next.js 16 App Router
  - React 19
  - TypeScript
  - Tailwind CSS 4
  - shadcn/ui-style component setup
  - Radix UI primitives
  - next-themes for system/manual light and dark mode
  - lucide-react icons
  - Supabase Auth and Database via `@supabase/ssr` and `@supabase/supabase-js`
  - Zustand persist for offline chat/settings cache and chat state management
  - React Markdown with GFM support
  - React Syntax Highlighter for Java/Sketchware-optimized code blocks
  - Cloudflare Worker proxy for regional AI provider access
- Planned services:
  - Supabase Storage for file attachments
  - Real per-message translation API for the translate toggle

## Current Folder Structure

```text
C:\Sketchware Ai Assistant
|-- app
|   |-- api
|   |   `-- chat
|   |       `-- route.ts
|   |-- auth
|   |   |-- callback
|   |   |   `-- route.ts
|   |   `-- page.tsx
|   |-- chat
|   |   `-- page.tsx
|   |-- settings
|   |   `-- page.tsx
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- cloudflare
|   `-- ai-proxy
|       |-- src
|       |   `-- index.ts
|       |-- package.json
|       |-- tsconfig.json
|       `-- wrangler.toml
|-- components
|   |-- auth
|   |   |-- auth-form.tsx
|   |   |-- password-field.tsx
|   |   `-- sign-out-button.tsx
|   |-- chat
|   |   |-- chat-input.tsx
|   |   |-- chat-shell.tsx
|   |   |-- message-list.tsx
|   |   `-- model-picker.tsx
|   |-- settings
|   |   |-- settings-applier.tsx
|   |   `-- settings-dashboard.tsx
|   |-- settings-sync.tsx
|   |-- theme-provider.tsx
|   |-- theme-toggle.tsx
|   |-- ui
|   |   |-- button.tsx
|   |   `-- sheet.tsx
|   `-- user-avatar.tsx
|-- lib
|   |-- ai
|   |   |-- providers.ts
|   |   `-- system-prompt.ts
|   |-- settings
|   |   |-- defaults.ts
|   |   |-- fonts.ts
|   |   |-- palettes.ts
|   |   |-- sync.ts
|   |   `-- types.ts
|   |-- ai-models.ts
|   |-- avatar.ts
|   |-- offline-store.ts
|   |-- supabase
|   |   |-- client.ts
|   |   |-- config.ts
|   |   |-- database.types.ts
|   |   `-- server.ts
|   `-- utils.ts
|-- supabase
|   `-- schema.sql
|-- .env.example
|-- .gitignore
|-- components.json
|-- next-env.d.ts
|-- next.config.ts
|-- package-lock.json
|-- package.json
|-- postcss.config.mjs
|-- PROGRESS.md
|-- proxy.ts
`-- tsconfig.json
```

Update this section whenever new folders or important top-level files are added.

## Completed Phases

- [x] Created project progress source-of-truth document.
- [x] Initialized Next.js App Router project structure in the existing repo.
- [x] Added TypeScript configuration and package scripts.
- [x] Added Tailwind CSS 4 global theme using white as the base and light blue as the Sketchware-inspired secondary/accent.
- [x] Added shadcn/ui-style configuration and reusable `Button`/`Sheet` components.
- [x] Added system-default light/dark mode support with a manual theme toggle.
- [x] Built the initial responsive ChatGPT-like interface with persistent desktop sidebar, mobile collapsible sidebar, chat history, and main chat area.
- [x] Integrated Supabase browser/server clients and environment configuration.
- [x] Added email/password sign in and sign up.
- [x] Added password show/hide eye toggles for all password fields.
- [x] Added Google and GitHub OAuth sign-in hooks through Supabase.
- [x] Added generated Google-style circular avatar using the first character of username/email.
- [x] Added protected `/chat` routing and auth redirects through Next 16 `proxy.ts` route protection.
- [x] Added Supabase callback route for exchanging OAuth/email confirmation codes.
- [x] Added SQL schema for profiles, user settings, chats, messages, and RLS policies.
- [x] Added Zustand persisted local cache for offline chat/settings viewing.
- [x] Added chat creation and message saving to Supabase with immediate local cache updates.
- [x] Added theme/settings sync to Supabase and the offline settings cache.
- [x] Built main chat interface with selected chat, recent chat list, pin, edit, search, delete, and timestamps managed through Zustand.
- [x] Added auto-resizing textarea where Enter creates a new line and only the send button submits.
- [x] Added clip button file picker and drag/drop file attachment UI.
- [x] Added AI provider/model menu with free model options grouped by provider.
- [x] Added right-aligned user messages and left-aligned AI responses.
- [x] Added React Markdown rendering for AI responses.
- [x] Added Java/Sketchware syntax highlighting, copy code button, and `Sketchware add source directly` UI for Java blocks.
- [x] Added translate toggle below AI responses for English/Myanmar display.
- [x] Verified with `npm.cmd run build`.
- [x] Verified with `npm.cmd run typecheck`.
- [x] Added provider-agnostic `/api/chat` SSE route with Sketchware expert system prompt and Myanmar response context.
- [x] Wired client-side streaming chat send flow through the Cloudflare proxy contract.
- [x] Added Cloudflare Worker proxy at `cloudflare/ai-proxy` with SSRF-safe provider URL allowlist and streaming passthrough.
- [x] Built `/settings` dashboard with account, activity, AI keys, custom rules, usage, UI customization, network proxy, restore defaults, and cache tabs.
- [x] Synced expanded settings to Supabase `user_settings.model_preferences` and Zustand local cache.
- [x] Added 10 color palettes, font family picker, font size slider, animation toggle, and live settings applier.
- [x] Added account delete RPC, chat export, clear-all-chats, and local cache reset actions.

## Current Phase & Active Bugs

Current phase:

- Phase 5 complete. Ready for deployment configuration, Supabase setup, and optional translation API work.

Active bugs:

- None in the application code.
- Supabase project values must be added to `.env.local` before real authentication works.
- OAuth providers must be enabled in the Supabase dashboard with redirect URL `/auth/callback`.
- Apply updated `supabase/schema.sql` (including `delete_own_account`) to the Supabase project.
- File attachments are currently cached as metadata in chat state; binary upload/storage is pending.
- Per-message translate toggle still uses placeholder fallback text; new chats use the real Myanmar response setting via the system prompt.
- Cloudflare Worker must be deployed and its URL added to `.env.local` or Settings network proxy before AI requests succeed.
- Environment note: the dev server starts successfully in foreground with `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000`, but prior background process attempts did not stay reachable from the sandbox.

## Pending Phases

- [ ] Configure real Supabase project environment values.
- [ ] Apply `supabase/schema.sql` to the Supabase project.
- [ ] Enable Google and GitHub OAuth providers in Supabase.
- [ ] Deploy `cloudflare/ai-proxy` and set `CLOUDFLARE_AI_PROXY_URL` in `.env.local`.
- [ ] Add provider API keys as Worker secrets or user Settings keys.
- [ ] Connect real translation API for English/Myanmar response switching on existing messages.
- [ ] Add Supabase Storage or equivalent binary upload support for attached files.
- [ ] Add message sync conflict handling for offline-created content.
- [ ] Add tests and validation workflows.
- [ ] Prepare deployment documentation.

## Maintenance Rule

At the end of every successful major task or phase, update this file automatically without waiting for an explicit request.
