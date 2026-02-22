# Reference Geometry Import — Architecture

Architecture decision record for importing external 3D files (STL, OBJ, 3MF) as reference geometry in React-Finity. Users load models of existing tools/objects to design custom Gridfinity holders around them.

---

## Motivation

A core Gridfinity workflow is designing custom holders for specific tools (screwdrivers, pliers, drill bits, etc.). Today users must manually measure their tools and translate those measurements into bin parameters. With reference geometry import, users can:

1. Import an STL/OBJ/3MF of the tool they want to hold
2. See it rendered semi-transparently in the viewport alongside their Gridfinity objects
3. Use auto-suggested bin dimensions based on the tool's bounding box
4. Position and scale the reference to fit inside a bin
5. Optionally include the reference in exports for fitment testing

---

## Design Decisions

### D1: Reference as a New Object Kind

Reference geometry is a **new object kind** (`'reference'`) in the `GridfinityObject` discriminated union. This is preferred over a separate data structure because:

- Follows the established discriminated union + switch pattern exactly
- Gets selection, positioning, naming, transform gizmo, and object list for free
- Natural exclusion from export via `kind` check (same pattern as baseplates not supporting modifiers)
- Stored in the same `ProjectData.objects` array for project persistence

**Not** a modifier — reference geometry has no parent-child relationship with bins. It exists independently in the scene.

### D2: File Format Support (Phased)

| Format | Library | Bundle Impact | Phase |
|--------|---------|---------------|-------|
| **STL** (binary + ASCII) | `three/addons/loaders/STLLoader.js` | 0 KB (bundled with Three.js) | 1 |
| **OBJ** | `three/addons/loaders/OBJLoader.js` | 0 KB (bundled with Three.js) | 1 |
| **3MF** | Custom parser using JSZip (already installed) | 0 KB new deps | 1 |
| **STEP** | `opencascade.js` (OpenCascade WASM) | ~25 MB | Deferred |

STL and OBJ loaders are included in the Three.js addons package already in the project. 3MF import reuses JSZip for OPC archive extraction and adds an XML mesh parser. STEP is deferred due to the heavy WASM bundle — revisit when the Tauri desktop app (Phase 7) can load it natively via Rust.

### D3: Geometry Storage — IndexedDB

Binary mesh data is too large for localStorage (5-10 MB limit). Reference geometry data is stored in **IndexedDB** alongside the project metadata:

- **IndexedDB database**: `react-finity-geometry`
- **Object store**: `reference-meshes`, keyed by object ID
- **Value**: Serialized geometry data (vertex positions, normals, indices as typed arrays)

Project JSON in localStorage stores only the `ReferenceParams` metadata (file name, vertex count, scale, etc.) — not the geometry itself. On project load, geometry is retrieved from IndexedDB by object ID.

If IndexedDB data is missing (cleared browser data, different machine), the properties panel shows a "Re-import" prompt. The object remains in the project with placeholder bounding box.

### D4: Rendering — Configurable Transparency

Reference objects render with a distinct visual treatment:

- **Default material**: Semi-transparent with configurable opacity (default 0.4)
- **Default color**: Amber/orange (`#e8a040`) to distinguish from Gridfinity objects (gray/blue)
- **Wireframe mode**: Toggle in properties panel for clearer interior visibility
- **Visibility toggle**: Hide/show without removing from the project
- **No edge highlighting** when selected (unlike Gridfinity objects) — just the transform gizmo

### D5: Export Behavior — Both Modes

Reference objects have an `includeInExport` flag (default `false`):

- **When `false`**: Completely excluded from the export pipeline, print layout, and print orientation. This is the primary use case — visual design aid only.
- **When `true`**: Included in export as a merged mesh alongside Gridfinity objects. Useful for fitment mockups or alignment jigs.

The print layout view shows reference objects ghosted (low opacity) when `includeInExport` is false, and solid when true.

### D6: Auto-Suggest Bin Dimensions

