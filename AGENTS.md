# Repository Guidelines

## Project Structure & Module Organization

- `src/`: ES-module game engine, Canvas rendering, input, UI, storage, and laboratory. Keep `engine.js` DOM-independent with a fixed 60Hz simulation.
- `src/plugins/`: trusted skill modules, explicitly registered in `registry.js`.
- `characters/`: character JSON and PNG assets; `manifest.json` registers playable characters.
- `templates/character/`: character template.
- `test/`: Node tests; `tools/`: server, validation, build, and placeholder generation.
- `docs/`: Chinese authoring guides and verification records. `dist/` is generated output; never edit it directly.

## Build, Test, and Development Commands

Use existing Node.js 22+; no `npm install` is needed.

- `npm run dev`: serve locally at `http://localhost:4173`; manually refresh after edits.
- `npm run lan`: expose the preview to local-network devices.
- `npm run check`: validate character definitions, PNG dimensions, skill references, and JavaScript syntax.
- `npm test`: run the built-in Node test runner.
- `npm run build`: validate and regenerate `dist/`.
- `npm run preview`: serve the static build.
- `node tools/verify-static.mjs`: check built resources over HTTP using a temporary server.

## Coding Style & Naming Conventions

Use ES modules, explicit `.js` extensions, semicolons, and JSDoc contracts. Use two-space indentation in new multiline blocks; preserve surrounding formatting. No formatter or linter is configured.

Use camelCase for functions/variables, PascalCase for classes, and lowercase kebab-case character/plugin IDs such as `moon-knight`. Keep player-facing text Chinese. Add characters through configuration and registered plugins rather than character-specific engine branches. Read `docs/角色制作规范.md` and `docs/技能扩展.md` first.

## Testing Guidelines

Write `test/*.test.js` using `node:test` and `node:assert/strict`, with behavior-based test names. Cover changed mechanics and regressions; use seeded simulations. No coverage threshold is configured.

Run checks, tests, and builds for code or asset changes. Verify affected UI flows manually; distinguish browser observations, automated checks, and untested phone behavior in verification notes.

## Commit & Pull Request Guidelines

No Git history is available in this checkout. Prefer imperative subjects, optionally scoped: `fix(input): clear cancelled touches`.

PRs should explain behavior changes, link relevant issues, list validation results, and include screenshots for visual changes. Update character documentation when interfaces change. Do not commit or push unless requested.

## Environment & Asset Safety

Before installing tools/dependencies or changing the environment, present a Chinese proposal covering versions, purpose, source, commands, absolute paths, relocation options, system impact, and rollback; wait for explicit approval. Reuse existing tools. Do not run placeholder generation with `--force` unless replacing those assets is explicitly intended. Keep original art drafts under ignored `素材/`.
