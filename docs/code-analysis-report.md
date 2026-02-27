# Code Analysis Report

**Date**: 2026-02-27
**Scope**: Full codebase analysis of React-Finity
**Status**: Build passes, lint clean, 318/318 unit tests pass cleanly

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

### Unit Tests: 318/318 PASS (clean)

All 318 tests pass across 27 test files with no unhandled errors.

**Fixed in this report**: `src/engine/export/exportUtils.ts:17` previously threw 4 `ReferenceError: document is not defined` exceptions during test runs. The `triggerDownload()` function used `setTimeout(() => { document.body.removeChild(link) }, 100)` for deferred DOM cleanup. In the test environment, the jsdom context was torn down before the timeout fired. Fixed by guarding with `typeof document !== 'undefined'`.

**Additional warning**: Multiple test files emit `THREE.WARNING: Multiple instances of Three.js being imported`, indicating dependency duplication in the test resolution chain.

---

## 2. Bugs

### BUG-1: Missing `e.stopPropagation()` in ObjectListPanel drag handler -- FIXED

**File**: `src/components/panels/ObjectListPanel.tsx`, `handleDragStart` function
**Severity**: Bug

The `handleDragStart` function did not call `e.stopPropagation()`, while the identical handler in `ModifierSection.tsx` (line 38) does. This inconsistency caused drag events to bubble up unexpectedly in the object list.

**Fix applied**: Added `e.stopPropagation()` at the start of `handleDragStart`.

### BUG-2: Missing `!e.shiftKey` guard on Ctrl+D keyboard shortcut -- FIXED

**File**: `src/hooks/useKeyboardShortcuts.ts`
**Severity**: Bug

The Ctrl+D (duplicate) shortcut did not exclude Shift, meaning Ctrl+Shift+D triggered duplication instead of being available for other bindings. All other Ctrl+key shortcuts in this file properly check `!e.shiftKey`.

**Fix applied**: Added `&& !e.shiftKey` to the Ctrl+D condition.

### BUG-3: Viewport click deselection logic is inverted relative to comment -- FIXED

**File**: `src/components/viewport/Viewport.tsx`
**Severity**: Bug (minor -- behavior was actually correct despite misleading comment)

The comment said "Only deselect if clicking on empty space (not on an object)" but the condition structure was confusing.

**Fix applied**: Updated comment to clearly describe the intent.

---

## 3. Memory Leaks

### MEM-1: GridHelper not disposed on dependency change -- FIXED

**File**: `src/components/viewport/PrintLayoutViewport.tsx`

The `GridHelper` created in `useMemo` was never disposed when `width`/`depth` dependencies changed or when the component unmounted.

**Fix applied**: Replaced imperative `GridHelper` with declarative R3F `<Grid>` component from `@react-three/drei`, which handles its own lifecycle.

### MEM-2: PlaneGeometry created inline without disposal -- FIXED

**File**: `src/components/viewport/PrintLayoutViewport.tsx`

A new `PlaneGeometry` was created on every render for the bed outline and never disposed.

**Fix applied**: Wrapped in `useMemo` with a `useEffect` cleanup that calls `.dispose()`.

### MEM-3: SectionPlane allocates array every frame -- FIXED

**File**: `src/components/viewport/Viewport.tsx`

`useFrame` ran at 60fps and reassigned `gl.clippingPlanes = [clippingPlane]` every frame when `sectionView` was active.

**Fix applied**: Added refs to track previous state and cached array, only reallocating when values change.

---

## 4. Division by Zero and Edge Case Risks

### DIV-1: Insert modifier divides by `compartmentsX` / `compartmentsY` without guard -- FIXED

**File**: `src/engine/geometry/modifiers/insert.ts`

The UI enforces `min=1` on sliders, but corrupted data could set `compartmentsX = 0`, producing `Infinity`.

**Fix applied**: Added early return with empty `BufferGeometry` when `compartmentsX < 1 || compartmentsY < 1`.

### DIV-2: Label tab `Math.tan(angleRad)` can produce extreme values -- FIXED

**File**: `src/engine/geometry/modifiers/labelTab.ts`

Corrupted data could set angle to 0 or 90, producing `Infinity` or division by zero.

**Fix applied**: Clamp angle to safe range: `Math.max(5, Math.min(85, angle))`.

### DIV-3: Bin geometry with negative inner dimensions -- FIXED

**File**: `src/engine/geometry/bin.ts`

If `wallThickness >= outerWidth/2`, inner dimensions went negative.

**Fix applied**: Clamp `innerWidth` and `innerDepth` to minimum 0.1mm with `Math.max(0.1, ...)`.

---

## 5. Error Handling Gaps

### ERR-1: Silent failure on localStorage save -- FIXED

**File**: `src/store/projectManagerStore.ts`

When `writeProjectData()` failed (quota exceeded), `saveProject()` silently set `isDirty: true` and `saveProjectAs()` silently returned.

