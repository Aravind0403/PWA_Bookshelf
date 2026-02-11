# Project
Name: <my-bookshelf>
Stack: <React/Next/Vite + TS?>, styling: <Tailwind/CSS Modules/etc>
Goal: Refactor UI/architecture to production-quality frontend best practices.

# Non-negotiables
- Keep changes incremental; avoid big-bang rewrites.
- Preserve core user flows and data model unless requested.
- Prefer composition over inheritance; avoid global state unless justified.
- Any UI change must keep accessibility in mind (labels, keyboard, contrast).
- Every meaningful refactor must include updated tests or at least a smoke check.

# What to do first
1) Generate an architecture + UI audit.
2) Propose a refactor plan (phased).
3) Implement Phase 1 only (small PR-sized change).
4) Run: lint, typecheck, tests, build.

# Commands
- Install: <pnpm i | npm i>
- Lint: <npm run lint>
- Typecheck: <npm run typecheck | tsc -p .>
- Test: <npm test | npm run test>
- Build: <npm run build>
- Dev: <npm run dev>