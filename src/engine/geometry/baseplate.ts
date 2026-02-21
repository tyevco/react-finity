import * as THREE from 'three'

import type { BaseplateParams, GridfinityProfile } from '@/types/gridfinity'

import { roundedRectShape, extrudeShape } from './primitives'

/**
 * Generate baseplate geometry from parameters and profile.
 *
 * Gridfinity baseplate structure (cross-section from bottom to top):
 * - Flat base (bottom)
 * - Per grid-cell: raised socket walls forming the Z-shaped interlock profile
 * - Socket profile: stepped walls that bins snap into
 *
 * The socket profile per cell (from outside in, bottom to top):
 * 1. Outer rim at full baseplate height
 * 2. Step down to mid-level
 * 3. Inner floor (lowest point of the socket)
 * 4. Optional magnet/screw holes in corners
 */
export function generateBaseplate(
  params: BaseplateParams,
  profile: GridfinityProfile,
): THREE.BufferGeometry {
  const { gridWidth, gridDepth, magnetHoles, screwHoles } = params
  const { gridSize, baseplateHeight, baseplateCornerRadius, tolerance } = profile

  // Overall dimensions (1 unit = 1mm)
  const totalWidth = gridWidth * gridSize
  const totalDepth = gridDepth * gridSize

  // Create the base slab
  const baseShape = roundedRectShape(totalWidth, totalDepth, baseplateCornerRadius)
  const baseGeometry = extrudeShape(baseShape, baseplateHeight)

  // Build socket geometry for each grid cell
  const socketGeometries: THREE.BufferGeometry[] = []
  const holeGeometries: THREE.BufferGeometry[] = []

  const cellSize = gridSize
  const cellInnerSize = gridSize - tolerance * 2

  // Socket profile dimensions
  const socketFloorHeight = 0.6 // bottom of the socket from base top
  const socketMidStep = 2.6 // mid-step height from base bottom
  const socketTopRim = baseplateHeight // top of socket walls

  for (let gx = 0; gx < gridWidth; gx++) {
    for (let gz = 0; gz < gridDepth; gz++) {
      // Cell center position
      const cx = (gx - (gridWidth - 1) / 2) * cellSize
      const cz = (gz - (gridDepth - 1) / 2) * cellSize

      // Socket walls: outer raised rim per cell
      const outerShape = roundedRectShape(
        cellInnerSize,
        cellInnerSize,
        baseplateCornerRadius - tolerance,
      )

      // Inner cutout for socket (the hollow part bins sit in)
      const innerWallThickness = 1.6
      const innerSize = cellInnerSize - innerWallThickness * 2
      const innerRadius = Math.max(0.1, baseplateCornerRadius - tolerance - innerWallThickness)

      // Create outer wall extrusion
      const outerGeo = extrudeShape(outerShape, socketTopRim)
      outerGeo.translate(cx, 0, cz)
      socketGeometries.push(outerGeo)

      // Socket floor - fills the inner area at floor level
      const floorShape = roundedRectShape(innerSize, innerSize, innerRadius)
      const floorGeo = extrudeShape(floorShape, socketFloorHeight)
      floorGeo.translate(cx, 0, cz)
      socketGeometries.push(floorGeo)

      // Mid-step ring: between floor and top, a stepped intermediate wall
      const midRingOuterSize = innerSize + 0.6
      const midRingRadius = innerRadius + 0.3
      const midRingShape = roundedRectShape(midRingOuterSize, midRingOuterSize, midRingRadius)
      const midRingGeo = extrudeShape(midRingShape, socketMidStep)
      midRingGeo.translate(cx, 0, cz)
      socketGeometries.push(midRingGeo)

      // Magnet and screw holes at corners
      if (magnetHoles || screwHoles) {
        const cornerOffset = cellInnerSize / 2 - 4.0 // ~4mm from edge
        const corners = [
          [cx - cornerOffset, cz - cornerOffset],
          [cx + cornerOffset, cz - cornerOffset],
          [cx - cornerOffset, cz + cornerOffset],
          [cx + cornerOffset, cz + cornerOffset],
        ]

        for (const [hx, hz] of corners) {
          if (magnetHoles) {
            const magnetRadius = profile.magnetDiameter / 2
            const magnetDepth = profile.magnetDepth
            const magnetGeo = new THREE.CylinderGeometry(
              magnetRadius,
              magnetRadius,
              magnetDepth,
              24,
            )
            magnetGeo.translate(hx, magnetDepth / 2, hz)
            holeGeometries.push(magnetGeo)
          }

          if (screwHoles) {
            const screwRadius = profile.screwDiameter / 2
            const screwDepth = baseplateHeight
            const screwGeo = new THREE.CylinderGeometry(screwRadius, screwRadius, screwDepth, 16)
            screwGeo.translate(hx, screwDepth / 2, hz)
            holeGeometries.push(screwGeo)
          }
        }
      }
    }
  }

  // Merge all geometries
  const allGeometries = [baseGeometry, ...socketGeometries]
  const result = mergeBufferGeometries(allGeometries)

  // Store hole data as userData for future CSG operations
  result.userData = {
    holeGeometries: holeGeometries.length > 0 ? holeGeometries : undefined,
  }

  // Clean up source geometries
  baseGeometry.dispose()
  for (const g of socketGeometries) g.dispose()

  return result
}

/**
 * Simple geometry merge using Three.js BufferGeometryUtils pattern.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry()
  if (geometries.length === 1) return geometries[0].clone()

  let totalPositions = 0

  // Calculate totals
  for (const geo of geometries) {
    totalPositions += geo.attributes.position.count
  }

  const mergedPositions = new Float32Array(totalPositions * 3)
  const mergedNormals = new Float32Array(totalPositions * 3)
  const mergedIndices: number[] = []

  let positionOffset = 0
  let indexOffset = 0

  for (const geo of geometries) {
    const positions = geo.attributes.position as THREE.BufferAttribute
    const normals = geo.attributes.normal as THREE.BufferAttribute | undefined

    // Copy positions
    for (let i = 0; i < positions.count * 3; i++) {
      mergedPositions[positionOffset * 3 + i] = positions.array[i]
    }

    // Copy normals
    if (normals) {
      for (let i = 0; i < normals.count * 3; i++) {
        mergedNormals[positionOffset * 3 + i] = normals.array[i]
      }
    }

    // Copy/generate indices
    if (geo.index) {
      for (let i = 0; i < geo.index.count; i++) {
        mergedIndices[indexOffset + i] = geo.index.array[i] + positionOffset
      }
      indexOffset += geo.index.count
    } else {
      for (let i = 0; i < positions.count; i++) {
        mergedIndices[indexOffset + i] = positionOffset + i
      }
      indexOffset += positions.count
    }

    positionOffset += positions.count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3))
  merged.setIndex(mergedIndices)
  merged.computeVertexNormals()

  return merged
}

/**
 * Get the bounding dimensions of a baseplate for display purposes.
 */
export function getBaseplateDimensions(
  params: BaseplateParams,
  profile: GridfinityProfile,
): { width: number; depth: number; height: number } {
  return {
    width: params.gridWidth * profile.gridSize,
    depth: params.gridDepth * profile.gridSize,
    height: profile.baseplateHeight,
  }
}
