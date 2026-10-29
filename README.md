# BenjaStore

Punto de venta (POS) para restaurante. SPA en React + TypeScript + Vite + Tailwind CSS v4.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (tema en `src/index.css`)
- Vitest + Testing Library
- ESLint + Prettier
- Alias `@/` → `src/`

## Desarrollo

Requiere Node `^20.19.0 || >=22.12.0`.

```
npm install
npm run dev
```

Scripts: `build`, `typecheck`, `lint`, `format:check`, `test`.

## Skills de Claude Code

Skills de spec-driven development (`/spec`, `/spec-impl`), instaladas con:

```
npx skills@latest add Klerith/fernando-skills
```

Quedan en `.agents/skills/` (con enlaces en `.claude/skills/`) y se registran en `skills-lock.json`.
