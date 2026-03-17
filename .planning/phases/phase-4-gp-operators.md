# Phase 4: GP Operators

**Branch:** `main` (after merging Phase 2 + 3)
**Status:** NOT STARTED
**Goal:** Complete GP pipeline — selection, replication, crossover, mutation, advance_generation, set_wildcard. Running advance_generation repeatedly should show fitness improving across generations.

## Tasks

- [ ] 4.1 Create `server/src/gp/selection.ts` — tournament selection logic (pick N tournaments, return winners)
- [ ] 4.2 Create `server/src/gp/crossover.ts` — subtree swap between two parent trees, enforce depth cap
- [ ] 4.3 Create `server/src/gp/mutation.ts` — subtree mutation, point mutation, hoist mutation, enforce depth cap
- [ ] 4.4 Implement `run_selection` reducer — tournament selection, mark is_selected, handle wildcard
- [ ] 4.5 Implement `replicate_elite` reducer — copy best genome to new generation, is_elite=true
- [ ] 4.6 Implement `perform_crossover` reducer — create offspring from selected parents
- [ ] 4.7 Implement `perform_mutation` reducer — mutate offspring at mutation_rate
- [ ] 4.8 Implement `advance_generation` reducer — orchestrates full pipeline (select → replicate → crossover → mutate → cleanup old trajectories → simulate)
- [ ] 4.9 Implement `set_wildcard` reducer — sets player's wildcard_genome_id
- [ ] 4.10 Verify: run 5+ generations via CLI, fitness trend improves

## Files created/modified

```
server/src/gp/selection.ts
server/src/gp/crossover.ts
server/src/gp/mutation.ts
server/src/index.ts             # add 5 new reducers
```

## Verification gate

```bash
make publish
# Run full pipeline via CLI:
spacetime call evogolf create_game --host http://localhost:3000
spacetime call evogolf init_population '{"holeId": 1, "popSize": 12}' --host http://localhost:3000
spacetime call evogolf simulate_shots '{"genId": 1}' --host http://localhost:3000
# Run 5 generations:
spacetime call evogolf advance_generation '{"genId": 1}' --host http://localhost:3000
spacetime call evogolf advance_generation '{"genId": 2}' --host http://localhost:3000
spacetime call evogolf advance_generation '{"genId": 3}' --host http://localhost:3000
spacetime call evogolf advance_generation '{"genId": 4}' --host http://localhost:3000
spacetime call evogolf advance_generation '{"genId": 5}' --host http://localhost:3000
# Check fitness trend:
spacetime sql evogolf "SELECT gen_number, best_fitness, avg_fitness FROM generation ORDER BY gen_number" --host http://localhost:3000
# best_fitness should generally increase
make logs  # no errors
make generate  # update client bindings for new reducers
cd client && npx tsc --noEmit  # client still compiles
```
