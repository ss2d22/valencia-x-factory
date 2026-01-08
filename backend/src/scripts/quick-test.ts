#!/usr/bin/env tsx

import { Client } from 'xrpl';

async function quickTest() {
  console.log('Testing XRPL Testnet connection...\n');

  const client = new Client('wss://s.altnet.rippletest.net:51233');

  try {
    await client.connect();
    console.log('✅ Connected to XRPL Testnet\n');

    const serverInfo = await client.request({
      command: 'server_info',
    });

    console.log('Server Information:');
    console.log(`  Build Version: ${serverInfo.result.info.build_version}`);
    console.log(`  Server State: ${serverInfo.result.info.server_state}`);
    console.log(`  Complete Ledgers: ${serverInfo.result.info.complete_ledgers}`);
    console.log(`  Network ID: ${serverInfo.result.info.network_id}`);

    console.log('\nTesting wallet creation...');
    const { wallet, balance } = await client.fundWallet();
    console.log(`✅ Wallet created: ${wallet.address}`);
    console.log(`   Balance: ${balance} XRP`);

    console.log('\nChecking RLUSD issuer...');
    const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
    try {
      const issuerInfo = await client.request({
        command: 'account_info',
        account: RLUSD_ISSUER,
        ledger_index: 'validated',
      });
      console.log(`✅ RLUSD Issuer exists: ${RLUSD_ISSUER}`);
      console.log(`   Balance: ${Number(issuerInfo.result.account_data.Balance) / 1_000_000} XRP`);
    } catch {
      console.log(`⚠️  RLUSD Issuer not found on testnet (this is expected)`);
    }

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

quickTest();
