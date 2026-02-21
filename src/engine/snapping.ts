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
