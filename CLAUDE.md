# CLAUDE.md

Project guidance for AI-assisted development of React-Finity.

## Project Overview

React-Finity is a browser-based parametric 3D modeling app for the Gridfinity modular storage system. Users define storage components (baseplates, bins, lids) through parameters and get real-time 3D previews with STL/3MF export.

**Tech stack:** React 19, TypeScript, Vite, React Three Fiber, Zustand, Tailwind CSS v4, shadcn/ui

## Commands

- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — TypeScript check + production build
- `npm run lint` — ESLint
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright e2e tests (requires `npx playwright install chromium` first)
- `npm run test:watch` — Vitest in watch mode

## Architecture

### Directory Structure

```
src/
├── app/                    # App entry point & layout
├── components/
│   ├── panels/            # Left (object list) & right (properties) panels
│   ├── viewport/          # 3D viewport (React Three Fiber canvas)
│   ├── toolbar/           # Top toolbar
│   └── ui/                # shadcn/ui primitives
├── engine/
│   ├── geometry/          # Parametric geometry generators (baseplate, bin)
│   │   └── __tests__/     # Unit tests for geometry
│   └── constants.ts       # Dimension profiles & default params
├── store/                 # Zustand stores (project, UI, profile)
│   └── __tests__/         # Unit tests for stores
├── types/                 # TypeScript interfaces
└── lib/                   # Utility functions
e2e/                       # Playwright e2e tests
```

### Key Patterns

- **Discriminated unions** for object types: `GridfinityObject = BaseplateObject | BinObject | LidObject`, switched on `object.kind`
- **Geometry generators** are pure functions: `generate*(params, profile) → BufferGeometry`. They use `roundedRectShape()`, `extrudeShape()`, and `mergeGeometries()` from `primitives.ts`
- **Zustand stores** are the single source of truth. Components read from stores via selectors. No prop drilling for shared state.
- **Profile system**: All dimension constants come from `GridfinityProfile` objects (Official, Tight Fit, Loose Fit). Geometry generators receive the active profile, not raw constants.
- **Properties panels**: One component per object kind (`BaseplateProperties`, `BinProperties`), following the same pattern of sliders/switches with label + value display.
- **Path alias**: `@/` maps to `src/` (configured in vite.config.ts and tsconfig)

### Adding a New Object Kind

1. Types already defined in `src/types/gridfinity.ts` (params interface + object interface)
2. Default params in `src/engine/constants.ts`
3. Geometry generator in `src/engine/geometry/<kind>.ts` — export `generate<Kind>()` and `get<Kind>Dimensions()`
4. Properties panel in `src/components/panels/<Kind>Properties.tsx`
5. Wire into `SceneObject.tsx` (add `case` to geometry switch)
6. Wire into `PropertiesPanel.tsx` (replace placeholder)
7. Enable in `Toolbar.tsx` (remove `disabled`, add click handler)

## Testing Requirements

**Every code change must include both unit tests and e2e tests.** This is non-negotiable.

### Unit Tests (Vitest)

- Location: colocated in `__tests__/` directories next to source files
- Geometry generators must have tests for:
  - Valid geometry output (vertices > 0, index defined)
  - Scaling behavior (larger params → more vertices)
  - Optional features (toggleable params change geometry)
  - Bounding box matches expected dimensions
  - Dimension helper returns correct mm values
- Store tests verify state mutations and action behavior
- Run with: `npm run test`

### E2E Tests (Playwright)

- Location: `e2e/` directory at project root
- Config: `playwright.config.ts` (Chromium only, dev server auto-started)
- Tests cover full user workflows:
  - Adding objects from toolbar dropdown
  - Properties panel showing correct controls per object kind
  - Slider/switch interactions updating values and dimension readouts
  - Object list selection, deletion, and multi-type interactions
  - Panel toggle visibility
  - Profile switching
- When adding a new object kind, add tests in:
  - `e2e/add-object.spec.ts` — adding from menu, auto-selection, name incrementing
  - `e2e/<kind>-properties.spec.ts` — all properties controls
  - `e2e/object-list.spec.ts` — mixed object type selection/deletion
- Update existing tests if behavior changes (e.g., menu items becoming enabled)
- Run with: `npm run test:e2e`

### Before Committing

Always verify:
1. `npm run test` — all unit tests pass
2. `npm run test:e2e` — all e2e tests pass
3. `npm run build` — TypeScript compiles and production build succeeds

## Code Style

- TypeScript strict mode. No `any` types.
- Imports use `@/` path alias (e.g., `import { useProjectStore } from '@/store/projectStore'`)
- Geometry generators dispose source geometries after merging to prevent memory leaks
- Components use shadcn/ui primitives (`Label`, `Slider`, `Switch`, `Separator`, `ScrollArea`, etc.)
- No emojis in code or commit messages
- Follow existing patterns — read a similar file before creating a new one

## Roadmap

See `ROADMAP.md` for the full project phases. Current status:
- Phase 1: Foundation & App Shell — Complete
- Phase 2: Bin Generation & Core Features — Complete
- Phase 3+: See ROADMAP.md
