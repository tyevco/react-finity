# Extensible Object & Modifier Framework

Architecture research and design for making React-Finity's object and modifier system extensible, enabling new kinds to be added through a registration API rather than manual wiring across 15+ files.

**Status:** Phase 1 Implemented
**Date:** 2026-02-22 (proposed), 2026-02-23 (Phase 1 implemented)
**Scope:** Internal registry (Phase 1) + external plugin support (Phase 2)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Proposed Solution: Registry Pattern](#proposed-solution-registry-pattern)
4. [Core TypeScript Interfaces](#core-typescript-interfaces)
5. [UI Extension Approaches](#ui-extension-approaches)
6. [Type System Design](#type-system-design)
7. [Serialization & Persistence](#serialization--persistence)
8. [Shared Primitives API](#shared-primitives-api)
9. [Security Considerations](#security-considerations)
10. [Migration Strategy](#migration-strategy)
11. [Implementation Phases](#implementation-phases)
12. [Trade-offs & Alternatives Considered](#trade-offs--alternatives-considered)

---

## Problem Statement

React-Finity currently supports 2 object kinds (`baseplate`, `bin`) and 5 modifier kinds (`dividerGrid`, `labelTab`, `scoop`, `insert`, `lid`). Adding a new kind requires changes across **12-15 files**, touching:

- TypeScript type unions and param interfaces
- Hardcoded switch/case statements in geometry, store, viewport, export, and UI layers
- Direct import statements for generators and components
- Constant definitions for default params, labels, and icon mappings

This tight coupling means every new kind is a cross-cutting concern that touches nearly every layer of the application. As the number of kinds grows (risers, drawers, weighted baseplates, custom modifiers like magnets, fillets, text labels, etc.), this approach becomes increasingly fragile and discourages contribution.

### Goals

1. **Reduce wiring cost**: Adding a new object or modifier kind should require creating the kind's own files (generator, UI component, defaults) and a single registration call -- not editing 15 existing files.
2. **Internal extensibility first (Phase 1)**: Make it easy for project contributors to add built-in kinds through a clean API. All built-in kinds use the same registration mechanism.
3. **External plugin support later (Phase 2)**: Architect the registry so that runtime-loaded plugins can register kinds without code changes to the core application.
4. **Maintain type safety**: TypeScript should catch registration errors at compile time for built-in kinds, and runtime validation should catch errors for dynamically loaded plugins.
5. **Preserve existing patterns**: Geometry generators remain pure functions. The Zustand store remains the single source of truth. The profile system and ModifierContext flow are unchanged.

---

## Current Architecture Analysis

### Wiring Points Inventory

Every switch statement, conditional, or mapping that must be updated when adding a new kind:

#### Object Kind Wiring (12 locations)

| # | File | Location | What it does |
|---|------|----------|-------------|
| 1 | `src/types/gridfinity.ts:37` | `GridfinityObjectKind` type | String literal union |
| 2 | `src/types/gridfinity.ts:55` | `GridfinityObject` type | Discriminated union |
| 3 | `src/engine/constants.ts` | `DEFAULT_*_PARAMS` | Default parameter constants |
| 4 | `src/store/projectStore.ts:120-139` | `addObject()` switch | Creates typed object with defaults |
| 5 | `src/store/projectStore.ts:56-63` | `getNextName()` kind names | Display name mapping |
| 6 | `src/components/viewport/SceneObject.tsx:122-127` | Geometry generation switch | Maps kind to generator function |
| 7 | `src/components/viewport/SceneObject.tsx:131-136` | Bin context check | Determines if kind supports modifiers |
| 8 | `src/components/panels/PropertiesPanel.tsx:35-39` | Properties panel conditional | Renders kind-specific properties |
| 9 | `src/components/panels/ObjectListPanel.tsx:9-12` | `kindIcons` mapping | Icon per kind |
| 10 | `src/components/toolbar/Toolbar.tsx:78-86,246-248` | Add object handlers + menu items | Toolbar dropdown entries |
| 11 | `src/components/viewport/MeasurementOverlay.tsx:15-21` | `getDimensions()` switch | Dimension helper dispatch |
| 12 | `src/engine/export/printOrientation.ts:12-19` | `getPrintRotation()` switch | Print orientation strategy |
| -- | `src/engine/export/mergeObjectGeometry.ts:117-127` | `generateObjectGeometry()` switch | Export geometry dispatch |
| -- | `src/engine/export/mergeObjectGeometry.ts:134-143` | `mergeObjectWithModifiers()` | Modifier support check |

#### Modifier Kind Wiring (9 locations)

| # | File | Location | What it does |
|---|------|----------|-------------|
| 1 | `src/types/gridfinity.ts:61` | `ModifierKind` type | String literal union |
| 2 | `src/types/gridfinity.ts:125-130` | `Modifier` type | Discriminated union |
| 3 | `src/engine/constants.ts` | `DEFAULT_*_PARAMS` | Default modifier params |
| 4 | `src/store/projectStore.ts:65-78` | `getDefaultModifierParams()` switch | Default params factory |
| 5 | `src/store/projectStore.ts:264-302` | `getModifierContext()` conditionals | Child context computation |
| 6 | `src/engine/export/mergeObjectGeometry.ts:18-35` | `generateModifierGeometry()` switch | Geometry dispatch |
| 7 | `src/engine/export/mergeObjectGeometry.ts:57-92` | `computeChildContext()` conditionals | Space subdivision logic |
| 8 | `src/components/panels/ModifierSection.tsx:20-26,62-74,135-148` | Labels, menu items, controls switch | UI label, dropdown, and component dispatch |
| 9 | `src/components/viewport/SceneObject.tsx:61-92` | `ModifierMesh` child context | Viewport child context computation |

### Key Observation

The wiring follows a consistent pattern: each location maps a `kind` string to some behavior (function, component, constant, or label). This is the textbook use case for a **registry pattern** -- a central map from kind strings to behavior descriptors.

---

## Proposed Solution: Registry Pattern

Two singleton registries -- `ObjectKindRegistry` and `ModifierKindRegistry` -- that map kind strings to registration descriptors. All current switch statements are replaced by registry lookups.

### Design Principles

1. **Built-in kinds register the same way as custom kinds**: No special path for built-in types. `registerObjectKind('bin', { ... })` is called during app initialization.
2. **Registration is imperative, not declarative**: Registries are populated by calling `register*()` functions, not by scanning files or using decorators. This keeps the system simple and tree-shakeable.
3. **Registries are frozen after initialization**: In Phase 1, all registrations happen before React renders. This avoids reactivity concerns. Phase 2 adds dynamic registration with store notification.
4. **Generic base types with runtime narrowing**: The type system uses a generic `Record<string, unknown>` for params at the registry boundary, with runtime validation for type safety.

### Architecture Overview

```
src/engine/registry/
  objectKindRegistry.ts    -- ObjectKindRegistry singleton + registration API
  modifierKindRegistry.ts  -- ModifierKindRegistry singleton + registration API
  types.ts                 -- Registration interfaces
  builtins.ts              -- Registers all built-in kinds (called at app startup)
```

Consumers (store, viewport, export, UI) import from the registry instead of importing individual generators/components. Example:

```typescript
// Before (mergeObjectGeometry.ts)
import { generateBaseplate } from '@/engine/geometry/baseplate'
import { generateBin } from '@/engine/geometry/bin'

function generateObjectGeometry(object: GridfinityObject, profile: GridfinityProfile) {
  switch (object.kind) {
    case 'baseplate': return generateBaseplate(object.params, profile)
    case 'bin': return generateBin(object.params, profile)
  }
}

// After
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'

function generateObjectGeometry(object: GridfinityObject, profile: GridfinityProfile) {
  const registration = objectKindRegistry.get(object.kind)
  if (!registration) throw new Error(`Unknown object kind: ${object.kind}`)
  return registration.generateGeometry(object.params, profile)
}
```

---

## Core TypeScript Interfaces

### `src/engine/registry/types.ts`

```typescript
import type { BufferGeometry } from 'three'
import type { ComponentType } from 'react'
import type { Euler } from 'three'
import type { GridfinityProfile, ModifierContext } from '@/types/gridfinity'
import type { LucideIcon } from 'lucide-react'

// ────────────────────────────────────────────
// Param Schema (for schema-driven UI)
// ────────────────────────────────────────────

export type ParamFieldType = 'slider' | 'switch' | 'select' | 'number'

export interface ParamFieldBase {
  key: string            // param property name (e.g., 'gridWidth')
  label: string          // display label (e.g., 'Grid Width')
  type: ParamFieldType
}

export interface SliderParamField extends ParamFieldBase {
  type: 'slider'
  min: number
  max: number
  step: number
  unit?: string          // e.g., 'mm', 'u' (grid units)
  precision?: number     // decimal places for display (default 0)
}

export interface SwitchParamField extends ParamFieldBase {
  type: 'switch'
}

export interface SelectParamField extends ParamFieldBase {
  type: 'select'
  options: Array<{ value: string; label: string }>
}

export interface NumberParamField extends ParamFieldBase {
  type: 'number'
  min?: number
  max?: number
  step?: number
  unit?: string
}

export type ParamField = SliderParamField | SwitchParamField | SelectParamField | NumberParamField

export interface ParamSchema {
  fields: ParamField[]
  /** Optional grouping of fields with separators */
  sections?: Array<{
    label?: string
    fieldKeys: string[]
  }>
}

// ────────────────────────────────────────────
// Object Kind Registration
// ────────────────────────────────────────────

export interface ObjectKindRegistration<TParams extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique kind identifier (e.g., 'baseplate', 'bin') */
  kind: string

  /** Human-readable display name (e.g., 'Baseplate', 'Bin') */
  label: string

  /** Lucide icon component for object list panel */
  icon: LucideIcon

  /** Default parameter values for new instances */
  defaultParams: TParams

  /** Pure function: generates Three.js geometry from params and profile */
  generateGeometry: (params: TParams, profile: GridfinityProfile) => BufferGeometry

  /** Returns bounding dimensions in mm for measurement overlay */
  getDimensions: (params: TParams, profile: GridfinityProfile) => {
    width: number
    depth: number
    height: number
  }

  /** Print orientation rotation for FDM export */
  getPrintRotation: (params: TParams) => Euler

  /** Whether this object kind supports modifiers (e.g., bins do, baseplates do not) */
  supportsModifiers: boolean

  /**
   * Computes the initial ModifierContext for this object's modifiers.
   * Only required if supportsModifiers is true.
   */
  computeModifierContext?: (params: TParams, profile: GridfinityProfile) => ModifierContext

  /**
   * UI for the properties panel. Two modes:
   * - schema: Auto-generated UI from ParamSchema
   * - component: Custom React component
   *
   * If both are provided, component takes precedence.
   */
  propertiesSchema?: ParamSchema
  PropertiesComponent?: ComponentType<{ object: { id: string; kind: string; params: TParams } }>
}

// ────────────────────────────────────────────
// Modifier Kind Registration
// ────────────────────────────────────────────

export interface ModifierKindRegistration<TParams extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique kind identifier (e.g., 'dividerGrid', 'labelTab') */
  kind: string

  /** Human-readable display name (e.g., 'Divider Grid', 'Label Tab') */
  label: string

  /** Default parameter values for new instances */
  defaultParams: TParams

  /** Pure function: generates modifier geometry from params, context, and profile */
  generateGeometry: (
    params: TParams,
    context: ModifierContext,
    profile: GridfinityProfile,
  ) => BufferGeometry | null

  /**
   * Whether this modifier subdivides the parent's space into child compartments.
   * If true, computeChildContext must be provided.
   * Examples: dividerGrid and insert subdivide; labelTab, scoop, lid do not.
   */
  subdividesSpace: boolean

  /**
   * Computes the child ModifierContext for nested modifiers.
   * Only required if subdividesSpace is true.
   * Receives the modifier's own params and the parent context.
   */
  computeChildContext?: (params: TParams, parentContext: ModifierContext) => ModifierContext

  /**
   * Optional: restrict which parent kinds this modifier can attach to.
   * If omitted, the modifier can attach to any object that supports modifiers
   * or to any other modifier.
   */
  allowedParentKinds?: string[]

  /**
   * UI for the modifier controls panel. Two modes:
   * - schema: Auto-generated UI from ParamSchema
   * - component: Custom React component
   */
  controlsSchema?: ParamSchema
  ControlsComponent?: ComponentType<{
    modifier: { id: string; kind: string; parentId: string; params: TParams }
  }>
}
```

### `src/engine/registry/objectKindRegistry.ts`

```typescript
import type { ObjectKindRegistration } from './types'

class ObjectKindRegistry {
  private registrations = new Map<string, ObjectKindRegistration>()
  private frozen = false

  register(registration: ObjectKindRegistration): void {
    if (this.frozen) {
      throw new Error(
        `Cannot register object kind "${registration.kind}" after registry is frozen. ` +
        `All registrations must happen before app initialization.`
      )
    }
    if (this.registrations.has(registration.kind)) {
      throw new Error(`Object kind "${registration.kind}" is already registered.`)
    }
    this.registrations.set(registration.kind, registration)
  }

  get(kind: string): ObjectKindRegistration | undefined {
    return this.registrations.get(kind)
  }

  getOrThrow(kind: string): ObjectKindRegistration {
    const reg = this.registrations.get(kind)
    if (!reg) throw new Error(`Unknown object kind: "${kind}"`)
    return reg
  }

  getAll(): ObjectKindRegistration[] {
    return Array.from(this.registrations.values())
  }

  getAllKinds(): string[] {
    return Array.from(this.registrations.keys())
  }

  has(kind: string): boolean {
    return this.registrations.has(kind)
  }

  /** Freeze the registry after all built-in kinds are registered. */
  freeze(): void {
    this.frozen = true
  }

  /** Phase 2: Unfreeze for dynamic plugin registration. */
  unfreeze(): void {
    this.frozen = false
  }
}

export const objectKindRegistry = new ObjectKindRegistry()
```

### `src/engine/registry/modifierKindRegistry.ts`

```typescript
import type { ModifierKindRegistration } from './types'

class ModifierKindRegistry {
  private registrations = new Map<string, ModifierKindRegistration>()
  private frozen = false

  register(registration: ModifierKindRegistration): void {
    if (this.frozen) {
      throw new Error(
        `Cannot register modifier kind "${registration.kind}" after registry is frozen.`
      )
    }
    if (this.registrations.has(registration.kind)) {
      throw new Error(`Modifier kind "${registration.kind}" is already registered.`)
    }
    if (registration.subdividesSpace && !registration.computeChildContext) {
      throw new Error(
        `Modifier kind "${registration.kind}" declares subdividesSpace but ` +
        `does not provide computeChildContext.`
      )
    }
    this.registrations.set(registration.kind, registration)
  }

  get(kind: string): ModifierKindRegistration | undefined {
    return this.registrations.get(kind)
  }

  getOrThrow(kind: string): ModifierKindRegistration {
    const reg = this.registrations.get(kind)
    if (!reg) throw new Error(`Unknown modifier kind: "${kind}"`)
    return reg
  }

  getAll(): ModifierKindRegistration[] {
    return Array.from(this.registrations.values())
  }

  getAllKinds(): string[] {
    return Array.from(this.registrations.keys())
  }

  /** Get modifiers allowed for a given parent kind. */
  getForParent(parentKind: string): ModifierKindRegistration[] {
    return this.getAll().filter((reg) => {
      if (!reg.allowedParentKinds) return true
      return reg.allowedParentKinds.includes(parentKind)
    })
  }

  has(kind: string): boolean {
    return this.registrations.has(kind)
  }

  freeze(): void {
    this.frozen = true
  }

  unfreeze(): void {
    this.frozen = false
  }
}

export const modifierKindRegistry = new ModifierKindRegistry()
```

### Example: Registering Built-in Bin Kind

`src/engine/registry/builtins.ts`:

```typescript
import * as THREE from 'three'
import { Box, Grid3x3 } from 'lucide-react'
import { objectKindRegistry } from './objectKindRegistry'
import { modifierKindRegistry } from './modifierKindRegistry'
import { generateBaseplate, getBaseplateDimensions } from '@/engine/geometry/baseplate'
import { generateBin, getBinDimensions } from '@/engine/geometry/bin'
import { generateDividerGrid } from '@/engine/geometry/modifiers/dividerGrid'
import { generateLabelTab } from '@/engine/geometry/modifiers/labelTab'
import { generateScoop } from '@/engine/geometry/modifiers/scoop'
import { generateInsert } from '@/engine/geometry/modifiers/insert'
import { generateLid } from '@/engine/geometry/modifiers/lid'
import { computeBinContext } from '@/engine/export/mergeObjectGeometry'
import {
  DEFAULT_BASEPLATE_PARAMS,
  DEFAULT_BIN_PARAMS,
  DEFAULT_DIVIDER_GRID_PARAMS,
  DEFAULT_LABEL_TAB_PARAMS,
  DEFAULT_SCOOP_PARAMS,
  DEFAULT_INSERT_PARAMS,
  DEFAULT_LID_PARAMS,
} from '@/engine/constants'

export function registerBuiltinKinds(): void {
  // ── Object Kinds ──

  objectKindRegistry.register({
    kind: 'baseplate',
    label: 'Baseplate',
    icon: Grid3x3,
    defaultParams: { ...DEFAULT_BASEPLATE_PARAMS },
    generateGeometry: generateBaseplate,
    getDimensions: getBaseplateDimensions,
    getPrintRotation: () => new THREE.Euler(0, 0, 0),
    supportsModifiers: false,
  })

  objectKindRegistry.register({
    kind: 'bin',
    label: 'Bin',
    icon: Box,
    defaultParams: { ...DEFAULT_BIN_PARAMS },
    generateGeometry: generateBin,
    getDimensions: getBinDimensions,
    getPrintRotation: () => new THREE.Euler(Math.PI, 0, 0),
    supportsModifiers: true,
    computeModifierContext: computeBinContext,
  })

  // ── Modifier Kinds ──

  modifierKindRegistry.register({
    kind: 'dividerGrid',
    label: 'Divider Grid',
    defaultParams: { ...DEFAULT_DIVIDER_GRID_PARAMS },
    generateGeometry: generateDividerGrid,
    subdividesSpace: true,
    computeChildContext: (params, parentContext) => {
      const { dividersX, dividersY, wallThickness } = params as {
        dividersX: number; dividersY: number; wallThickness: number
      }
      if (dividersX === 0 && dividersY === 0) return parentContext
      return {
        innerWidth: (parentContext.innerWidth - wallThickness * dividersX) / (dividersX + 1),
        innerDepth: (parentContext.innerDepth - wallThickness * dividersY) / (dividersY + 1),
        wallHeight: parentContext.wallHeight,
        floorY: parentContext.floorY,
        centerX: parentContext.centerX,
        centerZ: parentContext.centerZ,
      }
    },
  })

  modifierKindRegistry.register({
    kind: 'labelTab',
    label: 'Label Tab',
    defaultParams: { ...DEFAULT_LABEL_TAB_PARAMS },
    generateGeometry: generateLabelTab,
    subdividesSpace: false,
  })

  modifierKindRegistry.register({
    kind: 'scoop',
    label: 'Scoop',
    defaultParams: { ...DEFAULT_SCOOP_PARAMS },
    generateGeometry: generateScoop,
    subdividesSpace: false,
  })

  modifierKindRegistry.register({
    kind: 'insert',
    label: 'Insert',
    defaultParams: { ...DEFAULT_INSERT_PARAMS },
    generateGeometry: generateInsert,
    subdividesSpace: true,
    computeChildContext: (params, parentContext) => {
      const { compartmentsX, compartmentsY, wallThickness } = params as {
        compartmentsX: number; compartmentsY: number; wallThickness: number
      }
      const rimInnerWidth = parentContext.innerWidth - wallThickness * 2
      const rimInnerDepth = parentContext.innerDepth - wallThickness * 2
      return {
        innerWidth: (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX,
        innerDepth: (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY,
        wallHeight: parentContext.wallHeight,
        floorY: parentContext.floorY,
        centerX: parentContext.centerX,
        centerZ: parentContext.centerZ,
      }
    },
  })

  modifierKindRegistry.register({
    kind: 'lid',
    label: 'Lid',
    defaultParams: { ...DEFAULT_LID_PARAMS },
    generateGeometry: generateLid,
    subdividesSpace: false,
  })

  // Freeze registries after built-in registration
  objectKindRegistry.freeze()
  modifierKindRegistry.freeze()
}
```

---

## UI Extension Approaches

Two approaches for rendering properties panels and modifier controls for registered kinds.

### Approach A: Schema-Driven UI

Plugin authors define a `ParamSchema` describing their parameters. The application auto-generates the UI from the schema.

**Example schema for bin:**

```typescript
objectKindRegistry.register({
  kind: 'bin',
  // ... other fields ...
  propertiesSchema: {
    sections: [
      { label: 'Grid', fieldKeys: ['gridWidth', 'gridDepth', 'heightUnits'] },
      { fieldKeys: ['stackingLip', 'wallThickness', 'innerFillet'] },
    ],
    fields: [
      { key: 'gridWidth', label: 'Grid Width', type: 'slider', min: 1, max: 10, step: 1, unit: 'u' },
      { key: 'gridDepth', label: 'Grid Depth', type: 'slider', min: 1, max: 10, step: 1, unit: 'u' },
      { key: 'heightUnits', label: 'Height', type: 'slider', min: 1, max: 10, step: 1, unit: 'u' },
      { key: 'stackingLip', label: 'Stacking Lip', type: 'switch' },
      { key: 'wallThickness', label: 'Wall Thickness', type: 'slider', min: 0.4, max: 3.0, step: 0.1, unit: 'mm', precision: 1 },
      { key: 'innerFillet', label: 'Inner Fillet', type: 'slider', min: 0, max: 3.0, step: 0.5, unit: 'mm', precision: 1 },
    ],
  },
})
```

**Auto-generated renderer** (`SchemaPropertiesPanel.tsx`):

```typescript
function SchemaPropertiesPanel({ objectId, schema, params }: SchemaPropertiesPanelProps) {
  const updateParams = useProjectStore((s) => s.updateObjectParams)

  return (
    <div className="space-y-4">
      {(schema.sections ?? [{ fieldKeys: schema.fields.map(f => f.key) }]).map((section, i) => (
        <div key={i}>
          {section.label && <Label className="text-xs text-muted-foreground">{section.label}</Label>}
          {i > 0 && <Separator className="my-3" />}
          {section.fieldKeys.map((key) => {
            const field = schema.fields.find(f => f.key === key)
            if (!field) return null
            switch (field.type) {
              case 'slider':
                return <SliderField key={key} field={field} value={params[key]} onChange={(v) => updateParams(objectId, { [key]: v })} />
              case 'switch':
                return <SwitchField key={key} field={field} value={params[key]} onChange={(v) => updateParams(objectId, { [key]: v })} />
              case 'select':
                return <SelectField key={key} field={field} value={params[key]} onChange={(v) => updateParams(objectId, { [key]: v })} />
              // ...
            }
          })}
        </div>
      ))}
    </div>
  )
}
```

**Pros:**
- Zero React code required from plugin authors -- just data
- Consistent UI styling across all kinds
- Schema can be serialized (useful for Phase 2 external plugins)
- Params validation can be derived from schema (min/max/type)
- Easier to add features like undo/redo, param presets

**Cons:**
- Limited expressiveness -- cannot handle custom layouts, computed displays (e.g., bin's dimension readout showing `{gridWidth}u ({dims.width}mm)`), conditional visibility, or interdependent params
- The current BinProperties panel has a ProfileSelector, dimension readout, and ModifierSection that are not param fields -- these would need special handling
- Every new UI pattern requires extending the schema vocabulary

### Approach B: Component-Based UI

Plugin authors provide a full React component that receives the object/modifier and renders its own UI.

**Example:**

```typescript
objectKindRegistry.register({
  kind: 'bin',
  // ... other fields ...
  PropertiesComponent: BinProperties,
})
```

The `PropertiesPanel` renders it:

```typescript
function PropertiesPanel() {
  const registration = objectKindRegistry.get(selectedObject.kind)
  if (!registration) return null

  if (registration.PropertiesComponent) {
    return <registration.PropertiesComponent object={selectedObject} />
  }
  if (registration.propertiesSchema) {
    return <SchemaPropertiesPanel schema={registration.propertiesSchema} ... />
  }
  return <div>No properties available</div>
}
```

**Pros:**
- Full expressiveness -- any layout, any logic, any custom display
- Built-in kinds keep their existing polished components unchanged
- No schema vocabulary to maintain or extend

**Cons:**
- Plugin authors must write React code and understand shadcn/ui conventions
- Risk of inconsistent styling across plugins
- Components cannot be serialized (relevant for Phase 2)

### Recommendation: Hybrid Approach

**Use both.** The registration interface accepts either `propertiesSchema`, `PropertiesComponent`, or both (component takes precedence). This gives:

- **Built-in kinds**: Use `PropertiesComponent` for their existing polished panels (BinProperties, BaseplateProperties, etc.)
- **Simple custom kinds**: Use `propertiesSchema` for quick param-based UI without writing React
- **Complex custom kinds**: Provide `PropertiesComponent` for full control

The same dual approach applies to modifier controls (`controlsSchema` / `ControlsComponent`).

For Phase 2 (external plugins loaded at runtime), the schema-driven approach becomes essential since external code cannot easily provide React components without a module bundling solution. Schema-driven would be the default for external plugins, with component-based as an advanced option for plugins distributed as npm packages.

---

## Type System Design

### The Challenge

The current type system uses closed discriminated unions:

```typescript
type GridfinityObjectKind = 'baseplate' | 'bin'
type GridfinityObject = BaseplateObject | BinObject
```

TypeScript's exhaustive checking in switch statements ensures all cases are handled. Opening the union (changing to `string`) loses this safety. But keeping it closed defeats extensibility.

### Solution: Open Kinds with Runtime Validation

#### Phase 1: Widen the union, keep type guards

```typescript
// types/gridfinity.ts -- after migration

/** Built-in object kinds. Custom kinds use arbitrary strings. */
export type BuiltinObjectKind = 'baseplate' | 'bin'

/** All object kinds -- built-in plus any registered custom kinds. */
export type GridfinityObjectKind = BuiltinObjectKind | (string & {})
// The `(string & {})` pattern allows any string while preserving
// autocomplete for built-in values.

export interface GridfinityObjectBase {
  id: string
  name: string
  kind: string                          // open string, not a closed union
  position: [number, number, number]
  params: Record<string, unknown>       // generic params at base level
}

// Built-in typed objects for internal use
export interface BaseplateObject extends GridfinityObjectBase {
  kind: 'baseplate'
  params: BaseplateParams
}

export interface BinObject extends GridfinityObjectBase {
  kind: 'bin'
  params: BinParams
}

// Union of known built-in objects (for internal type narrowing)
export type BuiltinObject = BaseplateObject | BinObject

// The general type used in stores and components
export type GridfinityObject = GridfinityObjectBase
```

#### Type guards for built-in kinds

```typescript
// types/guards.ts

export function isBaseplateObject(obj: GridfinityObject): obj is BaseplateObject {
  return obj.kind === 'baseplate'
}

export function isBinObject(obj: GridfinityObject): obj is BinObject {
  return obj.kind === 'bin'
}
```

Built-in components that need specific param types (e.g., `BinProperties`) use these guards internally. The rest of the application works with `GridfinityObject` (generic params) and delegates to the registry.

#### Runtime param validation

For Phase 2 (dynamic plugins), the registry validates params against the schema at deserialization time:

```typescript
function validateParams(params: Record<string, unknown>, schema: ParamSchema): boolean {
  for (const field of schema.fields) {
    const value = params[field.key]
    switch (field.type) {
      case 'slider':
      case 'number':
        if (typeof value !== 'number') return false
        if (field.min !== undefined && value < field.min) return false
        if (field.max !== undefined && value > field.max) return false
        break
      case 'switch':
        if (typeof value !== 'boolean') return false
        break
      case 'select':
        if (typeof value !== 'string') return false
        if (!field.options.some(o => o.value === value)) return false
        break
    }
  }
  return true
}
```

### Modifier Type System

Same approach -- `ModifierKind` becomes open, `ModifierBase` uses `params: Record<string, unknown>`, and built-in modifiers keep their typed interfaces for internal component use.

```typescript
export type BuiltinModifierKind = 'dividerGrid' | 'labelTab' | 'scoop' | 'insert' | 'lid'
export type ModifierKind = BuiltinModifierKind | (string & {})

export interface ModifierBase {
  id: string
  parentId: string
  kind: string
  params: Record<string, unknown>
}

// Built-in typed modifiers
export interface DividerGridModifier extends ModifierBase {
  kind: 'dividerGrid'
  params: DividerGridModifierParams
}
// ... etc

// General type used in stores and registries
export type Modifier = ModifierBase
```

---

## Serialization & Persistence

### Current System

Projects are stored in localStorage as `ProjectData`:

```typescript
interface ProjectData {
  objects: GridfinityObject[]
  modifiers: Modifier[]
}
```

Objects and modifiers serialize to JSON naturally since they are plain objects with `kind`, `params`, and metadata.

### Impact of the Registry Pattern

**No change to serialization format.** The `kind` string and `params` object are self-describing. When loading a project:

1. Parse JSON as `ProjectData`
2. For each object/modifier, check `objectKindRegistry.has(obj.kind)` / `modifierKindRegistry.has(mod.kind)`
3. If the kind is registered, load normally
4. If the kind is unregistered (e.g., plugin was removed), either:
   - **Option A**: Skip the object and warn the user (data loss risk)
   - **Option B**: Keep the object in a "degraded" state -- store its data but render a placeholder in the viewport and a warning in the properties panel
   - **Recommended**: Option B, as it preserves the user's data and allows recovery when the plugin is re-installed

### Degraded Object Rendering

```typescript
// In SceneObject.tsx
const registration = objectKindRegistry.get(object.kind)
if (!registration) {
  // Render a placeholder box with warning color
  return (
    <mesh position={object.position}>
      <boxGeometry args={[42, 14, 42]} />
      <meshStandardMaterial color="#ff6b6b" wireframe />
    </mesh>
  )
}
```

### Project Format Versioning

Add a `version` field to `ProjectData` for forward compatibility:

```typescript
interface ProjectData {
  version: 1
  objects: GridfinityObject[]
  modifiers: Modifier[]
  /** Plugin kinds used in this project (for dependency tracking) */
  pluginKinds?: string[]
}
```

---

## Shared Primitives API

For plugin authors to create geometry, expose the existing primitives from `src/engine/geometry/primitives.ts` as a stable public API:

```typescript
// src/engine/registry/primitives.ts (re-export facade)

export {
  roundedRectShape,
  extrudeShape,
  mergeGeometries,
  createCylinder,
  getCurveSegments,
} from '@/engine/geometry/primitives'

// Additional helpers that plugin authors commonly need:
export { computeBinContext } from '@/engine/export/mergeObjectGeometry'
```

Document these functions as the "Plugin Primitives API" so that plugin authors don't need to import Three.js geometry utilities directly or reinvent shape-creation logic. This API should be considered stable and versioned.

---

## Security Considerations

### Phase 1 (Internal Only)

No security concerns. All code is bundled at build time and reviewed through normal PR processes.

### Phase 2 (External Plugins)

External plugins execute arbitrary JavaScript in the main thread. Key risks:

| Risk | Mitigation |
|------|-----------|
| **Malicious code execution** | Geometry generators are pure functions taking params and returning BufferGeometry. Consider running them in a Web Worker for isolation. |
| **DOM manipulation** | If plugins provide React components, they could manipulate the DOM arbitrarily. Schema-driven UI avoids this entirely. |
| **Infinite loops / perf** | Wrap generator calls in a timeout. Web Worker approach enables `terminate()`. |
| **Data exfiltration** | Plugins have access to `params` and `profile` but not to the full store. Limit the API surface exposed to plugins. |
| **Supply chain attacks** | If plugins are loaded from URLs, implement a content hash verification system. Consider a curated plugin registry. |

**Recommended Phase 2 approach:** Schema-driven plugins (JSON-only definitions) are safe by construction -- they contain no executable code, only param metadata. The geometry generator is the only executable part; running it in a Web Worker with `postMessage` serialization provides effective sandboxing.

For component-based plugins (which provide React components), a trust model is needed -- either a curated marketplace with code review, or a clear "untrusted plugin" warning to users.

---

## Migration Strategy

The migration is designed to be **incremental and backward-compatible**. Each step can be merged independently without breaking the application.

### Step 1: Create Registry Infrastructure

Add registry types, classes, and the builtins registration module. No existing code changes.

**Files created:**
- `src/engine/registry/types.ts`
- `src/engine/registry/objectKindRegistry.ts`
- `src/engine/registry/modifierKindRegistry.ts`
- `src/engine/registry/builtins.ts`

**Call `registerBuiltinKinds()` in app entry point** (`src/app/App.tsx` or `main.tsx`).

### Step 2: Migrate Export/Geometry Layer

Replace switch statements in `mergeObjectGeometry.ts` and `printOrientation.ts` with registry lookups. These are pure functions with no React dependencies -- safest to migrate first.

**Before:**
```typescript
function generateObjectGeometry(object: GridfinityObject, profile: GridfinityProfile) {
  switch (object.kind) {
    case 'baseplate': return generateBaseplate(object.params, profile)
    case 'bin': return generateBin(object.params, profile)
  }
}
```

**After:**
```typescript
function generateObjectGeometry(object: GridfinityObject, profile: GridfinityProfile) {
  const reg = objectKindRegistry.getOrThrow(object.kind)
  return reg.generateGeometry(object.params, profile)
}
```

**Files modified:**
- `src/engine/export/mergeObjectGeometry.ts`
- `src/engine/export/printOrientation.ts`

### Step 3: Migrate Store Layer

Replace `addObject()` switch and `getDefaultModifierParams()` switch with registry lookups.

**Before:**
```typescript
switch (kind) {
  case 'baseplate':
    newObject = { kind: 'baseplate', id, name, position: [0, 0, 0], params: { ...DEFAULT_BASEPLATE_PARAMS } }
    break
  case 'bin':
    newObject = { kind: 'bin', id, name, position: [0, 0, 0], params: { ...DEFAULT_BIN_PARAMS } }
    break
}
```

**After:**
```typescript
const reg = objectKindRegistry.getOrThrow(kind)
const newObject: GridfinityObject = {
  kind,
  id,
  name,
  position: [0, 0, 0],
  params: { ...reg.defaultParams },
}
```

Also migrate `getModifierContext()` to use `modifierKindRegistry` for child context computation.

**Files modified:**
- `src/store/projectStore.ts`

### Step 4: Migrate Viewport Layer

Replace geometry generation switch and modifier child context computation with registry lookups.

**Files modified:**
- `src/components/viewport/SceneObject.tsx`
- `src/components/viewport/MeasurementOverlay.tsx`

### Step 5: Migrate UI Layer

Replace hardcoded icon mappings, properties panel conditionals, modifier controls switch, and toolbar menu items with registry-driven rendering.

**Before (ObjectListPanel):**
```typescript
const kindIcons: Record<GridfinityObjectKind, typeof Grid3x3> = {
  baseplate: Grid3x3,
  bin: Box,
}
```

**After:**
```typescript
const Icon = objectKindRegistry.get(obj.kind)?.icon ?? HelpCircle
```

**Before (Toolbar add-object dropdown):**
```tsx
<DropdownMenuItem onClick={handleAddBaseplate}>Baseplate</DropdownMenuItem>
<DropdownMenuItem onClick={handleAddBin}>Bin</DropdownMenuItem>
```

**After:**
```tsx
{objectKindRegistry.getAll().map((reg) => (
  <DropdownMenuItem
    key={reg.kind}
    onClick={() => {
      const id = addObject(reg.kind)
      selectObject(id)
    }}
  >
    {reg.label}
  </DropdownMenuItem>
))}
```

**Before (ModifierSection dropdown):**
```tsx
<DropdownMenuItem onClick={() => addModifier(parentId, 'dividerGrid')}>Divider Grid</DropdownMenuItem>
<DropdownMenuItem onClick={() => addModifier(parentId, 'labelTab')}>Label Tab</DropdownMenuItem>
{/* ... 5 items */}
```

**After:**
```tsx
{modifierKindRegistry.getAll().map((reg) => (
  <DropdownMenuItem
    key={reg.kind}
    onClick={() => addModifier(parentId, reg.kind)}
  >
    {reg.label}
  </DropdownMenuItem>
))}
```

**Before (PropertiesPanel):**
```tsx
{selectedObject.kind === 'baseplate' && <BaseplateProperties object={selectedObject} />}
{selectedObject.kind === 'bin' && <BinProperties object={selectedObject} />}
```

**After:**
```tsx
{(() => {
  const reg = objectKindRegistry.get(selectedObject.kind)
  if (!reg) return <UnknownKindPlaceholder kind={selectedObject.kind} />
  if (reg.PropertiesComponent) return <reg.PropertiesComponent object={selectedObject} />
  if (reg.propertiesSchema) return <SchemaPropertiesPanel schema={reg.propertiesSchema} object={selectedObject} />
  return null
})()}
```

**Files modified:**
- `src/components/panels/PropertiesPanel.tsx`
- `src/components/panels/ModifierSection.tsx`
- `src/components/panels/ObjectListPanel.tsx`
- `src/components/toolbar/Toolbar.tsx`

### Step 6: Widen Type System

Update `src/types/gridfinity.ts` to use open kind strings and generic params at the base interface level. Add type guards. Update any remaining type assertions.

**Files modified:**
- `src/types/gridfinity.ts`

### Step 7: Build Schema-Driven UI Components

Create `SchemaPropertiesPanel` and `SchemaModifierControls` components that render UI from `ParamSchema`. These are used as fallback when no custom component is registered.

**Files created:**
- `src/components/panels/SchemaPropertiesPanel.tsx`
- `src/components/panels/SchemaModifierControls.tsx`

### Step 8: Add Schema-Driven UI for Built-in Modifier Controls

Convert the simpler modifier controls (scoop, lid) to use schemas instead of hand-coded components, validating the schema-driven approach works well. Keep complex controls (dividerGrid, insert, labelTab) as components.

---

## Implementation Phases

### Phase 1: Internal Registry (this project) -- IMPLEMENTED

All steps 1-8 above. Result: all built-in kinds register through the registry, new kinds can be added by creating files + a registration call.

**Definition of done:**
- All switch statements on `kind` are removed from core application code
- Adding a new object/modifier kind requires creating its files and adding one registration call in `builtins.ts`
- All existing tests pass
- Schema-driven UI works for at least 2 modifier kinds (scoop + lid)

**Implementation notes:**
- Registry singletons: `objectKindRegistry` and `modifierKindRegistry` in `src/engine/registry/`
- Registration happens in `src/engine/registry/builtins.ts`, called from `src/main.tsx` before React renders
- Type system widened with `GenericGridfinityObject` and `GenericModifier` for custom kinds
- Type guards available in `src/types/guards.ts` for built-in kind narrowing
- Schema-driven components: `SchemaPropertiesPanel` and `SchemaModifierControls` in `src/components/panels/`

### Phase 2: External Plugin Support (future)

- Plugin manifest format (JSON file describing a plugin's kinds)
- Plugin loading from URL or file upload
- Web Worker sandboxing for geometry generators
- Plugin manager UI (install, enable/disable, remove)
- Dynamic registry unfreezing and store notification on plugin load
- Plugin dependency tracking in project files

### Phase 3: Plugin Ecosystem (future)

- Plugin marketplace / curated registry
- Plugin versioning and compatibility checking
- Plugin sharing (export plugin as file, share via URL)
- Plugin development toolkit (template, testing utilities, documentation)

---

## Trade-offs & Alternatives Considered

### Alternative 1: Code Generation

Generate the wiring code (switch statements, imports, type unions) from a declarative config file using a build script.

**Rejected because:** Adds build complexity, generated code is harder to debug, doesn't support runtime extensibility (Phase 2).

### Alternative 2: Convention-Based Discovery

Scan a `plugins/` directory at build time and auto-register any modules matching a naming convention.

**Rejected because:** Relies on filesystem conventions rather than explicit registration, harder to understand and debug, doesn't work for runtime loading.

### Alternative 3: Event/Hook System

Use an event emitter pattern where the core application emits events ("need-geometry-for-kind", "need-properties-for-kind") and plugins subscribe.

**Rejected because:** Adds indirection without benefit over a direct registry lookup. Event systems are suited for many-to-many communication; this is one-to-one (one kind maps to one handler).

### Alternative 4: Full Dependency Injection

Use a DI container (like tsyringe or inversify) to wire all dependencies.

**Rejected because:** Heavyweight for this use case. The registry pattern is simpler, has no external dependencies, and solves the same problem. DI containers add complexity for factory resolution, lifecycle management, and container configuration that isn't needed here.

### Alternative 5: React Context-Based Plugin API

Provide plugins through React context providers at the app root.

**Rejected because:** Geometry generation and export run outside React (pure functions). A registry that works in both React and non-React contexts is more appropriate.

### Trade-off: Type Safety vs. Openness

The biggest trade-off is loosening TypeScript's exhaustive checking on switch statements. With closed unions, TypeScript errors if a case is missing. With open registries, a missing registration is only caught at runtime.

**Mitigation:**
- Built-in kinds register in `builtins.ts` which runs at startup -- missing registrations fail immediately on app load, not at some later point
- Registry's `getOrThrow()` fails fast with clear error messages
- Unit tests verify all built-in kinds are registered
- The `BuiltinObjectKind` / `BuiltinModifierKind` types still exist for code that needs compile-time guarantees on known kinds
