import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config/index.js';
import { getClient, disconnectClient } from './services/xrpl/client.js';
import { connectDatabase, disconnectDatabase } from './services/db.js';

import healthRouter from './routes/health.js';
import walletRouter from './routes/wallet.js';
import dealsRouter from './routes/deals.js';
import authRouter from './routes/auth.js';

validateConfig();

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());

if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/deals', dealsRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'X-Factory API',
    version: '1.0.0',
    description: 'XRPL-powered escrow and trade finance platform',
    docs: '/api/health',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      wallets: '/api/wallets',
      deals: '/api/deals',
    },
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

const server = app.listen(config.port, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     X-Factory API                          ║
╠═══════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${config.port}                       ║
║  Network:   ${config.xrpl.network.padEnd(42)}  ║
║  RLUSD:     ${config.rlusd.currency} (${config.rlusd.issuer.substring(0, 20)}...)  ║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    await connectDatabase();
    console.log('[DB] Connected to PostgreSQL');
  } catch (error) {
    console.error('[DB] Failed to connect:', error);
  }

  try {
    await getClient();
    console.log('[XRPL] Connected to', config.xrpl.network);
  } catch (error) {
    console.error('[XRPL] Failed to connect:', error);
  }
});

async function shutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed');

    try {
      await disconnectClient();
      console.log('[XRPL] Disconnected');
    } catch (error) {
      console.error('[XRPL] Error disconnecting:', error);
    }

    try {
      await disconnectDatabase();
      console.log('[DB] Disconnected');
    } catch (error) {
      console.error('[DB] Error disconnecting:', error);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
