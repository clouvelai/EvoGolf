Record a gameplay demo of EvoGolf for the README. This skill orchestrates the UI through Playwright MCP while the user records their screen.

## Before you begin

Tell the user: "Start your screen recorder now (e.g. Cmd+Shift+5 on macOS) and aim it at the browser window. I'll walk through the demo once you confirm you're recording."

Wait for the user to confirm they're recording before proceeding.

## Step 1: Environment setup

Make sure the full stack is running:

1. `docker compose up -d` — start SpacetimeDB
2. Poll `curl -s http://localhost:3000` until it responds (max 15 seconds)
3. `cd server && npm install && spacetime publish evogolf -s local -y`
4. `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`
5. Wipe any existing game data so the demo starts clean:
   ```
   spacetime sql evogolf "DELETE FROM trajectory_point" -s local
   spacetime sql evogolf "DELETE FROM golf_ball" -s local
   spacetime sql evogolf "DELETE FROM genome" -s local
   spacetime sql evogolf "DELETE FROM generation" -s local
   spacetime sql evogolf "DELETE FROM gp_event" -s local
   spacetime sql evogolf "DELETE FROM hall_of_fame" -s local
   ```
6. `cd client && npm install && npm run dev &` — start the client dev server in the background
7. Wait for vite to print the local URL (poll for a few seconds)

## Step 2: Open the app in Playwright

1. Use `mcp__playwright__browser_navigate` to open `http://localhost:5173`
2. Wait 3 seconds for the 3D scene and SpacetimeDB connection to initialize
3. Use `mcp__playwright__browser_snapshot` to verify the page loaded — you should see the "Initialize" button in the bottom control panel
4. Take a screenshot with `mcp__playwright__browser_take_screenshot` to confirm the initial state looks good

## Step 3: Initialize population

1. Use `mcp__playwright__browser_click` to click the "Initialize" button
2. Wait 4 seconds for the population to generate and physics simulation to run
3. Take a snapshot to confirm balls and trajectories are visible in the 3D scene
4. Take a screenshot — this is the "first generation" frame

## Step 4: Auto-evolve for several generations

1. Wait 2 seconds, then click the "Auto-Evolve" button
2. Let it run — check the snapshot every 8 seconds to watch the generation counter increment
3. Continue until you see "Gen 8" or higher in the control panel (about 5-6 checks)
4. Take a screenshot at roughly Gen 4 and Gen 8 for progress verification
5. Click "Stop" to halt auto-evolution

## Step 5: Final beauty shot

1. Wait 2 seconds for the last animation to settle
2. Take a final screenshot
3. Tell the user: "Demo sequence complete — you can stop recording now. The screenshots are saved if you want stills for the README too."

## Tips for a good recording

- The 3D scene looks best from the default camera angle — don't orbit during recording
- The fitness chart in the bottom-right shows evolution progress nicely
- Ball trajectories animate with colored arcs — they're the visual highlight
- If a generation finds a hole-in-one, a win overlay will appear — great ending if it happens naturally