When a reference object is selected, the properties panel shows a "Suggest Bin Size" section that computes the minimum Gridfinity bin dimensions to contain the reference geometry:

```
Reference bounding box: 85.2 x 40.1 x 32.5 mm
Suggested bin: 3W x 1D x 5H (126 x 42 x 35 mm)
Clearance: 40.8W x 1.9D x 2.5H mm
[Create Bin from Suggestion]
```

The suggestion accounts for:
- Gridfinity grid size (42mm per unit) and height units (7mm per unit)
- Wall thickness from the active profile
- A configurable minimum clearance (default 1mm per side)
- The reference object's current scale

Clicking "Create Bin from Suggestion" adds a new bin with the suggested parameters, positioned at the origin.

---

## Type System Changes

### New Types in `src/types/gridfinity.ts`

```typescript
// --- Reference geometry ---

export type ReferenceFileFormat = 'stl' | 'obj' | '3mf'

export interface ReferenceParams {
  // Transform
  scale: number                         // Uniform scale factor (default 1.0)
  rotation: [number, number, number]    // Euler angles in degrees (default [0,0,0])

  // Display
  opacity: number                       // 0.0-1.0 (default 0.4)
  color: string                         // Hex color (default '#e8a040')
  wireframe: boolean                    // Wireframe mode (default false)
  visible: boolean                      // Toggle visibility (default true)

  // Export
  includeInExport: boolean              // Include in STL/3MF export (default false)

  // File metadata (serialized to project JSON)
  sourceFileName: string                // Original file name
  sourceFileSize: number                // File size in bytes
  sourceFormat: ReferenceFileFormat     // File format
  vertexCount: number                   // Number of vertices
  triangleCount: number                 // Number of triangles

  // Bounding box in mm (at scale=1, pre-transform)
  boundingBox: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

export interface ReferenceObject extends GridfinityObjectBase {
  kind: 'reference'
  params: ReferenceParams
}
```

### Updated Union Types

```typescript
export type GridfinityObjectKind = 'baseplate' | 'bin' | 'reference'
export type GridfinityObject = BaseplateObject | BinObject | ReferenceObject
```

---

## Storage Architecture

### Geometry Serialization Format

Geometry is serialized as a compact binary structure stored in IndexedDB:

```typescript
interface SerializedGeometry {
  positions: Float32Array    // Vertex positions (x,y,z interleaved)
  normals: Float32Array      // Vertex normals (x,y,z interleaved)
  indices: Uint32Array       // Triangle indices
}
```

### IndexedDB Module — `src/engine/storage/geometryStorage.ts`

```typescript
// Open/initialize the IndexedDB database
function openGeometryDB(): Promise<IDBDatabase>

// Store geometry for a reference object
function saveReferenceGeometry(objectId: string, geometry: BufferGeometry): Promise<void>

// Retrieve geometry for a reference object
function loadReferenceGeometry(objectId: string): Promise<BufferGeometry | null>

// Delete geometry when a reference object is removed
function deleteReferenceGeometry(objectId: string): Promise<void>

// Delete all reference geometries (project clear/delete)
function clearAllReferenceGeometry(): Promise<void>

// Check if geometry exists for an object
function hasReferenceGeometry(objectId: string): Promise<boolean>
```

### Persistence Flow

**Import:**
1. User selects file via file input or drag-and-drop
2. File parsed into `BufferGeometry` via appropriate Three.js loader
3. Geometry stored in IndexedDB keyed by new object ID
4. `ReferenceObject` (with metadata only, no geometry data) added to project store
5. Project auto-save writes metadata to localStorage as usual

**Project Load:**
1. `loadProjectData()` restores objects from localStorage JSON
2. For each reference object, `SceneObject` triggers an async IndexedDB load
3. While loading, a placeholder bounding box is shown
4. If geometry not found in IndexedDB, properties panel shows "Re-import" prompt

**Project Delete:**
1. `deleteProject()` in `projectManagerStore` also calls `deleteReferenceGeometry()` for each reference object in that project

