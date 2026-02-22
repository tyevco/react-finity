# Image-to-3D Tool Cutouts & Finger Access Modifier

Architecture decision record for converting tool photos into 3D reference geometry and adding finger access cutouts to Gridfinity bins. Extends the reference geometry system (see `docs/reference-geometry-architecture.md`) with image-based import paths and adds a new modifier for ergonomic tool access.

**Status:** Proposed
**Date:** 2026-02-22
**Dependencies:** Reference Geometry Architecture (ADR), Modifier System (Phase 4)

---

## Table of Contents

1. [Motivation](#motivation)
2. [Overview](#overview)
3. [Part 1: Finger Access Modifier](#part-1-finger-access-modifier)
4. [Part 2: Reference Geometry Infrastructure](#part-2-reference-geometry-infrastructure)
5. [Part 3: Image-to-3D Silhouette Extrusion](#part-3-image-to-3d-silhouette-extrusion)
6. [Part 4: Image-to-3D AI Depth Estimation](#part-4-image-to-3d-ai-depth-estimation)
7. [File Inventory](#file-inventory)
8. [Dependency Analysis](#dependency-analysis)
9. [Verification Strategy](#verification-strategy)
10. [Risk Assessment](#risk-assessment)
11. [Open Questions](#open-questions)

---

## Motivation

A core Gridfinity workflow is designing custom holders for specific tools. Currently, users must manually measure their tools and translate those measurements into bin parameters. Two features address this friction:

1. **Image-to-3D conversion** -- Upload a photo of a tool and convert it to a 3D reference model that can be placed inside a bin for fitment design. Two conversion paths serve different accuracy needs: fast client-side silhouette extrusion (no dependencies, instant) and advanced AI depth estimation (browser WASM, higher fidelity).

2. **Finger Access modifier** -- Semicircular or slot cutouts at the top of bin walls that let users grab tools with their fingers. This is a common Gridfinity customization that currently requires external CAD tools.

### Design Constraints

- The reference geometry infrastructure from `docs/reference-geometry-architecture.md` is not yet implemented. The Image-to-3D feature depends on this infrastructure (types, IndexedDB storage, viewport rendering, properties panel).
- The Finger Access modifier is self-contained and follows the existing modifier pattern exactly. It has no dependency on the reference geometry system.
- The silhouette extrusion path must have zero new runtime dependencies.
- The AI depth estimation path must not affect initial bundle size (dynamic import only).

---

## Overview

The implementation is split into four parts with clear dependency ordering:

```
Part 1: Finger Access Modifier     (self-contained, no dependencies)
Part 2: Reference Geometry Infra   (from existing ADR)
Part 3: Silhouette Extrusion       (extends reference system)
Part 4: AI Depth Estimation         (extends reference system)
```

Parts 1 and 2 are independent of each other and can be developed in parallel. Parts 3 and 4 depend on Part 2. Part 4 depends on Part 3's UI (the `ImageTo3DDialog` component).

---

## Part 1: Finger Access Modifier

A new modifier kind that produces curved or rectangular cutouts at the top of bin walls, providing finger access for grabbing tools. This is geometrically an "inverted scoop" -- where the scoop modifier adds a curved ramp at the floor, finger access adds cutouts at the wall top.

The scoop modifier (`src/engine/geometry/modifiers/scoop.ts`) is the direct implementation template.

### Design Decisions

**D1: Additive geometry, not boolean subtraction.** Consistent with all existing modifiers, the finger access cutout is rendered as additive geometry (a filled half-cylinder or box) that visually represents where material is removed. The export pipeline merges all modifier geometries with the parent -- actual subtraction happens in the slicer. This avoids CSG complexity in the browser.

**D2: Multiple cutouts per wall.** Unlike the scoop (one per wall), finger access supports a `count` parameter (1-5) with cutouts evenly spaced along the wall span. This handles bins with dividers where each compartment needs its own access point.

**D3: Auto-sizing by default.** Width and depth default to 0, which triggers automatic sizing: width = `(span / count) * 0.7`, depth = `wallHeight * 0.3`. This produces reasonable cutouts for most bin sizes without manual tuning.

### Type Definitions

Add to `src/types/gridfinity.ts`:

```typescript
export type FingerAccessShape = 'semicircle' | 'slot'

export interface FingerAccessModifierParams {
  wall: WallFace
  shape: FingerAccessShape
  width: number    // mm, 0 = auto (span / count * 0.7)
  depth: number    // mm, 0 = auto (wallHeight * 0.3)
  count: number    // 1-5
}

export interface FingerAccessModifier extends ModifierBase {
  kind: 'fingerAccess'
  params: FingerAccessModifierParams
}
```

Update unions:

- `ModifierKind`: add `'fingerAccess'`
- `Modifier`: add `| FingerAccessModifier`

### Default Parameters

Add to `src/engine/constants.ts`:

```typescript
export const DEFAULT_FINGER_ACCESS_PARAMS: FingerAccessModifierParams = {
  wall: 'front',
  shape: 'semicircle',
  width: 0,
  depth: 0,
  count: 1,
}
```

### Geometry Generator

New file: `src/engine/geometry/modifiers/fingerAccess.ts`

Follows the scoop pattern directly:

1. Read `wall`, `shape`, `width`, `depth`, `count` from params; `innerWidth`, `innerDepth`, `wallHeight`, `floorY`, `centerX`, `centerZ` from context
2. Compute `effectiveWidth = width > 0 ? width : (span / count) * 0.7`
3. Compute `effectiveDepth = depth > 0 ? depth : wallHeight * 0.3`
4. Clamp depth to `wallHeight * 0.9`
5. For each cutout (evenly spaced along wall span):
   - **Semicircle**: `CylinderGeometry` half-cylinder, radius = `effectiveDepth`, height = `effectiveWidth`. Rotated and positioned at the top of the wall (`Y = floorY + wallHeight - clampedDepth`) with curved surface facing inward and downward (180-degree flip vs scoop)
   - **Slot**: Box from `roundedRectShape()` + `extrudeShape()`, positioned similarly
6. Wall switch (`front`/`back`/`left`/`right`) follows the same rotation/translation pattern as `scoop.ts` lines 37-62

This modifier does not subdivide space -- no child `ModifierContext` is needed.

### Controls Component

New file: `src/components/panels/modifiers/FingerAccessControls.tsx`

Pattern: `ScoopControls.tsx`. Contains:

| Control | Type | Range | Notes |
|---------|------|-------|-------|
| Wall | Select dropdown | front/back/left/right | Same as scoop |
| Shape | Select dropdown | Semicircle/Slot | |
| Width | Slider | 0-40mm, step 1 | Shows "Auto" when 0 |
| Depth | Slider | 0-20mm, step 1 | Shows "Auto" when 0 |
| Count | Slider | 1-5, step 1 | |

### Wiring Points

| File | Change |
|------|--------|
| `src/store/projectStore.ts` | Import `DEFAULT_FINGER_ACCESS_PARAMS`; add `case 'fingerAccess'` to `getDefaultModifierParams()` |
| `src/components/panels/ModifierSection.tsx` | Import `FingerAccessControls`; add to `MODIFIER_LABELS`; add `<DropdownMenuItem>` for Finger Access; add `case 'fingerAccess'` to `ModifierControls` switch |
| `src/engine/export/mergeObjectGeometry.ts` | Import `generateFingerAccess`; add `case 'fingerAccess'` to `generateModifierGeometry()` switch |

### Tests

**Unit tests** -- `src/engine/geometry/__tests__/modifiers/fingerAccess.test.ts` (pattern: `scoop.test.ts`):

- Valid geometry output (vertices > 0, index defined)
- Auto width/depth (params = 0) produces valid geometry
- Explicit width/depth produces valid geometry
- Wall targeting changes bounding box position (front vs back, left vs right)
- Geometry positioned at wall top (Y near `floorY + wallHeight`)
- `count > 1` produces more vertices than `count = 1`
- Both shapes (`semicircle`, `slot`) produce valid geometry

**E2E tests** -- `e2e/bin-properties.spec.ts`:

- Add finger access modifier to a bin, verify controls render
- Change wall face, verify geometry updates
- Remove modifier, verify it disappears from list

---

## Part 2: Reference Geometry Infrastructure

Implements the core reference geometry system from `docs/reference-geometry-architecture.md`. This is the prerequisite for Image-to-3D. Only the relevant aspects are summarized here -- see the full ADR for detailed design rationale.

### Type System Changes

In `src/types/gridfinity.ts`, add:

```typescript
export type ReferenceFileFormat = 'stl' | 'obj' | '3mf' | 'image-silhouette' | 'image-depth'

export interface ReferenceParams {
  scale: number
  rotation: [number, number, number]
  opacity: number
  color: string
  wireframe: boolean
  visible: boolean
  includeInExport: boolean
  sourceFileName: string
  sourceFileSize: number
  sourceFormat: ReferenceFileFormat
  vertexCount: number
  triangleCount: number
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

Update unions:

- `GridfinityObjectKind`: add `'reference'`
- `GridfinityObject`: add `| ReferenceObject`

The `'image-silhouette'` and `'image-depth'` format values are added from the start to avoid a second type-system change in Parts 3-4.

### IndexedDB Storage

New file: `src/engine/storage/geometryStorage.ts`

- Database: `react-finity-geometry`
- Object store: `reference-meshes`, keyed by object ID
- Operations: `saveReferenceGeometry()`, `loadReferenceGeometry()`, `deleteReferenceGeometry()`, `clearAllReferenceGeometry()`, `hasReferenceGeometry()`

### In-Memory Cache

New file: `src/engine/storage/geometryCache.ts`

Module-level `Map<string, BufferGeometry>` to avoid repeated IndexedDB reads. Populated on import and project load. Entries disposed on object delete.

### File Import Pipeline

New file: `src/engine/import/referenceImporter.ts`

| Format | Loader | Source |
|--------|--------|--------|
| STL | `STLLoader` | `three/addons/loaders/STLLoader.js` |
| OBJ | `OBJLoader` | `three/addons/loaders/OBJLoader.js` |
| 3MF | Custom XML parser | JSZip (already installed) |

All produce `BufferGeometry` + metadata (`ImportResult`). No new dependencies.

### Store Changes

In `src/store/projectStore.ts`:

- Add `importReference(file: File): Promise<string>` -- parses file, stores geometry in IndexedDB, creates `ReferenceObject`
- Add `addReferenceFromGeometry(geometry, metadata): string` -- used by Image-to-3D paths
- Update `removeObject()` to clean up IndexedDB for reference objects

### Properties Panel

New file: `src/components/panels/ReferenceProperties.tsx`

Controls for scale, rotation (X/Y/Z), opacity, color, wireframe toggle, visibility toggle, export inclusion toggle. Displays source file info and scaled dimensions. Includes "Suggest Bin Size" section per the reference geometry ADR.

### Viewport and Export Pipeline

| File | Change |
|------|--------|
| `src/components/viewport/SceneObject.tsx` | Add `'reference'` case -- async geometry load from cache/IndexedDB, apply scale/rotation/opacity/color/wireframe from params |
| `src/engine/export/mergeObjectGeometry.ts` | Add `'reference'` case to `generateObjectGeometry()` -- return cached geometry clone |
| `src/engine/export/printLayout.ts` | Filter reference objects based on `includeInExport` flag |
| `src/engine/export/printOrientation.ts` | Add `'reference'` case -- identity rotation (no auto-orientation) |

### Toolbar

In `src/components/toolbar/Toolbar.tsx`, add to the Add Object dropdown:

```
Add Object
  Baseplate
  Bin
  ──────────
  Import Reference...      -> file picker (STL/OBJ/3MF)
  Image to 3D...           -> opens ImageTo3DDialog
```

### Tests

- Unit: `referenceImporter` (STL/OBJ/3MF parsing, validation, metadata extraction)
- Unit: `geometryStorage` (IndexedDB save/load/delete)
- Unit: `geometryCache` (cache hit/miss/eviction)
- E2E: Import STL via toolbar, verify object appears in list; properties panel controls

---

## Part 3: Image-to-3D Silhouette Extrusion

Client-side only, zero new dependencies. Converts a tool photo into a 3D extruded silhouette by thresholding the image to a binary mask, extracting contours, and extruding them as Three.js geometry.

### Design Decisions

**D1: Client-side processing only.** No server, no API calls. All image processing runs in the browser using Canvas 2D. This keeps the app self-contained and works offline.

**D2: Otsu's method for automatic thresholding.** Users can manually adjust the threshold, but the default is computed via Otsu's algorithm -- a well-known technique that maximizes inter-class variance to find the optimal binary split point. This handles most tool-on-background photos without manual tuning.

**D3: Marching squares for contour extraction.** A standard algorithm for finding isocontours in a 2D scalar field. The implementation is ~200 lines of TypeScript with no dependencies. Produces polylines that are simplified via Ramer-Douglas-Peucker before conversion to Three.js shapes.

**D4: Pixel-to-mm calibration via known dimension.** Users specify a known physical dimension (e.g., "this wrench is 150mm long") and draw/identify the corresponding pixel distance. The ratio gives `pixelsPerMm`, which scales the extruded geometry to real-world size.

### Image Processing Pipeline

```
Photo (PNG/JPG/WEBP)
  -> loadImageToCanvas()     [imageProcessor.ts]
  -> thresholdImage()        [imageProcessor.ts]  -- binary mask
  -> computeOtsuThreshold()  [imageProcessor.ts]  -- auto threshold
  -> marchingSquares()       [contourExtractor.ts] -- contour polylines
  -> simplifyPolygon()       [contourExtractor.ts] -- RDP simplification
  -> classifyContours()      [contourExtractor.ts] -- outer/hole by signed area
  -> contoursToGeometry()    [silhouetteToGeometry.ts] -- THREE.Shape + extrude
  -> ReferenceObject         [stored via Part 2 infrastructure]
```

### Image Processor

New file: `src/engine/image/imageProcessor.ts`

```typescript
// Load image file into canvas, return ImageData
function loadImageToCanvas(file: File): Promise<ImageData>

// Convert RGBA image data to binary mask using luminance threshold
function thresholdImage(
  data: ImageData,
  threshold: number,
  invert: boolean,
): Uint8Array  // 1 = foreground, 0 = background

// Compute optimal threshold via Otsu's method
function computeOtsuThreshold(data: ImageData): number
```

### Contour Extractor

New file: `src/engine/image/contourExtractor.ts`

```typescript
interface Contour {
  points: Array<{ x: number; y: number }>
  isOuter: boolean  // true = outer boundary, false = hole
}

// Extract contour polylines from binary mask via marching squares
function extractContours(
  mask: Uint8Array,
  width: number,
  height: number,
): Contour[]

// Simplify polygon via Ramer-Douglas-Peucker algorithm
function simplifyPolygon(
  points: Array<{ x: number; y: number }>,
  tolerance: number,
): Array<{ x: number; y: number }>
```

**Marching squares** iterates over the 2D grid of binary values, examining each 2x2 cell to determine which edges the contour crosses. The 16 possible cell configurations are encoded in a lookup table. Adjacent edge crossings are linked into closed polylines.

**Contour classification** uses the signed area of each polygon (shoelace formula). Counter-clockwise polygons are outer boundaries; clockwise polygons are holes. Holes are assigned to the smallest enclosing outer polygon.

### Silhouette to Geometry

New file: `src/engine/image/silhouetteToGeometry.ts`

```typescript
interface SilhouetteOptions {
  pixelsPerMm: number       // from scale calibration
  extrusionDepth: number    // mm (user-configurable, default 10)
  simplifyTolerance: number // RDP tolerance in pixels (default 2.0)
}

function silhouetteToGeometry(
  contours: Contour[],
  options: SilhouetteOptions,
): BufferGeometry
```

The conversion:

1. Convert outer contours to `THREE.Shape` objects, with hole contours as `THREE.Path` added via `shape.holes.push()`
2. Scale from pixel coordinates to mm using `pixelsPerMm`
3. Call `extrudeShape()` from `src/engine/geometry/primitives.ts` with the specified depth
4. Center geometry at origin, compute normals and bounding box

### Scale Calibration

New file: `src/engine/image/scaleCalibration.ts`

```typescript
interface CalibrationResult {
  pixelsPerMm: number
}

// Compute scale from a known physical dimension
function calibrateFromKnownDimension(
  pixelDistance: number,  // measured in the image
  knownMm: number,       // real-world dimension
): CalibrationResult
```

Simple division, but isolated for testability and potential future expansion (multi-point calibration, ruler detection, etc.).

### Image-to-3D Dialog

New file: `src/components/panels/ImageTo3DDialog.tsx`

A multi-step modal dialog (shadcn `Dialog`):

**Step 1 -- Upload:**
- Drag-and-drop / file picker for PNG/JPG/WEBP
- Image preview with dimensions

**Step 2 -- Method Selection:**
- Radio group: "Silhouette (Fast)" / "Depth Estimation (Advanced)"
- Brief description of each method

**Step 3a -- Silhouette Settings** (if silhouette selected):
- Live threshold preview on a `<canvas>` element showing the binary mask overlaid on the original image
- Threshold slider (0-255, default from Otsu's)
- Invert toggle (for dark tools on light background vs light on dark)
- Simplification tolerance slider (0.5-5.0 pixels, default 2.0)
- Known dimension input: mm value + pixel distance (click two points on image)
- Extrusion depth slider (1-50mm, default 10)

**Step 3b -- Depth Settings** (if depth selected, see Part 4)

**Step 4 -- Preview:**
- Embedded mini React Three Fiber canvas showing the generated 3D geometry
- Rotate/zoom to inspect
- Vertex and triangle count display

**Step 5 -- Confirm:**
- "Add to Scene" button
- Stores geometry via IndexedDB (Part 2 infrastructure)
- Creates `ReferenceObject` with `sourceFormat: 'image-silhouette'`
- Closes dialog and selects the new object

### Tests

**Unit tests:**

- `imageProcessor.test.ts`:
  - `thresholdImage()` on a known pixel pattern produces expected binary mask
  - `computeOtsuThreshold()` on a bimodal histogram returns a value between the two peaks
  - Invert flag flips the mask

- `contourExtractor.test.ts`:
  - Rectangular binary mask produces a 4-point outer contour
  - Circular binary mask produces a contour approximating a circle
  - Mask with a hole produces one outer and one hole contour
  - `simplifyPolygon()` reduces point count while preserving shape

- `silhouetteToGeometry.test.ts`:
  - Single rectangle contour produces a valid extruded `BufferGeometry`
  - Scale calibration affects geometry dimensions correctly
  - Contour with holes produces fewer vertices than without (hole material removed)

- `scaleCalibration.test.ts`:
  - `calibrateFromKnownDimension(100, 50)` returns `pixelsPerMm = 2.0`
  - Edge cases: zero/negative values throw errors

**E2E tests:**

- Open Image-to-3D dialog from toolbar
- Upload an image, verify preview renders
- Click "Add to Scene", verify reference object appears in object list

---

## Part 4: Image-to-3D AI Depth Estimation

Uses `@huggingface/transformers` with the Depth Anything V2 Small model to estimate per-pixel depth from a single photo, then converts the depth map to a 3D mesh. Runs entirely in the browser via WebGPU/WASM.

### Design Decisions

**D1: Depth Anything V2 Small.** The `Xenova/depth-anything-v2-small` model is ~100 MB ONNX, optimized for browser inference. It provides monocular depth estimation from a single image -- no stereo pair needed. The "small" variant balances quality and download size.

**D2: Dynamic import only.** The `@huggingface/transformers` package is imported via `import()` at runtime, only when the user selects the depth estimation path. This keeps the initial bundle size unaffected. The model itself is downloaded and cached by the transformers library on first use.

**D3: Grid mesh from depth map.** The depth map is sampled onto a regular vertex grid (configurable resolution, default 128x128). Each vertex's Y coordinate is set from the depth value. This produces a displaced plane mesh -- coarser than a point cloud but suitable for Gridfinity fitment design.

**D4: Progress feedback is essential.** Model download (~100 MB on first use) and inference (~2-5 seconds) need clear progress indicators. The transformers library provides progress callbacks for both stages.

### Install Dependency

```bash
npm install @huggingface/transformers
```

This is the only new runtime dependency across the entire feature set. It is dynamically imported and does not affect initial bundle size.

### Depth Estimator

New file: `src/engine/image/depthEstimator.ts`

```typescript
type ProgressCallback = (progress: {
  status: 'download' | 'inference'
  progress: number  // 0-1
  message: string
}) => void

interface DepthResult {
  depthMap: Float32Array  // normalized 0-1 depth values
  width: number
  height: number
}

// Estimate depth from a single image
async function estimateDepth(
  imageData: ImageData,
  onProgress?: ProgressCallback,
): Promise<DepthResult>
```

Implementation:

1. `const { pipeline } = await import('@huggingface/transformers')`
2. Create `depth-estimation` pipeline with `Xenova/depth-anything-v2-small`
3. Convert `ImageData` to a format the pipeline accepts
4. Run inference with progress callbacks
5. Return normalized depth map as `Float32Array`

### Depth Map to Geometry

New file: `src/engine/image/depthMapToGeometry.ts`

```typescript
interface DepthMeshOptions {
  resolution: number      // grid resolution (default 128)
  depthScale: number      // mm multiplier for depth values (default 20)
  smoothingPasses: number // Laplacian smoothing iterations (default 1)
  pixelsPerMm: number     // from scale calibration
}

function depthMapToGeometry(
  depthMap: Float32Array,
  mapWidth: number,
  mapHeight: number,
  options: DepthMeshOptions,
): BufferGeometry
```

The conversion:

1. Sample depth map onto a vertex grid at the specified resolution
2. Set vertex positions: X/Z from grid coordinates (scaled by `pixelsPerMm`), Y from depth value * `depthScale`
3. Create triangle indices (2 triangles per grid cell, row-major order)
4. Optional Laplacian smoothing pass -- each vertex Y is averaged with its neighbors to reduce noise
5. Compute vertex normals via `geometry.computeVertexNormals()`
6. Center geometry at origin, compute bounding box

### UI: Extend ImageTo3DDialog

Add step 3b (depth estimation path) to the dialog from Part 3:

**Step 3b -- Depth Settings:**
- Progress indicator during model download (first use only, shows MB downloaded)
- Progress indicator during inference
- Depth map preview (grayscale visualization on a canvas)
- Depth scale slider (5-50mm, default 20)
- Mesh resolution slider (64/128/256, default 128)
- Smoothing passes slider (0-3, default 1)

The preview step (Step 4) and confirm step (Step 5) work identically to the silhouette path, except `sourceFormat` is set to `'image-depth'`.

### Tests

**Unit tests:**

- `depthMapToGeometry.test.ts`:
  - Flat depth map (all zeros) produces a flat plane geometry
  - Linear gradient depth map produces a sloped mesh (vertex Y values increase monotonically)
  - Resolution parameter controls vertex count (`resolution^2` vertices)
  - Smoothing reduces variance in noisy input
  - Depth scale multiplier affects geometry height range

**E2E tests:**

- Depth estimation E2E testing is challenging due to the ~100 MB model download. Options:
  - Mock the `@huggingface/transformers` module in Playwright to return a synthetic depth map
  - Skip the model download/inference and test only the UI flow (dialog steps, controls rendering)
  - Use a pre-cached model in CI (slower but comprehensive)
- Recommended: mock-based E2E that verifies the dialog flow and geometry creation without actual model inference

---

## File Inventory

### New Files

| File | Part | Purpose |
|------|------|---------|
| `src/engine/geometry/modifiers/fingerAccess.ts` | 1 | Finger access geometry generator |
| `src/components/panels/modifiers/FingerAccessControls.tsx` | 1 | Finger access modifier UI controls |
| `src/engine/geometry/__tests__/modifiers/fingerAccess.test.ts` | 1 | Unit tests for finger access geometry |
| `src/engine/storage/geometryStorage.ts` | 2 | IndexedDB storage for reference geometry |
| `src/engine/storage/geometryCache.ts` | 2 | In-memory geometry cache |
| `src/engine/import/referenceImporter.ts` | 2 | STL/OBJ/3MF file import pipeline |
| `src/components/panels/ReferenceProperties.tsx` | 2 | Reference object properties panel |
| `src/engine/image/imageProcessor.ts` | 3 | Image loading, thresholding, Otsu's method |
| `src/engine/image/contourExtractor.ts` | 3 | Marching squares contour extraction + RDP simplification |
| `src/engine/image/silhouetteToGeometry.ts` | 3 | Contour-to-BufferGeometry conversion |
| `src/engine/image/scaleCalibration.ts` | 3 | Pixel-to-mm scale calibration |
| `src/components/panels/ImageTo3DDialog.tsx` | 3 | Multi-step Image-to-3D conversion dialog |
| `src/engine/image/depthEstimator.ts` | 4 | AI depth estimation via Hugging Face transformers |
| `src/engine/image/depthMapToGeometry.ts` | 4 | Depth map to mesh conversion |

### Modified Files

| File | Part(s) | Change Summary |
|------|---------|----------------|
| `src/types/gridfinity.ts` | 1, 2 | Add `FingerAccessModifier` types, `ReferenceObject` types, update unions |
| `src/engine/constants.ts` | 1 | Add `DEFAULT_FINGER_ACCESS_PARAMS` |
| `src/store/projectStore.ts` | 1, 2 | Add finger access defaults case, add `importReference()`, `addReferenceFromGeometry()`, update `removeObject()` |
| `src/components/panels/ModifierSection.tsx` | 1 | Wire in finger access controls and dropdown item |
| `src/engine/export/mergeObjectGeometry.ts` | 1, 2 | Add `'fingerAccess'` and `'reference'` cases to geometry switches |
| `src/components/toolbar/Toolbar.tsx` | 2, 3 | Add "Import Reference..." and "Image to 3D..." to Add Object dropdown |
| `src/components/viewport/SceneObject.tsx` | 2 | Add `'reference'` case for viewport rendering |
| `src/components/panels/PropertiesPanel.tsx` | 2 | Add `'reference'` case to render `ReferenceProperties` |
| `src/engine/export/printLayout.ts` | 2 | Filter reference objects by `includeInExport` |
| `src/engine/export/printOrientation.ts` | 2 | Add `'reference'` case (identity rotation) |
| `package.json` | 4 | Add `@huggingface/transformers` dependency |
| `CLAUDE.md` | 1, 2, 3, 4 | Update modifier lists, directory structure, key patterns |
| `ROADMAP.md` | 1, 2, 3, 4 | Note deliverables in appropriate phases |

---

## Dependency Analysis

| Feature | New Dependencies | Bundle Impact | Notes |
|---------|-----------------|---------------|-------|
| Finger Access modifier | None | 0 KB | Uses existing Three.js + primitives |
| Reference geometry infra | None | 0 KB | STLLoader/OBJLoader bundled with Three.js, JSZip already installed, IndexedDB is native |
| Silhouette extrusion | None | 0 KB | Pure TypeScript image processing |
| AI depth estimation | `@huggingface/transformers` | 0 KB initial (dynamic import) | ~100 MB model downloaded on first use, cached by browser |

---

## Verification Strategy

After each part, all three verification gates must pass:

1. `npm run test` -- all unit tests pass
2. `npm run test:e2e` -- all E2E tests pass
3. `npm run build` -- TypeScript compiles, production build succeeds

### Part 1 Manual Verification

- Add a bin, add a finger access modifier
- Verify it renders on each wall face (front, back, left, right)
- Verify count parameter spaces cutouts evenly
- Verify both shapes (semicircle, slot) render correctly
- Export to STL and verify merged geometry includes the cutout

### Parts 3-4 Manual Verification

- Open the Image-to-3D dialog from the toolbar
- Upload a test image (e.g., a wrench photo)
- Verify silhouette extraction produces a reasonable binary mask
- Verify the 3D preview shows an extruded shape matching the tool outline
- Click "Add to Scene", verify a reference object appears in the viewport and object list
- For depth path: verify progress indicators during model download and inference

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Finger access geometry overlaps with scoop on same wall | Low | Both are additive geometry -- visual overlap is harmless. Document that users should choose one or the other per wall. |
| Silhouette extraction fails on complex backgrounds | Medium | Otsu's automatic thresholding handles most bimodal distributions. Manual threshold slider + invert toggle cover edge cases. Recommend solid-color backgrounds in UI. |
| Marching squares produces too many contour points | Low | RDP simplification with configurable tolerance reduces point count. Default tolerance of 2.0 pixels is reasonable for most images. |
| AI model download is slow on first use | Medium | Clear progress indicator with MB count. Model cached by transformers library after first download. Consider offering a "Download model now" button in settings. |
| AI depth estimation is inaccurate for thin tools | Medium | Depth Anything V2 struggles with objects thinner than ~5mm in photos. Silhouette extrusion is the recommended path for flat/thin tools. Document the tradeoff in the dialog method selection. |
| WebGPU not available in all browsers | Low | `@huggingface/transformers` falls back to WASM when WebGPU is unavailable. Performance degrades but functionality is preserved. |
| Large images (>4K) cause memory pressure | Low | Resize images to max 1024px before processing. The transformers pipeline also internally resizes for inference. |
| IndexedDB storage quota exceeded | Low | Reference geometry is typically 1-5 MB per object. Modern browsers allow 50+ MB per origin. Warn if approaching quota. |

---

## Open Questions

1. **Contour extraction algorithm**: Marching squares is proposed as the simplest approach with no dependencies. An alternative is a flood-fill-based boundary tracer, which is simpler to implement but produces noisier contours. Should we benchmark both approaches on real tool photos before committing?

2. **Multi-contour handling for silhouette**: When thresholding produces multiple disconnected regions (e.g., a photo with multiple tools), should we import all contours as one geometry, let the user select which contour to import, or import each as a separate reference object?

3. **Depth estimation model selection**: Depth Anything V2 Small is the proposed model. Larger variants (Base, Large) produce better results but increase download size (300 MB+). Should we offer a model quality selector in settings, or lock to Small for simplicity?

4. **Scale calibration UX**: The proposed approach requires the user to input a known dimension. An alternative is automatic scale detection using ArUco markers or a reference object of known size (e.g., a coin). Automatic detection adds complexity -- worth it for v1?

5. **Finger access vs boolean subtraction**: The current approach renders finger access as additive geometry (matching all other modifiers). When CSG support is eventually added (Phase 7+), should finger access be retroactively changed to true boolean subtraction from the bin walls?
