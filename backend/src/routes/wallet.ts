import { Router, Response } from 'express';
import { createParticipantWallet, verifyParticipant, getWalletHistory, listDealsByWallet } from '../services/deal.js';
import { getAccountInfo } from '../services/xrpl/client.js';
import { getDID } from '../services/xrpl/did.js';
import { getTrustLines, getRLUSDBalance } from '../services/xrpl/trustline.js';
import { getAccountCredentials } from '../services/xrpl/credentials.js';
import { participantStorage, walletStorage, credentialStorage } from '../services/storage.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import type { ApiResponse, CreateWalletResponse } from '../types/index.js';

const router = Router();

async function checkWalletOwnership(userId: string, address: string): Promise<boolean> {
  const wallet = await participantStorage.getByAddressWithUser(address);
  return wallet?.userId === userId;
}

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, role } = req.body;
    const userId = req.user!.id;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name and role are required',
      } as ApiResponse<null>);
    }

    if (!['buyer', 'supplier', 'facilitator'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be buyer, supplier, or facilitator',
      } as ApiResponse<null>);
    }

    const participant = await createParticipantWallet(name, role, userId);

    const accountInfo = await getAccountInfo(participant.xrplAddress);
    const safeWallet = await walletStorage.getSafe(participant.xrplAddress);

    const response: ApiResponse<CreateWalletResponse> = {
      success: true,
      data: {
        address: participant.xrplAddress,
        publicKey: safeWallet?.publicKey || '',
        balance: Number(accountInfo.balance) / 1_000_000,
        did: participant.did,
      },
      message: `Created ${role} wallet`,
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating wallet:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create wallet',
    } as ApiResponse<null>);
  }
});

router.get('/:address', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user!.id;

    const hasAccess = await checkWalletOwnership(userId, address);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this wallet',
      } as ApiResponse<null>);
    }

    const participant = await participantStorage.getByAddress(address);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse<null>);
    }

    const accountInfo = await getAccountInfo(address);
    const did = await getDID(address);
    const trustLines = await getTrustLines(address);
    const rlusdBalance = await getRLUSDBalance(address);

    return res.json({
      success: true,
      data: {
        participant,
        balance: {
          xrp: Number(accountInfo.balance) / 1_000_000,
          rlusd: rlusdBalance,
        },
        did: did,
        trustLines,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting wallet:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet',
    } as ApiResponse<null>);
  }
});

router.get('/:address/credentials', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user!.id;

    const hasAccess = await checkWalletOwnership(userId, address);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this wallet',
      } as ApiResponse<null>);
    }

    const onChainCredentials = await getAccountCredentials(address);
    const storedCredentials = await credentialStorage.listByWallet(address);

    return res.json({
      success: true,
      data: {
        onChain: onChainCredentials,
        stored: storedCredentials,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting credentials:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credentials',
    } as ApiResponse<null>);
  }
});

router.get('/:address/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user!.id;

    const hasAccess = await checkWalletOwnership(userId, address);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this wallet history',
      } as ApiResponse<null>);
    }

    const history = await getWalletHistory(address);

    return res.json({
      success: true,
      data: history,
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting wallet history:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet history',
    } as ApiResponse<null>);
  }
});

router.get('/:address/deals', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const userId = req.user!.id;

    const hasAccess = await checkWalletOwnership(userId, address);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this wallet',
      } as ApiResponse<null>);
    }

    const deals = await listDealsByWallet(address);

    return res.json({
      success: true,
      data: deals,
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error getting wallet deals:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet deals',
    } as ApiResponse<null>);
  }
});

router.post('/:address/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const { issuerAddress, demo } = req.body;
    const userId = req.user!.id;

    const hasAccess = await checkWalletOwnership(userId, address);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You can only verify your own wallet',
      } as ApiResponse<null>);
    }

    const participant = await participantStorage.getByAddress(address);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse<null>);
    }

    if (participant.verified) {
      return res.json({
        success: true,
        data: participant,
        message: 'Wallet already verified',
      } as ApiResponse<unknown>);
    }

    if (demo) {
      await participantStorage.updateByAddress(address, {
        verified: true,
        issuer: 'X-Factory Platform (Demo)',
      });

      const updatedParticipant = await participantStorage.getByAddress(address);

      console.log(`[Wallet] Demo KYC verification completed for: ${address}`);

      return res.json({
        success: true,
        data: updatedParticipant,
        message: 'Demo KYC verification completed',
      } as ApiResponse<unknown>);
    }

    if (!issuerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Issuer address is required for on-chain verification',
      } as ApiResponse<null>);
    }

    await verifyParticipant(issuerAddress, address);

    const updatedParticipant = await participantStorage.getByAddress(address);

    return res.json({
      success: true,
      data: updatedParticipant,
      message: 'Participant verified',
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error verifying participant:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify participant',
    } as ApiResponse<null>);
  }
});

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const participants = await participantStorage.listByUser(userId);

    return res.json({
      success: true,
      data: participants,
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error listing wallets:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list wallets',
    } as ApiResponse<null>);
  }
});

export default router;
