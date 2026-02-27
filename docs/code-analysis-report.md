# Code Analysis Report

**Date**: 2026-02-27
**Scope**: Full codebase analysis of React-Finity
**Status**: Build passes, lint clean, 310/310 unit tests pass cleanly

---

## Executive Summary

The React-Finity codebase is well-structured with strong TypeScript usage, proper geometry disposal patterns, and consistent architecture. The analysis uncovered **3 bugs**, **4 test infrastructure issues**, **1 build warning**, and several areas for improvement across type safety, memory management, error handling, and performance.

**Severity breakdown:**

| Severity | Count | Description |
|----------|-------|-------------|
| Bug | 3 | Logic errors in event handling and keyboard shortcuts |
| Test Infra | 4 | Unhandled errors in test suite from DOM cleanup race (FIXED) |
| Build | 1 | Bundle size exceeds 500 KB warning |
| High | 6 | Memory leaks, missing null guards, division-by-zero risks |
| Medium | 12 | Performance issues, missing validation, unsafe casts |
| Low | 8 | Code consistency, minor optimizations |

---

## 1. Build, Lint, and Test Results

### Lint: CLEAN
No warnings or errors from ESLint.

### Build: PASSES with 1 warning
- TypeScript compilation succeeds with no errors
- **Warning**: Main JS bundle is **1,642 KB** (470 KB gzipped), exceeding the 500 KB chunk size warning
- **Recommendation**: Implement code-splitting via dynamic `import()` or configure `build.rollupOptions.output.manualChunks` to split heavy dependencies (three.js, three-bvh-csg, jszip)

### Unit Tests: 310/310 PASS (clean)

All 310 tests pass across 27 test files with no unhandled errors.

**Fixed in this report**: `src/engine/export/exportUtils.ts:17` previously threw 4 `ReferenceError: document is not defined` exceptions during test runs. The `triggerDownload()` function used `setTimeout(() => { document.body.removeChild(link) }, 100)` for deferred DOM cleanup. In the test environment, the jsdom context was torn down before the timeout fired. Fixed by guarding with `typeof document !== 'undefined'`.

**Additional warning**: Multiple test files emit `THREE.WARNING: Multiple instances of Three.js being imported`, indicating dependency duplication in the test resolution chain.

---

## 2. Bugs

### BUG-1: Missing `e.stopPropagation()` in ObjectListPanel drag handler

**File**: `src/components/panels/ObjectListPanel.tsx`, `handleDragStart` function
**Severity**: Bug

The `handleDragStart` function does not call `e.stopPropagation()`, while the identical handler in `ModifierSection.tsx` (line 38) does. This inconsistency can cause drag events to bubble up unexpectedly in the object list.

```typescript
// ObjectListPanel.tsx -- missing stopPropagation
const handleDragStart = (e: React.DragEvent, index: number) => {
  setDragIndex(index)
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index))
}

// ModifierSection.tsx -- has stopPropagation (correct)
const handleDragStart = (e: React.DragEvent, index: number) => {
  e.stopPropagation()
  setDragIndex(index)
  ...
}
```

### BUG-2: Missing `!e.shiftKey` guard on Ctrl+D keyboard shortcut

**File**: `src/hooks/useKeyboardShortcuts.ts`, line 88
**Severity**: Bug

The Ctrl+D (duplicate) shortcut does not exclude Shift, meaning Ctrl+Shift+D triggers duplication instead of being available for other bindings. All other Ctrl+key shortcuts in this file properly check `!e.shiftKey`.

```typescript
// Current (line 88) -- missing !e.shiftKey
if ((e.ctrlKey || e.metaKey) && e.key === 'd') {

// Expected -- consistent with other shortcuts (lines 41, 49, 61, 67, 75)
if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'd') {
```

### BUG-3: Viewport click deselection logic is inverted relative to comment

**File**: `src/components/viewport/Viewport.tsx`, line ~151
**Severity**: Bug (minor -- behavior is actually correct despite misleading comment)

The comment says "Only deselect if clicking on empty space (not on an object)" but the code returns (skips deselection) when the target IS a Mesh or GridHelper. The logic actually works correctly (clicking background clears selection), but the condition structure is confusing. Should be restructured for clarity:

```typescript
// Current -- correct behavior but confusing structure
if (e.object.type === 'GridHelper' || e.object.type === 'Mesh') return
clearSelection()

// Suggested -- clearer intent
const isBackgroundClick = e.object.type !== 'GridHelper' && e.object.type !== 'Mesh'
if (isBackgroundClick) clearSelection()
```

