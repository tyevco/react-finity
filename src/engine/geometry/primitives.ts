import {
  Shape,
  Path,
  ExtrudeGeometry,
  CylinderGeometry,
  BufferGeometry,
  BufferAttribute,
} from 'three'
import type { CurveQuality } from '@/types/gridfinity'

const QUALITY_SEGMENTS: Record<CurveQuality, number> = {
  low: 4,
  medium: 8,
  high: 16,
}

// Module-level state: curve segment count is set via setCurveQuality() from
// uiStore and read by extrudeShape/createCylinder. Stored outside Zustand
// because geometry generators are pure functions that should not depend on
// React state. The uiStore synchronizes this value via its setCurveQuality action.
let activeCurveSegments = QUALITY_SEGMENTS.medium

export function setCurveQuality(quality: CurveQuality): void {
  activeCurveSegments = QUALITY_SEGMENTS[quality]
}

export function getCurveSegments(): number {
  return activeCurveSegments
}

/**
 * Create a 2D rounded rectangle shape.
 * Origin is at the center of the rectangle.
 */
export function roundedRectShape(width: number, depth: number, radius: number): Shape {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const shape = new Shape()

  shape.moveTo(-hw + r, -hd)
  shape.lineTo(hw - r, -hd)
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r)
  shape.lineTo(hw, hd - r)
  shape.quadraticCurveTo(hw, hd, hw - r, hd)
  shape.lineTo(-hw + r, hd)
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r)
  shape.lineTo(-hw, -hd + r)
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd)

  return shape
}

/**
 * Extrude a shape to a given height.
 * Returns geometry centered at the XZ plane with bottom at y=0.
 */
export function extrudeShape(shape: Shape, height: number, bevelEnabled = false): BufferGeometry {
  if (height <= 0) return new BufferGeometry()

  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled,
    steps: 1,
    curveSegments: activeCurveSegments,
  })
  // ExtrudeGeometry extrudes along Z, rotate to extrude along Y
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Create a cylinder geometry for holes (magnet, screw).
 * Cylinder is oriented along Y axis with center at the given position.
 */
export function createCylinder(
  radius: number,
  height: number,
  segments = activeCurveSegments * 3,
): BufferGeometry {
  return new CylinderGeometry(radius, radius, height, segments)
}

/**
 * Create a rounded rectangle Path (clockwise winding) for use as a hole
 * in a Shape. Opposite winding to roundedRectShape (CCW).
 */
export function roundedRectHolePath(width: number, depth: number, radius: number): Path {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const path = new Path()

  // Clockwise: BL→left edge up→TL→top edge right→TR→right edge down→BR→bottom edge left
  path.moveTo(-hw + r, -hd)
  path.quadraticCurveTo(-hw, -hd, -hw, -hd + r)
  path.lineTo(-hw, hd - r)
  path.quadraticCurveTo(-hw, hd, -hw + r, hd)
  path.lineTo(hw - r, hd)
  path.quadraticCurveTo(hw, hd, hw, hd - r)
  path.lineTo(hw, -hd + r)
  path.quadraticCurveTo(hw, -hd, hw - r, -hd)
  path.lineTo(-hw + r, -hd)

  return path
}

/**
 * Create a rounded rectangle hole Path offset to a given center (cx, cz).
 * Clockwise winding for use as a Shape.hole.
 */
export function roundedRectHolePathAt(
  width: number,
  depth: number,
  radius: number,
  cx: number,
  cz: number,
): Path {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const path = new Path()

  path.moveTo(cx - hw + r, cz - hd)
  path.quadraticCurveTo(cx - hw, cz - hd, cx - hw, cz - hd + r)
  path.lineTo(cx - hw, cz + hd - r)
  path.quadraticCurveTo(cx - hw, cz + hd, cx - hw + r, cz + hd)
  path.lineTo(cx + hw - r, cz + hd)
  path.quadraticCurveTo(cx + hw, cz + hd, cx + hw, cz + hd - r)
  path.lineTo(cx + hw, cz - hd + r)
  path.quadraticCurveTo(cx + hw, cz - hd, cx + hw - r, cz - hd)
  path.lineTo(cx - hw + r, cz - hd)

  return path
}

/**
 * Create a hollow extruded shape (tube with rounded-rect cross section).
 * Uses Shape.holes to cut out the interior.
 */
export function createHollowExtrusion(
  outerWidth: number,
  outerDepth: number,
  outerRadius: number,
  innerWidth: number,
  innerDepth: number,
  innerRadius: number,
  height: number,
): BufferGeometry {
  const shape = roundedRectShape(outerWidth, outerDepth, outerRadius)
  shape.holes.push(roundedRectHolePath(innerWidth, innerDepth, innerRadius))
  return extrudeShape(shape, height)
}

/**
 * Create a diamond-shaped hole Path (clockwise winding for use as Shape.hole)
 * centered at (cx, cz) with the given point-to-point size.
 */
export function createDiamondHolePath(size: number, cx: number, cz: number): Path {
  const half = size / 2
  const path = new Path()
  path.moveTo(cx, cz - half)
  path.lineTo(cx - half, cz)
  path.lineTo(cx, cz + half)
  path.lineTo(cx + half, cz)
  path.closePath()
  return path
}

/**
 * Create a hexagon hole Path (clockwise winding for use as Shape.hole)
 * centered at (cx, cz) with the given radius. Flat-top orientation.
 */
export function createHexagonHolePath(radius: number, cx: number, cz: number): Path {
  const path = new Path()
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6 // flat-top orientation
    const x = cx + radius * Math.cos(angle)
    const z = cz + radius * Math.sin(angle)
    if (i === 0) {
      path.moveTo(x, z)
    } else {
      path.lineTo(x, z)
    }
  }
  path.closePath()
  return path
}

/**
 * Merge multiple geometries into one.
 */
export function mergeGeometries(geometries: BufferGeometry[]): BufferGeometry {
  const merged = new BufferGeometry()
  if (geometries.length === 0) return merged

  // Filter out empty geometries that lack a position attribute to prevent crashes
  const valid = geometries.filter((geo) => 'position' in geo.attributes)
  if (valid.length === 0) return merged

  let totalVertices = 0
  let totalIndices = 0

  for (const geo of valid) {
    totalVertices += geo.attributes.position.count
    if (geo.index) {
      totalIndices += geo.index.count
    } else {
      totalIndices += geo.attributes.position.count
    }
  }

  const positions = new Float32Array(totalVertices * 3)
  const indices = new Uint32Array(totalIndices)

  let vertexOffset = 0
  let indexOffset = 0

  for (const geo of valid) {
    const posAttr = geo.attributes.position as BufferAttribute

    // Copy positions using accessor methods (handles offset/stride correctly)
    for (let i = 0; i < posAttr.count; i++) {
      const base = (vertexOffset + i) * 3
      positions[base] = posAttr.getX(i)
      positions[base + 1] = posAttr.getY(i)
      positions[base + 2] = posAttr.getZ(i)
    }

    // Copy indices
    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices[indexOffset + i] = geo.index.getX(i) + vertexOffset
      }
      indexOffset += geo.index.count
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        indices[indexOffset + i] = vertexOffset + i
      }
      indexOffset += posAttr.count
    }

    vertexOffset += posAttr.count
  }

  merged.setAttribute('position', new BufferAttribute(positions, 3))
  merged.setIndex(new BufferAttribute(indices, 1))
  merged.computeVertexNormals()

  return merged
}
