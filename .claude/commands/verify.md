Run the full self-verification protocol for EvoGolf. Execute each step in order and report results:

1. Type-check the server: `cd server && npx tsc --noEmit`
2. Type-check the client: `cd client && npx tsc --noEmit`
3. Publish the module: `cd server && spacetime publish evogolf --host http://localhost:3000`
4. Regenerate bindings: `cd client && spacetime generate --lang typescript --out-dir src/module_bindings --host http://localhost:3000 evogolf`
5. Re-type-check client with fresh bindings: `cd client && npx tsc --noEmit`
6. Check server logs for errors: `spacetime logs evogolf --host http://localhost:3000 | tail -30`
7. Verify client dev server starts: `cd client && timeout 10 npm run dev` (just check it starts)
8. Use Playwright MCP to open http://localhost:5173 and take a screenshot to verify the 3D scene renders

Report a summary: which steps passed, which failed, and what needs fixing.
