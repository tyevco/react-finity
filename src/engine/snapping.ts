/**
 * Snap a position to the nearest grid increment.
 * Only snaps X and Z axes (Y is vertical, not grid-aligned).
 */
export function snapToGrid(
  position: [number, number, number],
  gridSize: number,
): [number, number, number] {
  return [snapValue(position[0], gridSize), position[1], snapValue(position[2], gridSize)]
}

/**
 * Snap a single value to the nearest grid increment.
 */
export function snapValue(value: number, gridSize: number): number {
  if (gridSize === 0) return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap an object position to the grid, accounting for the object's grid dimensions.
 *
 * Objects with even grid dimensions (2x2, 4x2) need half-grid offsets so their
 * per-cell plugs align with baseplate cell centers. Odd dimensions (1x1, 3x3)
 * snap to standard grid multiples.
 */
export function snapObjectToGrid(
  position: [number, number, number],
  gridSize: number,
  gridWidth: number,
  gridDepth: number,
): [number, number, number] {
  if (gridSize === 0) return [...position]
  const xOffset = gridWidth % 2 === 0 ? gridSize / 2 : 0
  const zOffset = gridDepth % 2 === 0 ? gridSize / 2 : 0
  return [
    Math.round((position[0] - xOffset) / gridSize) * gridSize + xOffset,
    position[1],
    Math.round((position[2] - zOffset) / gridSize) * gridSize + zOffset,
  ]
}
