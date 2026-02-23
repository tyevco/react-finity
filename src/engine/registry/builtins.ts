import { Euler } from 'three'
import { Grid3x3, Box } from 'lucide-react'
import { objectKindRegistry } from './objectKindRegistry'
import { modifierKindRegistry } from './modifierKindRegistry'

import { generateBaseplate, getBaseplateDimensions } from '@/engine/geometry/baseplate'
import { generateBin, getBinDimensions } from '@/engine/geometry/bin'
import { generateDividerGrid } from '@/engine/geometry/modifiers/dividerGrid'
import { generateLabelTab } from '@/engine/geometry/modifiers/labelTab'
import { generateScoop } from '@/engine/geometry/modifiers/scoop'
import { generateInsert } from '@/engine/geometry/modifiers/insert'
import { generateLid } from '@/engine/geometry/modifiers/lid'
import {
  DEFAULT_BASEPLATE_PARAMS,
  DEFAULT_BIN_PARAMS,
  DEFAULT_DIVIDER_GRID_PARAMS,
  DEFAULT_LABEL_TAB_PARAMS,
  DEFAULT_SCOOP_PARAMS,
  DEFAULT_INSERT_PARAMS,
  DEFAULT_LID_PARAMS,
} from '@/engine/constants'
import type {
  BinParams,
  DividerGridModifierParams,
  InsertModifierParams,
  ModifierContext,
  GridfinityProfile,
} from '@/types/gridfinity'
import { BaseplateProperties } from '@/components/panels/BaseplateProperties'
import { BinProperties } from '@/components/panels/BinProperties'
import { DividerGridControls } from '@/components/panels/modifiers/DividerGridControls'
import { LabelTabControls } from '@/components/panels/modifiers/LabelTabControls'
import { InsertControls } from '@/components/panels/modifiers/InsertControls'
import type { ComponentType } from 'react'
import type { ObjectPropertiesComponentProps, ModifierControlsComponentProps } from './types'

// Type bridge helpers for registry component types.
// The registry uses broad prop types; these casts are safe because
// the registry ensures components only receive their matching kind.
function asPropertiesComponent<T>(
  component: ComponentType<T>,
): ComponentType<ObjectPropertiesComponentProps> {
  return component as unknown as ComponentType<ObjectPropertiesComponentProps>
}

function asControlsComponent<T>(
  component: ComponentType<T>,
): ComponentType<ModifierControlsComponentProps> {
  return component as unknown as ComponentType<ModifierControlsComponentProps>
}

function computeBinModifierContext(params: BinParams, profile: GridfinityProfile): ModifierContext {
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

let initialized = false

export function registerBuiltinKinds(): void {
  if (initialized) return
  initialized = true

  // --- Object kinds ---

  objectKindRegistry.register({
    kind: 'baseplate',
    label: 'Baseplate',
    icon: Grid3x3,
    defaultParams: { ...DEFAULT_BASEPLATE_PARAMS },
    generateGeometry: generateBaseplate,
    getDimensions: getBaseplateDimensions,
    getPrintRotation: () => new Euler(0, 0, 0),
    supportsModifiers: false,
    PropertiesComponent: asPropertiesComponent(BaseplateProperties),
  })

  objectKindRegistry.register({
    kind: 'bin',
    label: 'Bin',
    icon: Box,
    defaultParams: { ...DEFAULT_BIN_PARAMS },
    generateGeometry: generateBin,
    getDimensions: getBinDimensions,
    getPrintRotation: () => new Euler(0, 0, 0),
    supportsModifiers: true,
    getDefaultPosition: (profile) => [0, profile.baseplateHeight - profile.socketWallHeight, 0],
    computeModifierContext: computeBinModifierContext,
    PropertiesComponent: asPropertiesComponent(BinProperties),
  })

  // --- Modifier kinds ---

  modifierKindRegistry.register({
    kind: 'dividerGrid',
    label: 'Divider Grid',
    color: '#a8d8ea',
    defaultParams: { ...DEFAULT_DIVIDER_GRID_PARAMS },
    generateGeometry: generateDividerGrid,
    subdividesSpace: true,
    computeChildContext: (
      params: DividerGridModifierParams,
      parentContext: ModifierContext,
    ): ModifierContext => {
      const { dividersX, dividersY, wallThickness } = params
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
    },
    ControlsComponent: asControlsComponent(DividerGridControls),
  })

  modifierKindRegistry.register({
    kind: 'labelTab',
    label: 'Label Tab',
    color: '#f9c784',
    defaultParams: { ...DEFAULT_LABEL_TAB_PARAMS },
    generateGeometry: generateLabelTab,
    subdividesSpace: false,
    ControlsComponent: asControlsComponent(LabelTabControls),
  })

  modifierKindRegistry.register({
    kind: 'scoop',
    label: 'Scoop',
    color: '#b5e8b5',
    defaultParams: { ...DEFAULT_SCOOP_PARAMS },
    generateGeometry: generateScoop,
    subdividesSpace: false,
    controlsSchema: {
      fields: [
        {
          key: 'wall',
          label: 'Wall',
          type: 'select',
          options: [
            { value: 'front', label: 'Front' },
            { value: 'back', label: 'Back' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          key: 'radius',
          label: 'Radius',
          type: 'slider',
          min: 0,
          max: 20,
          step: 1,
          unit: 'mm',
        },
      ],
    },
  })

  modifierKindRegistry.register({
    kind: 'insert',
    label: 'Insert',
    color: '#d4a5e5',
    defaultParams: { ...DEFAULT_INSERT_PARAMS },
    generateGeometry: generateInsert,
    subdividesSpace: true,
    computeChildContext: (
      params: InsertModifierParams,
      parentContext: ModifierContext,
    ): ModifierContext => {
      const { compartmentsX, compartmentsY, wallThickness } = params
      const rimInnerWidth = parentContext.innerWidth - wallThickness * 2
      const rimInnerDepth = parentContext.innerDepth - wallThickness * 2
      const compartmentWidth = (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX
      const compartmentDepth = (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY
      return {
        innerWidth: compartmentWidth,
        innerDepth: compartmentDepth,
        wallHeight: parentContext.wallHeight,
        floorY: parentContext.floorY,
        centerX: parentContext.centerX,
        centerZ: parentContext.centerZ,
      }
    },
    ControlsComponent: asControlsComponent(InsertControls),
  })

  modifierKindRegistry.register({
    kind: 'lid',
    label: 'Lid',
    color: '#f5a5a5',
    defaultParams: { ...DEFAULT_LID_PARAMS },
    generateGeometry: generateLid,
    subdividesSpace: false,
    separatePrintPart: true,
    controlsSchema: {
      fields: [{ key: 'stacking', label: 'Stacking', type: 'switch' }],
    },
  })

  objectKindRegistry.freeze()
  modifierKindRegistry.freeze()
}