**Object Delete:**
1. `removeObject()` in `projectStore` calls `deleteReferenceGeometry(id)` for reference objects

---

## File Import Pipeline

### Module — `src/engine/import/referenceImporter.ts`

```typescript
interface ImportResult {
  geometry: BufferGeometry
  metadata: {
    fileName: string
    fileSize: number
    format: ReferenceFileFormat
    vertexCount: number
    triangleCount: number
    boundingBox: { min: [number, number, number]; max: [number, number, number] }
  }
}

// Main entry point — detects format from extension and delegates to loader
function importReferenceFile(file: File): Promise<ImportResult>

// Format-specific loaders
function importSTL(buffer: ArrayBuffer): BufferGeometry
function importOBJ(text: string): BufferGeometry
function import3MF(buffer: ArrayBuffer): Promise<BufferGeometry>
```

### STL Import

Uses Three.js `STLLoader`:

```typescript
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

function importSTL(buffer: ArrayBuffer): BufferGeometry {
  const loader = new STLLoader()
  const geometry = loader.parse(buffer)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}
```

### OBJ Import

Uses Three.js `OBJLoader`:

```typescript
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

function importOBJ(text: string): BufferGeometry {
  const loader = new OBJLoader()
  const group = loader.parse(text)
  // Merge all child meshes into a single BufferGeometry
  const geometries = group.children
    .filter((c): c is Mesh => c instanceof Mesh)
    .map((m) => m.geometry)
  const merged = mergeGeometries(geometries)
  // Dispose source geometries
  for (const g of geometries) g.dispose()
  return merged
}
```

### 3MF Import

Parses the OPC ZIP archive (via JSZip) and extracts mesh data from the 3D Model XML:

```typescript
import JSZip from 'jszip'

async function import3MF(buffer: ArrayBuffer): Promise<BufferGeometry> {
  const zip = await JSZip.loadAsync(buffer)
  const modelXml = await zip.file('3D/3dmodel.model')?.async('string')
  if (!modelXml) throw new Error('No 3D model found in 3MF archive')

  // Parse XML to extract vertices and triangles
  const parser = new DOMParser()
  const doc = parser.parseFromString(modelXml, 'application/xml')
  // Extract <vertices> and <triangles> elements
  // Build BufferGeometry from parsed data
  return geometry
}
```

### Validation

Before accepting an import:

- **File size limit**: 50 MB (configurable, prevents browser tab crash)
- **Triangle count warning**: > 500K triangles shows a warning that performance may suffer, with option to decimate
- **Format detection**: Extension-based (`.stl`, `.obj`, `.3mf`), with magic-byte fallback for STL (binary vs ASCII)

---

## Component Architecture

### Import Trigger — Toolbar Enhancement

Add "Reference" option to the "Add Object" dropdown in `Toolbar.tsx`:

```
Add Object ▾
├── Baseplate
├── Bin
├── ─────────
└── Import Reference...  → opens file picker
```

Also support **drag-and-drop** onto the viewport canvas. The viewport detects file drops with matching extensions and triggers the import pipeline.

### Properties Panel — `src/components/panels/ReferenceProperties.tsx`

```
┌─────────────────────────────┐
│ Reference 1 (reference)     │
├─────────────────────────────┤
│ Source File                  │
│ ┌─────────────────────────┐ │
│ │ wrench_metric_13mm.stl  │ │
│ │ 245 KB · 12,840 tris    │ │
│ │ [Re-import]             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Transform                   │
│ Scale     ──●────── 1.00    │
│ Rotate X  ──●────── 0°      │
│ Rotate Y  ──●────── 0°      │
│ Rotate Z  ──●────── 0°      │
├─────────────────────────────┤
│ Display                     │
│ Opacity   ──●────── 0.40    │
│ Color     [■ #e8a040]       │
│ Wireframe ○ Off             │
│ Visible   ● On              │
├─────────────────────────────┤
│ Export                       │
│ Include in export  ○ Off    │
├─────────────────────────────┤
│ Dimensions (at current      │
│ scale)                      │
│ Width:  85.2 mm             │
│ Depth:  40.1 mm             │
│ Height: 32.5 mm             │
├─────────────────────────────┤
│ Suggested Bin Size          │
│ Grid: 3W × 1D × 5H         │
│ Inner: 122.1 × 38.1 × 35mm │
│ Clearance: 36.9W 0.0D 2.5H │
│ [Create Bin from Suggestion]│
└─────────────────────────────┘
```

