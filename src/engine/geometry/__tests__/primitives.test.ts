import { describe, it, expect, beforeEach } from 'vitest'
import { BufferGeometry, BufferAttribute } from 'three'
import {
  setCurveQuality,
  getCurveSegments,
  roundedRectShape,
  extrudeShape,
  createCylinder,
  roundedRectHolePath,
  roundedRectHolePathAt,
  createHollowExtrusion,
  mergeGeometries,
} from '../primitives'

describe('setCurveQuality / getCurveSegments', () => {
  beforeEach(() => {
    setCurveQuality('medium')
  })

  it('defaults to medium (8 segments)', () => {
    expect(getCurveSegments()).toBe(8)
  })

  it('low quality produces 4 segments', () => {
    setCurveQuality('low')
    expect(getCurveSegments()).toBe(4)
  })

  it('high quality produces 16 segments', () => {
    setCurveQuality('high')
    expect(getCurveSegments()).toBe(16)
  })
})

describe('roundedRectShape', () => {
  it('returns a shape with points within bounds', () => {
    const shape = roundedRectShape(10, 8, 1)
    const points = shape.getPoints(4)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-5.01)
      expect(p.x).toBeLessThanOrEqual(5.01)
      expect(p.y).toBeGreaterThanOrEqual(-4.01)
      expect(p.y).toBeLessThanOrEqual(4.01)
    }
  })

  it('clamps radius to half the smallest dimension', () => {
    const shape = roundedRectShape(4, 6, 100)
    const points = shape.getPoints(4)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-2.01)
      expect(p.x).toBeLessThanOrEqual(2.01)
    }
  })
})

describe('extrudeShape', () => {
  beforeEach(() => {
    setCurveQuality('low')
  })

  it('produces valid geometry', () => {
    const shape = roundedRectShape(10, 10, 1)
    const geo = extrudeShape(shape, 5)
    expect(geo.attributes.position.count).toBeGreaterThan(0)
    expect(geo.index).toBeDefined()
    geo.dispose()
  })

  it('bounding box height matches extrusion height', () => {
    const shape = roundedRectShape(10, 10, 1)
    const geo = extrudeShape(shape, 7)
    geo.computeBoundingBox()
    expect(geo.boundingBox).toBeDefined()
    const height = geo.boundingBox!.max.y - geo.boundingBox!.min.y // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(height).toBeCloseTo(7, 1)
    geo.dispose()
  })
})

describe('createCylinder', () => {
  it('produces geometry with correct height', () => {
    const geo = createCylinder(3, 10, 8)
    geo.computeBoundingBox()
    expect(geo.boundingBox).toBeDefined()
    const height = geo.boundingBox!.max.y - geo.boundingBox!.min.y // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(height).toBeCloseTo(10, 1)
    geo.dispose()
  })

  it('more segments produce more vertices', () => {
    const low = createCylinder(3, 10, 6)
    const high = createCylinder(3, 10, 24)
    expect(high.attributes.position.count).toBeGreaterThan(low.attributes.position.count)
    low.dispose()
    high.dispose()
  })
})

describe('roundedRectHolePath', () => {
  it('returns a path with multiple points', () => {
    const path = roundedRectHolePath(10, 8, 1)
    const points = path.getPoints(4)
    expect(points.length).toBeGreaterThan(4)
  })
})

describe('roundedRectHolePathAt', () => {
  it('offsets the hole to the given center', () => {
    const path = roundedRectHolePathAt(4, 4, 0.5, 10, 20)
    const points = path.getPoints(4)
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(7.9)
    expect(Math.max(...xs)).toBeLessThanOrEqual(12.1)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(17.9)
    expect(Math.max(...ys)).toBeLessThanOrEqual(22.1)
  })
})

describe('createHollowExtrusion', () => {
  beforeEach(() => {
    setCurveQuality('low')
  })

  it('produces more vertices than a solid extrusion', () => {
    const hollow = createHollowExtrusion(20, 20, 2, 16, 16, 1, 10)
    const solid = extrudeShape(roundedRectShape(20, 20, 2), 10)
    expect(hollow.attributes.position.count).toBeGreaterThan(solid.attributes.position.count)
    hollow.dispose()
    solid.dispose()
  })
})

describe('mergeGeometries', () => {
  it('returns empty geometry for empty input', () => {
    const merged = mergeGeometries([])
    expect(merged.attributes.position).toBeUndefined()
    merged.dispose()
  })

  it('merges two geometries into one with combined vertices', () => {
    const geo1 = new BufferGeometry()
    const v1 = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    geo1.setAttribute('position', new BufferAttribute(v1, 3))
    geo1.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const geo2 = new BufferGeometry()
    const v2 = new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0])
    geo2.setAttribute('position', new BufferAttribute(v2, 3))
    geo2.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const merged = mergeGeometries([geo1, geo2])
    expect(merged.attributes.position.count).toBe(6)
    expect(merged.index).toBeDefined()
    expect(merged.index?.count).toBe(6)

    geo1.dispose()
    geo2.dispose()
    merged.dispose()
  })

  it('handles non-indexed geometry', () => {
    const geo = new BufferGeometry()
    const verts = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    geo.setAttribute('position', new BufferAttribute(verts, 3))

    const merged = mergeGeometries([geo])
    expect(merged.attributes.position.count).toBe(3)
    expect(merged.index).toBeDefined()
    expect(merged.index?.count).toBe(3)

    geo.dispose()
    merged.dispose()
  })
})
