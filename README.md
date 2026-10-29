# React + TypeScript + Tailwind — Plantilla

> **Este repositorio es una plantilla (GitHub Template Repository), no un proyecto.** No se clona para trabajar aquí: se usa para crear repositorios nuevos. Si estás editando _esta_ plantilla, los cambios afectan a todos los proyectos futuros; los proyectos ya creados no se actualizan solos.

Base para aplicaciones web de una sola página (SPA) renderizadas en el cliente: dashboards, tiendas, herramientas internas, landings, paneles de administración, etc.

## Qué incluye

- React 19 + TypeScript (estricto) + Vite
- Tailwind CSS v4 (plugin de Vite, sin `tailwind.config`)
- Vitest + Testing Library + jest-dom (jsdom)
- ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier (con orden de clases de Tailwind)
- Alias `@/` → `src/`
- Configuración recomendada de VS Code y versión de Node fijada (`.nvmrc`)

## Qué NO incluye (se añade por proyecto)

Se deja fuera a propósito para que la plantilla sirva a cualquier proyecto sin cargar dependencias que no uses:

- Router (`react-router`, TanStack Router)
- Fetch de datos / estado global (TanStack Query, Zustand, etc.)
- Formularios y validación (React Hook Form, Zod)
- Backend, base de datos o autenticación
- SSR / SEO avanzado: si lo necesitas, **no uses esta plantilla**, empieza con Next.js o similar
- Apps de escritorio, móviles o librerías publicables: requieren otra estructura de build

## Crear un proyecto nuevo

1. En GitHub: **Use this template → Create a new repository**.
2. Clona el repositorio nuevo y entra a la carpeta.
3. Usa Node `^20.19.0 || >=22.12.0` (`nvm use` toma la versión de `.nvmrc`).
4. Personaliza los archivos de la lista de abajo.
5. `npm install` y luego `npm run dev`.

## Checklist al clonar: qué cambiar

**Obligatorio**

- [ ] `package.json` → `name`, `description` (y `version` si aplica). Después ejecuta `npm install` para que `package-lock.json` tome el nombre nuevo.
- [ ] `index.html` → `<title>`, `lang` (`es` o `en`) y, si quieres, `<meta name="description">`.
- [ ] `README.md` → reemplaza todo este contenido por la documentación del proyecto.
- [ ] `CLAUDE.md` → ajusta la sección de arquitectura a tu proyecto (y borra lo que ya no aplique).
- [ ] `src/App.tsx` y `src/App.test.tsx` → son el ejemplo; reemplázalos por tu app real.

**Según el proyecto**

- [ ] `public/favicon.svg` → tu icono.
- [ ] `LICENSE` → añade una (la plantilla no trae ninguna) o déjalo privado.
- [ ] `.nvmrc` y `engines` en `package.json` → si necesitas otra versión de Node.
- [ ] `src/index.css` → tema de Tailwind (`@theme`), fuentes y estilos base.
- [ ] `.vscode/` → ajusta o borra si no usas VS Code.

**No hace falta tocar**: `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`.

## Scripts

| Script                            | Descripción                            |
| --------------------------------- | -------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo                 |
| `npm run build`                   | Chequeo de tipos + build de producción |
| `npm run preview`                 | Sirve el build de producción           |
| `npm run typecheck`               | `tsc -b`                               |
| `npm run lint` / `lint:fix`       | ESLint                                 |
| `npm run format` / `format:check` | Prettier                               |
| `npm test` / `npm run test:watch` | Vitest (jsdom, `globals` activado)     |

## Notas técnicas

- Importa desde `src` con el alias: `import { App } from "@/App"`. Está definido en `vite.config.ts` **y** `tsconfig.app.json`; si lo cambias, cambia ambos.
- Tailwind v4 no tiene archivo de configuración: el tema y los plugins van en `src/index.css`.
- `typescript` está fijado a `~6.0` porque `typescript-eslint` aún no soporta TS 7. Súbelos juntos cuando lo soporte.

## Mantener la plantilla

Si mejoras la plantilla (actualizar dependencias, nueva config), hazlo aquí y luego, en cada proyecto, copia a mano los cambios que quieras. Las plantillas de GitHub no sincronizan cambios hacia los proyectos ya creados.