### Viewport Rendering — SceneObject.tsx Changes

```typescript
// In SceneObject component:
case 'reference':
  // Geometry loaded async from IndexedDB
  // Apply scale and rotation from params
  // Render with transparent material + configurable color
  // No modifier context (references don't have modifiers)
  // No edge highlighting
```

Reference objects use a separate mesh component (`ReferenceMesh`) that handles:

- Async geometry loading from IndexedDB (shows bounding box placeholder while loading)
- Applying `scale`, `rotation`, `opacity`, `color`, `wireframe` from params
- Visibility toggle via `visible` param
- Transform gizmo when selected

### Bin Dimension Suggestion — `src/engine/geometry/binSuggestion.ts`

```typescript
interface BinSuggestion {
  gridWidth: number
  gridDepth: number
  heightUnits: number
  innerWidth: number    // mm
  innerDepth: number    // mm
  innerHeight: number   // mm
  clearance: {
    width: number       // mm
    depth: number       // mm
    height: number      // mm
  }
}

function suggestBinDimensions(
  boundingBox: { min: [number, number, number]; max: [number, number, number] },
  scale: number,
  profile: GridfinityProfile,
  clearance?: number,  // mm per side, default 1.0
): BinSuggestion
```

The algorithm:
1. Compute scaled bounding box dimensions (width, depth, height)
2. Add clearance on each side (default 1mm)
3. Account for wall thickness from profile
4. Find minimum grid units: `ceil((neededWidth + tolerance*2 + wallThickness*2) / gridSize)`
5. Find minimum height units: `ceil(neededHeight / heightUnit)`
6. Clamp to valid ranges (1-10 grid, 1-10 height)
7. Compute actual inner dimensions and clearance at those grid sizes

---

## Store Changes

### Project Store — `src/store/projectStore.ts`

New/modified actions:

```typescript
interface ProjectStore {
  // Existing...
  addObject: (kind: GridfinityObjectKind) => string

  // New: Import reference — creates object + stores geometry in IndexedDB
  importReference: (file: File) => Promise<string>

  // New: Re-import reference — replaces geometry for existing reference object
  reimportReference: (objectId: string, file: File) => Promise<void>

  // Modified: removeObject also cleans up IndexedDB for reference objects
  removeObject: (id: string) => void

  // Modified: clearObjects also cleans up all IndexedDB reference geometry
  clearObjects: () => void
}
```

### UI Store — `src/store/uiStore.ts`

New state for import progress:

```typescript
interface UIStore {
  // Existing...

  // New: Import loading state
  importLoading: boolean
  importError: string | null
  setImportLoading: (loading: boolean) => void
  setImportError: (error: string | null) => void
}
```

### Geometry Cache — In-Memory Store

To avoid repeated IndexedDB reads, reference geometry is cached in a module-level `Map`:

```typescript
// src/engine/storage/geometryCache.ts
const cache = new Map<string, BufferGeometry>()

function getCachedGeometry(objectId: string): BufferGeometry | undefined
function setCachedGeometry(objectId: string, geometry: BufferGeometry): void
function removeCachedGeometry(objectId: string): void
function clearCache(): void
```

The cache is populated on import and on project load. Cache entries are disposed when objects are deleted.

---

## Export Pipeline Changes

### `mergeObjectGeometry.ts`

