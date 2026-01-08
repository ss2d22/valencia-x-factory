#!/usr/bin/env tsx

import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import cc from 'five-bells-condition';
import crypto from 'crypto';

const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';
const RIPPLE_EPOCH = 946684800;

async function runEscrowDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    X-Factory Escrow Demo                                   ║
║             Testing XRP Escrow on XRPL Testnet                            ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const client = new Client(TESTNET_URL);

  try {
    console.log('📡 Connecting to XRPL Testnet...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('Creating buyer wallet...');
    const { wallet: buyer, balance: buyerBalance } = await client.fundWallet();
    console.log(`✅ Buyer: ${buyer.address} (${buyerBalance} XRP)\n`);

    console.log('Creating supplier wallet...');
    const { wallet: supplier, balance: supplierBalance } = await client.fundWallet();
    console.log(`✅ Supplier: ${supplier.address} (${supplierBalance} XRP)\n`);

    console.log('Generating crypto condition...');
    const preimage = crypto.randomBytes(32);
    const fulfillment = new cc.PreimageSha256();
    fulfillment.setPreimage(preimage);

    const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();
    const fulfillmentHex = fulfillment.serializeBinary().toString('hex').toUpperCase();
    console.log(`✅ Condition: ${condition.substring(0, 40)}...`);
    console.log(`✅ Fulfillment: ${fulfillmentHex.substring(0, 40)}...\n`);

    const escrowAmount = '50';
    const now = Math.floor(Date.now() / 1000);

    console.log(`Creating escrow for ${escrowAmount} XRP...`);
    const escrowCreateTx = {
      TransactionType: 'EscrowCreate' as const,
      Account: buyer.address,
      Destination: supplier.address,
      Amount: xrpToDrops(escrowAmount),
      Condition: condition,
      CancelAfter: now - RIPPLE_EPOCH + 86400,
    };

    const createPrepared = await client.autofill(escrowCreateTx);
    const createSigned = buyer.sign(createPrepared);
    const createResult = await client.submitAndWait(createSigned.tx_blob);

    if ((createResult.result.meta as { TransactionResult: string }).TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${(createResult.result.meta as { TransactionResult: string }).TransactionResult}`);
    }

    const escrowSequence = (createResult.result as { tx_json?: { Sequence?: number } }).tx_json?.Sequence!;
    console.log(`✅ Escrow created!`);
    console.log(`   Transaction: ${createResult.result.hash}`);
    console.log(`   Sequence: ${escrowSequence}\n`);

    const buyerInfo1 = await client.request({
      command: 'account_info',
      account: buyer.address,
      ledger_index: 'validated',
    });
    console.log(`Buyer balance after escrow: ${dropsToXrp(buyerInfo1.result.account_data.Balance)} XRP`);

    console.log('\nVerifying escrow on ledger...');
    const escrowInfo = await client.request({
      command: 'ledger_entry',
      escrow: {
        owner: buyer.address,
        seq: escrowSequence,
      },
      ledger_index: 'validated',
    });
    console.log(`✅ Escrow found: ${dropsToXrp((escrowInfo.result.node as { Amount: string }).Amount)} XRP locked\n`);

    console.log('Finishing escrow (releasing funds to supplier)...');
    const escrowFinishTx = {
      TransactionType: 'EscrowFinish' as const,
      Account: supplier.address,
      Owner: buyer.address,
      OfferSequence: escrowSequence,
      Condition: condition,
      Fulfillment: fulfillmentHex,
    };

    const finishPrepared = await client.autofill(escrowFinishTx);
    const finishSigned = supplier.sign(finishPrepared);
    const finishResult = await client.submitAndWait(finishSigned.tx_blob);

    if ((finishResult.result.meta as { TransactionResult: string }).TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow finish failed: ${(finishResult.result.meta as { TransactionResult: string }).TransactionResult}`);
    }

    console.log(`✅ Escrow finished!`);
    console.log(`   Transaction: ${finishResult.result.hash}\n`);

    const buyerInfo2 = await client.request({
      command: 'account_info',
      account: buyer.address,
      ledger_index: 'validated',
    });
    const supplierInfo2 = await client.request({
      command: 'account_info',
      account: supplier.address,
      ledger_index: 'validated',
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('FINAL BALANCES');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Buyer:    ${dropsToXrp(buyerInfo2.result.account_data.Balance)} XRP`);
    console.log(`Supplier: ${dropsToXrp(supplierInfo2.result.account_data.Balance)} XRP`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('✅ Escrow demo completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  } finally {
    await client.disconnect();
    console.log('📡 Disconnected from XRPL\n');
  }
}

runEscrowDemo().catch(console.error);
