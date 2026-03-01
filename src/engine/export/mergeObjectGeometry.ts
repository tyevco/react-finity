import type { BufferGeometry } from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import type {
  GridfinityObject,
  GridfinityProfile,
  Modifier,
  ModifierContext,
  BinParams,
} from '@/types/gridfinity'
import { objectKindRegistry } from '@/engine/registry/objectKindRegistry'
import { modifierKindRegistry } from '@/engine/registry/modifierKindRegistry'
import { mergeGeometries } from '@/engine/geometry/primitives'

// Bridge typed params interfaces to the registry's Record<string, unknown>.
// Safe because the registry ensures params match the registered kind.
function asParams(p: object): Record<string, unknown> {
  return p as Record<string, unknown>
}

export function generateModifierGeometry(
  modifier: Modifier,
  context: ModifierContext,
  profile: GridfinityProfile,
): BufferGeometry | null {
  const reg = modifierKindRegistry.get(modifier.kind)
  if (!reg) {
    console.warn(`Unknown modifier kind "${modifier.kind}", skipping`)
    return null
  }
  return reg.generateGeometry(asParams(modifier.params), context, profile)
}

export function computeBinContext(params: BinParams, profile: GridfinityProfile): ModifierContext {
  const { gridWidth, gridDepth, heightUnits, wallThickness } = params
  const { gridSize, heightUnit, tolerance, socketWallHeight } = profile

  const outerWidth = gridWidth * gridSize - tolerance * 2
  const outerDepth = gridDepth * gridSize - tolerance * 2
  // Clamp to minimum 0.1mm to match bin.ts and prevent negative dimensions
  // when wallThickness exceeds half the outer dimension
  const innerWidth = Math.max(0.1, outerWidth - wallThickness * 2)
  const innerDepth = Math.max(0.1, outerDepth - wallThickness * 2)
  const wallHeight = heightUnits * heightUnit

  return {
    innerWidth,
    innerDepth,
    wallHeight,
    floorY: socketWallHeight + wallThickness,
    centerX: 0,
    centerZ: 0,
  }
}

function computeChildContexts(
  modifier: Modifier,
  parentContext: ModifierContext,
): ModifierContext[] {
  const reg = modifierKindRegistry.get(modifier.kind)
  if (reg?.subdividesSpace && reg.computeChildContext) {
    const result = reg.computeChildContext(asParams(modifier.params), parentContext)
    return Array.isArray(result) ? result : [result]
  }
  return [parentContext]
}

interface CollectedModifierGeometries {
  additive: BufferGeometry[]
  subtractive: BufferGeometry[]
}

function collectModifierGeometries(
  parentId: string,
  context: ModifierContext,
  allModifiers: Modifier[],
  profile: GridfinityProfile,
): CollectedModifierGeometries {
  const children = allModifiers.filter((m) => m.parentId === parentId)
  const additive: BufferGeometry[] = []
  const subtractive: BufferGeometry[] = []

  for (const modifier of children) {
    const reg = modifierKindRegistry.get(modifier.kind)

    // Skip separate print part modifiers -- they are exported independently
    if (reg?.separatePrintPart) continue

    const geo = generateModifierGeometry(modifier, context, profile)
    if (geo) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- position may be absent on empty BufferGeometry
      if (geo.attributes.position && geo.attributes.position.count > 0) {
        if (reg?.subtractive) {
          subtractive.push(geo)
        } else {
          additive.push(geo)
        }
      } else {
        geo.dispose()
      }
    }

    const childContexts = computeChildContexts(modifier, context)
    for (const childCtx of childContexts) {
      const childGeos = collectModifierGeometries(modifier.id, childCtx, allModifiers, profile)
      additive.push(...childGeos.additive)
      subtractive.push(...childGeos.subtractive)
    }
  }

  return { additive, subtractive }
}

function generateObjectGeometry(
  object: GridfinityObject,
  profile: GridfinityProfile,
): BufferGeometry {
  const reg = objectKindRegistry.getOrThrow(object.kind)
  return reg.generateGeometry(asParams(object.params), profile)
}

/**
 * Merge an object with all its modifiers into a single BufferGeometry.
 * The result includes the base object geometry plus all modifier geometries
 * recursively collected and merged. Modifiers with separatePrintPart are
 * excluded from the merge (they are exported as independent print parts).
 */
export function mergeObjectWithModifiers(
  object: GridfinityObject,
  modifiers: Modifier[],
  profile: GridfinityProfile,
): BufferGeometry {
  const baseGeometry = generateObjectGeometry(object, profile)

  const reg = objectKindRegistry.getOrThrow(object.kind)
  if (!reg.supportsModifiers || !reg.computeModifierContext) {
    return baseGeometry
  }

  const context = reg.computeModifierContext(asParams(object.params), profile)
  const { additive, subtractive } = collectModifierGeometries(
    object.id,
    context,
    modifiers,
    profile,
  )

  if (additive.length === 0 && subtractive.length === 0) {
    return baseGeometry
  }

  // Merge base + additive geometries
  const additiveGeometries = [baseGeometry, ...additive]
  let result = mergeGeometries(additiveGeometries)

  // Dispose source geometries now that they've been merged
  baseGeometry.dispose()
  for (const geo of additive) {
    geo.dispose()
  }

  // CSG subtract subtractive modifiers
  if (subtractive.length > 0) {
    const mergedSubtractive = mergeGeometries(subtractive)
    for (const geo of subtractive) {
      geo.dispose()
    }

    const evaluator = new Evaluator()
    evaluator.attributes = ['position', 'normal']
    const baseBrush = new Brush(result)
    const subtractBrush = new Brush(mergedSubtractive)

    try {
      const csgResult = evaluator.evaluate(baseBrush, subtractBrush, SUBTRACTION)
      result = csgResult.geometry
    } finally {
      // Brush holds a reference to the geometry passed to its constructor,
      // so baseBrush.geometry === (old) result. Disposing here covers both
      // the success path (old result replaced) and error path (old result
      // still assigned but unusable). Avoid disposing result directly above
      // to prevent double-dispose.
      baseBrush.geometry.dispose()
      subtractBrush.geometry.dispose()
    }
  }

  return result
}

/**
 * Collect modifiers marked as separate print parts and generate their
 * geometry independently. Returns modifier + geometry pairs for layout.
 */
export function collectSeparatePartModifiers(
  objectId: string,
  modifiers: Modifier[],
  profile: GridfinityProfile,
  object: GridfinityObject,
): { modifier: Modifier; geometry: BufferGeometry }[] {
  const reg = objectKindRegistry.getOrThrow(object.kind)
  if (!reg.supportsModifiers || !reg.computeModifierContext) {
    return []
  }

  const context = reg.computeModifierContext(asParams(object.params), profile)
  const results: { modifier: Modifier; geometry: BufferGeometry }[] = []

  const directChildren = modifiers.filter((m) => m.parentId === objectId)
  for (const modifier of directChildren) {
    const modReg = modifierKindRegistry.get(modifier.kind)
    if (!modReg?.separatePrintPart) continue

    const geo = generateModifierGeometry(modifier, context, profile)
    if (geo) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- position may be absent on empty BufferGeometry
      if (geo.attributes.position && geo.attributes.position.count > 0) {
        results.push({ modifier, geometry: geo })
      } else {
        geo.dispose()
      }
    }
  }

  return results
}