```typescript
function generateObjectGeometry(object: GridfinityObject, profile: GridfinityProfile): BufferGeometry {
  switch (object.kind) {
    case 'baseplate':
      return generateBaseplate(object.params, profile)
    case 'bin':
      return generateBin(object.params, profile)
    case 'reference':
      // Return cached geometry (clone to prevent disposal of the cache entry)
      return loadCachedReferenceGeometry(object.id)
  }
}

function mergeObjectWithModifiers(...): BufferGeometry {
  // Reference objects don't support modifiers — return base geometry directly
  if (object.kind === 'reference') {
    return generateObjectGeometry(object, profile)
  }
  // ... existing logic
}
```

### `printLayout.ts`

Filter reference objects based on `includeInExport`:

```typescript
function computePrintLayout(objects, modifiers, profile, ...): PrintLayoutItem[] {
  const exportableObjects = objects.filter(
    (obj) => obj.kind !== 'reference' || obj.params.includeInExport
  )
  // ... existing layout logic with exportableObjects
}
```

### `printOrientation.ts`

Reference objects use identity rotation (no auto-orientation):

```typescript
function getPrintRotation(object: GridfinityObject): Euler {
  switch (object.kind) {
    case 'baseplate': return new Euler(0, 0, 0)
    case 'bin': return new Euler(Math.PI, 0, 0)
    case 'reference': return new Euler(0, 0, 0)  // No auto-orientation
  }
}
```

---

## Implementation Phases

### Phase A: Core Import Infrastructure

**Scope:** STL import, IndexedDB storage, basic rendering, type system changes

**Files to create:**
- `src/types/gridfinity.ts` — Add `ReferenceObject`, `ReferenceParams`, update unions
- `src/engine/import/referenceImporter.ts` — File parsing (STL first)
- `src/engine/storage/geometryStorage.ts` — IndexedDB operations
- `src/engine/storage/geometryCache.ts` — In-memory geometry cache
- `src/engine/constants.ts` — Add `DEFAULT_REFERENCE_PARAMS`

**Files to modify:**
- `src/store/projectStore.ts` — Add `importReference`, update `removeObject`, `clearObjects`
- `src/store/uiStore.ts` — Add import loading state
- `src/components/viewport/SceneObject.tsx` — Add reference case to geometry switch
- `src/components/toolbar/Toolbar.tsx` — Add "Import Reference..." to dropdown
- `src/components/panels/PropertiesPanel.tsx` — Add reference case
- `src/engine/export/mergeObjectGeometry.ts` — Handle reference kind
- `src/engine/export/printLayout.ts` — Filter reference objects
- `src/engine/export/printOrientation.ts` — Handle reference kind

**Tests:**
- Unit: referenceImporter (STL parsing, validation, metadata extraction)
- Unit: geometryStorage (IndexedDB save/load/delete)
- Unit: geometryCache (cache operations)
- E2E: Import STL via toolbar, verify object appears in list and viewport

### Phase B: Properties Panel and OBJ/3MF Support

**Scope:** Full properties panel, OBJ + 3MF import, display controls

**Files to create:**
- `src/components/panels/ReferenceProperties.tsx` — Full properties panel
- `src/engine/geometry/__tests__/referenceImporter.test.ts` — Extended tests

**Files to modify:**
- `src/engine/import/referenceImporter.ts` — Add OBJ + 3MF parsers
- `src/components/panels/PropertiesPanel.tsx` — Wire in ReferenceProperties

**Tests:**
- Unit: OBJ import, 3MF import
- E2E: Properties panel controls (scale, rotation, opacity, color, wireframe, visibility)

### Phase C: Bin Suggestion and Export Integration

**Scope:** Auto-suggest bin dimensions, export toggle, drag-and-drop import

**Files to create:**
- `src/engine/geometry/binSuggestion.ts` — Bin dimension suggestion algorithm
- `src/engine/geometry/__tests__/binSuggestion.test.ts`

