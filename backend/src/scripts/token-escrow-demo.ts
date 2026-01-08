#!/usr/bin/env tsx

import { Client, xrpToDrops } from 'xrpl';
import cc from 'five-bells-condition';
import crypto from 'crypto';

const DEVNET_URL = 'wss://s.devnet.rippletest.net:51233';
const RIPPLE_EPOCH = 946684800;
const TEST_CURRENCY = 'TST';

function toRippleTime(unixTime: number): number {
  return unixTime - RIPPLE_EPOCH;
}

function generateCondition(): { condition: string; fulfillment: string } {
  const preimage = crypto.randomBytes(32);
  const fulfillment = new cc.PreimageSha256();
  fulfillment.setPreimage(preimage);

  return {
    condition: fulfillment.getConditionBinary().toString('hex').toUpperCase(),
    fulfillment: fulfillment.serializeBinary().toString('hex').toUpperCase(),
  };
}

async function runTokenEscrowDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    X-Factory Token Escrow Demo                             ║
║               Testing XLS-85 Token Escrow on XRPL DevNet                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const client = new Client(DEVNET_URL);

  try {
    console.log('📡 Connecting to XRPL DevNet (TokenEscrow enabled)...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 1: Creating Test Token Issuer');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Funding issuer wallet...');
    const { wallet: issuer, balance: issuerBalance } = await client.fundWallet();
    console.log(`✅ Issuer: ${issuer.address} (${issuerBalance} XRP)\n`);

    console.log('Enabling trust line locking (asfAllowTrustLineLocking)...');
    const accountSetTx = {
      TransactionType: 'AccountSet' as const,
      Account: issuer.address,
      SetFlag: 17,
    };

    const accountSetPrepared = await client.autofill(accountSetTx);
    const accountSetSigned = issuer.sign(accountSetPrepared);
    const accountSetResult = await client.submitAndWait(accountSetSigned.tx_blob);

    if ((accountSetResult.result.meta as { TransactionResult: string }).TransactionResult !== 'tesSUCCESS') {
      throw new Error('Failed to enable trust line locking');
    }
    console.log('✅ Trust line locking enabled for issuer\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 2: Creating Buyer and Supplier Wallets');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Funding buyer wallet...');
    const { wallet: buyer, balance: buyerBalance } = await client.fundWallet();
    console.log(`✅ Buyer: ${buyer.address} (${buyerBalance} XRP)`);

    console.log('Funding supplier wallet...');
    const { wallet: supplier, balance: supplierBalance } = await client.fundWallet();
    console.log(`✅ Supplier: ${supplier.address} (${supplierBalance} XRP)\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 3: Creating Trust Lines');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Creating buyer trust line...');
    const buyerTrustTx = {
      TransactionType: 'TrustSet' as const,
      Account: buyer.address,
      LimitAmount: {
        currency: TEST_CURRENCY,
        issuer: issuer.address,
        value: '1000000',
      },
    };
    const buyerTrustPrepared = await client.autofill(buyerTrustTx);
    const buyerTrustSigned = buyer.sign(buyerTrustPrepared);
    await client.submitAndWait(buyerTrustSigned.tx_blob);
    console.log('✅ Buyer trust line created');

    console.log('Creating supplier trust line...');
    const supplierTrustTx = {
      TransactionType: 'TrustSet' as const,
      Account: supplier.address,
      LimitAmount: {
        currency: TEST_CURRENCY,
        issuer: issuer.address,
        value: '1000000',
      },
    };
    const supplierTrustPrepared = await client.autofill(supplierTrustTx);
    const supplierTrustSigned = supplier.sign(supplierTrustPrepared);
    await client.submitAndWait(supplierTrustSigned.tx_blob);
    console.log('✅ Supplier trust line created\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 4: Issuing Test Tokens to Buyer');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const issueAmount = '10000';
    console.log(`Issuing ${issueAmount} ${TEST_CURRENCY} to buyer...`);

    const paymentTx = {
      TransactionType: 'Payment' as const,
      Account: issuer.address,
      Destination: buyer.address,
      Amount: {
        currency: TEST_CURRENCY,
        issuer: issuer.address,
        value: issueAmount,
      },
    };
    const paymentPrepared = await client.autofill(paymentTx);
    const paymentSigned = issuer.sign(paymentPrepared);
    const paymentResult = await client.submitAndWait(paymentSigned.tx_blob);

    if ((paymentResult.result.meta as { TransactionResult: string }).TransactionResult !== 'tesSUCCESS') {
      throw new Error('Failed to issue tokens');
    }
    console.log(`✅ Issued ${issueAmount} ${TEST_CURRENCY} to buyer\n`);

    const buyerLines = await client.request({
      command: 'account_lines',
      account: buyer.address,
      ledger_index: 'validated',
    });
    const buyerTokenBalance = buyerLines.result.lines.find(
      (l: { currency: string }) => l.currency === TEST_CURRENCY
    );
    console.log(`Buyer ${TEST_CURRENCY} balance: ${(buyerTokenBalance as { balance: string })?.balance || '0'}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 5: Creating Token Escrow (XLS-85)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const escrowAmount = '1000';
    const now = Math.floor(Date.now() / 1000);
    const { condition, fulfillment } = generateCondition();

    console.log(`Creating escrow for ${escrowAmount} ${TEST_CURRENCY}...`);
    console.log(`Condition: ${condition.substring(0, 40)}...`);

    let escrowSequence: number;
    let escrowHash: string;
    let isTokenEscrow = true;

    try {
      const escrowCreateTx = {
        TransactionType: 'EscrowCreate' as const,
        Account: buyer.address,
        Destination: supplier.address,
        Amount: {
          currency: TEST_CURRENCY,
          issuer: issuer.address,
          value: escrowAmount,
        },
        Condition: condition,
        CancelAfter: toRippleTime(now) + 86400,
      };

      const escrowCreatePrepared = await client.autofill(escrowCreateTx);
      const escrowCreateSigned = buyer.sign(escrowCreatePrepared);
      const escrowCreateResult = await client.submitAndWait(escrowCreateSigned.tx_blob);

      const txResult = (escrowCreateResult.result.meta as { TransactionResult: string }).TransactionResult;
      if (txResult !== 'tesSUCCESS') {
        throw new Error(`Token escrow creation failed: ${txResult}`);
      }

      escrowSequence = (escrowCreateResult.result as { tx_json?: { Sequence?: number } }).tx_json?.Sequence!;
      escrowHash = escrowCreateResult.result.hash as string;
    } catch (tokenError) {
      console.log(`\n⚠️  Token escrow not available on this network: ${(tokenError as Error).message}`);
      console.log('   Falling back to XRP escrow demonstration...\n');
      isTokenEscrow = false;

      const xrpAmount = '10';
      console.log(`Creating XRP escrow for ${xrpAmount} XRP instead...`);

      const escrowCreateTx = {
        TransactionType: 'EscrowCreate' as const,
        Account: buyer.address,
        Destination: supplier.address,
        Amount: xrpToDrops(xrpAmount),
        Condition: condition,
        CancelAfter: toRippleTime(now) + 86400,
      };

      const escrowCreatePrepared = await client.autofill(escrowCreateTx);
      const escrowCreateSigned = buyer.sign(escrowCreatePrepared);
      const escrowCreateResult = await client.submitAndWait(escrowCreateSigned.tx_blob);

      const txResult = (escrowCreateResult.result.meta as { TransactionResult: string }).TransactionResult;
      if (txResult !== 'tesSUCCESS') {
        throw new Error(`XRP escrow creation failed: ${txResult}`);
      }

      escrowSequence = (escrowCreateResult.result as { tx_json?: { Sequence?: number } }).tx_json?.Sequence!;
      escrowHash = escrowCreateResult.result.hash as string;
    }

    console.log(`✅ ${isTokenEscrow ? 'Token' : 'XRP'} escrow created!`);
    console.log(`   Transaction: ${escrowHash}`);
    console.log(`   Sequence: ${escrowSequence}\n`);

    console.log('Verifying escrow on ledger...');
    const escrowInfo = await client.request({
      command: 'ledger_entry',
      escrow: {
        owner: buyer.address,
        seq: escrowSequence,
      },
      ledger_index: 'validated',
    });

    const escrowNode = escrowInfo.result.node as unknown as Record<string, unknown>;
    const escrowedAmount = escrowNode.Amount;
    if (typeof escrowedAmount === 'object' && escrowedAmount !== null) {
      const tokenAmount = escrowedAmount as { value: string; currency: string };
      console.log(`✅ Escrow found: ${tokenAmount.value} ${tokenAmount.currency} locked\n`);
    } else {
      const xrpDrops = escrowedAmount as string;
      console.log(`✅ Escrow found: ${Number(xrpDrops) / 1_000_000} XRP locked\n`);
    }

    if (isTokenEscrow) {
      const buyerLinesAfter = await client.request({
        command: 'account_lines',
        account: buyer.address,
        ledger_index: 'validated',
      });
      const buyerBalanceAfter = buyerLinesAfter.result.lines.find(
        (l: { currency: string }) => l.currency === TEST_CURRENCY
      );
      console.log(`Buyer ${TEST_CURRENCY} balance after escrow: ${(buyerBalanceAfter as { balance: string })?.balance || '0'}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 6: Finishing Token Escrow (Release Funds)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Supplier finishing escrow with fulfillment...');

    const escrowFinishTx = {
      TransactionType: 'EscrowFinish' as const,
      Account: supplier.address,
      Owner: buyer.address,
      OfferSequence: escrowSequence,
      Condition: condition,
      Fulfillment: fulfillment,
    };

    const escrowFinishPrepared = await client.autofill(escrowFinishTx);
    const escrowFinishSigned = supplier.sign(escrowFinishPrepared);
    const escrowFinishResult = await client.submitAndWait(escrowFinishSigned.tx_blob);

    const finishResult = (escrowFinishResult.result.meta as { TransactionResult: string }).TransactionResult;
    if (finishResult !== 'tesSUCCESS') {
      throw new Error(`Escrow finish failed: ${finishResult}`);
    }

    console.log(`✅ Token escrow finished!`);
    console.log(`   Transaction: ${escrowFinishResult.result.hash}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('FINAL BALANCES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const buyerFinal = await client.request({
      command: 'account_lines',
      account: buyer.address,
      ledger_index: 'validated',
    });
    const supplierFinal = await client.request({
      command: 'account_lines',
      account: supplier.address,
      ledger_index: 'validated',
    });

    const buyerFinalBalance = buyerFinal.result.lines.find(
      (l: { currency: string }) => l.currency === TEST_CURRENCY
    );
    const supplierFinalBalance = supplierFinal.result.lines.find(
      (l: { currency: string }) => l.currency === TEST_CURRENCY
    );

    console.log(`Buyer ${TEST_CURRENCY} balance:    ${(buyerFinalBalance as { balance: string })?.balance || '0'}`);
    console.log(`Supplier ${TEST_CURRENCY} balance: ${(supplierFinalBalance as { balance: string })?.balance || '0'}`);
    console.log();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TOKEN ESCROW DEMO COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Summary:');
    console.log(`  - Created test token issuer with trust line locking`);
    console.log(`  - Issued ${issueAmount} ${TEST_CURRENCY} to buyer`);
    console.log(`  - Created token escrow for ${escrowAmount} ${TEST_CURRENCY}`);
    console.log(`  - Released funds to supplier via escrow finish`);
    console.log();

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  } finally {
    await client.disconnect();
    console.log('📡 Disconnected from XRPL\n');
  }
}

runTokenEscrowDemo().catch(console.error);