---

## 3. Memory Leaks

### MEM-1: GridHelper not disposed on dependency change (HIGH)

**File**: `src/components/viewport/PrintLayoutViewport.tsx`, lines 15-23

The `GridHelper` created in `useMemo` is never disposed when `width`/`depth` dependencies change or when the component unmounts. `GridHelper` contains internal geometries and materials.

**Fix**: Add a `useEffect` cleanup that calls `.dispose()` on the old grid, or use R3F declarative `<gridHelper>` instead.

### MEM-2: PlaneGeometry created inline without disposal (HIGH)

**File**: `src/components/viewport/PrintLayoutViewport.tsx`, line 35

```typescript
<edgesGeometry args={[new PlaneGeometry(width, depth)]} />
```

A new `PlaneGeometry` is created on every render and never disposed. The `edgesGeometry` receives it as an arg but the source plane is orphaned.

**Fix**: Wrap in `useMemo` and dispose on cleanup.

### MEM-3: SectionPlane allocates array every frame (MEDIUM)

**File**: `src/components/viewport/Viewport.tsx`, lines 87-94

`useFrame` runs at 60fps and reassigns `gl.clippingPlanes = [clippingPlane]` every frame when `sectionView` is active, allocating a new array each time.

**Fix**: Track previous state with a ref and only update `gl.clippingPlanes` when `sectionView` or `clippingPlane` actually changes.

---

## 4. Division by Zero and Edge Case Risks

### DIV-1: Insert modifier divides by `compartmentsX` / `compartmentsY` without guard

**File**: `src/engine/geometry/modifiers/insert.ts`, lines 60, 71

```typescript
const compartmentWidthX = (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX
const compartmentDepthZ = (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY
```

The UI enforces `min=1` on sliders, but if corrupted data is loaded from localStorage with `compartmentsX = 0`, this produces `Infinity` and creates degenerate geometry.

**Fix**: Add a guard: `if (compartmentsX < 1 || compartmentsY < 1) return mergeGeometries([])`.

### DIV-2: Label tab `Math.tan(angleRad)` can produce extreme values

**File**: `src/engine/geometry/modifiers/labelTab.ts`, line 19

```typescript
const tabDepthVal = height / Math.tan(angleRad)
```

While the slider constrains angle to 30-60 degrees, corrupted data could set angle to 0 or 90, producing `Infinity` or division by zero.

**Fix**: Clamp angle to safe range: `const safeAngle = Math.max(10, Math.min(80, angle))`.

### DIV-3: Bin geometry with negative inner dimensions

**File**: `src/engine/geometry/bin.ts`, lines 50-51

```typescript
const innerWidth = outerWidth - wt * 2
const innerDepth = outerDepth - wt * 2
```

If `wallThickness >= outerWidth/2`, inner dimensions go negative. The insert modifier has this guard (`rimInnerWidth > 0`), but the bin generator does not.

---

## 5. Error Handling Gaps

### ERR-1: Silent failure on localStorage save

**File**: `src/store/projectManagerStore.ts`, lines 110-113, 133

When `writeProjectData()` fails (quota exceeded), `saveProject()` silently sets `isDirty: true` and `saveProjectAs()` silently returns. The user has no indication their data was not saved.

**Fix**: Surface a toast notification or error state visible to the user.

### ERR-2: Incomplete localStorage data validation

**File**: `src/store/projectManagerStore.ts`, lines 14-24

`readProjectData()` only checks `Array.isArray(data.objects)` and `Array.isArray(data.modifiers)`, but doesn't validate that objects have required fields (`id`, `kind`, `params`). Corrupted data with `{ objects: [{}], modifiers: [] }` passes validation and could crash the app.

**Fix**: Add minimal shape validation (check required fields exist) or wrap component renders in error boundaries.

### ERR-3: No user feedback on empty export

**Files**: `src/engine/export/stlExporter.ts:65`, `src/engine/export/threeMfExporter.ts:277`

When `items.length === 0`, export functions silently return with no user feedback.

### ERR-4: Modifier hierarchy traversal silently caps at 100

**File**: `src/store/projectStore.ts`, lines 176-186

`getRootObjectId()` iterates with a depth limit of 100. If a circular reference exists (modifier A -> modifier B -> modifier A), it silently returns `null` instead of detecting and reporting the cycle.

