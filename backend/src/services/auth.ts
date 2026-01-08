import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db.js';
import { config } from '../config/index.js';

const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export async function createUser(email: string, password: string, name: string): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function authenticateUser(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id, user.email);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    token,
  };
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as AuthTokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  try {
    const payload = verifyToken(token);

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      createdAt: session.user.createdAt,
    };
  } catch {
    return null;
  }
}

export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function updateUser(userId: string, updates: { name?: string; password?: string }): Promise<AuthUser | null> {
  const data: { name?: string; passwordHash?: string } = {};

  if (updates.name) {
    data.name = updates.name;
  }

  if (updates.password) {
    data.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function getUserWallets(userId: string): Promise<Array<{
  address: string;
  role: string;
  name: string;
  did: string | null;
  verified: boolean;
}>> {
  return prisma.wallet.findMany({
    where: { userId },
    select: {
      address: true,
      role: true,
      name: true,
      did: true,
      verified: true,
    },
  });
}

export async function linkWalletToUser(userId: string, walletAddress: string): Promise<void> {
  await prisma.wallet.update({
    where: { address: walletAddress },
    data: { userId },
  });
}
