# Slicer Export Integration Research

Architecture research for extending React-Finity's export system with 3MF format support, slicer application deep links, and desktop CLI integration.

---

## Current State (Phase 5)

The following export infrastructure is already implemented and working:

| Module | Path | Purpose |
|--------|------|---------|
| Geometry merging | `src/engine/export/mergeObjectGeometry.ts` | Recursively merges object + modifier geometries into a single `BufferGeometry`. Exports `mergeObjectWithModifiers()`, `generateModifierGeometry()`, `computeBinContext()`. |
| Print orientation | `src/engine/export/printOrientation.ts` | Computes optimal FDM rotation per object kind (bins flipped 180 deg on X, baseplates flat). Exports `getPrintRotation()`, `getOrientedBounds()`, `applyPrintOrientation()`. |
| Print layout | `src/engine/export/printLayout.ts` | Row-based packing algorithm that arranges objects on a virtual print bed with configurable spacing. Exports `computePrintLayout()`, `disposePrintLayout()`. |
| STL export | `src/engine/export/stlExporter.ts` | Binary STL export via Three.js `STLExporter`. Supports single-object, ZIP bundle, and merged plate export. Uses JSZip for bundling. |
| Print layout view | `src/components/viewport/PrintLayoutViewport.tsx` | 3D visualization of the print bed with arranged objects and grid overlay. |
| Print settings panel | `src/components/panels/PrintSettingsPanel.tsx` | Bed size presets (220/256/350mm), spacing slider, per-object export buttons, ZIP and plate export. |
| Toolbar integration | `src/components/toolbar/Toolbar.tsx` | Edit/Print view toggle, Export dropdown with "Export Selected (STL)" and "Open Print Layout". Keyboard shortcuts: Ctrl+P (view toggle), Ctrl+Shift+E (export selected). |
| Tests | `src/engine/export/__tests__/` | 27 unit tests across 4 files. 22 E2E tests in `e2e/export.spec.ts` and `e2e/print-layout.spec.ts`. |

### Dependencies already installed

- `three@^0.183.1` -- includes `STLExporter` at `three/addons/exporters/STLExporter.js`
- `jszip@^3.10.1` -- used for ZIP bundling in `stlExporter.ts`

### What Phase 5 deferred

From `ROADMAP.md`:

- 3MF export
- Local storage persistence (save/load projects as JSON)
- Project management (new, save, load, rename, delete)
- Export settings (scale, polygon quality)

---

## Tier 1: 3MF Export

### Format Overview

3MF (3D Manufacturing Format) is the preferred format for modern slicers. It is a ZIP archive following the Open Packaging Conventions (OPC) specification, containing:

```
[Content_Types].xml           OPC content type declarations
_rels/.rels                   Root relationship pointing to the 3D model
3D/3dmodel.model              XML document with mesh data (vertices + triangles)
```

### Why 3MF over STL

| Feature | STL | 3MF |
|---------|-----|-----|
| Units | None (slicer assumes mm) | Explicit unit attribute (`millimeter`) |
| Multi-object | One mesh per file | Multiple `<object>` elements in one file |
| File size | ~50 bytes/triangle (binary) | Compressed XML in ZIP (typically 3-5x smaller) |
| Metadata | None | Object names, part numbers, custom properties |
| Multi-material | Not supported | Color groups, material assignments |
| Slicer support | Universal | PrusaSlicer, OrcaSlicer, Bambu Studio, Cura (native) |

### Implementation Approach

Use JSZip (already installed) to create the ZIP archive. No new dependencies needed.

**Core function signature:**

```typescript
// src/engine/export/threeMfExporter.ts

export function exportObjectAs3MF(geometry: BufferGeometry, name: string): void
export async function exportAllAs3MF(items: PrintLayoutItem[]): Promise<void>
```

**3D model XML structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model" name="Bin 1">
      <mesh>
        <vertices>
          <vertex x="0.000" y="0.000" z="0.000" />
          <!-- one <vertex> per position in geometry.attributes.position -->
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2" />
          <!-- one <triangle> per 3 indices in geometry.index -->
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>
```

**Vertex/index extraction from BufferGeometry:**

The existing geometry pipeline produces indexed `BufferGeometry` with `position` (Float32Array, stride 3) and `index` (Uint32Array) attributes. These map directly to 3MF's `<vertices>` and `<triangles>` elements:

```typescript
const positions = geometry.attributes.position  // BufferAttribute
for (let i = 0; i < positions.count; i++) {
  // positions.getX(i), .getY(i), .getZ(i) -> <vertex x="" y="" z="" />
}