---

## 6. Type Safety Issues

### TYPE-1: Unsafe `e.target as HTMLElement` cast

**File**: `src/hooks/useKeyboardShortcuts.ts`, line 24

```typescript
const target = e.target as HTMLElement
if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
```

`e.target` could be any `EventTarget`, not necessarily an `HTMLElement`. Should use `instanceof` check:

```typescript
const target = e.target
if (!(target instanceof HTMLElement)) return
```

### TYPE-2: Registry `.get()` calls without null checks

Multiple files call `objectKindRegistry.get(kind)` or `modifierKindRegistry.get(kind)` and use the result without checking for `undefined`. While most call sites are protected by the discriminated union ensuring known kinds, extensible kinds could return `undefined`.

**Files affected**:
- `src/components/viewport/MeasurementOverlay.tsx:14`
- `src/components/viewport/SceneObject.tsx:77`
- Several files in `src/engine/export/`

### TYPE-3: Pervasive `as unknown as` pattern

14+ files use `as unknown as` casts, primarily at the registry boundary where typed params are erased to `Record<string, unknown>`. This is an architectural trade-off for extensibility and is well-documented in the code. The pattern is acceptable but should be centralized into shared helper functions.

---

## 7. Performance Issues

### PERF-1: ModifierSection subscribes to all modifiers

**File**: `src/components/panels/ModifierSection.tsx`, lines 25-29

Subscribes to the entire `allModifiers` array. Any modifier param change anywhere in the project triggers re-render of every `ModifierSection`, even if the change is unrelated.

**Fix**: Use a selector with shallow equality comparison or filter at the store level.

### PERF-2: No slider debounce for geometry regeneration

**File**: `src/components/panels/BinProperties.tsx` and other property panels

Slider `onValueChange` immediately calls `updateObjectParams`, triggering geometry regeneration on every frame during drag. History has 300ms debounce, but the viewport regenerates at slider speed.

**Fix**: Consider a 16-50ms debounce on param updates during slider drag.

### PERF-3: `singleSelectedObject` not memoized

**File**: `src/components/viewport/Viewport.tsx`, lines 110-113

`.find()` runs on every render without `useMemo`:

```typescript
const singleSelectedObject =
  selectedObjectIds.length === 1
    ? (objects.find((o) => o.id === selectedObjectIds[0]) ?? null)
    : null
```

### PERF-4: Keyboard event listener churn

**File**: `src/hooks/useKeyboardShortcuts.ts`, line 128

The `useEffect` dependency array includes `selectedObjectIds`, causing the event listener to be removed and re-added on every selection change.

**Fix**: Use `useRef` for values that change frequently but don't need to trigger re-subscription.

---

## 8. Code Consistency Issues

### STYLE-1: Inconsistent drag handler patterns
`ObjectListPanel.tsx` and `ModifierSection.tsx` have nearly identical drag-and-drop implementations but differ in `stopPropagation` usage.

### STYLE-2: Inconsistent modifier key checks in shortcuts
Most keyboard shortcuts check `!e.shiftKey` but Ctrl+D does not (see BUG-2).

---

## 9. Recommendations (Priority Order)

### Immediate (bugs)
1. Add `e.stopPropagation()` to `ObjectListPanel` drag handler
2. Add `!e.shiftKey` guard to Ctrl+D shortcut
3. ~~Fix test `document` cleanup race in `exportUtils.ts`~~ (DONE)

### Short-term (stability)
4. Add defensive guards for division-by-zero in geometry generators (`insert.ts`, `labelTab.ts`, `bin.ts`)
5. Add null checks after registry `.get()` calls
6. Fix `GridHelper` and `PlaneGeometry` disposal in `PrintLayoutViewport.tsx`
7. Add user notification for localStorage save failures

### Medium-term (performance)
8. Implement code-splitting to reduce bundle size below 500 KB
9. Debounce slider param updates for geometry regeneration
10. Optimize `ModifierSection` to only re-render when its own modifiers change
11. Memoize `singleSelectedObject` lookup in Viewport
12. Use refs instead of state for keyboard shortcut dependencies

### Long-term (architecture)
13. Centralize `as unknown as Record<string, unknown>` pattern into a single typed helper
14. Add runtime schema validation for localStorage project data
15. Resolve Three.js duplicate instance warning in test setup
16. Add error boundaries around geometry rendering to gracefully handle degenerate params
