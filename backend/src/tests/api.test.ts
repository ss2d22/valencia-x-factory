import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    const module = await import('../index.js');
    app = module.default;
  });

  describe('Health Endpoints', () => {
    it('GET /api/health should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('xrpl');
    });

    it('GET / should return API info', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'X-Factory API');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('endpoints');
    });
  });

  describe('Wallet Endpoints', () => {
    it('POST /api/wallets should create a wallet', async () => {
      const res = await request(app)
        .post('/api/wallets')
        .send({ name: 'Test Buyer', role: 'buyer' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('address');
      expect(res.body.data).toHaveProperty('balance');
      expect(res.body.data.address).toMatch(/^r[a-zA-Z0-9]{24,34}$/);
    }, 30000);

    it('POST /api/wallets should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/wallets')
        .send({ name: 'Test', role: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('role');
    });

    it('POST /api/wallets should require name and role', async () => {
      const res = await request(app)
        .post('/api/wallets')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/wallets should list participants', async () => {
      const res = await request(app).get('/api/wallets');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Deal Endpoints', () => {
    let buyerAddress: string;
    let supplierAddress: string;
    let facilitatorAddress: string;
    let dealId: string;

    beforeAll(async () => {
      const buyer = await request(app)
        .post('/api/wallets')
        .send({ name: 'Test Buyer', role: 'buyer' });
      buyerAddress = buyer.body.data.address;

      const supplier = await request(app)
        .post('/api/wallets')
        .send({ name: 'Test Supplier', role: 'supplier' });
      supplierAddress = supplier.body.data.address;

      const facilitator = await request(app)
        .post('/api/wallets')
        .send({ name: 'Test Facilitator', role: 'facilitator' });
      facilitatorAddress = facilitator.body.data.address;
    }, 90000);

    it('POST /api/deals should create a deal', async () => {
      const res = await request(app)
        .post('/api/deals')
        .send({
          name: 'Test Deal',
          amount: 10000,
          buyerAddress,
          supplierAddress,
          facilitatorAddress,
          milestones: [
            { name: 'Phase 1', percentage: 30 },
            { name: 'Phase 2', percentage: 40 },
            { name: 'Phase 3', percentage: 30 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('dealReference');
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.milestones).toHaveLength(3);

      dealId = res.body.data.id;
    });

    it('POST /api/deals should reject invalid milestone percentages', async () => {
      const res = await request(app)
        .post('/api/deals')
        .send({
          name: 'Invalid Deal',
          amount: 10000,
          buyerAddress,
          supplierAddress,
          milestones: [
            { name: 'Phase 1', percentage: 50 },
            { name: 'Phase 2', percentage: 30 },
          ],
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('100%');
    });

    it('GET /api/deals should list deals', async () => {
      const res = await request(app).get('/api/deals');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/deals/:id should get a deal', async () => {
      if (!dealId) return;

      const res = await request(app).get(`/api/deals/${dealId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dealId);
    });

    it('POST /api/deals/:id/fund should fund a deal', async () => {
      if (!dealId) return;

      const res = await request(app).post(`/api/deals/${dealId}/fund`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('funded');
      expect(res.body.data.escrowBalance).toBeGreaterThan(0);
    }, 60000);

    it('POST /api/deals/:id/milestones/:index/release should release a milestone', async () => {
      if (!dealId) return;

      const res = await request(app).post(`/api/deals/${dealId}/milestones/0/release`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.milestones[0].status).toBe('Released');
      expect(res.body.data.supplierBalance).toBeGreaterThan(0);
    }, 30000);

    it('POST /api/deals/:id/dispute should raise a dispute', async () => {
      const createRes = await request(app)
        .post('/api/deals')
        .send({
          name: 'Dispute Test Deal',
          amount: 5000,
          buyerAddress,
          supplierAddress,
          milestones: [{ name: 'Phase 1', percentage: 100 }],
        });

      const newDealId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/deals/${newDealId}/dispute`)
        .send({ reason: 'Quality issues' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dispute).toBe(true);
      expect(res.body.data.status).toBe('disputed');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
