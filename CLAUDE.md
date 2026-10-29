# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run typecheck` / `npm run lint` / `npm run format:check`
- `npm test` — Vitest once; `npx vitest run src/App.test.tsx` for a single file, `npx vitest run -t "name"` for a single test

## Architecture

GitHub template: React 19 + TypeScript + Vite + Tailwind CSS v4 (`@tailwindcss/vite`, no tailwind config; theme goes in `src/index.css`). Entry is `src/main.tsx` → `App` (`src/App.tsx`).

- `@/` alias → `src/`, defined in both `vite.config.ts` (resolve.alias) and `tsconfig.app.json` (paths); keep them in sync.
- Vitest config lives in `vite.config.ts` (imports `defineConfig` from `vitest/config`); jsdom, globals on, setup in `src/test/setup.ts` (jest-dom matchers).
- `typescript` is pinned to `~6.0` because `typescript-eslint` rejects TS 7. Upgrade both together.
- Prettier (default style + tailwind class sorting) is the formatter; `eslint-config-prettier` disables conflicting rules.
