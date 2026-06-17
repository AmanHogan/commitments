# AINSTRUCTIONS — Coding standards for the Commitments web app

Any agent (or human) working in this repository **must** follow these rules. They are
enforced by ESLint and TypeScript; CI / `npm run lint` and `npm run typecheck` must pass
before any change is considered done.

## Project at a glance

- **Framework:** Next.js (App Router) — note: a newer major; check `node_modules/next/dist/docs/`
  before using framework APIs, conventions may differ from older Next.js.
- **Language:** TypeScript (strict).
- **UI:** React 19 + Tailwind CSS v4 + shadcn-style primitives in `src/components/ui`.
- **Auth:** NextAuth (Auth.js v5) credentials provider with a register page.
- **Data:** MongoDB via Mongoose. Files stored in MongoDB GridFS.
- **Server access:** **Server Actions** (`'use server'`) — there is no separate REST API.
  Server Actions replace the old Electron IPC layer.
- **Multi-user:** every document is scoped to the authenticated user's `userId`. Never
  read or write data without scoping to the current session's user.

## Hard rules (enforced by ESLint)

1. **JSDoc required for every function or component longer than 20 lines.** Use:
   ```ts
   /**
    * <description>
    * @param <name> <description>
    * @returns <description>
    */
   ```
2. **`any` is banned everywhere.** Use precise types, generics, or `unknown` + narrowing.
   The rule `@typescript-eslint/no-explicit-any` is set to **error**.
3. **`@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` are banned.** Fix the type instead.
   (`@typescript-eslint/ban-ts-comment` is **error**.)
4. **Every function must declare an explicit return type.**
   (`@typescript-eslint/explicit-function-return-type` is **error**.)
5. **No floating promises.** Every promise must be awaited, returned, or explicitly
   marked with `void`. (`@typescript-eslint/no-floating-promises` is **error**.)
6. **ESLint must pass.** Run `npm run lint` before finishing. Do not disable rules to make
   linting pass; fix the underlying code.

## Conventions

- Use the `@/*` import alias (maps to `src/*`).
- Validate every Server Action input with `zod` before touching the database.
- Keep Server Actions thin: validate → scope to `userId` → call a model/db helper → return
  plain serializable data (no Mongoose documents leak to the client; convert `_id` to a
  string `id`).
- Client Components are marked `'use client'` only when they need interactivity. Prefer
  Server Components for data fetching.
- File/date fields: store ISO strings or native Date; convert `ObjectId` to `string id` at
  the boundary so the UI works with string ids everywhere.

## Commands

- `npm run dev` — start dev server.
- `npm run lint` — ESLint (must pass).
- `npm run typecheck` — `tsc --noEmit` (must pass).
- `npm run build` — production build.
