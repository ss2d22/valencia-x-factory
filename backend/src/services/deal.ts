import { v4 as uuidv4 } from 'uuid';
import { dealStorage, participantStorage, walletStorage, transactionStorage, credentialStorage } from './storage.js';
import {
  createAndFundWallet,
  getWalletFromSeed,
  getAccountInfo,
} from './xrpl/client.js';
import {
  generateConditionAndFulfillment,
  createXRPEscrow,
  finishEscrow,
  getEscrow,
} from './xrpl/escrow.js';
import { createDID } from './xrpl/did.js';
import { createRLUSDTrustLine } from './xrpl/trustline.js';
import {
  issueAndAcceptCredential,
  verifyCredential,
  CredentialTypes,
} from './xrpl/credentials.js';
import type {
  Deal,
  Participant,
  Milestone,
  CreateDealRequest,
} from '../types/index.js';

export async function createParticipantWallet(
  name: string,
  role: 'buyer' | 'supplier' | 'facilitator',
  userId?: string
): Promise<Participant> {
  const { wallet, balance } = await createAndFundWallet();

  const did = await createDID(wallet);
  await createRLUSDTrustLine(wallet);

  const participant = await participantStorage.create(
    {
      role,
      name,
      xrplAddress: wallet.address,
      did: did.did,
      verified: false,
    },
    {
      address: wallet.address,
      publicKey: wallet.publicKey,
      seed: wallet.seed!,
    },
    userId
  );

  await transactionStorage.create({
    walletId: participant.id,
    type: 'wallet_created',
    fromAddress: wallet.address,
    status: 'success',
    metadata: { role, name, balance },
  });

  console.log(`[Deal] Created ${role} wallet: ${wallet.address} (${balance} XRP)`);

  return participant;
}

export async function verifyParticipant(
  issuerAddress: string,
  subjectAddress: string
): Promise<void> {
  const existingParticipant = await participantStorage.getByAddress(subjectAddress);
  if (existingParticipant?.verified) {
    console.log(`[Deal] Participant already verified: ${subjectAddress}`);
    return;
  }

  const issuerWalletData = await walletStorage.get(issuerAddress);
  const subjectWalletData = await walletStorage.get(subjectAddress);

  if (!issuerWalletData?.seed || !subjectWalletData?.seed) {
    throw new Error('Wallet seeds not found');
  }

  const issuerWallet = getWalletFromSeed(issuerWalletData.seed);
  const subjectWallet = getWalletFromSeed(subjectWalletData.seed);

  const existingCredential = await verifyCredential(
    issuerAddress,
    subjectAddress,
    CredentialTypes.BUSINESS_VERIFICATION
  );

  let transactionHash = '';

  if (existingCredential.valid) {
    console.log(`[Deal] Credential already exists on XRPL for: ${subjectAddress}`);
    transactionHash = existingCredential.credential?.transactionHash || '';
  } else {
    const result = await issueAndAcceptCredential(
      issuerWallet,
      subjectWallet,
      CredentialTypes.BUSINESS_VERIFICATION,
      { expirationDays: 365 }
    );
    transactionHash = result.transactionHash;
  }

  await credentialStorage.create(subjectAddress, issuerAddress, CredentialTypes.BUSINESS_VERIFICATION);
  await credentialStorage.accept(subjectAddress, issuerAddress, CredentialTypes.BUSINESS_VERIFICATION);

  await participantStorage.updateByAddress(subjectAddress, {
    verified: true,
    issuer: issuerAddress,
  });

  const subjectParticipant = await participantStorage.getByAddress(subjectAddress);
  if (subjectParticipant && transactionHash) {
    await transactionStorage.create({
      walletId: subjectParticipant.id,
      type: 'credential_issued',
      hash: transactionHash,
      fromAddress: issuerAddress,
      toAddress: subjectAddress,
      status: 'success',
      metadata: { credentialType: CredentialTypes.BUSINESS_VERIFICATION },
    });
  }

  console.log(`[Deal] Verified participant: ${subjectAddress}`);
}

