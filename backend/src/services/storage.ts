import { prisma } from './db.js';
import type { Deal, Participant, XRPLWallet, Milestone, EscrowInfo } from '../types/index.js';

export async function generateDealReference(): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await prisma.dealCounter.upsert({
    where: { id: 'counter' },
    update: { value: { increment: 1 } },
    create: { id: 'counter', value: 1 },
  });

  return `DEAL-${year}-${String(counter.value).padStart(4, '0')}`;
}

function dbWalletToParticipant(wallet: {
  id: string;
  address: string;
  role: string;
  name: string;
  did: string | null;
  verified: boolean;
}): Participant {
  return {
    id: wallet.id,
    role: wallet.role as 'buyer' | 'supplier' | 'facilitator',
    name: wallet.name,
    xrplAddress: wallet.address,
    did: wallet.did || undefined,
    verified: wallet.verified,
  };
}

function dbDealToDeal(dbDeal: {
  id: string;
  dealReference: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  settlementAsset: string;
  status: string;
  dispute: boolean;
  disputeReason: string | null;
  escrowBalance: number;
  supplierBalance: number;
  credentialProvider: string;
  complianceStatus: string;
  createdAt: Date;
  updatedAt: Date;
  buyer: { id: string; address: string; role: string; name: string; did: string | null; verified: boolean };
  supplier: { id: string; address: string; role: string; name: string; did: string | null; verified: boolean };
  facilitator: { id: string; address: string; role: string; name: string; did: string | null; verified: boolean } | null;
  milestones: Array<{
    id: string;
    name: string;
    percentage: number;
    amount: number;
    status: string;
    index: number;
    verifierDid: string | null;
    verificationStatus: string;
    escrow: {
      sequence: number;
      ownerAddress: string;
      destinationAddress: string;
      amount: string;
      condition: string;
      fulfillment: string;
      cancelAfter: number;
      status: string;
      transactionHash: string | null;
    } | null;
  }>;
  transactions: Array<{ hash: string | null }>;
}): Deal {
  return {
    id: dbDeal.id,
    dealReference: dbDeal.dealReference,
    name: dbDeal.name,
    description: dbDeal.description || undefined,
    amount: dbDeal.amount,
    currency: dbDeal.currency,
    settlementAsset: dbDeal.settlementAsset,
    status: dbDeal.status as Deal['status'],
    dispute: dbDeal.dispute,
    disputeReason: dbDeal.disputeReason || undefined,
    escrowBalance: dbDeal.escrowBalance,
    supplierBalance: dbDeal.supplierBalance,
    credentialProvider: dbDeal.credentialProvider,
    complianceStatus: dbDeal.complianceStatus,
    createdAt: dbDeal.createdAt.toISOString(),
    updatedAt: dbDeal.updatedAt.toISOString(),
    participants: {
      buyer: dbWalletToParticipant(dbDeal.buyer),
      supplier: dbWalletToParticipant(dbDeal.supplier),
      facilitator: dbDeal.facilitator ? dbWalletToParticipant(dbDeal.facilitator) : undefined,
    },
    milestones: dbDeal.milestones
      .sort((a, b) => a.index - b.index)
      .map((m) => ({
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        amount: m.amount,
        status: m.status as Milestone['status'],
        verification: {
          verifier: m.verifierDid || '',
          credential: 'Certified Inspector',
          status: m.verificationStatus as 'Pending' | 'Verified',
        },
        escrow: m.escrow ? {
          sequence: m.escrow.sequence,
          owner: m.escrow.ownerAddress,
          destination: m.escrow.destinationAddress,
          amount: m.escrow.amount,
          condition: m.escrow.condition,
          fulfillment: m.escrow.fulfillment,
          cancelAfter: m.escrow.cancelAfter,
          status: m.escrow.status as EscrowInfo['status'],
          transactionHash: m.escrow.transactionHash || '',
        } : undefined,
      })),
    transactionHashes: dbDeal.transactions.filter((t) => t.hash).map((t) => t.hash!),
  };
}

const dealInclude = {
  buyer: true,
  supplier: true,
  facilitator: true,
  milestones: {
    include: { escrow: true },
    orderBy: { index: 'asc' as const },
  },
  transactions: { select: { hash: true } },
};

