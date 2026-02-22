import type { BufferGeometry } from 'three'
import type {
  GridfinityObject,
  GridfinityProfile,
  Modifier,
  ModifierContext,
  BinParams,
} from '@/types/gridfinity'
import { generateBaseplate } from '@/engine/geometry/baseplate'
import { generateBin } from '@/engine/geometry/bin'
import { generateDividerGrid } from '@/engine/geometry/modifiers/dividerGrid'
import { generateLabelTab } from '@/engine/geometry/modifiers/labelTab'
import { generateScoop } from '@/engine/geometry/modifiers/scoop'
import { generateInsert } from '@/engine/geometry/modifiers/insert'
import { generateLid } from '@/engine/geometry/modifiers/lid'
import { mergeGeometries } from '@/engine/geometry/primitives'

export function generateModifierGeometry(
  modifier: Modifier,
  context: ModifierContext,
  profile: GridfinityProfile,
): BufferGeometry | null {
  switch (modifier.kind) {
    case 'dividerGrid':
      return generateDividerGrid(modifier.params, context, profile)
    case 'labelTab':
      return generateLabelTab(modifier.params, context, profile)
    case 'scoop':
      return generateScoop(modifier.params, context, profile)
    case 'insert':
      return generateInsert(modifier.params, context, profile)
    case 'lid':
      return generateLid(modifier.params, context, profile)
  }
}

export function computeBinContext(params: BinParams, profile: GridfinityProfile): ModifierContext {
  const { gridWidth, gridDepth, heightUnits, wallThickness } = params
  const { gridSize, heightUnit, tolerance, socketWallHeight } = profile

  const outerWidth = gridWidth * gridSize - tolerance * 2
  const outerDepth = gridDepth * gridSize - tolerance * 2
  const innerWidth = outerWidth - wallThickness * 2
  const innerDepth = outerDepth - wallThickness * 2
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

function computeChildContext(modifier: Modifier, parentContext: ModifierContext): ModifierContext {
  if (modifier.kind === 'dividerGrid') {
    const { dividersX, dividersY, wallThickness } = modifier.params
    if (dividersX === 0 && dividersY === 0) return parentContext
    const compartmentWidth =
      (parentContext.innerWidth - wallThickness * dividersX) / (dividersX + 1)
    const compartmentDepth =
      (parentContext.innerDepth - wallThickness * dividersY) / (dividersY + 1)
    return {
      innerWidth: compartmentWidth,
      innerDepth: compartmentDepth,
      wallHeight: parentContext.wallHeight,
      floorY: parentContext.floorY,
      centerX: parentContext.centerX,
      centerZ: parentContext.centerZ,
    }
  }
  if (modifier.kind === 'insert') {
    const { compartmentsX, compartmentsY, wallThickness } = modifier.params
    const rimInnerWidth = parentContext.innerWidth - wallThickness * 2
    const rimInnerDepth = parentContext.innerDepth - wallThickness * 2
    const compartmentWidth =
      (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX
    const compartmentDepth =
      (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY
    return {
      innerWidth: compartmentWidth,
      innerDepth: compartmentDepth,
      wallHeight: parentContext.wallHeight,
      floorY: parentContext.floorY,
      centerX: parentContext.centerX,
      centerZ: parentContext.centerZ,
    }
  }
  return parentContext
}

function collectModifierGeometries(
  parentId: string,
  context: ModifierContext,
  allModifiers: Modifier[],
  profile: GridfinityProfile,
): BufferGeometry[] {
  const children = allModifiers.filter((m) => m.parentId === parentId)
  const geometries: BufferGeometry[] = []

  for (const modifier of children) {
    const geo = generateModifierGeometry(modifier, context, profile)
    if (geo && 'position' in geo.attributes) {
      geometries.push(geo)
    }

    const childContext = computeChildContext(modifier, context)
    const childGeos = collectModifierGeometries(modifier.id, childContext, allModifiers, profile)
    geometries.push(...childGeos)
  }

  return geometries
}

function generateObjectGeometry(
  object: GridfinityObject,
  profile: GridfinityProfile,
): BufferGeometry {
  switch (object.kind) {
    case 'baseplate':
      return generateBaseplate(object.params, profile)
    case 'bin':
      return generateBin(object.params, profile)
  }
}

/**
 * Merge an object with all its modifiers into a single BufferGeometry.
 * The result includes the base object geometry plus all modifier geometries
 * recursively collected and merged.
 */
export function mergeObjectWithModifiers(
  object: GridfinityObject,
  modifiers: Modifier[],
  profile: GridfinityProfile,
): BufferGeometry {
  const baseGeometry = generateObjectGeometry(object, profile)

  if (object.kind !== 'bin') {
    return baseGeometry
  }

  const context = computeBinContext(object.params, profile)
  const modifierGeometries = collectModifierGeometries(object.id, context, modifiers, profile)

  if (modifierGeometries.length === 0) {
    return baseGeometry
  }

  const allGeometries = [baseGeometry, ...modifierGeometries]
  const merged = mergeGeometries(allGeometries)

  baseGeometry.dispose()
  for (const geo of modifierGeometries) {
    geo.dispose()
  }

  return merged
}
