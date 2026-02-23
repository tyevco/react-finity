import * as THREE from 'three'
import type { CurveQuality } from '@/types/gridfinity'

const QUALITY_SEGMENTS: Record<CurveQuality, number> = {
  low: 4,
  medium: 8,
  high: 16,
}

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
export function roundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const shape = new THREE.Shape()

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
export function extrudeShape(
  shape: THREE.Shape,
  height: number,
  bevelEnabled = false,
): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
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
): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(radius, radius, height, segments)
}

/**
 * Create a rounded rectangle Path (clockwise winding) for use as a hole
 * in a THREE.Shape. Opposite winding to roundedRectShape (CCW).
 */
export function roundedRectHolePath(width: number, depth: number, radius: number): THREE.Path {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const path = new THREE.Path()

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
): THREE.Path {
  const r = Math.min(radius, width / 2, depth / 2)
  const hw = width / 2
  const hd = depth / 2
  const path = new THREE.Path()

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
): THREE.BufferGeometry {
  const shape = roundedRectShape(outerWidth, outerDepth, outerRadius)
  shape.holes.push(roundedRectHolePath(innerWidth, innerDepth, innerRadius))
  return extrudeShape(shape, height)
}

/**
 * Merge multiple geometries into one.
 */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  if (geometries.length === 0) return merged

  let totalVertices = 0
  let totalIndices = 0

  for (const geo of geometries) {
    totalVertices += geo.attributes.position.count
    if (geo.index) {
      totalIndices += geo.index.count
    } else {
      totalIndices += geo.attributes.position.count
    }
  }

  const positions = new Float32Array(totalVertices * 3)
  const normals = new Float32Array(totalVertices * 3)
  const indices = new Uint32Array(totalIndices)

  let vertexOffset = 0
  let indexOffset = 0

  for (const geo of geometries) {
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const normAttr = geo.attributes.normal as THREE.BufferAttribute | undefined

    // Copy positions
    for (let i = 0; i < posAttr.count * 3; i++) {
      positions[vertexOffset * 3 + i] = posAttr.array[i]
    }

    // Copy normals
    if (normAttr) {
      for (let i = 0; i < normAttr.count * 3; i++) {
        normals[vertexOffset * 3 + i] = normAttr.array[i]
      }
    }

    // Copy indices
    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        indices[indexOffset + i] = geo.index.array[i] + vertexOffset
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

  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  merged.computeVertexNormals()

  return merged
}
