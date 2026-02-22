# iOS LiDAR Workspace Scanner

Architecture research for an iOS companion app that uses LiDAR to scan physical workspaces and recommend optimal Gridfinity storage configurations for use in React-Finity.

**Status:** Proposed
**Date:** 2026-02-22
**Scope:** iOS companion app design, workspace-to-grid mapping algorithm, web app integration

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [iOS LiDAR Technology Overview](#ios-lidar-technology-overview)
3. [Scanning Approach](#scanning-approach)
4. [Gridfinity Configuration Algorithm](#gridfinity-configuration-algorithm)
5. [Data Transfer Schema](#data-transfer-schema)
6. [iOS App Architecture](#ios-app-architecture)
7. [Web App Integration Points](#web-app-integration-points)
8. [Implementation Phases](#implementation-phases)
9. [Trade-offs & Alternatives](#trade-offs--alternatives)

---

## Problem Statement

Gridfinity users design storage systems for specific physical spaces -- desk drawers, tool chest compartments, workbenches, shelving units. Today, the workflow to go from a physical space to a React-Finity project is entirely manual:

1. Measure the workspace with a tape measure or ruler
2. Convert millimeter dimensions to Gridfinity grid units (42mm per unit)
3. Account for tolerances, wall clearances, and irregular shapes
4. Manually create baseplates and bins in the web app
5. Iterate when the printed result doesn't quite fit

This process is error-prone at every step. Tape measurements of enclosed spaces (drawer interiors, recessed shelves) are awkward to take and easy to get wrong by several millimeters. Converting to grid units requires mental arithmetic. And there is no way to verify the result until after printing.

### Goals

1. **Accurate scanning** -- Capture workspace dimensions with millimeter-level precision using LiDAR, eliminating manual measurement errors
2. **Automatic configuration** -- Map scanned dimensions to an optimal Gridfinity layout (baseplates, bins, bin sizes) that maximizes coverage of the scanned area
3. **AR preview** -- Let users see the proposed Gridfinity layout overlaid on the physical space before committing to a design
4. **Seamless handoff** -- Transfer the scanned configuration to React-Finity for further customization and export

### Non-Goals

- Full room scanning or floor plan generation
- Object recognition (identifying what tools/items are in the workspace)
- Inventory management or "what goes where" recommendations
- Android support in initial scope (see [Trade-offs & Alternatives](#trade-offs--alternatives))

---

## iOS LiDAR Technology Overview

### Device Requirements

LiDAR is available on:
- **iPhone**: 12 Pro, 13 Pro, 14 Pro, 15 Pro, 16 Pro (and Max/Ultra variants)
- **iPad**: Pro models from 2020 onward (M-series chip preferred for performance)

The LiDAR scanner is a dToF (direct Time-of-Flight) sensor that emits infrared light pulses and measures return time. It operates at up to 5 meters range with effective accuracy of approximately 1% of distance. For workspace scanning at typical distances (0.2-1.5m), this translates to **2-15mm accuracy** -- sufficient for Gridfinity grid alignment since one grid unit is 42mm.

### Available APIs

| API | iOS Version | Purpose | Suitability |
|-----|-------------|---------|-------------|
| **ARKit (ARWorldTrackingConfiguration)** | 14+ | Raw point cloud + mesh data, plane detection, scene understanding | Best for custom surface detection and bounding box extraction |
| **RoomPlan** | 16+ | Structured room scanning -- walls, doors, windows, furniture classification | Designed for rooms, not drawers. Useful for open surfaces (desks, shelving) but poor for enclosed small spaces |
| **ARKit Scene Geometry** | 13.4+ | Real-time mesh reconstruction of environment | Good for irregular shape capture and mesh-based dimension extraction |
| **RealityKit** | 13+ | 3D rendering and AR entity placement | AR overlay visualization of proposed Gridfinity layout |

**Recommended approach:** ARKit with scene geometry for scanning (works for both enclosed and open spaces), combined with RealityKit for AR preview.

RoomPlan is not suitable as the primary scanning API because it is optimized for room-scale geometry (walls, floors, ceilings) and classifies furniture at a high level. It does not detect drawer interiors, shelf recesses, or workbench surfaces at the precision needed. However, it could serve as a secondary input for open workspace scanning -- identifying a desk surface or shelving unit that the user then refines.

### Accuracy Characteristics

| Distance | LiDAR Accuracy | Grid Units Affected |
|----------|---------------|-------------------|
| 0.2m (drawer interior) | ~2mm | < 1/20th of a grid unit -- negligible |
| 0.5m (desk surface) | ~5mm | < 1/8th of a grid unit -- negligible |
| 1.0m (workbench) | ~10mm | ~1/4 of a grid unit -- round down to be safe |
| 1.5m (shelving unit) | ~15mm | ~1/3 of a grid unit -- round down, warn user |

For workspace scanning, the practical accuracy is better than raw LiDAR specs suggest because:
- Multiple samples are averaged during a scan sweep
- Plane fitting algorithms smooth out individual point noise
- Edge detection benefits from the structured geometry of manufactured surfaces (flat walls, right angles)

---

## Scanning Approach

The app supports two workspace categories with different scanning strategies.

### Category 1: Enclosed Spaces

**Examples:** Desk drawers, toolbox compartments, cabinet shelves, recessed shelving bays, parts bins

**Characteristics:**
- Well-defined walls on 3-4 sides
- A floor surface
- An overhead constraint (clearance to the shelf/lid above)
- Typically rectangular or near-rectangular
- Small scale (100-600mm per dimension)

**Scanning method:**
1. User points the device into the open space (drawer pulled out, cabinet door open)
2. ARKit detects the horizontal floor plane and vertical wall planes
3. The app guides the user to move slowly to capture all surfaces (visual progress indicator showing which walls/floor/ceiling have been detected)
4. Plane intersection computes the bounding box:
   - Width = distance between left and right wall planes
   - Depth = distance between front and back wall planes
   - Height = distance from floor plane to overhead plane (if detected)
5. For non-rectangular spaces (L-shaped drawers, rounded corners), the app fits the largest inscribed rectangle and reports both the full outline and the usable rectangular region

**Scan guidance UX:**
```
+--------------------------------------------------+
|                                                    |
|   [ AR Camera View ]                              |
|                                                    |
|   Detected surfaces:                              |
|   [x] Floor    [x] Left wall   [x] Right wall    |
|   [x] Back     [ ] Overhead                       |
|                                                    |
|   Dimensions:  382mm x 524mm x (scanning...)      |
|                                                    |
|   "Tilt up slightly to capture overhead clearance" |
|                                                    |
|              [ Finish Scan ]                       |
+--------------------------------------------------+
```

### Category 2: Open Surfaces

**Examples:** Desktop areas, workbench tops, shelf tops, garage peg board walls, inside of closets

**Characteristics:**
- A flat base surface (desk, shelf)
- User-defined boundaries (they choose how much of the surface to use)
- No inherent overhead constraint (or optional -- shelf above a desk)
- Potentially large scale (500-2000mm+)

**Scanning method:**
1. User scans the surface. ARKit detects the primary horizontal plane.
2. User taps the four corners of the area they want to cover with Gridfinity, placing AR markers on the detected plane. This defines the workspace rectangle on an otherwise unbounded surface.
3. Optionally, the user scans upward to detect an overhead surface (shelf above the desk) for height constraints.
4. The app computes:
   - Width = distance between corner pairs along the longer axis
   - Depth = distance between corner pairs along the shorter axis
   - Height = overhead clearance (if scanned), otherwise unconstrained

**Corner placement UX:**
```
+--------------------------------------------------+
|                                                    |
|   [ AR Camera View with detected surface ]        |
|                                                    |
|   o-----------o     Place corners to              |
|   |           |     define workspace area.         |
|   |   Desk    |                                    |
|   |           |     Corners placed: 3/4            |
|   o-----------o                                    |
|                     892mm x 456mm                  |
|                                                    |
|       [ Undo Corner ]  [ Finish Area ]            |
+--------------------------------------------------+
```

### Handling Irregular Shapes

Some workspaces are not rectangular:
- L-shaped drawers
- Drawers with rounded corners
- Shelves with support brackets intruding
- Surfaces with obstructions (pipes, wiring channels)

The app captures the full outline as a polygon from the mesh/plane data. It then computes:
1. The **axis-aligned bounding box** (full enclosing rectangle)
2. The **largest inscribed rectangle** (maximum usable rectangular area)
3. The **margin areas** where Gridfinity would not fit

The user can choose which rectangle to use for configuration. The inscribed rectangle is the default recommendation since it guarantees the Gridfinity layout will fit entirely within the space.

### Scan Refinement

After the initial scan, the user can:
- **Adjust dimensions manually** -- fine-tune width/depth/height by +/- mm if they know the measurement is slightly off
- **Add margin offsets** -- specify a buffer (e.g., 2mm per side) to account for manufacturing tolerances in the workspace itself
- **Lock height** -- set a specific height constraint if the overhead clearance is known but hard to scan (e.g., "this drawer is exactly 65mm deep")

---

## Gridfinity Configuration Algorithm

The core algorithm maps scanned physical dimensions (in mm) to an optimal Gridfinity layout.

### Input

```
WorkspaceDimensions {
  width: number     // mm (inner usable width)
  depth: number     // mm (inner usable depth)
  height: number?   // mm (optional overhead clearance)
  margins: {        // optional per-side deductions
    left: number
    right: number
    front: number
    back: number
  }
}
```

### Step 1: Compute Available Space

Subtract margins from raw dimensions:

```
availableWidth = width - margins.left - margins.right
availableDepth = depth - margins.front - margins.back
```

### Step 2: Grid Unit Fitting

Each Gridfinity baseplate unit occupies `gridSize` mm (42mm with the Official profile). Compute the maximum number of grid units that fit:

```
gridUnitsX = floor(availableWidth / profile.gridSize)
gridUnitsY = floor(availableDepth / profile.gridSize)
```

**Example:** A 382mm x 524mm drawer with Official profile:
- gridUnitsX = floor(382 / 42) = floor(9.095) = **9 units** (378mm)
- gridUnitsY = floor(524 / 42) = floor(12.476) = **12 units** (504mm)
- Leftover: 4mm on width side, 20mm on depth side

### Step 3: Baseplate Tiling

React-Finity baseplates support a maximum of 10x10 grid units. If the workspace requires more than 10 units in either dimension, multiple baseplates must be tiled:

```
platesX = ceil(gridUnitsX / 10)
platesY = ceil(gridUnitsY / 10)
```

Distribute grid units across baseplates to balance sizes. Prefer equal-sized plates when possible; use smaller edge plates when units don't divide evenly.

**Tiling algorithm (per axis):**

```
function tileAxis(totalUnits: number): number[] {
  if (totalUnits <= 10) return [totalUnits]

  // Try to split into equal-sized plates
  const plateCount = ceil(totalUnits / 10)
  const baseSize = floor(totalUnits / plateCount)
  const remainder = totalUnits - (baseSize * plateCount)

  // Distribute remainder: some plates get baseSize+1
  const plates: number[] = []
  for (let i = 0; i < plateCount; i++) {
    plates.push(baseSize + (i < remainder ? 1 : 0))
  }
  return plates
}
```

**Example (continuing):** 9 x 12 grid units:
- X axis: 9 units fits in a single plate (9)
- Y axis: 12 units -> 2 plates: [6, 6]
- Result: 2 baseplates, each 9x6

### Step 4: Height Constraint to Bin Height Units

If an overhead clearance was scanned, compute the maximum bin height:

```
maxBinHeight = height - profile.baseplateHeight

// Bin total height = socketWallHeight + (heightUnits * heightUnit) + stackingLipHeight
// Solve for max heightUnits:
availableForUnits = maxBinHeight - profile.socketWallHeight - profile.stackingLipHeight
maxHeightUnits = floor(availableForUnits / profile.heightUnit)
maxHeightUnits = clamp(maxHeightUnits, 1, 10)
```

**Example:** 65mm drawer height, Official profile:
- maxBinHeight = 65 - 7 = 58mm
- availableForUnits = 58 - 4.65 - 4.4 = 48.95mm
- maxHeightUnits = floor(48.95 / 7) = **6 units** (42mm walls, 51.05mm total bin height)
- Remaining clearance: 65 - 7 - 51.05 = 6.95mm

If no overhead constraint, default to a reasonable height (e.g., 3 height units) and let the user adjust in React-Finity.

### Step 5: Profile Impact

Different profiles change the effective coverage slightly:

| Profile | Tolerance | Bin Footprint per Grid Unit | Wasted Space per Bin |
|---------|-----------|---------------------------|---------------------|
| Official | 0.25mm | 41.5mm | 0.5mm |
| Tight Fit | 0.1mm | 41.8mm | 0.2mm |
| Loose Fit | 0.4mm | 41.2mm | 0.8mm |

The configuration algorithm uses the selected profile's `tolerance` to compute accurate bin interior dimensions. This matters when recommending divider/compartment counts -- tighter profiles yield slightly more interior space per bin.

### Step 6: Generate Recommended Layout

The algorithm produces a complete `ProjectData` structure:

1. **Baseplates** -- one per tile from Step 3, positioned at correct offsets
2. **Bins** -- one bin per baseplate (full baseplate coverage), with height from Step 4
3. **Default modifiers** -- no modifiers initially; the user customizes in React-Finity

```
Recommendation {
  baseplates: [
    { gridWidth: 9, gridDepth: 6, position: [0, 0, 0] },
    { gridWidth: 9, gridDepth: 6, position: [0, 0, 252] },
  ],
  bins: [
    { gridWidth: 9, gridDepth: 6, heightUnits: 6, position: [0, 7, 0] },
    { gridWidth: 9, gridDepth: 6, heightUnits: 6, position: [0, 7, 252] },
  ],
  workspace: {
    scannedWidth: 382,
    scannedDepth: 524,
    scannedHeight: 65,
    coverageWidth: 378,   // 9 * 42
    coverageDepth: 504,   // 12 * 42
    leftoverWidth: 4,
    leftoverDepth: 20,
    coveragePercent: 95.2, // (378 * 504) / (382 * 524)
  },
  profile: "official",
}
```

### Coverage Visualization

The iOS app should show the user how well the Gridfinity layout covers the scanned area:

```
+----------------------------------------------+  ^
|                                              |  |
|  +----------------------------------------+  |  |
|  |                                        |  |  |
|  |    Gridfinity coverage (378 x 504mm)   |  |  524mm
|  |    9 x 12 grid = 2 baseplates          |  |  |
|  |    (9x6 + 9x6)                         |  |  |
|  |                                        |  |  |
|  +----------------------------------------+  |  |
|  ^-- 2mm gap each side                      |  |
|              20mm unused depth -->            |  v
+----------------------------------------------+
<-------------------- 382mm ------------------->
```

---

## Data Transfer Schema

### WorkspaceScan JSON Format

The iOS app produces a `WorkspaceScan` object that captures everything needed for configuration:

```typescript
interface WorkspaceScan {
  version: 1
  scannedAt: string              // ISO 8601 timestamp
  deviceModel: string            // e.g., "iPhone 15 Pro"

  workspace: {
    type: 'enclosed' | 'open'
    width: number                // mm, usable interior width
    depth: number                // mm, usable interior depth
    height: number | null        // mm, overhead clearance (null if unconstrained)
    shape: 'rectangular' | 'irregular'
    outline: [number, number][]  // polygon vertices in mm (for irregular shapes)
    margins: {
      left: number
      right: number
      front: number
      back: number
    }
  }

  recommendation: {
    profileKey: string           // "official" | "tightFit" | "looseFit"
    baseplates: Array<{
      gridWidth: number
      gridDepth: number
      offsetX: number            // mm from workspace origin
      offsetZ: number
    }>
    bins: Array<{
      gridWidth: number
      gridDepth: number
      heightUnits: number
      baseplateIndex: number     // which baseplate this bin sits on
    }>
    coverage: {
      widthMm: number
      depthMm: number
      percent: number
      leftoverWidthMm: number
      leftoverDepthMm: number
    }
  }
}
```

### Transfer Methods

Listed in order of implementation priority:

| Method | Direction | Complexity | UX Quality | Phase |
|--------|-----------|-----------|------------|-------|
| **Clipboard (JSON)** | iOS -> Web | Low | Moderate -- paste into import dialog | A |
| **URL scheme** | iOS -> Web | Low | Good -- opens web app with params | A |
| **Share sheet (file)** | iOS -> Web | Medium | Good -- native share to "Open in React-Finity" | B |
| **QR code** | iOS -> Web | Medium | Good for cross-device -- scan QR on desktop | A |
| **Cloud sync** | Bidirectional | High | Best -- automatic sync | C |

**URL scheme approach (Phase A):**

The iOS app opens a URL that the hosted React-Finity instance handles:

```
https://react-finity.app/import?scan={base64-encoded-WorkspaceScan-JSON}
```

For local development:
```
http://localhost:5173/import?scan={base64-encoded-WorkspaceScan-JSON}
```

URL length limits (~2000 chars for broad compatibility) may be a constraint for complex scans. The base64-encoded JSON for a typical 2-baseplate layout is approximately 800-1200 chars, which fits comfortably.

**QR code approach (Phase A):**

For cross-device transfer (scan on phone, design on desktop), the iOS app displays a QR code containing the same URL. The user scans it with their desktop browser's camera or a QR reader. This avoids any network dependency.

---

## iOS App Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI framework | SwiftUI | Declarative UI, native iOS look |
| 3D scanning | ARKit (ARWorldTrackingConfiguration with scene reconstruction) | LiDAR mesh + plane detection |
| AR overlay | RealityKit | Visualize Gridfinity layout on scanned surface |
| Data model | Swift Codable structs | JSON serialization for transfer |
| Persistence | SwiftData or UserDefaults | Save scan history locally |
| QR generation | CoreImage (CIQRCodeGenerator) | Generate transfer QR codes |

### App Structure

```
GridfinityScanner/
  App/
    GridfinityScannerApp.swift     # App entry point
    ContentView.swift              # Tab navigation (Scan / History / Settings)
  Scanning/
    ScannerView.swift              # AR camera view + scan guidance
    ScanSession.swift              # Manages ARSession, plane detection
    SurfaceDetector.swift          # Plane classification + bounding box
    BoundingBoxCalculator.swift    # Computes workspace dimensions from planes
  Configuration/
    GridCalculator.swift           # Grid unit fitting algorithm
    TilingEngine.swift             # Baseplate tiling logic
    HeightCalculator.swift         # Height constraint -> bin height units
    ProfileDefinitions.swift       # Gridfinity profiles (mirror constants.ts)
  Preview/
    ARPreviewView.swift            # AR overlay of proposed layout
    ConfigSummaryView.swift        # 2D summary with dimensions + coverage
  Transfer/
    WorkspaceScan.swift            # Codable data model
    URLSchemeGenerator.swift       # Generates react-finity import URLs
    QRCodeGenerator.swift          # QR code image from URL
    ClipboardExporter.swift        # Copy JSON to clipboard
  Models/
    GridfinityProfile.swift        # Profile constants (Official, Tight, Loose)
    ScanHistory.swift              # Persisted scan records
```

### Scan Session Flow

```
[Launch] -> [Select workspace type: Enclosed / Open Surface]
                |                           |
                v                           v
        [AR scan enclosed]          [AR scan surface]
        - Detect floor              - Detect horizontal plane
        - Detect walls (L/R/F/B)    - User taps 4 corners
        - Detect overhead           - Optional: scan overhead
        - Auto bounding box         - Compute rectangle
                |                           |
                +-------------+-------------+
                              |
                              v
                    [Review dimensions]
                    - Show width x depth x height
                    - Allow manual adjustment
                    - Set margins
                              |
                              v
                    [Compute Gridfinity layout]
                    - Select profile
                    - Run grid fitting algorithm
                    - Show coverage stats
                              |
                              v
                    [AR Preview] (Phase B)
                    - Overlay baseplates on scanned surface
                    - Show bins at computed height
                    - Toggle grid lines
                              |
                              v
                    [Transfer to React-Finity]
                    - Open URL / Show QR / Copy JSON
```

### Gridfinity Profile Mirroring

The iOS app must include the same profile constants as React-Finity to compute configurations accurately. These values are sourced from `src/engine/constants.ts`:

```swift
struct GridfinityProfile: Codable {
    let name: String
    let gridSize: Double       // 42mm
    let heightUnit: Double     // 7mm
    let baseplateHeight: Double // 7mm
    let wallThickness: Double  // 1.2mm
    let tolerance: Double      // 0.25mm (Official)
    let stackingLipHeight: Double // 4.4mm
    let socketWallHeight: Double  // 4.65mm
}

let officialProfile = GridfinityProfile(
    name: "Official",
    gridSize: 42,
    heightUnit: 7,
    baseplateHeight: 7,
    wallThickness: 1.2,
    tolerance: 0.25,
    stackingLipHeight: 4.4,
    socketWallHeight: 4.65
)
```

These must stay in sync with the web app. A shared JSON definition file that both apps read at build time would prevent drift.

---

## Web App Integration Points

### Required Changes in React-Finity

#### 1. URL Parameter Import Handler

A new route or URL parameter handler that reads the `?scan=` parameter, decodes the `WorkspaceScan` JSON, and offers to create a project from it.

**Affected files:**
- `src/app/App.tsx` -- check for URL params on mount
- New: `src/lib/importWorkspaceScan.ts` -- parse and validate `WorkspaceScan` JSON

#### 2. Scan-to-Project Converter

Converts a `WorkspaceScan.recommendation` into `ProjectData` (the existing format used by `projectStore`):

```typescript
// src/lib/importWorkspaceScan.ts

function workspaceScanToProject(
  scan: WorkspaceScan,
  profile: GridfinityProfile
): ProjectData {
  const objects: GridfinityObject[] = []
  const modifiers: Modifier[] = []

  // Create baseplates
  for (const bp of scan.recommendation.baseplates) {
    objects.push({
      id: crypto.randomUUID(),
      kind: 'baseplate',
      name: `Baseplate ${objects.length + 1}`,
      position: [bp.offsetX, 0, bp.offsetZ],
      params: {
        gridWidth: bp.gridWidth,
        gridDepth: bp.gridDepth,
        magnetHoles: true,
        screwHoles: false,
      },
    })
  }

  // Create bins
  for (const bin of scan.recommendation.bins) {
    const bp = scan.recommendation.baseplates[bin.baseplateIndex]
    objects.push({
      id: crypto.randomUUID(),
      kind: 'bin',
      name: `Bin ${objects.length + 1}`,
      position: [bp.offsetX, profile.baseplateHeight, bp.offsetZ],
      params: {
        gridWidth: bin.gridWidth,
        gridDepth: bin.gridDepth,
        heightUnits: bin.heightUnits,
        stackingLip: true,
        wallThickness: profile.wallThickness,
        innerFillet: 0,
      },
    })
  }

  return { objects, modifiers }
}
```

#### 3. Import UI

A dialog or banner that appears when scan data is detected:

```
+----------------------------------------------------------+
|  Workspace Scan Detected                                  |
|                                                          |
|  Scanned area: 382mm x 524mm x 65mm (enclosed drawer)   |
|  Recommended: 2 baseplates (9x6 + 9x6), 2 bins (6h)    |
|  Coverage: 95.2%                                         |
|                                                          |
|  Profile: Official  [change]                             |
|                                                          |
|  [ Create Project ]  [ Dismiss ]                         |
+----------------------------------------------------------+
```

**Affected files:**
- New: `src/components/ImportScanDialog.tsx`
- `src/components/toolbar/Toolbar.tsx` -- optional "Import Scan" menu item
- `src/store/projectStore.ts` -- use existing `loadProjectData()` to load the generated project

#### 4. Workspace Scan Type Definition

Add the `WorkspaceScan` interface to the TypeScript types:

**Affected file:** `src/types/gridfinity.ts` (or a new `src/types/workspaceScan.ts`)

---

## Implementation Phases

### Phase A: Dimensions-Only MVP

**Scope:** iOS app captures workspace dimensions and transfers them. React-Finity receives dimensions and auto-generates a basic project.

**iOS app delivers:**
- LiDAR scanning for enclosed spaces and open surfaces
- Dimension display with manual adjustment
- Grid unit fitting algorithm (on-device, for immediate feedback)
- Transfer via URL scheme, QR code, and clipboard

**React-Finity changes:**
- URL parameter import handler
- `WorkspaceScan` JSON schema validation
- Scan-to-project converter
- Import confirmation dialog

**The iOS app at this stage is a "smart tape measure"** -- it captures dimensions accurately and translates them to Gridfinity grid units, but the user does all customization (modifiers, bin sizing, dividers) in the web app.

### Phase B: On-Device Recommendation + AR Preview

**Scope:** iOS app computes full Gridfinity layouts and shows them in AR overlaid on the physical workspace.

**iOS app additions:**
- Baseplate tiling engine (mirrors the web algorithm)
- Height constraint computation
- AR overlay: translucent baseplates and bins rendered on the scanned surface via RealityKit
- User can adjust the layout in AR (drag to reposition, change bin heights)
- Profile selector (Official / Tight / Loose)
- Coverage statistics and leftover space visualization

**React-Finity changes:**
- Enhanced import that accepts the full `recommendation` block (baseplates + bins + positions)
- Workspace metadata display in the project (scanned dimensions, coverage %)

### Phase C: Bidirectional Sync

**Scope:** Changes made in React-Finity sync back to the iOS app for AR validation.

**Requires:**
- Cloud backend or peer-to-peer connection (WebRTC, Multipeer Connectivity)
- Project serialization/deserialization on both platforms
- Conflict resolution for concurrent edits

This phase is significantly more complex and depends on React-Finity having a backend (which may come with the Tauri desktop app in Phase 7 of the main roadmap, or a future cloud service).

---

## Trade-offs & Alternatives

### Android Support (ARCore)

Android devices with ARCore support depth sensing via ToF sensors (e.g., Samsung Galaxy S series). ARCore provides plane detection and depth APIs similar to ARKit. However:

- LiDAR availability on Android is fragmented (not all flagships have it, unlike iPhone Pro line)
- ARCore's depth API uses a combination of ToF and software depth estimation, with lower accuracy than Apple's dedicated LiDAR hardware
- Development cost doubles (separate Swift and Kotlin codebases, or cross-platform via Flutter/React Native with AR bridge)

**Recommendation:** Start with iOS-only. Consider Android if user demand justifies it, or explore a cross-platform approach with React Native + ViroReact once the iOS app design is validated.

### Photogrammetry Without LiDAR

Structure-from-motion photogrammetry (taking photos from multiple angles to reconstruct 3D geometry) works on any camera-equipped device. Apple's Object Capture API provides this on iOS. However:

- Requires many photos from different angles (20-50 for a good reconstruction)
- Processing is slow (minutes vs. seconds for LiDAR)
- Accuracy is lower and inconsistent, especially for flat surfaces and uniform textures (common in drawers and shelves)
- Poor performance in low-light conditions (drawer interiors)

**Recommendation:** Not suitable as the primary scanning method. Could be a fallback for non-LiDAR devices, but the accuracy may not be sufficient for grid-unit-level fitting.

### Manual Measurement Input (Fallback)

A simple form where the user types workspace dimensions (width x depth x height in mm) and the app computes the Gridfinity configuration. This requires no camera, AR, or LiDAR.

**Recommendation:** Include this as a fallback mode in the iOS app (and potentially as a standalone feature in React-Finity itself). Some users will know their workspace dimensions already or prefer manual entry. The configuration algorithm is the same regardless of input method.

### PWA Camera Approach

Instead of a native iOS app, use the web app's camera access (via `getUserMedia`) to do basic measurement. WebXR provides AR capabilities in Safari on iOS.

**Pros:**
- No separate app to install
- Single codebase

**Cons:**
- WebXR on iOS Safari has limited LiDAR access (no scene reconstruction, limited plane detection)
- Performance is significantly worse than native ARKit
- No background processing or local persistence
- UX is constrained by browser chrome

**Recommendation:** Not viable for the scanning use case due to WebXR limitations on iOS. A native app is necessary to access LiDAR hardware properly.

### Shared Profile Constants

The iOS app must duplicate the Gridfinity profile constants from `src/engine/constants.ts`. This creates a maintenance risk -- if profiles change in the web app, the iOS app must be updated too.

**Mitigation options:**
1. **JSON config file** -- a shared `gridfinity-profiles.json` that both apps read. The web app imports it at build time, the iOS app bundles it.
2. **API endpoint** -- the web app hosts profile definitions that the iOS app fetches. Requires a backend.
3. **Manual sync** -- document the profiles clearly and treat them as a rarely-changing specification. Gridfinity's dimensions are physically standardized and unlikely to change frequently.

Option 1 (shared JSON file) is recommended for Phase A/B. Option 2 becomes viable if/when a backend exists.
