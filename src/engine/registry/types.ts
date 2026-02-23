import type { BufferGeometry, Euler } from 'three'
import type { GridfinityProfile, ModifierContext } from '@/types/gridfinity'
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

// --- Schema-driven UI types ---

export interface SliderParamField {
  type: 'slider'
  key: string
  label: string
  min: number
  max: number
  step: number
  unit?: string
  precision?: number
}

export interface SwitchParamField {
  type: 'switch'
  key: string
  label: string
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectParamField {
  type: 'select'
  key: string
  label: string
  options: SelectOption[]
}

export interface NumberParamField {
  type: 'number'
  key: string
  label: string
  min?: number
  max?: number
  step?: number
  unit?: string
}

export type ParamField = SliderParamField | SwitchParamField | SelectParamField | NumberParamField

export interface ParamSchema {
  fields: ParamField[]
}

// --- Component prop types for registry ---
// These are intentionally broad: the registry ensures components only receive
// their matching kind at runtime. This avoids contravariance issues with
// React component types in strict mode.

export interface ObjectPropertiesComponentProps {
  object: {
    id: string
    kind: string
    name: string
    position: [number, number, number]
    params: Record<string, unknown>
  }
}

export interface ModifierControlsComponentProps {
  modifier: {
    id: string
    kind: string
    parentId: string
    params: Record<string, unknown>
  }
}

// --- Object kind registration ---

export interface ObjectKindRegistration<TParams = Record<string, unknown>> {
  kind: string
  label: string
  icon: LucideIcon
  defaultParams: TParams
  generateGeometry: (params: TParams, profile: GridfinityProfile) => BufferGeometry
  getDimensions: (
    params: TParams,
    profile: GridfinityProfile,
  ) => { width: number; depth: number; height: number }
  getPrintRotation: (params: TParams) => Euler
  supportsModifiers: boolean
  getDefaultPosition?: (profile: GridfinityProfile) => [number, number, number]
  computeModifierContext?: (params: TParams, profile: GridfinityProfile) => ModifierContext
  propertiesSchema?: ParamSchema
  PropertiesComponent?: ComponentType<ObjectPropertiesComponentProps>
}

// --- Modifier kind registration ---

export interface ModifierKindRegistration<TParams = Record<string, unknown>> {
  kind: string
  label: string
  color: string
  defaultParams: TParams
  generateGeometry: (
    params: TParams,
    context: ModifierContext,
    profile: GridfinityProfile,
  ) => BufferGeometry | null
  subdividesSpace: boolean
  computeChildContext?: (params: TParams, parentContext: ModifierContext) => ModifierContext
  separatePrintPart?: boolean
  allowedParentKinds?: string[]
  controlsSchema?: ParamSchema
  ControlsComponent?: ComponentType<ModifierControlsComponentProps>
}
