import { useMemo } from 'react';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';

/**
 * Shared hook for generation-scoped data lookups.
 * Used by BallSwarm and TrajectoryLines to avoid duplicate map construction.
 */
export function useGenerationData(currentGenId: number | null) {
  const [balls] = useTable(tables.golfBall);
  const [genomes] = useTable(tables.genome);
  const [trajectoryPoints] = useTable(tables.trajectoryPoint);

  const currentBalls = useMemo(
    () =>
      currentGenId != null
        ? balls.filter((b) => b.genId === currentGenId)
        : [],
    [balls, currentGenId],
  );

  const genomeMap = useMemo(() => {
    const map = new Map<number, (typeof genomes)[number]>();
    for (const g of genomes) {
      map.set(g.genomeId, g);
    }
    return map;
  }, [genomes]);

  const trajectoryMap = useMemo(() => {
    const map = new Map<
      number,
      { step: number; x: number; y: number; z: number }[]
    >();
    for (const p of trajectoryPoints) {
      let arr = map.get(p.ballId);
      if (!arr) {
        arr = [];
        map.set(p.ballId, arr);
      }
      arr.push(p);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.step - b.step);
    }
    return map;
  }, [trajectoryPoints]);

  return { currentBalls, genomeMap, trajectoryMap };
}