export const dealStorage = {
  async create(deal: Omit<Deal, 'id' | 'dealReference' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const dealReference = await generateDealReference();

    const dbDeal = await prisma.deal.create({
      data: {
        dealReference,
        name: deal.name,
        description: deal.description,
        amount: deal.amount,
        currency: deal.currency,
        settlementAsset: deal.settlementAsset,
        status: deal.status,
        dispute: deal.dispute,
        escrowBalance: deal.escrowBalance,
        supplierBalance: deal.supplierBalance,
        credentialProvider: deal.credentialProvider,
        complianceStatus: deal.complianceStatus,
        buyerId: deal.participants.buyer.id,
        supplierId: deal.participants.supplier.id,
        facilitatorId: deal.participants.facilitator?.id,
        milestones: {
          create: deal.milestones.map((m, index) => ({
            name: m.name,
            percentage: m.percentage,
            amount: m.amount,
            status: m.status,
            index,
            verifierDid: m.verification?.verifier,
            verificationStatus: m.verification?.status || 'Pending',
            escrow: m.escrow ? {
              create: {
                sequence: m.escrow.sequence,
                ownerAddress: m.escrow.owner,
                destinationAddress: m.escrow.destination,
                amount: m.escrow.amount,
                condition: m.escrow.condition,
                fulfillment: m.escrow.fulfillment || '',
                cancelAfter: m.escrow.cancelAfter,
                status: m.escrow.status,
                transactionHash: m.escrow.transactionHash || null,
              },
            } : undefined,
          })),
        },
      },
      include: dealInclude,
    });

    return dbDealToDeal(dbDeal as unknown as Parameters<typeof dbDealToDeal>[0]);
  },

  async get(id: string): Promise<Deal | undefined> {
    const dbDeal = await prisma.deal.findUnique({
      where: { id },
      include: dealInclude,
    });

    if (!dbDeal) return undefined;
    return dbDealToDeal(dbDeal as unknown as Parameters<typeof dbDealToDeal>[0]);
  },

  async getByReference(reference: string): Promise<Deal | undefined> {
    const dbDeal = await prisma.deal.findUnique({
      where: { dealReference: reference },
      include: dealInclude,
    });

    if (!dbDeal) return undefined;
    return dbDealToDeal(dbDeal as unknown as Parameters<typeof dbDealToDeal>[0]);
  },

  async update(id: string, updates: Partial<Deal>): Promise<Deal | undefined> {
    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) return undefined;

    const dbDeal = await prisma.deal.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        amount: updates.amount,
        status: updates.status,
        dispute: updates.dispute,
        disputeReason: updates.disputeReason,
        escrowBalance: updates.escrowBalance,
        supplierBalance: updates.supplierBalance,
        complianceStatus: updates.complianceStatus,
      },
      include: dealInclude,
    });

    return dbDealToDeal(dbDeal as unknown as Parameters<typeof dbDealToDeal>[0]);
  },

  async updateMilestone(dealId: string, milestoneIndex: number, updates: Partial<Milestone>): Promise<Deal | undefined> {
    const milestone = await prisma.milestone.findFirst({
      where: { dealId, index: milestoneIndex },
    });

    if (!milestone) return undefined;

    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: updates.status,
        verificationStatus: updates.verification?.status,
        verifiedAt: updates.verification?.status === 'Verified' ? new Date() : undefined,
        releasedAt: updates.status === 'Released' ? new Date() : undefined,
      },
    });

    return this.get(dealId);
  },

  async updateEscrow(dealId: string, milestoneIndex: number, escrowUpdates: Partial<EscrowInfo>): Promise<Deal | undefined> {
    const milestone = await prisma.milestone.findFirst({
      where: { dealId, index: milestoneIndex },
      include: { escrow: true },
    });

    if (!milestone) return undefined;

    if (milestone.escrow) {
      await prisma.escrow.update({
        where: { id: milestone.escrow.id },
        data: {
          sequence: escrowUpdates.sequence,
          status: escrowUpdates.status,
          transactionHash: escrowUpdates.transactionHash,
        },
      });
    } else if (escrowUpdates.owner) {
      await prisma.escrow.create({
        data: {
          milestoneId: milestone.id,
          sequence: escrowUpdates.sequence || 0,
          ownerAddress: escrowUpdates.owner,
          destinationAddress: escrowUpdates.destination || '',
          amount: escrowUpdates.amount || '0',
          condition: escrowUpdates.condition || '',
          fulfillment: escrowUpdates.fulfillment || '',
          cancelAfter: escrowUpdates.cancelAfter || 0,
          status: escrowUpdates.status || 'created',
          transactionHash: escrowUpdates.transactionHash,
        },
      });
    }

    return this.get(dealId);
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.deal.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async list(): Promise<Deal[]> {
    const dbDeals = await prisma.deal.findMany({
      include: dealInclude,
      orderBy: { createdAt: 'desc' },
    });

    return dbDeals.map((d: unknown) => dbDealToDeal(d as Parameters<typeof dbDealToDeal>[0]));
  },

  async listByParticipant(address: string): Promise<Deal[]> {
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (!wallet) return [];

    const dbDeals = await prisma.deal.findMany({
      where: {
        OR: [
          { buyerId: wallet.id },
          { supplierId: wallet.id },
          { facilitatorId: wallet.id },
        ],
      },
      include: dealInclude,
      orderBy: { createdAt: 'desc' },
    });

    return dbDeals.map((d: unknown) => dbDealToDeal(d as Parameters<typeof dbDealToDeal>[0]));
  },
};

