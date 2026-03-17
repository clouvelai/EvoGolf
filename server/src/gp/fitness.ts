/**
 * Compute fitness based on distance to hole.
 * Closer to hole = higher fitness (approaches 1.0).
 * fitness = 1.0 / (distanceToHole + 1.0)
 */
export function computeFitness(
  finalX: number,
  finalZ: number,
  holeX: number,
  holeZ: number,
): number {
  const dx = finalX - holeX;
  const dz = finalZ - holeZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return 1.0 / (distance + 1.0);
}

/**
 * Compute Euclidean distance between two 2D points.
 */
export function distanceToHole(
  finalX: number,
  finalZ: number,
  holeX: number,
  holeZ: number,
): number {
  const dx = finalX - holeX;
  const dz = finalZ - holeZ;
  return Math.sqrt(dx * dx + dz * dz);
}
