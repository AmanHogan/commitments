# Project standards

**Read [AINSTRUCTIONS.md](./AINSTRUCTIONS.md) before writing any code.** It defines the
mandatory coding standards (JSDoc on functions >20 lines, no `any`, no ts-ignore, explicit
return types, no floating promises) which are enforced by ESLint. Run `npm run lint` and
`npm run typecheck` before finishing — both must pass.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