export const participantStorage = {
  async create(participant: Omit<Participant, 'id'>, wallet: XRPLWallet, userId?: string): Promise<Participant> {
    const dbWallet = await prisma.wallet.create({
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        seed: wallet.seed || '',
        role: participant.role,
        name: participant.name,
        did: participant.did,
        verified: participant.verified,
        userId,
      },
    });

    return dbWalletToParticipant(dbWallet);
  },

  async get(id: string): Promise<Participant | undefined> {
    const wallet = await prisma.wallet.findUnique({ where: { id } });
    if (!wallet) return undefined;
    return dbWalletToParticipant(wallet);
  },

  async getByAddress(address: string): Promise<Participant | undefined> {
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (!wallet) return undefined;
    return dbWalletToParticipant(wallet);
  },

  async getByAddressWithUser(address: string): Promise<(Participant & { userId?: string }) | undefined> {
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (!wallet) return undefined;
    return {
      ...dbWalletToParticipant(wallet),
      userId: wallet.userId || undefined,
    };
  },

  async update(id: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    try {
      const wallet = await prisma.wallet.update({
        where: { id },
        data: {
          name: updates.name,
          did: updates.did,
          verified: updates.verified,
        },
      });
      return dbWalletToParticipant(wallet);
    } catch {
      return undefined;
    }
  },

  async updateByAddress(address: string, updates: Partial<Participant>): Promise<Participant | undefined> {
    try {
      const wallet = await prisma.wallet.update({
        where: { address },
        data: {
          name: updates.name,
          did: updates.did,
          verified: updates.verified,
        },
      });
      return dbWalletToParticipant(wallet);
    } catch {
      return undefined;
    }
  },

  async list(): Promise<Participant[]> {
    const wallets = await prisma.wallet.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return wallets.map(dbWalletToParticipant);
  },

  async listByUser(userId: string): Promise<Participant[]> {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return wallets.map(dbWalletToParticipant);
  },

  async listByRole(role: string): Promise<Participant[]> {
    const wallets = await prisma.wallet.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });
    return wallets.map(dbWalletToParticipant);
  },
};

export const walletStorage = {
  async store(address: string, wallet: XRPLWallet): Promise<void> {
    await prisma.wallet.upsert({
      where: { address },
      update: {
        publicKey: wallet.publicKey,
        seed: wallet.seed || '',
      },
      create: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        seed: wallet.seed || '',
        role: 'buyer',
        name: 'Unknown',
      },
    });
  },

  async get(address: string): Promise<XRPLWallet | undefined> {
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (!wallet) return undefined;
    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      seed: wallet.seed,
    };
  },

  async delete(address: string): Promise<boolean> {
    try {
      await prisma.wallet.delete({ where: { address } });
      return true;
    } catch {
      return false;
    }
  },

  async getSafe(address: string): Promise<Omit<XRPLWallet, 'seed'> | undefined> {
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (!wallet) return undefined;
    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
    };
  },
};

export const transactionStorage = {
  async create(data: {
    dealId?: string;
    walletId?: string;
    type: string;
    hash?: string;
    amount?: string;
    currency?: string;
    fromAddress?: string;
    toAddress?: string;
    status: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await prisma.transactionHistory.create({
      data: {
        dealId: data.dealId,
        walletId: data.walletId,
        type: data.type,
        hash: data.hash,
        amount: data.amount,
        currency: data.currency,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        status: data.status,
        metadata: data.metadata as object | undefined,
      },
    });
  },

  async listByDeal(dealId: string): Promise<Array<{
    id: string;
    type: string;
    hash: string | null;
    amount: string | null;
    status: string;
    createdAt: Date;
  }>> {
    return prisma.transactionHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        hash: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async listByWallet(walletAddress: string): Promise<Array<{
    id: string;
    type: string;
    hash: string | null;
    amount: string | null;
    status: string;
    createdAt: Date;
  }>> {
    const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) return [];

    return prisma.transactionHistory.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        hash: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });
  },
};

export const credentialStorage = {
  async create(walletAddress: string, issuerAddress: string, credentialType: string): Promise<void> {
    const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) return;

    await prisma.credential.create({
      data: {
        walletId: wallet.id,
        issuerAddress,
        credentialType,
      },
    });
  },

  async accept(walletAddress: string, issuerAddress: string, credentialType: string): Promise<void> {
    const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) return;

    await prisma.credential.updateMany({
      where: {
        walletId: wallet.id,
        issuerAddress,
        credentialType,
      },
      data: { accepted: true },
    });
  },

  async listByWallet(walletAddress: string): Promise<Array<{
    issuerAddress: string;
    credentialType: string;
    accepted: boolean;
    createdAt: Date;
  }>> {
    const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) return [];

    return prisma.credential.findMany({
      where: { walletId: wallet.id },
      select: {
        issuerAddress: true,
        credentialType: true,
        accepted: true,
        createdAt: true,
      },
    });
  },
};

export async function clearAllData(): Promise<void> {
  await prisma.transactionHistory.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dealCounter.deleteMany();
}

export default {
  deals: dealStorage,
  participants: participantStorage,
  wallets: walletStorage,
  transactions: transactionStorage,
  credentials: credentialStorage,
  clearAllData,
  generateDealReference,
};
