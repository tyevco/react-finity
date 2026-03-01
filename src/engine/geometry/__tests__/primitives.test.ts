import { describe, it, expect, beforeEach } from 'vitest'
import {
  BufferGeometry,
  BufferAttribute,
  InterleavedBuffer,
  InterleavedBufferAttribute,
} from 'three'
import {
  setCurveQuality,
  getCurveSegments,
  roundedRectShape,
  extrudeShape,
  createCylinder,
  roundedRectHolePath,
  roundedRectHolePathAt,
  createHollowExtrusion,
  createDiamondHolePath,
  createHexagonHolePath,
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

  it('returns empty geometry for height <= 0', () => {
    const shape = roundedRectShape(10, 10, 1)
    const zeroGeo = extrudeShape(shape, 0)
    expect(zeroGeo.attributes.position).toBeUndefined()
    zeroGeo.dispose()

    const negGeo = extrudeShape(shape, -5)
    expect(negGeo.attributes.position).toBeUndefined()
    negGeo.dispose()
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

describe('createDiamondHolePath', () => {
  it('returns a path with 4 corner points', () => {
    const path = createDiamondHolePath(10, 0, 0)
    const points = path.getPoints(1)
    // Diamond: 4 sides + close = 5 points (moveTo + 3 lineTo + closePath)
    expect(points.length).toBe(5)
  })

  it('points stay within the diamond bounds', () => {
    const size = 11
    const cx = 5
    const cz = 10
    const path = createDiamondHolePath(size, cx, cz)
    const points = path.getPoints(1)
    const half = size / 2
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(cx - half - 0.01)
      expect(p.x).toBeLessThanOrEqual(cx + half + 0.01)
      expect(p.y).toBeGreaterThanOrEqual(cz - half - 0.01)
      expect(p.y).toBeLessThanOrEqual(cz + half + 0.01)
    }
  })

  it('offsets correctly to the given center', () => {
    const path = createDiamondHolePath(10, 20, 30)
    const points = path.getPoints(1)
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    // Center should be at (20, 30), so min/max x should be [15, 25], y should be [25, 35]
    expect(Math.min(...xs)).toBeCloseTo(15, 1)
    expect(Math.max(...xs)).toBeCloseTo(25, 1)
    expect(Math.min(...ys)).toBeCloseTo(25, 1)
    expect(Math.max(...ys)).toBeCloseTo(35, 1)
  })
})

describe('createHexagonHolePath', () => {
  it('returns a path with 6 sides plus close point', () => {
    const path = createHexagonHolePath(5, 0, 0)
    const points = path.getPoints(1)
    // hexagon: moveTo + 5 lineTo + closePath = 7 points
    expect(points.length).toBe(7)
  })

  it('stays within the bounding radius', () => {
    const radius = 5
    const cx = 10
    const cz = 20
    const path = createHexagonHolePath(radius, cx, cz)
    const points = path.getPoints(1)
    for (const p of points) {
      const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cz) ** 2)
      expect(dist).toBeLessThanOrEqual(radius + 0.01)
    }
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

  it('computes vertex normals without pre-allocated normals array', () => {
    const geo = new BufferGeometry()
    const v = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    geo.setAttribute('position', new BufferAttribute(v, 3))
    geo.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const merged = mergeGeometries([geo])
    // computeVertexNormals should have created the normal attribute
    expect(merged.attributes.normal).toBeDefined()
    expect(merged.attributes.normal.count).toBe(3)

    geo.dispose()
    merged.dispose()
  })

  it('skips geometries without position attribute', () => {
    const empty = new BufferGeometry() // no position attribute
    const valid = new BufferGeometry()
    const v = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    valid.setAttribute('position', new BufferAttribute(v, 3))
    valid.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const merged = mergeGeometries([empty, valid])
    expect(merged.attributes.position.count).toBe(3)
    expect(merged.index?.count).toBe(3)

    empty.dispose()
    valid.dispose()
    merged.dispose()
  })

  it('returns empty geometry when all inputs lack position attribute', () => {
    const empty1 = new BufferGeometry()
    const empty2 = new BufferGeometry()

    const merged = mergeGeometries([empty1, empty2])
    expect(merged.attributes.position).toBeUndefined()

    empty1.dispose()
    empty2.dispose()
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

  it('merges three geometries with correct index offsets', () => {
    const geos = Array.from({ length: 3 }, () => {
      const geo = new BufferGeometry()
      const v = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
      geo.setAttribute('position', new BufferAttribute(v, 3))
      geo.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))
      return geo
    })

    const merged = mergeGeometries(geos)
    expect(merged.attributes.position.count).toBe(9)
    expect(merged.index?.count).toBe(9)

    // Third geometry indices should be offset by 6 (2 * 3 vertices)
    const idx = merged.index!.array // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(idx[6]).toBe(6)
    expect(idx[7]).toBe(7)
    expect(idx[8]).toBe(8)

    for (const g of geos) g.dispose()
    merged.dispose()
  })

  it('merges mixed indexed and non-indexed geometries', () => {
    const indexed = new BufferGeometry()
    indexed.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    )
    indexed.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const nonIndexed = new BufferGeometry()
    nonIndexed.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0]), 3),
    )

    const merged = mergeGeometries([indexed, nonIndexed])
    expect(merged.attributes.position.count).toBe(6)
    expect(merged.index?.count).toBe(6)

    // Non-indexed geometry should get sequential indices offset by vertex count of first geo
    const idx = merged.index!.array // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(idx[3]).toBe(3)
    expect(idx[4]).toBe(4)
    expect(idx[5]).toBe(5)

    indexed.dispose()
    nonIndexed.dispose()
    merged.dispose()
  })

  it('correctly reads positions from interleaved buffer attributes', () => {
    // Interleaved buffer: stride=6 (pos xyz + normal xyz packed together)
    const data = new Float32Array([
      // vertex 0: pos(10,20,30), normal(0,0,1)
      10, 20, 30, 0, 0, 1,
      // vertex 1: pos(40,50,60), normal(0,0,1)
      40, 50, 60, 0, 0, 1,
      // vertex 2: pos(70,80,90), normal(0,0,1)
      70, 80, 90, 0, 0, 1,
    ])
    const interleaved = new InterleavedBuffer(data, 6)
    const posAttr = new InterleavedBufferAttribute(interleaved, 3, 0) // itemSize=3, offset=0

    const geo = new BufferGeometry()
    geo.setAttribute('position', posAttr)
    geo.setIndex(new BufferAttribute(new Uint32Array([0, 1, 2]), 1))

    const merged = mergeGeometries([geo])
    expect(merged.attributes.position.count).toBe(3)

    // Verify vertex positions were read correctly via accessor methods
    const pos = merged.attributes.position as BufferAttribute
    expect(pos.getX(0)).toBeCloseTo(10)
    expect(pos.getY(0)).toBeCloseTo(20)
    expect(pos.getZ(0)).toBeCloseTo(30)
    expect(pos.getX(1)).toBeCloseTo(40)
    expect(pos.getY(1)).toBeCloseTo(50)
    expect(pos.getZ(1)).toBeCloseTo(60)
    expect(pos.getX(2)).toBeCloseTo(70)
    expect(pos.getY(2)).toBeCloseTo(80)
    expect(pos.getZ(2)).toBeCloseTo(90)

    geo.dispose()
    merged.dispose()
  })
})
