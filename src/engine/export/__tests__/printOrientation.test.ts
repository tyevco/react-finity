import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { getPrintRotation, getOrientedBounds, applyPrintOrientation } from '../printOrientation'
import { generateBaseplate } from '../../geometry/baseplate'
import { generateBin } from '../../geometry/bin'
import { PROFILE_OFFICIAL } from '../../constants'
import type { BaseplateObject, BinObject } from '@/types/gridfinity'

function makeBaseplate(): BaseplateObject {
  return {
    id: 'bp-1',
    name: 'Test Baseplate',
    kind: 'baseplate',
    position: [0, 0, 0],
    params: { gridWidth: 1, gridDepth: 1, magnetHoles: false, screwHoles: false },
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

  it('returns 180-degree X rotation for bins', () => {
    const bin = makeBin()
    const rotation = getPrintRotation(bin)
    expect(rotation.x).toBeCloseTo(Math.PI, 5)
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

  it('bin min Y is approximately 0 after orientation (flipped)', () => {
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

    const rotation = new THREE.Euler(Math.PI, 0, 0)
    const oriented = applyPrintOrientation(geo, rotation)

    geo.computeBoundingBox()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(geo.boundingBox!.min.y).toBeCloseTo(originalMinY, 5)

    geo.dispose()
    oriented.dispose()
  })
})
