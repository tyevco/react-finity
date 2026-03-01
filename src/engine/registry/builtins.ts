import { Euler } from 'three'
import { Grid3x3, Box, Grip } from 'lucide-react'
import { objectKindRegistry } from './objectKindRegistry'
import { modifierKindRegistry } from './modifierKindRegistry'

import { generateBaseplate, getBaseplateDimensions } from '@/engine/geometry/baseplate'
import { generateBin, getBinDimensions } from '@/engine/geometry/bin'
import { generateOpenGridBoard, getOpenGridBoardDimensions } from '@/engine/geometry/opengridBoard'
import { generateDividerGrid } from '@/engine/geometry/modifiers/dividerGrid'
import { generateLabelTab } from '@/engine/geometry/modifiers/labelTab'
import { generateScoop } from '@/engine/geometry/modifiers/scoop'
import { generateInsert } from '@/engine/geometry/modifiers/insert'
import { generateLid } from '@/engine/geometry/modifiers/lid'
import { generateFingerScoop } from '@/engine/geometry/modifiers/fingerScoop'
import {
  DEFAULT_BASEPLATE_PARAMS,
  DEFAULT_BIN_PARAMS,
  DEFAULT_OPENGRID_BOARD_PARAMS,
  DEFAULT_DIVIDER_GRID_PARAMS,
  DEFAULT_LABEL_TAB_PARAMS,
  DEFAULT_SCOOP_PARAMS,
  DEFAULT_INSERT_PARAMS,
  DEFAULT_LID_PARAMS,
  DEFAULT_FINGER_SCOOP_PARAMS,
} from '@/engine/constants'
import { computeBinContext } from '@/engine/export/mergeObjectGeometry'
import type {
  DividerGridModifierParams,
  InsertModifierParams,
  ModifierContext,
} from '@/types/gridfinity'
import { BaseplateProperties } from '@/components/panels/BaseplateProperties'
import { BinProperties } from '@/components/panels/BinProperties'
import { OpenGridBoardProperties } from '@/components/panels/OpenGridBoardProperties'
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
    computeModifierContext: computeBinContext,
    PropertiesComponent: asPropertiesComponent(BinProperties),
  })

  objectKindRegistry.register({
    kind: 'opengridBoard',
    label: 'OpenGrid Board',
    icon: Grip,
    defaultParams: { ...DEFAULT_OPENGRID_BOARD_PARAMS },
    generateGeometry: generateOpenGridBoard,
    getDimensions: getOpenGridBoardDimensions,
    getPrintRotation: () => new Euler(0, 0, 0),
    supportsModifiers: false,
    PropertiesComponent: asPropertiesComponent(OpenGridBoardProperties),
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
    ): ModifierContext | ModifierContext[] => {
      const { dividersX, dividersY, wallThickness } = params
      if (dividersX === 0 && dividersY === 0) return parentContext
      const compartmentWidth =
        (parentContext.innerWidth - wallThickness * dividersX) / (dividersX + 1)
      const compartmentDepth =
        (parentContext.innerDepth - wallThickness * dividersY) / (dividersY + 1)
      const cw = Math.max(0.1, compartmentWidth)
      const cd = Math.max(0.1, compartmentDepth)
      const contexts: ModifierContext[] = []
      for (let i = 0; i <= dividersX; i++) {
        for (let j = 0; j <= dividersY; j++) {
          contexts.push({
            innerWidth: cw,
            innerDepth: cd,
            wallHeight: Math.max(0.1, parentContext.wallHeight),
            floorY: parentContext.floorY,
            centerX:
              parentContext.centerX -
              parentContext.innerWidth / 2 +
              cw / 2 +
              i * (cw + wallThickness),
            centerZ:
              parentContext.centerZ -
              parentContext.innerDepth / 2 +
              cd / 2 +
              j * (cd + wallThickness),
          })
        }
      }
      return contexts
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
    ): ModifierContext | ModifierContext[] => {
      const { compartmentsX, compartmentsY, wallThickness } = params
      if (compartmentsX < 1 || compartmentsY < 1) return parentContext
      const rimInnerWidth = parentContext.innerWidth - wallThickness * 2
      const rimInnerDepth = parentContext.innerDepth - wallThickness * 2
      if (rimInnerWidth <= 0 || rimInnerDepth <= 0) return parentContext
      const cw = Math.max(
        0.1,
        (rimInnerWidth - wallThickness * (compartmentsX - 1)) / compartmentsX,
      )
      const cd = Math.max(
        0.1,
        (rimInnerDepth - wallThickness * (compartmentsY - 1)) / compartmentsY,
      )
      const contexts: ModifierContext[] = []
      for (let i = 0; i < compartmentsX; i++) {
        for (let j = 0; j < compartmentsY; j++) {
          contexts.push({
            innerWidth: cw,
            innerDepth: cd,
            wallHeight: Math.max(0.1, parentContext.wallHeight),
            floorY: parentContext.floorY,
            centerX: parentContext.centerX - rimInnerWidth / 2 + cw / 2 + i * (cw + wallThickness),
            centerZ: parentContext.centerZ - rimInnerDepth / 2 + cd / 2 + j * (cd + wallThickness),
          })
        }
      }
      return contexts
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

  modifierKindRegistry.register({
    kind: 'fingerScoop',
    label: 'Finger Scoop',
    color: '#90caf9',
    defaultParams: { ...DEFAULT_FINGER_SCOOP_PARAMS },
    generateGeometry: generateFingerScoop,
    subdividesSpace: false,
    subtractive: true,
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
        { key: 'width', label: 'Width', type: 'slider', min: 10, max: 30, step: 1, unit: 'mm' },
        { key: 'depth', label: 'Depth', type: 'slider', min: 5, max: 20, step: 1, unit: 'mm' },
      ],
    },
  })

  objectKindRegistry.freeze()
  modifierKindRegistry.freeze()
}
