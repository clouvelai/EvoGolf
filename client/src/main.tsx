import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, tables } from './module_bindings';
import type { Identity } from 'spacetimedb';
import App from './App';
import './styles/ui.css';

// Store identity globally so App can access it
export let localIdentity: Identity | null = null;

const connectionBuilder = DbConnection.builder()
  .withUri('ws://localhost:3000')
  .withDatabaseName('evogolf')
  .onConnect((conn, identity, _token) => {
    localIdentity = identity;

    // Register player (idempotent)
    conn.reducers.registerPlayer({ name: '' });

    conn.subscriptionBuilder()
      .onApplied(() => console.log('[SpacetimeDB] Subscription applied'))
      .subscribe([
        tables.golfCourse,
        tables.generation,
        tables.genome,
        tables.golfBall,
        tables.trajectoryPoint,
        tables.gpEvent,
        tables.player,
        tables.championBall,
        tables.hallOfFame,
      ]);
  })
  .onConnectError((_ctx, error) => {
    console.error('[SpacetimeDB] Connection error:', error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  </React.StrictMode>,
);
