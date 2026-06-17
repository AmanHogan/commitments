# Commitments (Next.js + MongoDB)

A web rewrite of the Electron "Commitment Tracker" desktop app. Same features, now a
multi-user web app: Next.js (App Router) + NextAuth + MongoDB (Mongoose) + Tailwind/shadcn.

> **Standards:** all contributors (human or agent) must follow
> [AINSTRUCTIONS.md](./AINSTRUCTIONS.md). `npm run lint` and `npm run typecheck` must pass.

## Architecture

- **No separate API service.** The server runtime lives inside Next.js. The old Electron
  IPC layer (`window.api.*` / `ipcMain.handle`) is replaced by **Server Actions**
  (`'use server'` functions). MongoDB is only ever touched server-side.
- **Auth:** NextAuth v5 credentials provider (`src/lib/auth.ts`). Login at `/login`,
  register at `/register`. Route protection is done in `src/proxy.ts` (Next 16 renamed
  Middleware → Proxy) using the edge-safe `src/lib/auth.config.ts`.
- **Multi-user:** every document carries a `userId`; every Server Action scopes reads and
  writes to the current session user via `requireUserId()` (`src/lib/session.ts`).
- **Files:** planned to be stored in MongoDB GridFS (not yet implemented).

## Local setup

1. Have MongoDB running locally (e.g. `mongodb://localhost:27017`).
2. Copy env: `cp .env.example .env.local` and set `MONGODB_URI` and `AUTH_SECRET`
   (`openssl rand -base64 32`).
3. Install + run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 → you'll be redirected to `/login`. Create an account at
   `/register`.

## Project layout

```
src/
  app/
    (auth)/            login + register pages and the register Server Action
    api/auth/[...nextauth]/route.ts   NextAuth handlers
    dashboard/         authenticated app (layout = sidebar + header)
      skills/          ← reference feature: page.tsx, skills-client.tsx, actions.ts
  components/
    ui/                shadcn primitives (button, input, label, card, …)
    app-sidebar.tsx    navigation
  lib/
    db.ts              cached Mongoose connection
    auth.ts            full NextAuth config (Node)
    auth.config.ts     edge-safe config used by proxy.ts
    session.ts         requireUserId()
    models/            Mongoose models (user, skill, …)
    types.ts           client-facing DTOs
  proxy.ts             route protection (was middleware)
```

## Adding a feature (the Skills pattern)

The **Skills** feature is the reference implementation. To port another collection from the
Electron app (`../commitments-electron/src/main/database.ts`), copy the pattern:

1. **Model** — `src/lib/models/<thing>.ts`: a Mongoose schema with `userId` + `index`,
   guarded against HMR re-compilation. Embed sub-items as subdocuments where the Electron
   app used a child table (e.g. `business_commitments_two` → embedded `subEvents`).
2. **DTO** — add the client-facing shape to `src/lib/types.ts` (string `id`, no ObjectId).
3. **Actions** — `src/app/dashboard/<thing>/actions.ts` with `'use server'`: validate input
   with zod, scope to `requireUserId()`, mutate, `revalidatePath`, and return DTOs via a
   `toDTO()` serializer. (See `src/app/dashboard/skills/actions.ts`.)
4. **Page** — a server component that calls the `get…` action and passes data to a
   `'use client'` island for interactivity. (See `skills/page.tsx` + `skills-client.tsx`.)

## Status

Done & verified end-to-end:
- Scaffold, strict ESLint/TS, auth (register/login/proxy), DB layer.
- **Skills**
- **Business Partner Impact** (Business Commitment One — with value entries + status)
- **Development Commitment** (Development Commitment One — with embedded learning modules)
- **Innovation Commitment** & **TDP Program Impact** (Development/Business Commitment Two —
  shared event-commitment schema + service, embedded sub-items)
- **Action Items** (criticality, due dates, overdue/due-today indicators, mark done, sort)

Remaining (all follow the Skills/commitment pattern): one-on-ones, flashcards (sets/cards/
starred/skills), notes, images/résumés (file uploads via GridFS), and the reminder system
(client polling + Web Notifications, replacing the Electron main-process pusher).
