# React-Finity Roadmap

> A web-based parametric 3D modeling application for the Gridfinity modular storage system.
> Generate, customize, and export Gridfinity baseplates, bins, and modular accessories — all from your browser.

## Project Vision

React-Finity aims to be the definitive browser-based tool for designing custom Gridfinity storage components. Instead of searching for pre-made STL files, users define their storage needs through intuitive parameters and get print-ready models instantly. The app provides a real-time 3D preview with interactive manipulation, supports the full range of Gridfinity features (magnet holes, stacking lips, dividers, label tabs), and exports directly to STL/3MF for slicing.

Long-term, the app will transition to a native desktop experience via Tauri while remaining fully functional in the browser.

---

## Phase 1: Foundation & App Shell ✅

**Status:** Complete

**Goal:** Working app with 3D viewport, full UI shell, and parametric baseplate generation.

**Delivered:**
- Vite + React 19 + TypeScript project scaffold
- Tailwind CSS v4 + shadcn/ui integration (dark theme)
- App layout: top toolbar, left object list panel, center 3D viewport, right properties panel
- React Three Fiber viewport with orbit camera controls, ground grid, axis gizmo
- Zustand state management (project, UI, and profile stores)
- Gridfinity dimension profile system (Official, Tight Fit, Loose Fit presets)
- Parametric baseplate geometry generator with socket profiles
- Baseplate properties editor (grid size sliders, magnet/screw hole toggles)
- Object selection system (click in viewport or object list)
- Unit tests for geometry generator and project store (13 tests)

---

## Phase 2: Bin Generation & Core Features ✅

**Status:** Complete

**Goal:** Full bin/container generation with stacking lip and internal geometry.

**Delivered:**
- Bin geometry generator — configurable width (grid units), depth (grid units), height (7mm units)
  - Outer shell with correct corner fillets (3.75mm radius)
  - Bottom base profile matching baseplate socket interlock
  - Stacking lip profile on top edge (toggleable)
  - Hollow interior with configurable wall thickness
- Bin properties panel with all parameters
- Multiple object types in scene (baseplates + bins)
- Object selection via click in viewport (raycasting)
- Selected object highlighting (outline edge effect)
- Profile selector integrated into properties panel

---

## Phase 3: Interactivity & Manipulation ✅

**Status:** Complete

**Goal:** Interactive editing with gizmos, grid snapping, and real-time parameter updates.

**Delivered:**
- Transform gizmo (translate mode) via @react-three/drei TransformControls
- Grid snapping — objects snap to 42mm grid positions (toggleable)
- Real-time parameter editing — slider/input changes instantly regenerate geometry
- Camera view presets (top, front, side, isometric) in toolbar
- Keyboard shortcuts (Delete/Backspace to remove, Escape to deselect)
- Viewport environment settings (background color: dark/light/neutral; lighting presets: studio/outdoor/soft)
- Measurement overlay showing width/depth/height dimensions on selected object
- Collapsible left and right panels

---

## Phase 4: Modifier System & Advanced Geometry ✅

**Status:** Complete

**Goal:** Extensible modifier system for bins with dividers, label tabs, scoops, inserts, and lids.

**Delivered:**
- **Modifier architecture** — composable modifier system where modifiers attach to bins (or other modifiers) via a parent-child relationship. Each modifier has typed params, its own geometry generator, and UI controls. Modifiers are stored flat in the project store with `parentId` references and rendered recursively in both the properties panel and the 3D viewport.
- **Divider Grid** modifier — configurable internal divider walls (dividersX 0-9, dividersY 0-9, wall thickness). Sub-modifiers can nest inside divider compartments.
- **Label Tab** modifier — angled label surface on a selectable wall face (front/back/left/right), with configurable angle (30-60 deg) and height (5-14mm).
- **Scoop** modifier — curved scoop cutout on a selectable wall face with configurable radius (0 = auto-calculated from wall height).
- **Insert** modifier — open-top compartment grid (compartmentsX/Y 1-10, wall thickness) that generates a rim and internal divider walls. Sub-modifiers can nest inside insert compartments.
- **Lid** modifier — flat or stacking lid variant (boolean toggle), replacing the original standalone lid object type. Attaches as a modifier on a bin.
- **Inner fillet** on bins — configurable fillet radius (0-3mm) for internal bottom edges of the bin cavity.
- **Modifier UI** — "Modifiers" section in BinProperties with an Add dropdown menu, per-modifier cards with controls and a remove button, and recursive sub-modifier support.
- **Modifier rendering** — each modifier generates its own `BufferGeometry` and is rendered as a separate mesh in the viewport. `ModifierContext` provides inner dimensions so modifiers adapt to their parent's geometry.
- Unit tests for all 5 modifier geometry generators (29 tests) and modifier store actions
- E2E tests for modifier UI workflows (adding, configuring, removing modifiers)

**Deferred to Phase 6:**
- Fillet/chamfer on divider and insert internal edges
- Modifier reordering in the UI
- Visual differentiation of modifier meshes (color-coded by type)

---

## Phase 5: Export & Print Layout ✅

**Status:** Complete

**Goal:** Export to 3D printing formats, print-ready visualization, project persistence, and export settings.

