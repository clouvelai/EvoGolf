import type { Identity } from 'spacetimedb';

type BallRow = {
  ballId: number;
  genomeId: number;
  genId: number;
  state: string;
  finalX: number;
  finalZ: number;
  distanceToHole: number;
  playerId: Identity;
};

/**
 * Filter balls to show 1 best ball per player by default.
 * When showMySwarm=true, shows ALL of my balls + 1 best per opponent.
 */
export function bestBallPerPlayer<T extends BallRow>(
  balls: readonly T[],
  myIdentity: Identity | null,
  showMySwarm: boolean,
): T[] {
  // Group balls by player
  const byPlayer = new Map<string, T[]>();
  for (const ball of balls) {
    const pid = ball.playerId.toHexString();
    let arr = byPlayer.get(pid);
    if (!arr) { arr = []; byPlayer.set(pid, arr); }
    arr.push(ball);
  }

  const result: T[] = [];

  for (const [, playerBalls] of byPlayer) {
    const isMine = myIdentity ? myIdentity.isEqual(playerBalls[0].playerId) : false;

    if (isMine && showMySwarm) {
      // Show all my balls
      result.push(...playerBalls);
    } else {
      // Pick best stopped ball, fall back to first ball
      const stopped = playerBalls.filter(b => b.state === 'stopped');
      if (stopped.length > 0) {
        let best = stopped[0];
        for (const b of stopped) {
          if (b.distanceToHole < best.distanceToHole) best = b;
        }
        result.push(best);
      } else {
        result.push(playerBalls[0]);
      }
    }
  }

  return result;
}
