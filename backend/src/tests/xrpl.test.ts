import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, Wallet, xrpToDrops } from 'xrpl';

describe('XRPL Integration Tests', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();
    console.log('[Test] Connected to XRPL Testnet');
  });

  afterAll(async () => {
    if (client.isConnected()) {
      await client.disconnect();
      console.log('[Test] Disconnected from XRPL');
    }
  });

  describe('Wallet Operations', () => {
    it('should create and fund a wallet', async () => {
      const { wallet, balance } = await client.fundWallet();

      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.address).toMatch(/^r[a-zA-Z0-9]{24,34}$/);
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.seed).toBeDefined();
      expect(balance).toBeGreaterThan(0);

      console.log(`[Test] Created wallet: ${wallet.address} (${balance} XRP)`);
    });

    it('should get account info', async () => {
      const { wallet } = await client.fundWallet();

      const response = await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated',
      });

      expect(response.result.account_data).toBeDefined();
      expect(response.result.account_data.Account).toBe(wallet.address);
      expect(Number(response.result.account_data.Balance)).toBeGreaterThan(0);
    });
  });

  describe('Trust Line Operations', () => {
    it('should create a trust line', async () => {
      const { wallet } = await client.fundWallet();
      const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';

      const trustSetTx = {
        TransactionType: 'TrustSet' as const,
        Account: wallet.address,
        LimitAmount: {
          currency: 'USD',
          issuer: RLUSD_ISSUER,
          value: '1000000',
        },
      };

      const prepared = await client.autofill(trustSetTx);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      expect(result.result.meta).toBeDefined();
      expect((result.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      console.log(`[Test] Trust line created for ${wallet.address}`);
    });
  });

  describe('XRP Escrow Operations', () => {
    it('should create and finish an XRP escrow', async () => {
      const buyer = (await client.fundWallet()).wallet;
      const supplier = (await client.fundWallet()).wallet;

      console.log(`[Test] Buyer: ${buyer.address}`);
      console.log(`[Test] Supplier: ${supplier.address}`);

      const cc = await import('five-bells-condition');
      const crypto = await import('crypto');

      const preimageData = crypto.randomBytes(32);
      const myFulfillment = new cc.PreimageSha256();
      myFulfillment.setPreimage(preimageData);

      const condition = myFulfillment.getConditionBinary().toString('hex').toUpperCase();
      const fulfillment = myFulfillment.serializeBinary().toString('hex').toUpperCase();

      const now = Math.floor(Date.now() / 1000);
      const RIPPLE_EPOCH = 946684800;

      const escrowCreateTx = {
        TransactionType: 'EscrowCreate' as const,
        Account: buyer.address,
        Destination: supplier.address,
        Amount: xrpToDrops('10'),
        Condition: condition,
        CancelAfter: now - RIPPLE_EPOCH + 86400,
      };

      const createPrepared = await client.autofill(escrowCreateTx);
      const createSigned = buyer.sign(createPrepared);
      const createResult = await client.submitAndWait(createSigned.tx_blob);

      expect((createResult.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      const escrowSequence = (createResult.result as { tx_json?: { Sequence?: number } }).tx_json?.Sequence;
      expect(escrowSequence).toBeDefined();

      console.log(`[Test] Escrow created with sequence: ${escrowSequence}`);

      const escrowFinishTx = {
        TransactionType: 'EscrowFinish' as const,
        Account: supplier.address,
        Owner: buyer.address,
        OfferSequence: escrowSequence!,
        Condition: condition,
        Fulfillment: fulfillment,
      };

      const finishPrepared = await client.autofill(escrowFinishTx);
      const finishSigned = supplier.sign(finishPrepared);
      const finishResult = await client.submitAndWait(finishSigned.tx_blob);

      expect((finishResult.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      console.log(`[Test] Escrow finished: ${finishResult.result.hash}`);
    });
  });

  describe('DID Operations', () => {
    it('should create a DID', async () => {
      const { wallet } = await client.fundWallet();

      const uri = `https://x-factory.io/did/${wallet.address}`;
      const uriHex = Buffer.from(uri).toString('hex').toUpperCase();

      const didSetTx = {
        TransactionType: 'DIDSet' as const,
        Account: wallet.address,
        URI: uriHex,
      };

      const prepared = await client.autofill(didSetTx);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      expect((result.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      console.log(`[Test] DID created: did:xrpl:1:${wallet.address}`);

      const didResponse = await client.request({
        command: 'ledger_entry',
        did: wallet.address,
        ledger_index: 'validated',
      });

      expect(didResponse.result.node).toBeDefined();
    });
  });

  describe('Credential Operations', () => {
    it('should issue and accept a credential', async () => {
      const issuer = (await client.fundWallet()).wallet;
      const subject = (await client.fundWallet()).wallet;

      const credentialType = Buffer.from('BusinessVerification').toString('hex').toUpperCase();

      const credentialCreateTx = {
        TransactionType: 'CredentialCreate' as const,
        Account: issuer.address,
        Subject: subject.address,
        CredentialType: credentialType,
      };

      const createPrepared = await client.autofill(credentialCreateTx);
      const createSigned = issuer.sign(createPrepared);
      const createResult = await client.submitAndWait(createSigned.tx_blob);

      expect((createResult.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      console.log(`[Test] Credential issued to ${subject.address}`);

      const credentialAcceptTx = {
        TransactionType: 'CredentialAccept' as const,
        Account: subject.address,
        Issuer: issuer.address,
        CredentialType: credentialType,
      };

      const acceptPrepared = await client.autofill(credentialAcceptTx);
      const acceptSigned = subject.sign(acceptPrepared);
      const acceptResult = await client.submitAndWait(acceptSigned.tx_blob);

      expect((acceptResult.result.meta as { TransactionResult: string }).TransactionResult).toBe('tesSUCCESS');

      console.log(`[Test] Credential accepted by ${subject.address}`);
    });
  });
});
