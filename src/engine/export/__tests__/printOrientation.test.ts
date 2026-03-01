import { describe, it, expect, beforeAll } from 'vitest'
import { Euler } from 'three'
import {
  getPrintRotation,
  getOrientedBounds,
  getBoundsFromOriented,
  applyPrintOrientation,
} from '../printOrientation'
import { generateBaseplate } from '../../geometry/baseplate'
import { generateBin } from '../../geometry/bin'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BaseplateObject, BinObject } from '@/types/gridfinity'
import { registerBuiltinKinds } from '@/engine/registry/builtins'

beforeAll(() => {
  registerBuiltinKinds()
})

function makeBaseplate(): BaseplateObject {
  return {
    id: 'bp-1',
    name: 'Test Baseplate',
    kind: 'baseplate',
    position: [0, 0, 0],
    params: { gridWidth: 1, gridDepth: 1, slim: false, magnetHoles: false, screwHoles: false },
  }
}

function makeBin(): BinObject {
  return {
    id: 'bin-1',
    name: 'Test Bin',
    kind: 'bin',
    position: [0, 0, 0],
    params: {
      gridWidth: 1,
      gridDepth: 1,
      heightUnits: 3,
      stackingLip: true,
      wallThickness: 1.2,
      innerFillet: 0,
      magnetHoles: false,
      weightHoles: false,
      honeycombBase: false,
    },
  }
}

describe('getPrintRotation', () => {
  it('returns identity rotation for baseplates', () => {
    const bp = makeBaseplate()
    const rotation = getPrintRotation(bp)
    expect(rotation.x).toBe(0)
    expect(rotation.y).toBe(0)
    expect(rotation.z).toBe(0)
  })

  it('returns identity rotation for bins (upright, base on bed)', () => {
    const bin = makeBin()
    const rotation = getPrintRotation(bin)
    expect(rotation.x).toBe(0)
    expect(rotation.y).toBe(0)
    expect(rotation.z).toBe(0)
  })
})

describe('getOrientedBounds', () => {
  it('returns positive dimensions for baseplate', () => {
    const bp = makeBaseplate()
    const geo = generateBaseplate(bp.params, PROFILE_OFFICIAL)
    const rotation = getPrintRotation(bp)
    const bounds = getOrientedBounds(geo, rotation)

    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.depth).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
    expect(bounds.yOffset).toBeGreaterThanOrEqual(0)

    geo.dispose()
  })

  it('returns correct bounds for rotated bin', () => {
    const bin = makeBin()
    const geo = generateBin(bin.params, PROFILE_OFFICIAL)
    const rotation = getPrintRotation(bin)
    const bounds = getOrientedBounds(geo, rotation)

    expect(bounds.width).toBeGreaterThan(30) // approx 1 grid unit
    expect(bounds.depth).toBeGreaterThan(30)
    expect(bounds.height).toBeGreaterThan(10) // bin has height

    geo.dispose()
  })
})

describe('getOrientedBounds edge cases', () => {
  it('returns consistent dimensions for a non-rotated bin', () => {
    const bin = makeBin()
    const geo = generateBin(bin.params, PROFILE_OFFICIAL)
    const rotation = new Euler(0, 0, 0) // no rotation
    const bounds = getOrientedBounds(geo, rotation)

    // Non-rotated bounds should match raw bounding box
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = geo.boundingBox!
    expect(bounds.width).toBeCloseTo(box.max.x - box.min.x, 2)
    expect(bounds.depth).toBeCloseTo(box.max.z - box.min.z, 2)
    expect(bounds.height).toBeCloseTo(box.max.y - box.min.y, 2)

    geo.dispose()
  })
})

describe('getBoundsFromOriented', () => {
  it('matches getOrientedBounds for a bin', () => {
    const bin = makeBin()
    const geo = generateBin(bin.params, PROFILE_OFFICIAL)
    const rotation = getPrintRotation(bin)

    const orientedBounds = getOrientedBounds(geo, rotation)
    const oriented = applyPrintOrientation(geo, rotation)
    const fromOriented = getBoundsFromOriented(oriented)

    expect(fromOriented.width).toBeCloseTo(orientedBounds.width, 2)
    expect(fromOriented.depth).toBeCloseTo(orientedBounds.depth, 2)
    expect(fromOriented.height).toBeCloseTo(orientedBounds.height, 2)

    geo.dispose()
    oriented.dispose()
  })
})

describe('applyPrintOrientation', () => {
  it('baseplate min Y is approximately 0 after orientation', () => {
    const bp = makeBaseplate()
    const geo = generateBaseplate(bp.params, PROFILE_OFFICIAL)
    const rotation = getPrintRotation(bp)
    const oriented = applyPrintOrientation(geo, rotation)

    oriented.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = oriented.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 2)

    geo.dispose()
    oriented.dispose()
  })

  it('bin min Y is approximately 0 after orientation (upright)', () => {
    const bin = makeBin()
    const geo = generateBin(bin.params, PROFILE_OFFICIAL)
    const rotation = getPrintRotation(bin)
    const oriented = applyPrintOrientation(geo, rotation)

    oriented.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const box = oriented.boundingBox!
    expect(box.min.y).toBeCloseTo(0, 2)
    expect(box.max.y).toBeGreaterThan(0)

    geo.dispose()
    oriented.dispose()
  })

  it('does not modify the original geometry', () => {
    const bin = makeBin()
    const geo = generateBin(bin.params, PROFILE_OFFICIAL)
    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const originalMinY = geo.boundingBox!.min.y

    const rotation = new Euler(Math.PI, 0, 0)
    const oriented = applyPrintOrientation(geo, rotation)

    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(geo.boundingBox!.min.y).toBeCloseTo(originalMinY, 5)

    geo.dispose()
    oriented.dispose()
  })
})