const indices = geometry.index  // BufferAttribute
for (let i = 0; i < indices.count; i += 3) {
  // indices.getX(i), indices.getX(i+1), indices.getX(i+2) -> <triangle v1="" v2="" v3="" />
}
```

**Multi-object support:** When exporting all objects from the print layout, each `PrintLayoutItem` becomes a separate `<object>` element with position applied via a `<components>` transform or by pre-translating the geometry (consistent with existing `exportAllAsSingleSTL` approach).

**XML escaping:** Object names must be XML-escaped (`&`, `<`, `>`, `"`).

**Integration points:**

- Add "Export as 3MF" option to the Export dropdown in `Toolbar.tsx`
- Add "Export All (3MF)" button to `PrintSettingsPanel.tsx` alongside existing STL buttons
- Follow existing test patterns in `src/engine/export/__tests__/stlExporter.test.ts`

### 3MF Specification References

- Core specification: https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md
- Material extension: https://github.com/3MFConsortium/spec_materials/blob/master/3MF%20Materials%20Extension.md
- OPC (Open Packaging Conventions): ECMA-376 Part 2

---

## Tier 2: Slicer Deep Links (Browser)

### Protocol Handler Summary

All three major slicers register custom URL protocol handlers:

| Slicer | Protocol Scheme | URL Format | Platform |
|--------|----------------|------------|----------|
| PrusaSlicer | `prusaslicer://` | `prusaslicer://open?file=<https_url>` | Win/Mac/Linux |
| OrcaSlicer | `orcaslicer://` | `orcaslicer://open?file=<https_url>` | Win/Mac (Linux broken) |
| Bambu Studio | `bambustudio://` | `bambustudio://open?file=<https_url>` | Win/Mac |
| Bambu Connect | `bambu-connect://` | `bambu-connect://import-file?path=<local_path>&name=<name>&version=1.0.0` | Win/Mac (local files only) |

### Browser Constraints

All protocol handlers (except Bambu Connect) require an HTTPS URL pointing to the file. From a browser-only web app:

- `blob:` URLs do not work -- slicers reject them
- `data:` URIs do not work -- too large, not supported
- `file://` URLs do not work -- browser security sandbox prevents access
- Only publicly accessible `https://` URLs work

**This means direct "Open in Slicer" is not possible from a browser-only app** without one of these workarounds:

1. **Temporary file hosting** -- Upload the exported file to a presigned URL (S3, Cloudflare R2, etc.) and pass that URL to the slicer. Requires a backend service or serverless function.
2. **Self-hosted deployment** -- If the app is deployed to HTTPS and has a server component, it could serve exported files at temporary URLs.
3. **Service Worker approach** -- Register a Service Worker that intercepts fetch requests for a specific path and serves the blob. The URL would be `https://app-domain/export/model.3mf`. This works but is fragile and may not work across all slicer implementations.

### PrusaSlicer Domain Restriction

PrusaSlicer has a hardcoded domain allowlist for its protocol handler. As of the latest release, only `printables.com` is whitelisted. Third-party apps must apply to Prusa Research to be added. See: https://github.com/prusa3d/PrusaSlicer/issues/14313

OrcaSlicer and Bambu Studio are less restrictive but may still reject non-HTTPS URLs.

### Recommended Browser UX

Given the constraints, the realistic approach for a browser-only app is a **download-first workflow**:

1. User clicks "Export for Slicer"
2. File downloads to the user's default download location
3. App displays a brief instruction: "File downloaded. Open it in your slicer (PrusaSlicer, OrcaSlicer, or Bambu Studio) to prepare for printing."
4. Optionally, show a "Try Open in Slicer" button that attempts `window.location.href = 'orcaslicer://open?file=...'` as a best-effort fallback

### Protocol Handler Detection

There is no reliable cross-browser API to detect whether a protocol handler is registered. Heuristic approaches include:

- **Timeout-based**: Attempt `window.open(protocol_url)`, set a timeout. If the page still has focus after ~2 seconds, the handler likely did not fire.
- **`navigator.registerProtocolHandler()`**: Only works for web-to-web protocols, not custom app protocols.
- **Browser-specific APIs**: Chrome has `navigator.protocolHandler` proposals, but nothing is standardized.

### Implementation Sketch

