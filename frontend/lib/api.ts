const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return data;
}

export const api = {
  auth: {
    register: (email: string, password: string, name: string) =>
      request<{ id: string; email: string; name: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      request<{
        user: { id: string; email: string; name: string };
        token: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    logout: () =>
      request<void>("/api/auth/logout", { method: "POST" }),

    me: () =>
      request<{
        id: string;
        email: string;
        name: string;
        wallets: Array<{
          address: string;
          role: string;
          name: string;
          did: string | null;
          verified: boolean;
        }>;
      }>("/api/auth/me"),

    wallets: () =>
      request<
        Array<{
          address: string;
          role: string;
          name: string;
          did: string | null;
          verified: boolean;
        }>
      >("/api/auth/wallets"),

    linkWallet: (address: string) =>
      request<void>(`/api/auth/wallets/${address}/link`, { method: "POST" }),
  },

  wallets: {
    create: (name: string, role: "buyer" | "supplier" | "facilitator") =>
      request<{
        address: string;
        publicKey: string;
        balance: number;
        did: string;
      }>("/api/wallets", {
        method: "POST",
        body: JSON.stringify({ name, role }),
      }),

    list: () =>
      request<
        Array<{
          id: string;
          role: string;
          name: string;
          xrplAddress: string;
          did?: string;
          verified: boolean;
        }>
      >("/api/wallets"),

    get: (address: string) =>
      request<{
        participant: {
          id: string;
          role: string;
          name: string;
          xrplAddress: string;
          did?: string;
          verified: boolean;
        };
        balance: { xrp: number; rlusd: number };
        did: { did: string } | null;
        trustLines: Array<{ currency: string; balance: string }>;
      }>(`/api/wallets/${address}`),

    history: (address: string) =>
      request<
        Array<{
          id: string;
          type: string;
          hash: string | null;
          amount: string | null;
          status: string;
          createdAt: string;
        }>
      >(`/api/wallets/${address}/history`),

    deals: (address: string) =>
      request<Array<Deal>>(`/api/wallets/${address}/deals`),

    verify: (address: string, options?: { issuerAddress?: string; demo?: boolean }) =>
      request<{ verified: boolean }>(`/api/wallets/${address}/verify`, {
        method: "POST",
        body: JSON.stringify(options || {}),
      }),
  },

  deals: {
    create: (data: {
      name: string;
      description?: string;
      amount: number;
      buyerAddress: string;
      supplierAddress: string;
      facilitatorAddress?: string;
      milestones: Array<{ name: string; percentage: number }>;
    }) =>
      request<Deal>("/api/deals", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: () => request<Deal[]>("/api/deals"),

    get: (id: string) => request<Deal>(`/api/deals/${id}`),

    getByReference: (ref: string) => request<Deal>(`/api/deals/reference/${ref}`),

    history: (id: string) =>
      request<
        Array<{
          id: string;
          type: string;
          hash: string | null;
          amount: string | null;
          currency: string | null;
          status: string;
          createdAt: string;
        }>
      >(`/api/deals/${id}/history`),

    fund: (id: string) =>
      request<Deal>(`/api/deals/${id}/fund`, { method: "POST" }),

    verifyMilestone: (id: string, milestoneIndex: number, verifierAddress: string) =>
      request<Deal>(`/api/deals/${id}/milestones/${milestoneIndex}/verify`, {
        method: "POST",
        body: JSON.stringify({ verifierAddress }),
      }),

    releaseMilestone: (id: string, milestoneIndex: number) =>
      request<Deal>(`/api/deals/${id}/milestones/${milestoneIndex}/release`, {
        method: "POST",
      }),

    dispute: (id: string, reason: string) =>
      request<Deal>(`/api/deals/${id}/dispute`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },

  health: {
    check: () =>
      request<{
        status: string;
        version: string;
        xrpl: { connected: boolean; network: string };
      }>("/api/health"),
  },
};

export interface Deal {
  id: string;
  dealReference: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  settlementAsset: string;
  status: string;
  dispute: boolean;
  disputeReason?: string;
  escrowBalance: number;
  supplierBalance: number;
  credentialProvider: string;
  complianceStatus: string;
  createdAt: string;
  updatedAt: string;
  participants: {
    buyer: Participant;
    supplier: Participant;
    facilitator?: Participant;
  };
  milestones: Milestone[];
  transactionHashes: string[];
}

export interface Participant {
  id: string;
  role: string;
  name: string;
  xrplAddress: string;
  did?: string | null;
  verified: boolean;
}

export type ParticipantWithAddress = Participant & { address: string };

export interface Milestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  status: string;
  verifierDid?: string | null;
  verificationStatus: string;
  verifiedAt?: string | null;
  releasedAt?: string | null;
  escrow?: {
    sequence: number;
    owner: string;
    destination: string;
    amount: string;
    condition: string;
    fulfillment: string;
    cancelAfter: number;
    status: string;
    transactionHash?: string;
  } | null;
}
