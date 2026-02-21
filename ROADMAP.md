# React-Finity Roadmap

> A web-based parametric 3D modeling application for the Gridfinity modular storage system.
> Generate, customize, and export Gridfinity baseplates, bins, lids, and inserts — all from your browser.

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

## Phase 2: Bin Generation & Core Features 🔲

**Status:** Planned

**Goal:** Full bin/container generation with stacking lip and internal geometry.

**Deliverables:**
- Bin geometry generator — configurable width (grid units), depth (grid units), height (7mm units)
  - Outer shell with correct corner fillets (3.75mm radius)
  - Bottom base profile matching baseplate socket interlock
  - Stacking lip profile on top edge (toggleable)
  - Hollow interior with configurable wall thickness
- Bin properties panel with all parameters
- Multiple object types in scene (baseplates + bins)
- Object selection via click in viewport (raycasting)
- Selected object highlighting (outline effect)
- Profile selector integrated into properties panel

---

## Phase 3: Interactivity & Manipulation 🔲

**Status:** Planned

**Goal:** Interactive editing with gizmos, grid snapping, and real-time parameter updates.

**Deliverables:**
- Transform gizmo (translate mode) via @react-three/drei TransformControls
- Grid snapping — objects snap to 42mm grid positions
- Real-time parameter editing — slider/input changes instantly regenerate geometry
- Camera view presets (top, front, side, isometric)
- Keyboard shortcuts (Delete to remove, Ctrl+Z undo stub)
- Viewport environment toggle (background color, lighting presets)
- Measurement overlay showing dimensions on selected object

---

## Phase 4: Advanced Geometry Features 🔲

**Status:** Planned

**Goal:** Feature-complete Gridfinity generation with dividers, label tabs, scoops, and lids.

**Deliverables:**
- Bin dividers — configurable internal divider walls (count per axis)
- Label tabs — angled label surface on bin front wall
- Scoop front — curved scoop cutout on front wall for easy part access
- Lid generator — flat lid and stacking lid variants
- Bin insert generator — open-top compartment grids for tool organization
- Wall thickness customization
- Fillet/chamfer options for internal edges

---

## Phase 5: Export & Persistence 🔲

**Status:** Planned

**Goal:** Export to 3D printing formats and save/load projects.

**Deliverables:**
- STL export (binary) via Three.js STLExporter — single object or entire scene
- 3MF export via three-3mf-exporter
- Local storage persistence — save/load projects as JSON (parameters, not geometry)
- Project management — new, save, load, rename, delete
- Export settings — scale, orientation, polygon quality
- ZIP download for multi-object exports

---

## Phase 6: Polish & Advanced UX 🔲

**Status:** Planned

**Goal:** Production-quality UX with undo/redo, multi-select, and performance optimization.

**Deliverables:**
- Undo/redo system (command pattern over Zustand store)
- Multi-object selection (shift-click, box select)
- Copy/paste/duplicate objects
- Scene arrangement — drag-to-reorder in object list
- Performance — Web Worker geometry generation for complex objects
- Viewport enhancements — wireframe toggle, section view, transparency mode
- Print-ready validation — wall thickness checks, overhang warnings
- Responsive layout — collapsible panels, mobile-friendly viewport
- Onboarding — first-run tutorial / tooltips
- Comprehensive unit test coverage for all geometry generators

---

## Phase 7: Desktop App (Tauri) 🔲

**Status:** Planned

**Goal:** Native desktop application with filesystem access and enhanced performance.

**Deliverables:**
- Tauri v2 integration (Rust backend, system webview frontend)
- Native filesystem save/load (no localStorage limits)
- Native file dialogs for export
- Auto-update system
- OS-level menu bar integration
- Potential: multi-window support (viewport + properties in separate windows)
- Potential: native Rust geometry engine for massive performance gains

---

## Future Ideas

Items that may be explored beyond the core roadmap:

- **Community sharing** — publish and browse user-created designs
- **Parametric templates** — saveable parameter presets (e.g., "battery organizer", "screwdriver holder")
- **Multi-material 3MF** — assign different colors/materials to bin sections
- **Import reference geometry** — load STL/STEP files to design holders around existing tools
- **Print plate layout** — arrange multiple objects on a virtual print bed
- **Slicer integration** — direct export to PrusaSlicer/OrcaSlicer via CLI
- **Collaborative editing** — real-time multi-user design sessions
- **Mobile companion** — measure tools with phone camera, send dimensions to desktop
- **Accessibility** — full keyboard navigation, screen reader support for the parameter panels
