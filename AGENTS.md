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

## 规格驱动开发（SDD）

- 新增玩法、角色或技能，或者调整战斗规则、输入、存档等玩家可感知的行为时，先复制[规格模板](docs/specs/_template.md)到 `docs/specs/<feature>.md`，再开始实现。错别字和纯样式调整沿用现有流程。
- 写清目标、预期行为与边界、可验证的验收条件和实现范围。新增角色可引用[角色制作规范](docs/角色制作规范.md)和[技能扩展](docs/技能扩展.md)，在规格中写明该角色独有的行为。
- 需求变化时，先更新规格，再调整实现。交付前将每条验收条件对应到自动测试或游戏内操作，并在规格中记录实际结果。代码或素材变更按下文的测试约定执行，受影响的界面按[手动验收路径](docs/开发与验证.md#手动验收路径)验证。

## Testing Guidelines

Write `test/*.test.js` using `node:test` and `node:assert/strict`, with behavior-based test names. Cover changed mechanics and regressions; use seeded simulations. No coverage threshold is configured.

Run checks, tests, and builds for code or asset changes. Verify affected UI flows manually; distinguish browser observations, automated checks, and untested phone behavior in verification notes.

## Commit & Pull Request Guidelines

No Git history is available in this checkout. Prefer imperative subjects, optionally scoped: `fix(input): clear cancelled touches`.

PRs should explain behavior changes, link relevant issues, list validation results, and include screenshots for visual changes. Update character documentation when interfaces change. Do not commit or push unless requested.

## Environment & Asset Safety

Before installing tools/dependencies or changing the environment, present a Chinese proposal covering versions, purpose, source, commands, absolute paths, relocation options, system impact, and rollback; wait for explicit approval. Reuse existing tools. Do not run placeholder generation with `--force` unless replacing those assets is explicitly intended. Keep original art drafts under ignored `素材/`.