export async function createDeal(request: CreateDealRequest): Promise<Deal> {
  const totalPercentage = request.milestones.reduce((sum, m) => sum + m.percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`Milestone percentages must total 100%, got ${totalPercentage}%`);
  }

  const buyer = await participantStorage.getByAddress(request.buyerAddress);
  const supplier = await participantStorage.getByAddress(request.supplierAddress);
  const facilitator = request.facilitatorAddress
    ? await participantStorage.getByAddress(request.facilitatorAddress)
    : undefined;

  if (!buyer) {
    throw new Error('Buyer not found. Create wallet first.');
  }
  if (!supplier) {
    throw new Error('Supplier not found. Create wallet first.');
  }

  const milestones: Milestone[] = request.milestones.map((m) => {
    const { condition, fulfillment } = generateConditionAndFulfillment();
    const amount = (request.amount * m.percentage) / 100;

    return {
      id: uuidv4(),
      name: m.name,
      description: m.description,
      percentage: m.percentage,
      amount,
      status: 'Pending',
      verification: facilitator
        ? {
            verifier: facilitator.did || facilitator.xrplAddress,
            credential: 'Certified Inspector',
            status: 'Pending',
          }
        : undefined,
      escrow: {
        sequence: 0,
        owner: buyer.xrplAddress,
        destination: supplier.xrplAddress,
        amount: String(amount),
        condition,
        fulfillment,
        cancelAfter: 0,
        status: 'created',
        transactionHash: '',
      },
    };
  });

  const deal = await dealStorage.create({
    name: request.name,
    description: request.description,
    amount: request.amount,
    currency: request.currency || 'USD',
    settlementAsset: 'RLUSD',
    status: 'draft',
    participants: {
      buyer: { ...buyer, role: 'buyer' },
      supplier: { ...supplier, role: 'supplier' },
      facilitator: facilitator ? { ...facilitator, role: 'facilitator' } : undefined,
    },
    milestones,
    escrowBalance: 0,
    supplierBalance: 0,
    dispute: false,
    credentialProvider: facilitator?.issuer || 'X-Factory Platform',
    complianceStatus: buyer.verified && supplier.verified ? 'KYC Complete' : 'Pending',
    transactionHashes: [],
  });

  await transactionStorage.create({
    dealId: deal.id,
    type: 'deal_created',
    status: 'success',
    metadata: {
      dealReference: deal.dealReference,
      amount: request.amount,
      currency: request.currency || 'USD',
      milestoneCount: request.milestones.length,
    },
  });

  console.log(`[Deal] Created deal: ${deal.dealReference}`);

  return deal;
}

