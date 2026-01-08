import { Router } from 'express';
import { getClient } from '../services/xrpl/client.js';
import { config } from '../config/index.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  xrpl: {
    connected: boolean;
    network: string;
    url: string;
  };
  rlusd: {
    issuer: string;
    currency: string;
  };
}

router.get('/', async (_req, res) => {
  try {
    let xrplConnected = false;
    try {
      const client = await getClient();
      xrplConnected = client.isConnected();
    } catch {
      xrplConnected = false;
    }

    const health: HealthStatus = {
      status: xrplConnected ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      xrpl: {
        connected: xrplConnected,
        network: config.xrpl.network,
        url: config.xrpl.wsUrl,
      },
      rlusd: {
        issuer: config.rlusd.issuer,
        currency: config.rlusd.currency,
      },
    };

    const statusCode = xrplConnected ? 200 : 503;

    return res.status(statusCode).json({
      success: xrplConnected,
      data: health,
    } as ApiResponse<HealthStatus>);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        xrpl: {
          connected: false,
          network: config.xrpl.network,
          url: config.xrpl.wsUrl,
        },
        rlusd: {
          issuer: config.rlusd.issuer,
          currency: config.rlusd.currency,
        },
      },
      error: error instanceof Error ? error.message : 'Health check failed',
    } as ApiResponse<HealthStatus>);
  }
});

router.get('/xrpl', async (_req, res) => {
  try {
    const client = await getClient();

    const serverInfo = await client.request({
      command: 'server_info',
    });

    return res.json({
      success: true,
      data: {
        connected: client.isConnected(),
        serverState: serverInfo.result.info.server_state,
        buildVersion: serverInfo.result.info.build_version,
        completeLedgers: serverInfo.result.info.complete_ledgers,
        networkId: serverInfo.result.info.network_id,
        validatedLedger: serverInfo.result.info.validated_ledger,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('XRPL health check error:', error);
    return res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : 'XRPL connection failed',
    } as ApiResponse<null>);
  }
});

export default router;
