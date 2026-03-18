Record a gameplay demo of EvoGolf and produce a GIF for the README. This covers the full pipeline: environment setup, Playwright-driven UI walkthrough while the user screen-records, video conversion to GIF, and README update.

## Step 1: Environment setup

Get the full stack running and wipe old data so the demo starts fresh.

1. `docker compose up -d` — start SpacetimeDB
2. Poll `curl -s http://localhost:3000` until it responds (max 15 seconds)
3. `cd server && npm install && spacetime publish evogolf -s local -y`
4. `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server` (run from project root)
5. Wipe all game data for a clean slate:
   ```
   spacetime sql evogolf "DELETE FROM trajectory_point" -s local
   spacetime sql evogolf "DELETE FROM golf_ball" -s local
   spacetime sql evogolf "DELETE FROM genome" -s local
   spacetime sql evogolf "DELETE FROM generation" -s local
   spacetime sql evogolf "DELETE FROM gp_event" -s local
   spacetime sql evogolf "DELETE FROM hall_of_fame" -s local
   spacetime sql evogolf "DELETE FROM golf_course" -s local
   ```
6. Re-create the course: `spacetime call evogolf create_game -s local`
7. `cd client && npm install && npm run dev &` — start the client dev server in background
8. Poll `curl -s http://localhost:5173` until it responds

## Step 2: Start screen recording

Tell the user:

> Start your screen recorder now. On macOS: **Cmd+Shift+5**, then click **"Record Entire Screen"** or **"Record Selected Portion"** (the icons with a circle, not the camera). Aim it at the browser window. Let me know once you're recording and I'll walk through the demo.

Wait for confirmation before proceeding. The user controls the recording — Playwright orchestrates the UI clicks.

## Step 3: Playwright — run the demo

Open the app and drive the UI through Playwright MCP:

1. `mcp__playwright__browser_navigate` to `http://localhost:5173`
2. Wait 3 seconds, then `mcp__playwright__browser_snapshot` to verify the HUD and "Initialize" button are visible
3. Take a screenshot to confirm the initial empty-course state

**Initialize:**
4. Click the "Initialize" button — this creates 12 random genomes and simulates their shots
5. Wait 4 seconds for physics simulation to complete
6. Snapshot to confirm balls and trajectories appeared, take a screenshot

**Auto-evolve:**
7. Click "Auto-Evolve" — the button label changes to "Stop" while running
8. Check the snapshot every 8 seconds, watching for the generation counter ("Gen N") to increment
9. Let it run until Gen 8–10 (about 5–6 checks)
10. Take a screenshot around Gen 4 and again around Gen 8 to capture progress
11. Click "Stop" to halt auto-evolution

**Wrap up:**
12. Wait 2 seconds for animations to settle
13. Take a final screenshot
14. Tell the user: "Demo complete — stop your screen recording now."

## Step 4: Convert recording to GIF

The user's screen recording will be a `.mov` file (macOS). Convert it to a GIF that renders inline on GitHub READMEs. GitHub strips `<video>` tags and won't auto-embed repo-hosted mp4 URLs, so GIF is the only reliable format for inline playback.

Check that ffmpeg is installed (`which ffmpeg`). If not: `brew install ffmpeg`.

Ask the user for the recording file path, then run:

```bash
# Compress .mov → .mp4 (strips audio, shrinks ~17MB → ~450KB)
ffmpeg -i <input>.mov -c:v libx264 -crf 28 -preset fast -vf "scale=1280:-2" -an evogolf_demo.mp4 -y

# Convert .mp4 → .gif (12fps, 800px wide, ~750KB)
ffmpeg -i evogolf_demo.mp4 -vf "fps=12,scale=800:-1:flags=lanczos" -loop 0 evogolf_demo.gif -y
```

The intermediate mp4 can be deleted afterward. The gif should land under 1MB.

## Step 5: Update README and push

1. Replace the existing demo image/video line in README.md with:
   ```
   ![EvoGolf gameplay — evolving golf swings over 10 generations](evogolf_demo.gif)
   ```
2. Make sure `*.mov` is in `.gitignore` (large raw recordings shouldn't be committed)
3. Stage the gif and README: `git add evogolf_demo.gif README.md`
4. Commit and push

The GIF will render inline at the top of the README on GitHub — auto-playing and looping.
