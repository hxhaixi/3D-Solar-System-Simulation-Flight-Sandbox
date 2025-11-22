# Repository Guidelines

## Project Structure & Module Organization
This Vite-based Three.js simulation keeps a flat layout to simplify asset lookups. Core files include `index.html` (DOM shell), `main.js` (scene graph, flight controls, HUD labels), `package.json` (scripts and dependencies), and `README.md` (player overview). Keep gameplay modules colocated inside `main.js` until a subsystem exceeds ~200 lines, then extract to `src/flight/`, `src/ui/`, etc., and export ES modules referenced from `main.js`. Place textures or JSON presets under `public/assets/` so Vite serves them statically.

## Build, Test, and Development Commands
- `npm install` installs Three.js and Vite. Run whenever dependencies update.
- `npm run dev` launches Vite at `http://localhost:5173` with live reload; this is the main playground for manual verification.
- `npm run build` produces an optimized `dist/` bundle; run it before publishing or profiling performance.
- `npm run preview` serves the build output locally to confirm production parity.

## Coding Style & Naming Conventions
Use modern ES modules with 4-space indentation, `const`/`let`, and descriptive camelCase names (`createSolarSystem`, `solarSystemData`). Classes such as `Spaceship` remain PascalCase. Keep data literals (planet specs, control key maps) near the top of `main.js` and annotate them with inline comments when units are unclear. Prefer template literals over string concatenation and guard against undefined DOM lookups before appending renderers.

## Testing Guidelines
Automated tests are not yet configured; until Vitest is added, rely on scenario-driven manual tests: launch `npm run dev`, verify orbit speeds against `solarSystemData`, confirm controls (WASD + QE + Space/Shift) and label alignment. When adding Vitest, place specs in `tests/**/*.spec.js`, stub Three.js dependencies via `vi.mock`, and target at least 80% coverage on navigation helpers and input handlers.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat: add autopilot hud`, `fix: stabilize spaceship roll damping`) so change logs stay machine-readable. Each PR should include: a concise summary, linked issue or task ID, reproduction steps, screenshots or short clips for visual tweaks, and notes on how you validated (commands run, scenarios covered). Avoid bundling unrelated refactors¡ªsmall, reviewable PRs keep regression risk low.

## Simulation & Asset Tips
Tune orbits through `solarSystemData` (distance, radius, speed) and spaceship behavior through the `Spaceship` class near the bottom of `main.js`. When importing new textures or label assets, drop them into `public/assets/` and reference them with relative paths (`/assets/starfield.png`) so Vite handles cache busting automatically.