**Files to modify:**
- `src/components/panels/ReferenceProperties.tsx` — Add suggestion section
- `src/components/viewport/Viewport.tsx` — Add drag-and-drop file handling
- `src/engine/export/printLayout.ts` — Respect `includeInExport` flag

**Tests:**
- Unit: binSuggestion (various bounding boxes, profiles, clearances)
- E2E: Drag-and-drop import, "Create Bin from Suggestion" flow, export toggle behavior

### Phase D: Polish

**Scope:** Performance optimization, edge cases, mobile support

**Work items:**
- Large file handling — progress indicator for files > 5 MB
- Geometry decimation option for high-poly imports (> 500K triangles)
- Mobile file import (camera roll, Files app integration)
- Re-import flow when IndexedDB data is lost
- Print layout view — ghosted reference rendering when `includeInExport` is false
- Documentation updates (CLAUDE.md, README.md, ROADMAP.md)

---

## Dependency Changes

### No New Runtime Dependencies for Phase A-C

- `STLLoader` — already in `three/addons/loaders/STLLoader.js`
- `OBJLoader` — already in `three/addons/loaders/OBJLoader.js`
- `JSZip` — already installed for 3MF export
- `IndexedDB` — native browser API (no library needed)

### Future: STEP Support (Phase 7 / Tauri)

When STEP import is pursued:
- Browser: `opencascade.js` (~25 MB WASM, loaded on-demand via dynamic import)
- Tauri: Native Rust crate `opencascade-rs` with zero frontend bundle impact
- Consider a STEP-to-STL conversion service as an intermediate option

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Large files crash browser tab | File size limit (50 MB), triangle count warning (500K+), geometry decimation |
| IndexedDB cleared by user/browser | "Re-import" prompt in properties panel, metadata preserved in localStorage |
| OBJ files with multiple materials/groups | Merge all meshes into single geometry, discard materials |
| 3MF archives with multiple objects | Merge all objects, or prompt user to select which object to import |
| Units mismatch (inches vs mm) | Default to mm, provide a "Source units" dropdown that applies automatic scale conversion |
| Performance with many reference objects | Recommend max 3-5 references per project, geometry LOD for viewport |
| Project portability (sharing between machines) | Reference geometry must be re-imported on new machine. Consider optional geometry embedding in project export (future) |

---

## File Structure After Implementation

```
src/
├── engine/
│   ├── import/
│   │   ├── referenceImporter.ts       # File parsing (STL, OBJ, 3MF)
│   │   └── __tests__/
│   │       └── referenceImporter.test.ts
│   ├── storage/
│   │   ├── geometryStorage.ts         # IndexedDB operations
│   │   ├── geometryCache.ts           # In-memory geometry cache
│   │   └── __tests__/
│   │       ├── geometryStorage.test.ts
│   │       └── geometryCache.test.ts
│   ├── geometry/
│   │   ├── binSuggestion.ts           # Bin dimension suggestion
│   │   └── __tests__/
│   │       └── binSuggestion.test.ts
│   └── export/                        # Modified existing files
├── components/
│   ├── panels/
│   │   └── ReferenceProperties.tsx    # Reference properties panel
│   ├── viewport/                      # Modified SceneObject.tsx
│   └── toolbar/                       # Modified Toolbar.tsx
├── store/                             # Modified projectStore.ts, uiStore.ts
└── types/                             # Modified gridfinity.ts
```

---

## Open Questions

1. **Geometry decimation**: Should we implement client-side mesh decimation for high-poly imports, or just warn and let users decimate externally? A decimation library adds complexity but improves UX for users who don't have mesh editing tools.

2. **Multi-object 3MF**: When a 3MF contains multiple objects, should we import all as separate reference objects, merge into one, or prompt the user to choose?

3. **Project sharing**: When the project format evolves (Phase 7 / file-based saves), should reference geometry be embeddable in the project file? This would enable sharing complete projects without re-importing.

4. **Alignment tools**: Beyond transform gizmo positioning, should we add snap-to-center or align-to-bin-floor helpers for positioning reference geometry inside bins?
