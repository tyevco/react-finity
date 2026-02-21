import type {
  GridfinityProfile,
  DividerGridModifierParams,
  LabelTabModifierParams,
  ScoopModifierParams,
  InsertModifierParams,
  LidModifierParams,
} from '@/types/gridfinity'

export const PROFILE_OFFICIAL: GridfinityProfile = {
  name: 'Official',
  gridSize: 42,
  heightUnit: 7,
  baseplateHeight: 7,
  binCornerRadius: 3.75,
  baseplateCornerRadius: 4.0,
  wallThickness: 1.2,
  tolerance: 0.25,
  magnetDiameter: 6.15,
  magnetDepth: 2.0,
  screwDiameter: 3.0,
  heatSetDiameter: 4.2,
  stackingLipHeight: 4.4,
  socketWallHeight: 4.65,
  socketBottomChamfer: 0.8,
  socketMidHeight: 1.8,
  socketTopHeight: 2.15,
}

export const PROFILE_TIGHT_FIT: GridfinityProfile = {
  ...PROFILE_OFFICIAL,
  name: 'Tight Fit',
  tolerance: 0.1,
  magnetDiameter: 6.05,
}

export const PROFILE_LOOSE_FIT: GridfinityProfile = {
  ...PROFILE_OFFICIAL,
  name: 'Loose Fit',
  tolerance: 0.4,
  magnetDiameter: 6.3,
  heatSetDiameter: 4.4,
}

export const DEFAULT_PROFILES: Record<string, GridfinityProfile> = {
  official: PROFILE_OFFICIAL,
  tightFit: PROFILE_TIGHT_FIT,
  looseFit: PROFILE_LOOSE_FIT,
}

export const DEFAULT_BASEPLATE_PARAMS = {
  gridWidth: 3,
  gridDepth: 3,
  magnetHoles: true,
  screwHoles: false,
} as const

export const DEFAULT_BIN_PARAMS = {
  gridWidth: 1,
  gridDepth: 1,
  heightUnits: 3,
  stackingLip: true,
  wallThickness: 1.2,
  innerFillet: 0,
} as const

export const DEFAULT_DIVIDER_GRID_PARAMS: DividerGridModifierParams = {
  dividersX: 1,
  dividersY: 1,
  wallThickness: 1.2,
}

export const DEFAULT_LABEL_TAB_PARAMS: LabelTabModifierParams = {
  wall: 'front',
  angle: 45,
  height: 7,
}

export const DEFAULT_SCOOP_PARAMS: ScoopModifierParams = {
  wall: 'front',
  radius: 0,
}

export const DEFAULT_INSERT_PARAMS: InsertModifierParams = {
  compartmentsX: 2,
  compartmentsY: 2,
  wallThickness: 1.2,
}

export const DEFAULT_LID_PARAMS: LidModifierParams = {
  stacking: false,
}
