#!/usr/bin/env tsx

import { getClient, disconnectClient } from '../services/xrpl/client.js';
import {
  createParticipantWallet,
  verifyParticipant,
  createDeal,
  fundDeal,
  verifyMilestone,
  releaseMilestone,
} from '../services/deal.js';

async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                         X-Factory Demo                                     ║
║                   XRPL-Powered Trade Finance Platform                      ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  try {
    console.log('📡 Connecting to XRPL Testnet...');
    await getClient();
    console.log('✅ Connected to XRPL Testnet\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 1: Creating Participants');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Creating buyer wallet...');
    const buyer = await createParticipantWallet('Singapore Company', 'buyer');
    console.log(`✅ Buyer created: ${buyer.xrplAddress}`);
    console.log(`   DID: ${buyer.did}\n`);

    console.log('Creating supplier wallet...');
    const supplier = await createParticipantWallet('Algerian Manufacturer', 'supplier');
    console.log(`✅ Supplier created: ${supplier.xrplAddress}`);
    console.log(`   DID: ${supplier.did}\n`);

    console.log('Creating facilitator wallet...');
    const facilitator = await createParticipantWallet('Certified Inspector', 'facilitator');
    console.log(`✅ Facilitator created: ${facilitator.xrplAddress}`);
    console.log(`   DID: ${facilitator.did}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 2: KYC Verification (Credentials)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Issuing credentials to buyer...');
    await verifyParticipant(facilitator.xrplAddress, buyer.xrplAddress);
    console.log('✅ Buyer verified\n');

    console.log('Issuing credentials to supplier...');
    await verifyParticipant(facilitator.xrplAddress, supplier.xrplAddress);
    console.log('✅ Supplier verified\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 3: Creating Deal');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const deal = await createDeal({
      name: 'Industrial Equipment Order',
      description: 'Supply of manufacturing equipment from Algeria to Singapore',
      amount: 500,
      currency: 'USD',
      buyerAddress: buyer.xrplAddress,
      supplierAddress: supplier.xrplAddress,
      facilitatorAddress: facilitator.xrplAddress,
      milestones: [
        { name: 'Production Started', percentage: 30 },
        { name: 'Inspection Approved', percentage: 40 },
        { name: 'Shipment Confirmed', percentage: 30 },
      ],
    });

    console.log(`✅ Deal created: ${deal.dealReference}`);
    console.log(`   Total amount: $${deal.amount.toLocaleString()}`);
    console.log(`   Milestones: ${deal.milestones.length}`);
    console.log(`   Status: ${deal.status}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 4: Funding Deal (Creating Escrows)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Creating escrows for each milestone...');
    const fundedDeal = await fundDeal(deal.id);

    console.log(`✅ Deal funded`);
    console.log(`   Escrow balance: $${fundedDeal.escrowBalance.toLocaleString()}`);
    for (const milestone of fundedDeal.milestones) {
      console.log(`   - ${milestone.name}: $${milestone.amount.toLocaleString()} (seq: ${milestone.escrow?.sequence})`);
    }
    console.log();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 5: Milestone Verification & Release');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let i = 0; i < fundedDeal.milestones.length; i++) {
      const milestone = fundedDeal.milestones[i];
      console.log(`\n--- Milestone ${i + 1}: ${milestone.name} ---\n`);

      console.log('Verifying milestone...');
      await verifyMilestone(deal.id, i, facilitator.xrplAddress);
      console.log('✅ Milestone verified by inspector\n');

      console.log('Releasing escrow...');
      const releasedDeal = await releaseMilestone(deal.id, i);
      console.log(`✅ Escrow released: $${milestone.amount.toLocaleString()}`);
      console.log(`   Escrow balance: $${releasedDeal.escrowBalance.toLocaleString()}`);
      console.log(`   Supplier balance: $${releasedDeal.supplierBalance.toLocaleString()}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('DEAL COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const finalDeal = await import('../services/deal.js').then(m => m.getDeal(deal.id));
    if (finalDeal) {
      console.log(`Deal Reference: ${finalDeal.dealReference}`);
      console.log(`Status: ${finalDeal.status}`);
      console.log(`Total Released: $${finalDeal.supplierBalance.toLocaleString()}`);
      console.log(`Transaction Hashes: ${finalDeal.transactionHashes.length}`);
      console.log('\nMilestone Summary:');
      for (const m of finalDeal.milestones) {
        console.log(`  - ${m.name}: ${m.status} ($${m.amount.toLocaleString()})`);
      }
    }

    console.log('\n✅ Demo completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  } finally {
    await disconnectClient();
    console.log('\n📡 Disconnected from XRPL\n');
  }
}

runDemo().catch(console.error);
