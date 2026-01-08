import { Router, Response } from 'express';
import {
  createDeal,
  fundDeal,
  verifyMilestone,
  releaseMilestone,
  disputeDeal,
  getDeal,
  listDeals,
  getEscrowStatus,
  getDealHistory,
} from '../services/deal.js';
import { dealStorage, participantStorage } from '../services/storage.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import type { ApiResponse, Deal, CreateDealRequest } from '../types/index.js';

const router = Router();

async function checkDealAccess(userId: string, deal: Deal): Promise<boolean> {
  const buyerWallet = await participantStorage.getByAddressWithUser(deal.participants.buyer.xrplAddress);
  const supplierWallet = await participantStorage.getByAddressWithUser(deal.participants.supplier.xrplAddress);
  const facilitatorWallet = deal.participants.facilitator
    ? await participantStorage.getByAddressWithUser(deal.participants.facilitator.xrplAddress)
    : null;

  return (
    buyerWallet?.userId === userId ||
    supplierWallet?.userId === userId ||
    (facilitatorWallet !== null && facilitatorWallet?.userId === userId)
  );
}

async function getUserWalletAddresses(userId: string): Promise<string[]> {
  const wallets = await participantStorage.listByUser(userId);
  return wallets.map(w => w.xrplAddress);
}

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request: CreateDealRequest = req.body;
    const userId = req.user!.id;

    if (!request.name || !request.amount || !request.buyerAddress || !request.supplierAddress) {
      return res.status(400).json({
        success: false,
        error: 'Name, amount, buyerAddress, and supplierAddress are required',
      } as ApiResponse<null>);
    }

    if (!request.milestones || request.milestones.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one milestone is required',
      } as ApiResponse<null>);
    }

    const userWallets = await getUserWalletAddresses(userId);
    if (!userWallets.includes(request.buyerAddress)) {
      return res.status(403).json({
        success: false,
        error: 'You can only create deals as buyer using your own wallet',
      } as ApiResponse<null>);
    }

    const deal = await createDeal(request);

    return res.status(201).json({
      success: true,
      data: deal,
      message: `Deal created: ${deal.dealReference}`,
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error creating deal:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deal',
    } as ApiResponse<null>);
  }
});

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userWallets = await getUserWalletAddresses(userId);
    const allDeals = await listDeals();

    const userDeals = allDeals.filter(deal =>
      userWallets.includes(deal.participants.buyer.xrplAddress) ||
      userWallets.includes(deal.participants.supplier.xrplAddress) ||
      (deal.participants.facilitator && userWallets.includes(deal.participants.facilitator.xrplAddress))
    );

    return res.json({
      success: true,
      data: userDeals,
    } as ApiResponse<Deal[]>);
  } catch (error) {
    console.error('Error listing deals:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list deals',
    } as ApiResponse<null>);
  }
});

router.get('/reference/:reference', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reference } = req.params;
    const userId = req.user!.id;
    const deal = await dealStorage.getByReference(reference);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const hasAccess = await checkDealAccess(userId, deal);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this deal',
      } as ApiResponse<null>);
    }

    return res.json({
      success: true,
      data: deal,
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error getting deal:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deal',
    } as ApiResponse<null>);
  }
});

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const hasAccess = await checkDealAccess(userId, deal);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this deal',
      } as ApiResponse<null>);
    }

    return res.json({
      success: true,
      data: deal,
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error getting deal:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deal',
    } as ApiResponse<null>);
  }
});

router.get('/:id/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const hasAccess = await checkDealAccess(userId, deal);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this deal history',
      } as ApiResponse<null>);
    }

    const history = await getDealHistory(id);

    return res.json({
      success: true,
      data: history,
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting deal history:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deal history',
    } as ApiResponse<null>);
  }
});

router.post('/:id/fund', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const buyerWallet = await participantStorage.getByAddressWithUser(deal.participants.buyer.xrplAddress);
    if (buyerWallet?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can fund this deal',
      } as ApiResponse<null>);
    }

    const fundedDeal = await fundDeal(id);

    return res.json({
      success: true,
      data: fundedDeal,
      message: 'Deal funded successfully',
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error funding deal:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fund deal',
    } as ApiResponse<null>);
  }
});

router.post('/:id/milestones/:index/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, index } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    if (!deal.participants.facilitator) {
      return res.status(400).json({
        success: false,
        error: 'This deal has no facilitator',
      } as ApiResponse<null>);
    }

    const facilitatorWallet = await participantStorage.getByAddressWithUser(deal.participants.facilitator.xrplAddress);
    if (facilitatorWallet?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the facilitator can verify milestones',
      } as ApiResponse<null>);
    }

    const verifiedDeal = await verifyMilestone(id, parseInt(index, 10), deal.participants.facilitator.xrplAddress);

    return res.json({
      success: true,
      data: verifiedDeal,
      message: `Milestone ${index} verified`,
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error verifying milestone:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify milestone',
    } as ApiResponse<null>);
  }
});

router.post('/:id/milestones/:index/release', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, index } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const buyerWallet = await participantStorage.getByAddressWithUser(deal.participants.buyer.xrplAddress);
    if (buyerWallet?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can release milestones',
      } as ApiResponse<null>);
    }

    const releasedDeal = await releaseMilestone(id, parseInt(index, 10));

    return res.json({
      success: true,
      data: releasedDeal,
      message: `Milestone ${index} released`,
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error releasing milestone:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to release milestone',
    } as ApiResponse<null>);
  }
});

router.post('/:id/dispute', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Dispute reason is required',
      } as ApiResponse<null>);
    }

    const deal = await getDeal(id);
    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const hasAccess = await checkDealAccess(userId, deal);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Only deal participants can raise disputes',
      } as ApiResponse<null>);
    }

    const disputedDeal = await disputeDeal(id, reason);

    return res.json({
      success: true,
      data: disputedDeal,
      message: 'Dispute raised',
    } as ApiResponse<Deal>);
  } catch (error) {
    console.error('Error disputing deal:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to dispute deal',
    } as ApiResponse<null>);
  }
});

router.get('/:id/escrows/:sequence', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, sequence } = req.params;
    const userId = req.user!.id;
    const deal = await getDeal(id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      } as ApiResponse<null>);
    }

    const hasAccess = await checkDealAccess(userId, deal);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this deal',
      } as ApiResponse<null>);
    }

    const escrow = await getEscrowStatus(
      deal.participants.buyer.xrplAddress,
      parseInt(sequence, 10)
    );

    return res.json({
      success: true,
      data: escrow,
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting escrow status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escrow status',
    } as ApiResponse<null>);
  }
});

export default router;
