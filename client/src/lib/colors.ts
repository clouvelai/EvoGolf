/** Maps genome origin strings to hex color values. */
export const ORIGIN_COLORS: Record<string, string> = {
  random: '#ffffff',
  replication: '#ffd700',
  crossover: '#00ff88',
  mutation: '#aa44ff',
};

/** Returns the color for a given genome origin, defaulting to white. */
export function colorForOrigin(origin: string): string {
  return ORIGIN_COLORS[origin] ?? '#ffffff';
}