**Delivered:**
- **Print Layout view** — dedicated view mode with virtual print bed visualization, switchable via toolbar toggle (Edit/Print) or Ctrl+P
- **Print bed presets** — configurable bed size (220x220mm, 256x256mm, 350x350mm) with grid overlay
- **Automatic print orientation** — objects oriented optimally for FDM printing (bins flipped upside-down, baseplates flat)
- **Row-based object arrangement** — objects laid out on the print bed with configurable spacing (5-30mm), sorted by depth for efficient packing
- **Geometry merging** — each object's modifiers are recursively merged into a single geometry for export
- **STL export (binary)** — export individual objects or all objects via the Export dropdown or Print Settings panel
- **ZIP export** — export all objects as individually named STL files bundled in a ZIP
- **Single plate STL** — export all objects merged at their layout positions as one STL file
- **Print Settings panel** — bed size selector, spacing slider, per-object dimensions display, fit indicators, and export buttons
- **Keyboard shortcuts** — Ctrl+Shift+E to export selected object, Ctrl+P to toggle Print Layout view, Ctrl+S to save project
- **Local storage persistence** — projects saved as JSON (parameters + modifiers, not geometry) to localStorage with auto-save (2s debounce after last change)
- **Project management** — toolbar Project dropdown with New/Save/Save As/Manage. Manage Projects dialog for loading, renaming, and deleting saved projects. Projects auto-load on startup
- **Export settings** — configurable export scale (0.1x-10x) and polygon quality (Low/Medium/High) in Print Settings panel
- **3MF export** — single object and multi-object plate export in 3MF format using JSZip for OPC archive creation. Export Selected sub-menu (STL/3MF) in toolbar, per-object format dropdown and batch Export All (3MF) button in Print Settings panel
- Unit tests for geometry merging, print orientation, layout algorithm, STL export, 3MF export, project manager store, and export settings (55+ tests)
- E2E tests for print layout view, export functionality, project management, and export settings (45+ tests)

---

## Phase 6: Polish & Advanced UX ✅

**Status:** Complete

**Goal:** Production-quality UX with undo/redo, multi-select, drag reordering, and viewport polish.

**Delivered:**
- **Undo/redo system** — snapshot-based history over `projectStore` state with 300ms debounce, max 50 snapshots. Toolbar buttons (Undo/Redo) and keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y). History clears on project change.
- **Multi-object selection** — shift/ctrl/meta-click adds to selection in both object list and viewport. Properties panel shows "N objects selected" for multi-select. Escape clears selection.
- **Copy/paste/duplicate** — Ctrl+D duplicates selected objects with all their modifiers (deep copy with new UUIDs, offset by one grid unit). Ctrl+C/Ctrl+V for internal clipboard copy/paste.
- **Bulk operations** — Delete/Backspace removes all selected objects at once.
- **Drag-to-reorder objects** — HTML5 drag and drop in the object list with grip handle and visual drop indicator.
- **Drag-to-reorder modifiers** — drag and drop modifier cards within a bin's modifier list.
- **Color-coded modifier meshes** — each modifier kind has a distinct color in the viewport (blue for dividers, orange for labels, green for scoops, purple for inserts, red for lids).
- **Wireframe toggle** — toggle wireframe rendering on all meshes via Viewport Settings.
- **Transparency mode** — toggle semi-transparent rendering (50% opacity) for all meshes.
- **Section view** — clipping plane at configurable Y position to see internal geometry cross-sections.
- Unit tests for history store, selection model, duplicate/reorder actions, and viewport state (45+ new tests)
- E2E tests for undo/redo, multi-select, copy/paste/duplicate, and viewport display toggles (18+ new tests)

**Deferred to later phases:**
- Box select (marquee selection)
- Fillet/chamfer on divider and insert internal edges
- Performance — Web Worker geometry generation for complex objects
- Print-ready validation — wall thickness checks, overhang warnings
- Onboarding — first-run tutorial / tooltips

---

## Phase 7: Extensible Framework ✅

**Status:** Complete

**Goal:** Registry-based extensible architecture for object and modifier kinds, replacing hardcoded switch statements.

**Delivered:**
- **Registry infrastructure** -- `ObjectKindRegistry` and `ModifierKindRegistry` singleton classes with register/get/getAll/freeze APIs
- **Builtin registration** -- all 2 object kinds and 5 modifier kinds registered via `registerBuiltinKinds()` in `src/engine/registry/builtins.ts`
- **Full migration** -- all switch statements on `object.kind` and `modifier.kind` replaced with registry lookups across export, store, viewport, and UI layers
- **Widened type system** -- `GridfinityObjectKind` and `ModifierKind` accept extensible string values; `GenericGridfinityObject` and `GenericModifier` types for custom kinds; type guards in `src/types/guards.ts`
- **Schema-driven UI** -- `SchemaPropertiesPanel` and `SchemaModifierControls` components render property editors from `ParamSchema` definitions; scoop and lid modifiers converted to schema-driven controls
- **Adding a new kind** now requires only creating its files (generator, optional UI component) and one registration call in `builtins.ts`
- See `docs/extensible-framework-design.md` for the full architecture design

---

## Phase 8: Desktop App (Tauri) 🔲

**Status:** Planned

**Goal:** Native desktop application with filesystem access and enhanced performance.

**Deliverables:**
- Tauri v2 integration (Rust backend, system webview frontend)
- Native filesystem save/load (no localStorage limits)
- Native file dialogs for export
- Auto-update system
- OS-level menu bar integration
- Multi-window support (viewport + properties in separate windows)
- Native Rust geometry engine for massive performance gains

---

## Future Ideas

Items that may be explored beyond the core roadmap:

- **Community sharing** — publish and browse user-created designs
- **Parametric templates** — saveable parameter presets (e.g., "battery organizer", "screwdriver holder")
- **Multi-material 3MF** — assign different colors/materials to bin sections
- **Import reference geometry** — load STL/STEP files to design holders around existing tools
- **Slicer integration** — direct export to PrusaSlicer/OrcaSlicer via CLI
- **Collaborative editing** — real-time multi-user design sessions
- **Mobile companion** — iOS LiDAR workspace scanner to measure physical spaces and recommend Gridfinity configurations (see `docs/ios-lidar-workspace-scanner.md`)
- **Accessibility** — full keyboard navigation, screen reader support for the parameter panels
