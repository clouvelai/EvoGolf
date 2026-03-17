/** Maps genome origin strings to vibrant colors that pop against dark water. */
export const ORIGIN_COLORS: Record<string, string> = {
  random: '#66ccff',       // sky blue
  replication: '#ffd700',  // gold (elite)
  crossover: '#44ffaa',    // bright green
  mutation: '#ff55aa',     // hot pink
};

/** Returns the color for a given genome origin, defaulting to sky blue. */
export function colorForOrigin(origin: string): string {
  return ORIGIN_COLORS[origin] ?? '#66ccff';
}