```typescript
// src/engine/export/slicerLauncher.ts

export type SlicerApp = 'prusaslicer' | 'orcaslicer' | 'bambustudio'

export interface SlicerConfig {
  app: SlicerApp
  displayName: string
  protocolScheme: string
  requiresHttpsUrl: boolean
}

export const SLICER_CONFIGS: SlicerConfig[] = [
  { app: 'prusaslicer', displayName: 'PrusaSlicer', protocolScheme: 'prusaslicer', requiresHttpsUrl: true },
  { app: 'orcaslicer', displayName: 'OrcaSlicer', protocolScheme: 'orcaslicer', requiresHttpsUrl: true },
  { app: 'bambustudio', displayName: 'Bambu Studio', protocolScheme: 'bambustudio', requiresHttpsUrl: true },
]

/**
 * Attempt to open a file in a slicer via protocol handler.
 * Only works if fileUrl is an HTTPS URL.
 * Returns false if the URL scheme requirements are not met.
 */
export function tryOpenInSlicer(app: SlicerApp, fileUrl: string): boolean {
  const config = SLICER_CONFIGS.find((c) => c.app === app)
  if (!config) return false
  if (config.requiresHttpsUrl && !fileUrl.startsWith('https://')) return false

  window.location.href = `${config.protocolScheme}://open?file=${encodeURIComponent(fileUrl)}`
  return true
}
```

### References

- OrcaSlicer protocol handler PR: https://github.com/SoftFever/OrcaSlicer/pull/8304
- PrusaSlicer URL handler restriction: https://github.com/prusa3d/PrusaSlicer/issues/14313
- Bambu Lab third-party integration: https://wiki.bambulab.com/en/software/third-party-integration

---

## Tier 3: Desktop Integration (Tauri -- Phase 7)

### Slicer CLI Integration

When React-Finity adds a Tauri desktop shell (Phase 7), the export system gains the ability to invoke slicers directly via their command-line interfaces.

#### PrusaSlicer CLI

The most mature and well-documented CLI of the three:

```bash
# Open a model in PrusaSlicer GUI
prusa-slicer model.stl

# Slice and export G-code
prusa-slicer --export-gcode model.stl --load config.ini --output output.gcode

# Slice and export 3MF with embedded slicing data
prusa-slicer --export-3mf model.stl --load config.ini --output output.3mf

# Apply specific printer/filament/print profiles
prusa-slicer --export-gcode model.stl \
  --load printer.ini \
  --load filament.ini \
  --load print.ini
```

Key flags:
- `--export-gcode` / `--export-3mf` -- headless slicing mode
- `--load <config>` -- load INI config file (can be chained)
- `--output <path>` -- output file path
- `--center <x>,<y>` -- center object on bed
- `--scale <factor>` -- scale factor
- `--rotate <deg>` -- rotation angle

Reference: https://github.com/prusa3d/PrusaSlicer/wiki/Command-Line-Interface

#### OrcaSlicer CLI

OrcaSlicer is forked from PrusaSlicer and shares a similar (but not identical) CLI:

```bash
# Open model in GUI
orca-slicer model.3mf

# Headless slicing (OrcaSlicer-specific flags)
orca-slicer --slice 0 \
  --export-3mf output.3mf \
  --load-settings "machine.json;process.json;filament.json" \
  model.stl
```

Notes:
- CLI documentation is sparse and community-maintained
- Known issues with `--load-settings` on some platforms
- Linux/Docker headless mode has reported bugs
- Reference: https://github.com/OrcaSlicer/OrcaSlicer/discussions/8593

#### Bambu Studio CLI

```bash
# Headless slicing
bambu-studio --slice 2 \
  --export-3mf output.3mf \
  --load-settings "machine.json;process.json;filament.json" \
  model.stl
```

Notes:
- `--slice 2` mode is required for headless operation
- Config file format differs from PrusaSlicer (JSON, not INI)
- Known issues with preset loading from arbitrary file paths
- Reference: https://github.com/bambulab/BambuStudio/wiki/Command-Line-Usage

### Bambu Connect

Bambu Connect is middleware for third-party app integration with Bambu Lab printers. It provides:

1. **Protocol handler with local file paths**: `bambu-connect://import-file?path=<local_path>&name=<model_name>&version=1.0.0` -- works with local filesystem paths (desktop only)
2. **Printer discovery and management** via the Bambu Local Server

### Bambu Local Server

An HTTP API service that runs on the user's machine, providing:

- **Printer discovery** -- enumerate connected Bambu printers on the local network
- **3MF upload** -- send a sliced 3MF file directly to a printer
- **Print job management** -- start, pause, cancel print jobs
- **Status monitoring** -- printer state, temperature, progress

Currently Windows-only (Linux support in development). Can be packaged within third-party apps via the Local SDK.

Reference: https://wiki.bambulab.com/en/software/bambu-connect

### Tauri Integration Architecture

The desktop export builds on the existing browser export pipeline, replacing only the final delivery step:

