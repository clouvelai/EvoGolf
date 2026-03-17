import { type Rng } from './tree-gen.js';

type GenomeRow = {
  genomeId: number;
  fitness: number;
};

/**
 * Tournament selection: for each parent slot, sample tournamentSize random
 * genomes and pick the one with highest fitness. Avoids duplicate selections.
 * If wildcardId is set and exists in this gen, force-include it.
 */
export function tournamentSelection(
  rng: Rng,
  genomes: GenomeRow[],
  numParents: number,
  tournamentSize: number,
  wildcardId: number | null,
): number[] {
  const selected: number[] = [];
  const selectedSet = new Set<number>();

  // Force-include wildcard if present
  if (wildcardId !== null) {
    const wc = genomes.find(g => g.genomeId === wildcardId);
    if (wc) {
      selected.push(wc.genomeId);
      selectedSet.add(wc.genomeId);
    }
  }

  // Fill remaining slots via tournaments
  let attempts = 0;
  const maxAttempts = numParents * 10; // safety valve
  while (selected.length < numParents && attempts < maxAttempts) {
    attempts++;

    // Sample tournamentSize random genomes
    const candidates: GenomeRow[] = [];
    const usedIdx = new Set<number>();
    const tSize = Math.min(tournamentSize, genomes.length);

    let innerAttempts = 0;
    while (candidates.length < tSize && innerAttempts < tSize * 5) {
      innerAttempts++;
      const idx = rng.integerInRange(0, genomes.length - 1);
      if (!usedIdx.has(idx)) {
        usedIdx.add(idx);
        candidates.push(genomes[idx]);
      }
    }

    if (candidates.length === 0) break;

    // Pick best fitness from candidates
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].fitness > best.fitness) {
        best = candidates[i];
      }
    }

    if (!selectedSet.has(best.genomeId)) {
      selected.push(best.genomeId);
      selectedSet.add(best.genomeId);
    }
  }

  return selected;
}
