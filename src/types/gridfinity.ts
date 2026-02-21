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
  magnetHoles: boolean
  screwHoles: boolean
}

export interface BinParams {
  gridWidth: number // grid units (1-10)
  gridDepth: number // grid units (1-10)
  heightUnits: number // height in 7mm units (1-10)
  stackingLip: boolean
  wallThickness: number // override or use profile default
}

export interface LidParams {
  gridWidth: number
  gridDepth: number
  stacking: boolean // flat vs stacking lid
}

export type GridfinityObjectKind = 'baseplate' | 'bin' | 'lid'

export interface GridfinityObjectBase {
  id: string
  name: string
  position: [number, number, number]
}

export interface BaseplateObject extends GridfinityObjectBase {
  kind: 'baseplate'
  params: BaseplateParams
}

export interface BinObject extends GridfinityObjectBase {
  kind: 'bin'
  params: BinParams
}

export interface LidObject extends GridfinityObjectBase {
  kind: 'lid'
  params: LidParams
}

export type GridfinityObject = BaseplateObject | BinObject | LidObject