```typescript
// src/lib/download.ts (updated for desktop)

export async function saveFile(blob: Blob, filename: string): Promise<string | null> {
  if (isDesktopApp()) {
    // Use Tauri native file dialog
    const { save } = await import('@tauri-apps/api/dialog')
    const { writeBinaryFile } = await import('@tauri-apps/api/fs')

    const filePath = await save({
      defaultPath: filename,
      filters: [
        { name: 'STL Files', extensions: ['stl'] },
        { name: '3MF Files', extensions: ['3mf'] },
      ],
    })

    if (!filePath) return null

    const buffer = await blob.arrayBuffer()
    await writeBinaryFile(filePath, new Uint8Array(buffer))
    return filePath
  } else {
    // Existing browser download
    triggerDownload(blob, filename)
    return null
  }
}

function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}
```

After saving to a local file path, the slicer can be launched via CLI or protocol handler:

```typescript
// src/engine/export/desktopSlicerLauncher.ts

export async function openInSlicer(app: SlicerApp, filePath: string): Promise<void> {
  const { Command } = await import('@tauri-apps/api/shell')

  switch (app) {
    case 'prusaslicer':
      await new Command('prusa-slicer', [filePath]).execute()
      break
    case 'orcaslicer':
      await new Command('orca-slicer', [filePath]).execute()
      break
    case 'bambustudio':
      // Use Bambu Connect protocol with local path
      const { open } = await import('@tauri-apps/api/shell')
      const name = filePath.split(/[\\/]/).pop() ?? 'model'
      await open(`bambu-connect://import-file?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(name)}&version=1.0.0`)
      break
  }
}
```

---

## Recommended Implementation Sequence

### Tier 1 -- 3MF Export (next)

1. Create `src/engine/export/threeMfExporter.ts` with `geometryTo3MFModelXml()`, `exportObjectAs3MF()`, `exportAllAs3MF()`
2. Add unit tests in `src/engine/export/__tests__/threeMfExporter.test.ts`
3. Add "Export as 3MF" options to `Toolbar.tsx` Export dropdown and `PrintSettingsPanel.tsx`
4. Add E2E tests for 3MF export workflow
5. Update `ROADMAP.md` to mark 3MF as complete

### Tier 2 -- Slicer Deep Links (future)

1. Create `src/engine/export/slicerLauncher.ts` with config and `tryOpenInSlicer()`
2. Add slicer selection UI section to export flow (download-first with optional deep link attempt)
3. Only becomes fully functional when app is deployed to HTTPS with temp file hosting, or in the Tauri desktop build

### Tier 3 -- Desktop CLI Integration (Phase 7)

1. Add platform detection (`isDesktopApp()`) to `src/lib/download.ts`
2. Replace `triggerDownload()` with `saveFile()` abstraction
3. Create `src/engine/export/desktopSlicerLauncher.ts` with CLI invocation for each slicer
4. Add slicer path configuration to settings (auto-detect common install locations)
5. Integrate Bambu Connect protocol handler for Bambu Lab printers

---

## Dependency Analysis

| Feature | New Dependencies | Notes |
|---------|-----------------|-------|
| 3MF export | None | JSZip already installed (`^3.10.1`) |
| Slicer deep links | None | Browser-native `window.location.href` |
| Desktop file dialogs | `@tauri-apps/api` | Phase 7 (Tauri) |
| Desktop CLI | `@tauri-apps/api` | Phase 7 (Tauri) |
| Export settings dialog | `@radix-ui/react-dialog` | Add via `npx shadcn@latest add dialog` |

---

## Open Questions

1. **3MF multi-material**: Should we support color/material assignments per object or modifier? The 3MF material extension allows this but adds significant complexity. Recommended: defer to a future phase.

2. **Export scale factor**: The geometry pipeline already works in mm (1 unit = 1mm). A scale factor setting is only useful for compatibility with slicers that assume a different unit convention. Most modern slicers default to mm when reading 3MF (which declares `unit="millimeter"`). Recommended: skip scale factor for 3MF, keep as a potential STL export option.

3. **Polygon quality/LOD**: The current geometry generators produce a fixed tessellation level. A quality setting would require parameterizing the generators' segment counts. This is orthogonal to the export format and should be addressed separately.

4. **Temp file hosting for browser deep links**: If we want true "Open in Slicer" from the browser, we need a way to serve the exported file at a public HTTPS URL. Options include a Cloudflare Worker with R2 storage, a Vercel/Netlify serverless function, or a dedicated API endpoint. This adds backend infrastructure that the project currently avoids. Recommended: defer until demand is clear.