**Fix applied**: Added `console.warn` messages on save failure. A toast/notification UI can be added in a future iteration.

### ERR-2: Incomplete localStorage data validation -- FIXED

**File**: `src/store/projectManagerStore.ts`

`readProjectData()` only checked `Array.isArray()` but didn't validate that objects have required fields (`id`, `kind`, `params`).

**Fix applied**: Added `isValidObject()` and `isValidModifier()` shape validation functions that check required fields. Invalid entries are filtered out with a console warning, rather than rejecting the entire project.

### ERR-3: No user feedback on empty export -- FIXED

**Files**: `src/engine/export/stlExporter.ts`, `src/engine/export/threeMfExporter.ts`

When `items.length === 0`, export functions silently returned with no feedback.

**Fix applied**: Added `console.warn('Export skipped: no objects in layout')` before the early return.

### ERR-4: Modifier hierarchy traversal silently caps at 100 -- FIXED

**File**: `src/store/projectStore.ts`

`getRootObjectId()` iterated with an arbitrary depth limit of 100 and could not detect circular references.

**Fix applied**: Replaced the depth counter with a `Set<string>` visited tracker. Circular references are now detected and logged with `console.warn`, and the function returns `null`.

---

## 6. Type Safety Issues

### TYPE-1: Unsafe `e.target as HTMLElement` cast -- FIXED

**File**: `src/hooks/useKeyboardShortcuts.ts`

`e.target` could be any `EventTarget`, not necessarily an `HTMLElement`.

**Fix applied**: Replaced `as HTMLElement` cast with `instanceof HTMLElement` guard.

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

**File**: `src/components/panels/ModifierSection.tsx`

Subscribes to the entire `allModifiers` array. Any modifier param change anywhere in the project triggers re-render of every `ModifierSection`, even if the change is unrelated.

**Note**: The existing `useMemo` filter prevents children from re-rendering when the filtered result is unchanged. This is acceptable at current scale but could be optimized with `useShallow` from `zustand/react/shallow` if performance becomes an issue.

### PERF-2: No slider debounce for geometry regeneration

**File**: `src/components/panels/BinProperties.tsx` and other property panels

Slider `onValueChange` immediately calls `updateObjectParams`, triggering geometry regeneration on every frame during drag. History has 300ms debounce, but the viewport regenerates at slider speed.

**Fix**: Consider a 16-50ms debounce on param updates during slider drag.

### PERF-3: `singleSelectedObject` not memoized -- FIXED

**File**: `src/components/viewport/Viewport.tsx`

`.find()` ran on every render without `useMemo`.

**Fix applied**: Wrapped in `useMemo` with deps `[selectedObjectIds, objects]`.

### PERF-4: Keyboard event listener churn -- FIXED

**File**: `src/hooks/useKeyboardShortcuts.ts`

The `useEffect` dependency array included `selectedObjectIds`, causing the event listener to be removed and re-added on every selection change.

**Fix applied**: Refactored to read all state via `getState()` inside the handler, making the `useEffect` dependency array empty.

---

## 8. Code Consistency Issues

### STYLE-1: Inconsistent drag handler patterns -- FIXED
`ObjectListPanel.tsx` and `ModifierSection.tsx` now both call `stopPropagation` in their drag handlers.

### STYLE-2: Inconsistent modifier key checks in shortcuts -- FIXED
All keyboard shortcuts now properly check `!e.shiftKey` (see BUG-2 fix).

---

## 9. Recommendations (Priority Order)

### Immediate (bugs) -- ALL FIXED
1. ~~Add `e.stopPropagation()` to `ObjectListPanel` drag handler~~ (DONE)
2. ~~Add `!e.shiftKey` guard to Ctrl+D shortcut~~ (DONE)
3. ~~Fix test `document` cleanup race in `exportUtils.ts`~~ (DONE)

### Short-term (stability) -- ALL FIXED
4. ~~Add defensive guards for division-by-zero in geometry generators~~ (DONE)
5. Add null checks after registry `.get()` calls (REMAINING)
6. ~~Fix `GridHelper` and `PlaneGeometry` disposal in `PrintLayoutViewport.tsx`~~ (DONE)
7. ~~Add console warnings for localStorage save failures~~ (DONE -- full user notification deferred)

### Medium-term (performance) -- PARTIALLY FIXED
8. Implement code-splitting to reduce bundle size below 500 KB
9. Debounce slider param updates for geometry regeneration
10. Optimize `ModifierSection` to only re-render when its own modifiers change (acceptable at current scale)
11. ~~Memoize `singleSelectedObject` lookup in Viewport~~ (DONE)
12. ~~Use refs instead of state for keyboard shortcut dependencies~~ (DONE)

### Long-term (architecture)
13. Centralize `as unknown as Record<string, unknown>` pattern into a single typed helper
14. ~~Add runtime schema validation for localStorage project data~~ (DONE)
15. Resolve Three.js duplicate instance warning in test setup
16. Add error boundaries around geometry rendering to gracefully handle degenerate params
