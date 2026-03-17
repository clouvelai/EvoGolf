# Phase 1: Foundation

**Branch:** `main`
**Status:** DONE
**Goal:** Bare-bones app that connects to SpacetimeDB, creates a golf course, and renders it in 3D.

## Tasks

- [x] 1.1 Create `docker-compose.yml` (from PRD spec)
- [x] 1.2 Create `Makefile` (from PRD spec)
- [x] 1.3 Scaffold `server/` — `package.json`, `tsconfig.json`, install `spacetimedb`
- [x] 1.4 Define all 7 tables in `server/src/index.ts` using `table()` + `t.*` builders
- [x] 1.5 Implement `create_game` reducer (idempotent, inserts golf_course row)
- [x] 1.6 Export schema as default: `export default spacetimedb`
- [x] 1.7 `make publish` — verify module publishes
- [x] 1.8 Scaffold `client/` — `npm create vite@latest`, install deps (react-three/fiber, drei, three, spacetimedb, recharts)
- [x] 1.9 `make generate` — generate module bindings into `client/src/module_bindings/`
- [x] 1.10 Set up `SpacetimeDBProvider` in `main.tsx` with connection builder + subscriptions
- [x] 1.11 Create `<App>` with R3F `<Canvas>`, `<OrbitControls>`
- [x] 1.12 Create `<CourseGround>` — flat green plane, tee marker, hole/pin marker, grid lines
- [x] 1.13 Verify: browser shows 3D course, SpacetimeDB connected, `golf_course` row exists

## Files created

```
docker-compose.yml
Makefile
server/package.json
server/tsconfig.json
server/src/index.ts          # all tables + create_game reducer
client/                       # full Vite scaffold
client/src/main.tsx           # SpacetimeDBProvider + root
client/src/App.tsx            # Canvas + CourseGround
client/src/components/CourseGround.tsx
```

## Verification gate

```bash
docker compose up -d
make publish                  # must succeed
make generate                 # must succeed
cd server && npx tsc --noEmit # must pass
cd client && npx tsc --noEmit # must pass
cd client && npm run dev      # must start
# Browser: 3D green plane with tee + pin visible at localhost:5173
spacetime sql evogolf "SELECT * FROM golf_course" --host http://localhost:3000  # 1 row
```