export async function fundDeal(dealId: string): Promise<Deal> {
  const deal = await dealStorage.get(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  if (deal.status !== 'draft') {
    throw new Error(`Cannot fund deal in ${deal.status} status`);
  }

  const buyerWalletData = await walletStorage.get(deal.participants.buyer.xrplAddress);
  if (!buyerWalletData?.seed) {
    throw new Error('Buyer wallet not found');
  }

  const buyerWallet = getWalletFromSeed(buyerWalletData.seed);

  const accountInfo = await getAccountInfo(buyerWallet.address);
  console.log(`[Deal] Buyer balance: ${accountInfo.balance} drops`);

  let totalEscrowed = 0;

  for (let i = 0; i < deal.milestones.length; i++) {
    const milestone = deal.milestones[i];
    const xrpAmount = String(milestone.amount / 100);

    const escrow = await createXRPEscrow(
      buyerWallet,
      deal.participants.supplier.xrplAddress,
      xrpAmount,
      milestone.escrow!.condition,
      {
        memoData: `${deal.dealReference}:${milestone.id}`,
      }
    );

    await dealStorage.updateEscrow(dealId, i, {
      sequence: escrow.sequence,
      cancelAfter: escrow.cancelAfter,
      finishAfter: escrow.finishAfter,
      status: 'created',
      transactionHash: escrow.transactionHash,
    });

    await transactionStorage.create({
      dealId: deal.id,
      type: 'escrow_created',
      hash: escrow.transactionHash,
      amount: xrpAmount,
      currency: 'XRP',
      fromAddress: deal.participants.buyer.xrplAddress,
      toAddress: deal.participants.supplier.xrplAddress,
      status: 'success',
      metadata: {
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        escrowSequence: escrow.sequence,
      },
    });

    totalEscrowed += milestone.amount;

    console.log(`[Deal] Funded milestone ${milestone.name}: ${xrpAmount} XRP (seq: ${escrow.sequence})`);
  }

  const updatedDeal = await dealStorage.update(dealId, {
    status: 'funded',
    escrowBalance: totalEscrowed,
  });

  console.log(`[Deal] Deal funded: ${deal.dealReference} ($${totalEscrowed})`);

  return updatedDeal!;
}

export async function verifyMilestone(
  dealId: string,
  milestoneIndex: number,
  verifierAddress: string
): Promise<Deal> {
  const deal = await dealStorage.get(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  if (deal.status !== 'funded' && deal.status !== 'active') {
    throw new Error(`Cannot verify milestone in ${deal.status} status`);
  }

  const milestone = deal.milestones[milestoneIndex];
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== 'Pending') {
    throw new Error(`Milestone already ${milestone.status}`);
  }

  if (deal.participants.facilitator?.xrplAddress !== verifierAddress) {
    throw new Error('Only facilitator can verify milestones');
  }

  await dealStorage.updateMilestone(dealId, milestoneIndex, {
    verification: {
      verifier: verifierAddress,
      credential: milestone.verification?.credential || 'Certified Inspector',
      status: 'Verified',
      verifiedAt: new Date().toISOString(),
    },
  });

  const updatedDeal = await dealStorage.update(dealId, { status: 'active' });

  await transactionStorage.create({
    dealId: deal.id,
    type: 'milestone_verified',
    status: 'success',
    metadata: {
      milestoneIndex,
      milestoneName: milestone.name,
      verifierAddress,
    },
  });

  console.log(`[Deal] Milestone verified: ${milestone.name}`);

  return updatedDeal!;
}

export async function releaseMilestone(
  dealId: string,
  milestoneIndex: number
): Promise<Deal> {
  const deal = await dealStorage.get(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  if (deal.dispute) {
    throw new Error('Cannot release milestone on disputed deal');
  }

  const milestone = deal.milestones[milestoneIndex];
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestoneIndex > 0) {
    const prevMilestone = deal.milestones[milestoneIndex - 1];
    if (prevMilestone.status !== 'Released') {
      throw new Error('Previous milestone must be released first');
    }
  }

  if (milestone.status === 'Released') {
    throw new Error('Milestone already released');
  }

  const supplierWalletData = await walletStorage.get(deal.participants.supplier.xrplAddress);
  if (!supplierWalletData?.seed) {
    throw new Error('Supplier wallet not found');
  }

  const supplierWallet = getWalletFromSeed(supplierWalletData.seed);
  const escrow = milestone.escrow!;

  const result = await finishEscrow(
    supplierWallet,
    deal.participants.buyer.xrplAddress,
    escrow.sequence,
    escrow.condition,
    escrow.fulfillment!
  );

  await dealStorage.updateMilestone(dealId, milestoneIndex, {
    status: 'Released',
    releasedAt: new Date().toISOString(),
    verification: milestone.verification
      ? { ...milestone.verification, status: 'Verified' }
      : undefined,
  });

  await dealStorage.updateEscrow(dealId, milestoneIndex, {
    status: 'finished',
    transactionHash: result.hash,
  });

  const releasedAmount = milestone.amount;
  const newEscrowBalance = deal.escrowBalance - releasedAmount;
  const newSupplierBalance = deal.supplierBalance + releasedAmount;

  const updatedDealAfterRelease = await dealStorage.get(dealId);
  const allReleased = updatedDealAfterRelease?.milestones.every((m) => m.status === 'Released');

  const updatedDeal = await dealStorage.update(dealId, {
    escrowBalance: newEscrowBalance,
    supplierBalance: newSupplierBalance,
    status: allReleased ? 'completed' : 'active',
  });

  await transactionStorage.create({
    dealId: deal.id,
    type: 'escrow_released',
    hash: result.hash,
    amount: String(releasedAmount / 100),
    currency: 'XRP',
    fromAddress: deal.participants.buyer.xrplAddress,
    toAddress: deal.participants.supplier.xrplAddress,
    status: 'success',
    metadata: {
      milestoneIndex,
      milestoneName: milestone.name,
      escrowSequence: escrow.sequence,
    },
  });

  console.log(`[Deal] Milestone released: ${milestone.name} ($${releasedAmount})`);

  return updatedDeal!;
}

export async function disputeDeal(
  dealId: string,
  reason: string
): Promise<Deal> {
  const deal = await dealStorage.get(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  for (let i = 0; i < deal.milestones.length; i++) {
    const m = deal.milestones[i];
    if (m.status === 'Pending') {
      await dealStorage.updateMilestone(dealId, i, { status: 'Disputed' });
    }
  }

  const updatedDeal = await dealStorage.update(dealId, {
    status: 'disputed',
    dispute: true,
    disputeReason: reason,
  });

  await transactionStorage.create({
    dealId: deal.id,
    type: 'deal_disputed',
    status: 'success',
    metadata: { reason },
  });

  console.log(`[Deal] Deal disputed: ${deal.dealReference} - ${reason}`);

  return updatedDeal!;
}

export async function getDeal(dealId: string): Promise<Deal | undefined> {
  return dealStorage.get(dealId);
}

export async function listDeals(): Promise<Deal[]> {
  return dealStorage.list();
}

export async function listDealsByWallet(walletAddress: string): Promise<Deal[]> {
  return dealStorage.listByParticipant(walletAddress);
}

export async function getEscrowStatus(
  ownerAddress: string,
  escrowSequence: number
): Promise<Record<string, unknown> | null> {
  return getEscrow(ownerAddress, escrowSequence);
}

export async function getDealHistory(dealId: string): Promise<Array<{
  id: string;
  type: string;
  hash: string | null;
  amount: string | null;
  status: string;
  createdAt: Date;
}>> {
  return transactionStorage.listByDeal(dealId);
}

export async function getWalletHistory(walletAddress: string): Promise<Array<{
  id: string;
  type: string;
  hash: string | null;
  amount: string | null;
  status: string;
  createdAt: Date;
}>> {
  return transactionStorage.listByWallet(walletAddress);
}

export default {
  createParticipantWallet,
  verifyParticipant,
  createDeal,
  fundDeal,
  verifyMilestone,
  releaseMilestone,
  disputeDeal,
  getDeal,
  listDeals,
  listDealsByWallet,
  getEscrowStatus,
  getDealHistory,
  getWalletHistory,
};
