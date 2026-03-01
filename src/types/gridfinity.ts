export interface GridfinityProfile {
  name: string
  gridSize: number // mm per grid unit (42mm standard)
  heightUnit: number // mm per height unit (7mm standard)
  baseplateHeight: number // total baseplate height in mm
  binCornerRadius: number // bin corner fillet radius (3.75mm)
  baseplateCornerRadius: number // baseplate corner fillet (4.0mm)
  wallThickness: number // wall thickness in mm (~1.2mm)
  tolerance: number // clearance between bin and baseplate (0.25mm)
  magnetDiameter: number // magnet hole diameter (6.15mm = 6mm + clearance)
  magnetDepth: number // magnet hole depth (2.0mm)
  screwDiameter: number // M3 screw hole diameter (3.0mm)
  heatSetDiameter: number // heat set insert hole diameter (4.2mm)
  stackingLipHeight: number // stacking lip total height (~4.4mm)
  socketWallHeight: number // baseplate socket wall height (4.65mm)
  socketBottomChamfer: number // chamfer at bottom of socket (0.8mm)
  socketMidHeight: number // height of the mid-step in socket (1.8mm)
  socketTopHeight: number // height of top rim in socket (2.15mm)
}

export interface BaseplateParams {
  gridWidth: number // grid units (1-10)
  gridDepth: number // grid units (1-10)
  slim: boolean
  magnetHoles: boolean
  screwHoles: boolean
}

export interface BinParams {
  gridWidth: number // grid units (1-10)
  gridDepth: number // grid units (1-10)
  heightUnits: number // height in 7mm units (1-10)
  stackingLip: boolean
  wallThickness: number // override or use profile default
  innerFillet: number // internal edge fillet radius in mm (0 = sharp, max 3)
  magnetHoles: boolean
  weightHoles: boolean
  honeycombBase: boolean
}

export interface OpenGridBoardParams {
  gridWidth: number // 1-10 (28mm grid units)
  gridDepth: number // 1-10 (28mm grid units)
  variant: 'full' | 'lite'
  orientation: 'flat' | 'wall'
}

export interface OpenGridBoardObject extends GridfinityObjectBase {
  kind: 'opengridBoard'
  params: OpenGridBoardParams
}

export type BuiltinObjectKind = 'baseplate' | 'bin' | 'opengridBoard'
export type GridfinityObjectKind = BuiltinObjectKind | (string & {})

export interface GridfinityObjectBase {
  id: string
  kind: string
  name: string
  position: [number, number, number]
  rotation?: [number, number, number] // Euler angles [x, y, z] in radians
}

export interface BaseplateObject extends GridfinityObjectBase {
  kind: 'baseplate'
  params: BaseplateParams
}

export interface BinObject extends GridfinityObjectBase {
  kind: 'bin'
  params: BinParams
}

export interface GenericGridfinityObject extends GridfinityObjectBase {
  params: Record<string, unknown>
}

export type GridfinityObject =
  | BaseplateObject
  | BinObject
  | OpenGridBoardObject
  | GenericGridfinityObject

// --- Modifier system ---

export type WallFace = 'front' | 'back' | 'left' | 'right'

export type BuiltinModifierKind =
  | 'dividerGrid'
  | 'labelTab'
  | 'scoop'
  | 'insert'
  | 'lid'
  | 'fingerScoop'
export type ModifierKind = BuiltinModifierKind | (string & {})

export interface ModifierBase {
  id: string
  parentId: string // can be an object ID or another modifier's ID
  kind: string
}

export interface ModifierContext {
  innerWidth: number // available width in mm
  innerDepth: number // available depth in mm
  wallHeight: number // available height in mm
  floorY: number // Y position of the floor
  centerX: number // center X offset
  centerZ: number // center Z offset
}

export interface DividerGridModifierParams {
  dividersX: number // walls along width (0-9)
  dividersY: number // walls along depth (0-9)
  wallThickness: number
}
export interface DividerGridModifier extends ModifierBase {
  kind: 'dividerGrid'
  params: DividerGridModifierParams
}

export interface LabelTabModifierParams {
  wall: WallFace
  angle: number // degrees (30-60)
  height: number // mm (5-14)
}
export interface LabelTabModifier extends ModifierBase {
  kind: 'labelTab'
  params: LabelTabModifierParams
}

export interface ScoopModifierParams {
  wall: WallFace
  radius: number // mm (0 = auto from wall height)
}
export interface ScoopModifier extends ModifierBase {
  kind: 'scoop'
  params: ScoopModifierParams
}

export interface InsertModifierParams {
  compartmentsX: number // 1-10
  compartmentsY: number // 1-10
  wallThickness: number
}
export interface InsertModifier extends ModifierBase {
  kind: 'insert'
  params: InsertModifierParams
}

export interface LidModifierParams {
  stacking: boolean // flat vs stacking
}
export interface LidModifier extends ModifierBase {
  kind: 'lid'
  params: LidModifierParams
}

export interface FingerScoopModifierParams {
  wall: WallFace
  width: number // mm (10-30)
  depth: number // mm (5-20, how far down from wall top)
}
export interface FingerScoopModifier extends ModifierBase {
  kind: 'fingerScoop'
  params: FingerScoopModifierParams
}

export interface GenericModifier extends ModifierBase {
  params: Record<string, unknown>
}

export type Modifier =
  | DividerGridModifier
  | LabelTabModifier
  | ScoopModifier
  | InsertModifier
  | LidModifier
  | FingerScoopModifier
  | GenericModifier

export type ViewportBackground = 'dark' | 'light' | 'neutral'
export type LightingPreset = 'studio' | 'outdoor' | 'soft'
export type CameraPreset = 'top' | 'front' | 'side' | 'isometric'

// --- View mode ---

export type AppView = 'edit' | 'printLayout'

export interface PrintBedPreset {
  name: string
  width: number // mm
  depth: number // mm
}

// --- Project persistence ---

export interface ProjectMeta {
  id: string
  name: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface ProjectData {
  objects: GridfinityObject[]
  modifiers: Modifier[]
}

// --- Export settings ---

export type CurveQuality = 'low' | 'medium' | 'high'
