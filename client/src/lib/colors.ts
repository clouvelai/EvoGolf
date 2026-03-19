/** Maps genome origin strings to vibrant colors that pop against dark water. */
export const ORIGIN_COLORS: Record<string, string> = {
  random: '#66ccff',          // sky blue
  replication: '#ffd700',     // gold (elite)
  crossover: '#44ffaa',       // bright green (exploration)
  mutation: '#ff55aa',        // hot pink (exploration)
  elite_mutation: '#ffaa44',  // orange (elite fine-tuning)
  elite_crossover: '#aaff44', // lime green (elite breeding)
};

/** Returns the color for a given genome origin, defaulting to sky blue. */
export function colorForOrigin(origin: string): string {
  return ORIGIN_COLORS[origin] ?? '#66ccff';
}
