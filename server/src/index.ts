import { schema, table, t } from 'spacetimedb/server';

// --- Tables ---

const golfCourse = table(
  { name: 'golf_course', public: true },
  {
    holeId: t.u32().primaryKey().autoInc(),
    par: t.u32(),
    teeX: t.f64(),
    teeZ: t.f64(),
    holeX: t.f64(),
    holeZ: t.f64(),
    distance: t.f64(),
    windX: t.f64(),
    windZ: t.f64(),
  }
);

const generation = table(
  { name: 'generation', public: true },
  {
    genId: t.u32().primaryKey().autoInc(),
    holeId: t.u32(),
    genNumber: t.u32(),
    phase: t.string(),
    bestFitness: t.f64(),
    avgFitness: t.f64(),
    popSize: t.u32(),
  }
);

const genome = table(
  {
    name: 'genome',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    genomeId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    treeJson: t.string(),
    treeDepth: t.u32(),
    nodeCount: t.u32(),
    fitness: t.f64(),
    origin: t.string(),
    parentAId: t.u32(),
    parentBId: t.u32(),
    isElite: t.bool(),
    isSelected: t.bool(),
  }
);

const golfBall = table(
  {
    name: 'golf_ball',
    public: true,
    indexes: [{ accessor: 'byGenId', algorithm: 'btree', columns: ['genId'] }],
  },
  {
    ballId: t.u32().primaryKey().autoInc(),
    genomeId: t.u32(),
    genId: t.u32(),
    state: t.string(),
    finalX: t.f64(),
    finalZ: t.f64(),
    distanceToHole: t.f64(),
  }
);

const trajectoryPoint = table(
  {
    name: 'trajectory_point',
    public: true,
    indexes: [{ accessor: 'byBallId', algorithm: 'btree', columns: ['ballId'] }],
  },
  {
    pointId: t.u32().primaryKey().autoInc(),
    ballId: t.u32(),
    step: t.u32(),
    x: t.f64(),
    y: t.f64(),
    z: t.f64(),
  }
);

const gpEvent = table(
  { name: 'gp_event', public: true },
  {
    eventId: t.u32().primaryKey().autoInc(),
    genId: t.u32(),
    eventType: t.string(),
    description: t.string(),
    genomeIdsJson: t.string(),
  }
);

const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().unique(),
    name: t.string(),
    wildcardGenomeId: t.u32(),
  }
);

// --- Schema ---

const spacetimedb = schema({
  golfCourse,
  generation,
  genome,
  golfBall,
  trajectoryPoint,
  gpEvent,
  player,
});
export default spacetimedb;

// --- Reducers ---

export const createGame = spacetimedb.reducer(
  (ctx) => {
    // Idempotent — no-op if a course already exists
    for (const _row of ctx.db.golfCourse.iter()) {
      return;
    }

    ctx.db.golfCourse.insert({
      holeId: 0,
      par: 3,
      teeX: 0,
      teeZ: 0,
      holeX: 0,
      holeZ: 137,
      distance: 150,
      windX: 0.5,
      windZ: 0.2,
    });
  }
);
