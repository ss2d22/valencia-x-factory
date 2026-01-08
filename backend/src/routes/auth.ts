import { Router, Response } from 'express';
import {
  createUser,
  authenticateUser,
  invalidateSession,
  getUser,
  updateUser,
  getUserWallets,
  linkWalletToUser,
} from '../services/auth.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      } as ApiResponse<null>);
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      } as ApiResponse<null>);
    }

    const user = await createUser(email, password, name);

    return res.status(201).json({
      success: true,
      data: user,
      message: 'User registered successfully',
    } as ApiResponse<typeof user>);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    } as ApiResponse<null>);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      } as ApiResponse<null>);
    }

    const { user, token } = await authenticateUser(email, password);

    return res.json({
      success: true,
      data: { user, token },
      message: 'Login successful',
    } as ApiResponse<{ user: typeof user; token: string }>);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    } as ApiResponse<null>);
  }
});

router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      await invalidateSession(token);
    }

    return res.json({
      success: true,
      message: 'Logged out successfully',
    } as ApiResponse<null>);
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    } as ApiResponse<null>);
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse<null>);
    }

    const wallets = await getUserWallets(user.id);

    return res.json({
      success: true,
      data: { ...user, wallets },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user',
    } as ApiResponse<null>);
  }
});

router.put('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, password } = req.body;

    if (password && password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      } as ApiResponse<null>);
    }

    const user = await updateUser(req.user!.id, { name, password });

    return res.json({
      success: true,
      data: user,
      message: 'Profile updated',
    } as ApiResponse<typeof user>);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    } as ApiResponse<null>);
  }
});

router.get('/wallets', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallets = await getUserWallets(req.user!.id);

    return res.json({
      success: true,
      data: wallets,
    } as ApiResponse<typeof wallets>);
  } catch (error) {
    console.error('Get wallets error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get wallets',
    } as ApiResponse<null>);
  }
});

router.post('/wallets/:address/link', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    await linkWalletToUser(req.user!.id, address);

    return res.json({
      success: true,
      message: 'Wallet linked to account',
    } as ApiResponse<null>);
  } catch (error) {
    console.error('Link wallet error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to link wallet',
    } as ApiResponse<null>);
  }
});

export default router;
