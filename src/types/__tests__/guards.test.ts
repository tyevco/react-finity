import { describe, it, expect } from 'vitest'
import {
  isBaseplateObject,
  isBinObject,
  isDividerGridModifier,
  isLabelTabModifier,
  isScoopModifier,
  isInsertModifier,
  isLidModifier,
  isFingerScoopModifier,
} from '@/types/guards'
import type { GridfinityObject, Modifier } from '@/types/gridfinity'

const baseObj = {
  id: 'test',
  name: 'Test',
  position: [0, 0, 0] as [number, number, number],
  params: {},
}
const baseMod = { id: 'test', parentId: 'p1', params: {} }

const baseplate = { ...baseObj, kind: 'baseplate' } as GridfinityObject
const bin = { ...baseObj, kind: 'bin' } as GridfinityObject
const other = { ...baseObj, kind: 'other' } as GridfinityObject

const dividerGrid = { ...baseMod, kind: 'dividerGrid' } as Modifier
const labelTab = { ...baseMod, kind: 'labelTab' } as Modifier
const scoop = { ...baseMod, kind: 'scoop' } as Modifier
const insert = { ...baseMod, kind: 'insert' } as Modifier
const lid = { ...baseMod, kind: 'lid' } as Modifier
const fingerScoop = { ...baseMod, kind: 'fingerScoop' } as Modifier
const otherMod = { ...baseMod, kind: 'other' } as Modifier

describe('isBaseplateObject', () => {
  it('returns true for baseplate kind', () => {
    expect(isBaseplateObject(baseplate)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isBaseplateObject(bin)).toBe(false)
    expect(isBaseplateObject(other)).toBe(false)
  })
})

describe('isBinObject', () => {
  it('returns true for bin kind', () => {
    expect(isBinObject(bin)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isBinObject(baseplate)).toBe(false)
    expect(isBinObject(other)).toBe(false)
  })
})

describe('isDividerGridModifier', () => {
  it('returns true for dividerGrid kind', () => {
    expect(isDividerGridModifier(dividerGrid)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isDividerGridModifier(labelTab)).toBe(false)
    expect(isDividerGridModifier(otherMod)).toBe(false)
  })
})

describe('isLabelTabModifier', () => {
  it('returns true for labelTab kind', () => {
    expect(isLabelTabModifier(labelTab)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isLabelTabModifier(dividerGrid)).toBe(false)
    expect(isLabelTabModifier(otherMod)).toBe(false)
  })
})

describe('isScoopModifier', () => {
  it('returns true for scoop kind', () => {
    expect(isScoopModifier(scoop)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isScoopModifier(dividerGrid)).toBe(false)
    expect(isScoopModifier(otherMod)).toBe(false)
  })
})

describe('isInsertModifier', () => {
  it('returns true for insert kind', () => {
    expect(isInsertModifier(insert)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isInsertModifier(dividerGrid)).toBe(false)
    expect(isInsertModifier(otherMod)).toBe(false)
  })
})

describe('isLidModifier', () => {
  it('returns true for lid kind', () => {
    expect(isLidModifier(lid)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isLidModifier(dividerGrid)).toBe(false)
    expect(isLidModifier(otherMod)).toBe(false)
  })
})

describe('isFingerScoopModifier', () => {
  it('returns true for fingerScoop kind', () => {
    expect(isFingerScoopModifier(fingerScoop)).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(isFingerScoopModifier(dividerGrid)).toBe(false)
    expect(isFingerScoopModifier(otherMod)).toBe(false)
  })
})
