Start the full EvoGolf development environment. Run these steps in order:

1. Start Docker: `docker compose up -d`
2. Wait for SpacetimeDB to be ready: poll `curl -s http://localhost:3000` until it responds (max 15 seconds)
3. Install server dependencies if needed: `cd server && npm install`
4. Publish the module: `cd server && spacetime publish evogolf --host http://localhost:3000`
5. Install client dependencies if needed: `cd client && npm install`
6. Generate client bindings: `cd client && spacetime generate --lang typescript --out-dir src/module_bindings --host http://localhost:3000 evogolf`
7. Start the client dev server: `cd client && npm run dev`

Report the status of each step. If any step fails, diagnose and suggest fixes.
