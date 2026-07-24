# Repository Guidelines

## Project Structure & Module Organization

- `src/main.tsx` initializes React, providers, routing, and global styles.
- `src/routes/` contains page-level routes (`BoardPage.tsx`, `SettingsPage.tsx`). Keep route composition here and reusable UI elsewhere.
- `src/components/board/` owns SVG board interaction, selection, text editing, and toolbar UI. `src/components/ui/` contains small Radix-based primitives.
- `src/lib/engine/` is the drawing domain: element types, state store, geometry, serialization, and rendering. Keep engine code framework-light and preserve element invariants.
- `src/lib/stencils/` defines and inserts architecture shapes; `src/i18n/locales/` holds the `pt`, `en`, and `es` translations.
- `public/` is for static assets. Docker deployment files and instructions live in `docker/`.

## Build, Test, and Development Commands

Use Node/npm with the committed lockfile:

```bash
npm ci          # install exact dependencies
npm run dev     # start Vite development server
npm run lint    # run Oxlint
npm run build   # type-check and create the production bundle
npm run preview # serve the built bundle locally
```

There is currently no automated test suite. Before opening a PR, run `npm run lint` and `npm run build`, then manually exercise affected drawing, keyboard, export/import, and theme behavior.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation, single quotes, semicolons omitted, and trailing commas in multiline calls. Components and routes use PascalCase filenames; utilities use lowercase kebab-free filenames such as `hit-test.ts`; hooks begin with `use`. Prefer the `@/` alias for imports from `src` and `import type` for type-only imports. Keep translated user-facing strings in the locale JSON files rather than embedding them in components.

## Commit & Pull Request Guidelines

Existing history uses concise, imperative summaries (for example, `Update Traefik configuration`). Keep each commit focused. PRs should explain the user-visible change, link the relevant issue when available, list validation commands, and include screenshots or a short recording for UI/canvas changes. Call out any persistence or `.duck` format compatibility impact.

## Configuration & Deployment

Do not commit secrets or local environment values. For container deployment, follow `docker/README.md` and choose the compose configuration matching standalone, TLS, or Traefik hosting.
