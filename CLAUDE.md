# CLAUDE.md

Project guidance for AI-assisted development of React-Finity.

## Project Overview

React-Finity is a browser-based parametric 3D modeling app for the Gridfinity modular storage system. Users define storage components (baseplates, bins) through parameters, attach modifiers (dividers, label tabs, scoops, inserts, lids), and get real-time 3D previews with STL/3MF export.

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
│   ├── panels/            # Left (object list) & right (properties/print settings) panels
│   │   └── modifiers/     # Per-modifier control components
│   ├── viewport/          # 3D viewport (React Three Fiber canvas) + print layout viewport
│   ├── toolbar/           # Top toolbar
│   └── ui/                # shadcn/ui primitives
├── engine/
│   ├── geometry/          # Parametric geometry generators (baseplate, bin)
│   │   ├── modifiers/     # Modifier geometry generators (divider, label, scoop, insert, lid)
│   │   └── __tests__/     # Unit tests for geometry
│   │       └── modifiers/ # Unit tests for modifier geometry
│   ├── export/            # Export & print layout utilities
│   │   ├── mergeObjectGeometry.ts  # Merge object + modifiers into single geometry
│   │   ├── printOrientation.ts     # Optimal FDM print orientation per object kind
│   │   ├── printLayout.ts          # Row-based print bed layout algorithm
│   │   ├── stlExporter.ts          # STL binary export + ZIP download
│   │   ├── threeMfExporter.ts      # 3MF export (single + multi-object)
│   │   └── __tests__/     # Unit tests for export modules
│   ├── constants.ts       # Dimension profiles, default params, print bed presets
│   └── snapping.ts        # Grid snapping logic
├── hooks/                 # Custom React hooks (keyboard shortcuts, mobile detection)
├── store/                 # Zustand stores (project, UI, profile, project manager)
│   └── __tests__/         # Unit tests for stores
├── types/                 # TypeScript interfaces
└── lib/                   # Utility functions
e2e/                       # Playwright e2e tests
docs/                      # Architecture decision records & research documents
```

### Key Patterns

- **Discriminated unions** for object types: `GridfinityObject = BaseplateObject | BinObject`, switched on `object.kind`
- **Modifier system**: Modifiers are composable entities that attach to bins (or other modifiers) via `parentId`. The union type `Modifier = DividerGridModifier | LabelTabModifier | ScoopModifier | InsertModifier | LidModifier` is switched on `modifier.kind`. Modifiers are stored flat in the project store and rendered recursively.
- **ModifierContext**: When rendering modifier geometry, a `ModifierContext` object provides the available inner dimensions (width, depth, wall height, floor Y). This context flows from bin params down through nested modifiers, allowing each modifier to adapt to its parent's geometry.
- **Geometry generators** are pure functions: `generate*(params, profile) → BufferGeometry`. They use `roundedRectShape()`, `extrudeShape()`, and `mergeGeometries()` from `primitives.ts`. Modifier generators take the form: `generate*(params, context, profile) → BufferGeometry`.
- **Polygon quality system**: `primitives.ts` exposes a module-level `setCurveQuality(quality)` / `getCurveSegments()` API. The `curveQuality` setting in `uiStore` drives segment counts (low=4, medium=8, high=16) used by `extrudeShape()`, `createCylinder()`, and `scoop.ts`. Viewport components include `curveQuality` in useMemo deps to trigger geometry regeneration on quality changes.
- **Project persistence**: `projectManagerStore` manages project metadata and auto-save. Cross-store dirty tracking uses `useProjectStore.subscribe()` with an `isLoadingProject` flag to prevent marking dirty during project load. `initializeProject()` loads project data after Zustand persist middleware rehydrates.
- **Zustand stores** are the single source of truth. Components read from stores via selectors. No prop drilling for shared state. The `projectManagerStore` uses Zustand's `persist` middleware for localStorage persistence of project metadata, while project data (objects + modifiers) is stored separately at `react-finity-project-{id}` localStorage keys.
- **Profile system**: All dimension constants come from `GridfinityProfile` objects (Official, Tight Fit, Loose Fit). Geometry generators receive the active profile, not raw constants.
- **Properties panels**: One component per object kind (`BaseplateProperties`, `BinProperties`), following the same pattern of sliders/switches with label + value display. BinProperties includes a `ModifierSection` that renders modifier cards recursively.
- **View mode system**: The app has two views — Edit (design with panels + viewport) and Print Layout (print bed preview + export). `activeView` in `uiStore` controls which view is rendered. The toolbar shows a toggle and conditionally renders view-specific controls.
- **Export pipeline**: `mergeObjectGeometry.ts` merges an object with all its modifiers into a single `BufferGeometry`. `printOrientation.ts` computes the optimal FDM print rotation. `printLayout.ts` arranges objects on a virtual print bed. `stlExporter.ts` exports to binary STL with optional ZIP bundling and configurable scale factor. `threeMfExporter.ts` exports to 3MF format using JSZip for OPC archive creation, sharing the same `PrintLayoutItem[]` interface as the STL exporter.
- **Shared geometry functions**: `generateModifierGeometry()` and `computeBinContext()` are defined in `src/engine/export/mergeObjectGeometry.ts` and imported by both `SceneObject.tsx` (for viewport rendering) and the export pipeline (for merging). Avoid duplicating these.
- **Responsive design**: The `md:` breakpoint (768px) divides mobile from desktop. The `useIsMobile()` hook in `src/hooks/useIsMobile.ts` provides JS-level detection via `matchMedia`. On mobile, panels render as Sheet overlays (`src/components/ui/sheet.tsx`) instead of inline sidebars; the toolbar collapses secondary actions (camera presets, snap-to-grid, viewport settings, project dropdown) into an overflow menu. All interactive elements use responsive Tailwind classes (e.g., `h-9 w-9 md:h-7 md:w-7`) to meet minimum touch target sizes on mobile.
- **Path alias**: `@/` maps to `src/` (configured in vite.config.ts and tsconfig)

### Adding a New Object Kind

1. Types already defined in `src/types/gridfinity.ts` (params interface + object interface)
2. Default params in `src/engine/constants.ts`
3. Geometry generator in `src/engine/geometry/<kind>.ts` — export `generate<Kind>()` and `get<Kind>Dimensions()`
4. Properties panel in `src/components/panels/<Kind>Properties.tsx`
5. Wire into `SceneObject.tsx` (add `case` to geometry switch)
6. Wire into `PropertiesPanel.tsx` (replace placeholder)
7. Enable in `Toolbar.tsx` (remove `disabled`, add click handler)

### Adding a New Modifier Kind

1. Add params interface and modifier interface to `src/types/gridfinity.ts`, add to `Modifier` union and `ModifierKind` type
2. Add default params in `getDefaultModifierParams()` in `src/store/projectStore.ts`
3. Create geometry generator in `src/engine/geometry/modifiers/<kind>.ts` — export `generate<Kind>(params, context, profile) → BufferGeometry`
4. Create controls component in `src/components/panels/modifiers/<Kind>Controls.tsx`
5. Wire into `ModifierSection.tsx` (import controls, add to switch + dropdown menu)
6. Wire into `SceneObject.tsx` `generateModifierGeometry()` switch
7. If the modifier subdivides space (like dividers or inserts), compute child `ModifierContext` in `ModifierMesh` and in `getModifierContext()` in the store
8. Add unit tests in `src/engine/geometry/__tests__/modifiers/<kind>.test.ts`
9. Add E2E tests in `e2e/bin-properties.spec.ts` (modifier UI section)

## Testing Requirements

**Every code change must include both unit tests and e2e tests.** This is non-negotiable.

### Unit Tests (Vitest)

- Location: colocated in `__tests__/` directories next to source files
- Geometry generators must have tests for:
  - Valid geometry output (vertices > 0, index defined)
  - Scaling behavior (larger params produce more vertices)
  - Optional features (toggleable params change geometry)
  - Bounding box matches expected dimensions
  - Dimension helper returns correct mm values
- Modifier generators must have tests for:
  - Valid geometry output
  - Edge cases (e.g., 0 dividers returns empty geometry)
  - Scaling with params (more dividers/compartments produce more vertices)
  - Wall face targeting where applicable
- Store tests verify state mutations and action behavior (including modifier add/update/remove/cascade-delete)
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
  - Modifier add/remove/configure workflows
  - Camera presets, keyboard shortcuts, viewport settings
- When adding a new object kind, add tests in:
  - `e2e/add-object.spec.ts` — adding from menu, auto-selection, name incrementing
  - `e2e/<kind>-properties.spec.ts` — all properties controls
  - `e2e/object-list.spec.ts` — mixed object type selection/deletion
- When adding a new modifier kind, add tests in:
  - `e2e/bin-properties.spec.ts` — adding modifier, controls rendering, removing
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

## Documentation Requirements

Keep project documentation up to date as features are added, modified, or removed. When making code changes, update the following files as needed:

- **README.md** — Update the feature list, tech stack, setup instructions, or project structure if the change affects any of these areas.
- **ROADMAP.md** — Mark phases/deliverables as complete when finished. Add new items if scope changes.
- **SECURITY.md** — Update the supported versions table when new versions are released. Revise the scope section if the architecture changes (e.g., adding a backend server or authentication).
- **CLAUDE.md** — Update architecture docs, directory structure, key patterns, or step-by-step guides when the codebase structure or conventions change.

Documentation updates should be included in the same commit as the code change they relate to, not deferred to a separate task.

### Architecture Decision Records (ADRs)

Research documents and architecture decision records live in the `docs/` directory. When creating or updating ADRs:

- **Location**: `docs/` at the project root
- **Naming**: Use descriptive kebab-case filenames (e.g., `slicer-export-research.md`)
- **Maintenance**: Keep ADRs up to date when the decisions they describe are implemented, revised, or superseded. If an implementation diverges from a research doc, update the doc to reflect the actual state.
- **Cross-references**: When implementing a feature described in an ADR, reference it in commit messages and link back to the relevant section from code comments if the rationale is non-obvious.
- **Status tracking**: Note what has been implemented vs. what remains proposed. Mark sections as "Implemented in Phase X" or "Superseded by Y" as the project evolves.

#### Current ADRs

- `docs/slicer-export-research.md` — Slicer export integration (3MF format, slicer deep links, CLI integration)
- `docs/extensible-framework-design.md` — Extensible object/modifier framework (registry pattern, plugin architecture, schema-driven UI)

## Roadmap

See `ROADMAP.md` for the full project phases. Current status:
- Phase 1: Foundation & App Shell — Complete
- Phase 2: Bin Generation & Core Features — Complete
- Phase 3: Interactivity & Manipulation — Complete
- Phase 4: Modifier System & Advanced Geometry — Complete
- Phase 5: Export & Print Layout — Complete
- Phase 6+: See ROADMAP.md
