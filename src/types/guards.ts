import type {
  GridfinityObject,
  BaseplateObject,
  BinObject,
  Modifier,
  DividerGridModifier,
  LabelTabModifier,
  ScoopModifier,
  InsertModifier,
  LidModifier,
} from './gridfinity'

export function isBaseplateObject(obj: GridfinityObject): obj is BaseplateObject {
  return obj.kind === 'baseplate'
}

export function isBinObject(obj: GridfinityObject): obj is BinObject {
  return obj.kind === 'bin'
}

export function isDividerGridModifier(mod: Modifier): mod is DividerGridModifier {
  return mod.kind === 'dividerGrid'
}

export function isLabelTabModifier(mod: Modifier): mod is LabelTabModifier {
  return mod.kind === 'labelTab'
}

export function isScoopModifier(mod: Modifier): mod is ScoopModifier {
  return mod.kind === 'scoop'
}

export function isInsertModifier(mod: Modifier): mod is InsertModifier {
  return mod.kind === 'insert'
}

export function isLidModifier(mod: Modifier): mod is LidModifier {
  return mod.kind === 'lid'
}
