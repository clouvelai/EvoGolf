# EvoGolf

A 3D golf game where players evolve swing strategies through genetic programming. Instead of manually aiming each shot, you initialize a population of randomized GP trees that encode swing parameters (launch angle, power, spin), then watch natural selection optimize them generation by generation until one finds the hole.

<!-- To add the demo video: drag evogolf_10gen.mov into a GitHub issue to get a hosted URL, then replace this comment with that URL -->

## How It Works

1. **Initialize** a population of 12 random genomes — each is a syntax tree that computes swing parameters
2. **Simulate** — the server runs physics on every genome's shot (gravity, drag, wind, bounce, roll)
3. **Evaluate** — fitness is scored by proximity to the hole
4. **Evolve** — tournament selection, subtree crossover, and mutation breed the next generation
5. **Repeat** — auto-evolve or step manually until a ball sinks

All GP logic (tree generation, evaluation, physics, selection, crossover, mutation) runs server-side in SpacetimeDB reducers. The React Three Fiber client is a pure visualization layer — it subscribes to table changes and renders.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database & Server Logic | [SpacetimeDB](https://spacetimedb.com) (TypeScript module) |
| 3D Rendering | React Three Fiber + Three.js |
| UI Framework | React 19 + Vite |
| Charts | Recharts |

## Features

- **GP Engine** — ramped half-and-half tree generation, context-sensitive 4-pass evaluation, tournament selection, subtree crossover, 3-type mutation (subtree/point/hoist)
- **3D Visualization** — instanced mesh ball swarm with animated trajectories, selectable genomes, orbit camera
- **Auto-Evolve** — hands-off mode with adjustable speed; stops on hole-in-one
- **Genome Inspector** — click any ball or genome to view its syntax tree and fitness
- **Wildcard Sponsorship** — force-include a favorite genome in the next generation's selection
- **Hall of Fame** — winning genomes are archived with trajectory replay
- **Real-time Reactivity** — SpacetimeDB subscriptions push all state changes to the client instantly

## Getting Started

### Prerequisites

- [Docker](https://docker.com)
- [SpacetimeDB CLI](https://spacetimedb.com/install) (v2.0+)
- Node.js 18+

### Run

```bash
# Start SpacetimeDB
docker compose up -d

# Publish server module & start client
make dev
```

The app will be available at `http://localhost:5173`.

### Commands

```bash
make dev         # Full startup: docker + publish + generate bindings + client dev server
make publish     # Publish server module to local SpacetimeDB
make generate    # Regenerate TypeScript client bindings
make reset       # Wipe all game data
make logs        # Tail server logs
```

## Project Structure

```
server/
  src/
    index.ts          # SpacetimeDB tables, schema, and reducers
    constants.ts      # Shared constants (physics, GP params)
    gp/
      types.ts        # TreeNode, SwingParams, EvalContext
      tree-gen.ts     # Ramped half-and-half population seeding
      evaluate.ts     # Context-sensitive tree evaluation
      physics.ts      # Ball flight simulation (gravity, drag, wind, bounce)
      fitness.ts      # Distance-to-hole fitness scoring
      selection.ts    # Tournament selection with wildcard override
      crossover.ts    # Subtree crossover with depth capping
      mutation.ts     # Subtree, point, and hoist mutation

client/
  src/
    App.tsx           # Main app — state management, 3D canvas, UI layout
    components/
      CourseGround    # 3D golf course terrain
      BallSwarm       # Instanced mesh for all balls
      TrajectoryLines # Animated shot trajectories
      GPControlPanel  # Initialize, evolve, auto-evolve controls
      GenomeTreePanel # Genome list + syntax tree viewer
      FitnessChart    # Generation-over-generation fitness plot
      EventLog        # GP operation event feed
      HUD             # Course info overlay
      HallOfFame      # Archived winning genomes
      WinOverlay      # Hole-in-one celebration
```

## License

MIT
