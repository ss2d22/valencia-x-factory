export type UserRole = 'buyer' | 'supplier' | 'facilitator';

export type MilestoneStatus = 'Pending' | 'Released' | 'Disputed';

export type VerificationStatus = 'Pending' | 'Verified' | 'Disputed';

export type DealStatus = 'draft' | 'funded' | 'active' | 'completed' | 'cancelled' | 'disputed';

export interface XRPLWallet {
  address: string;
  publicKey: string;
  seed?: string;
}

export interface XRPLEscrow {
  sequence: number;
  owner: string;
  destination: string;
  amount: string;
  condition: string;
  fulfillment?: string;
  cancelAfter: number;
  finishAfter?: number;
  status: 'created' | 'finished' | 'cancelled';
  transactionHash: string;
}

export type EscrowInfo = XRPLEscrow;

export interface XRPLDID {
  did: string;
  address: string;
  uri?: string;
  documentHash?: string;
}

export interface XRPLCredential {
  issuer: string;
  subject: string;
  credentialType: string;
  expiration?: number;
  accepted: boolean;
  transactionHash: string;
}

export interface MilestoneVerification {
  verifier: string;
  credential: string;
  status: VerificationStatus;
  verifiedAt?: string;
  transactionHash?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  verification?: MilestoneVerification;
  escrow?: XRPLEscrow;
  releasedAt?: string;
}

export interface Participant {
  id: string;
  role: UserRole;
  name: string;
  xrplAddress: string;
  did?: string;
  issuer?: string;
  verified: boolean;
  credentials?: XRPLCredential[];
}

export interface Deal {
  id: string;
  dealReference: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  settlementAsset: string;
  status: DealStatus;
  participants: {
    buyer: Participant;
    supplier: Participant;
    facilitator?: Participant;
  };
  milestones: Milestone[];
  escrowBalance: number;
  supplierBalance: number;
  dispute: boolean;
  disputeReason?: string;
  credentialProvider?: string;
  complianceStatus?: string;
  transactionHashes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealRequest {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  buyerAddress: string;
  supplierAddress: string;
  facilitatorAddress?: string;
  milestones: {
    name: string;
    description?: string;
    percentage: number;
  }[];
}

export interface CreateWalletResponse {
  address: string;
  publicKey: string;
  balance: number;
  did?: string;
}

export interface FundDealRequest {
  dealId: string;
}

export interface ReleaseMilestoneRequest {
  dealId: string;
  milestoneIndex: number;
  fulfillment?: string;
}

export interface VerifyMilestoneRequest {
  dealId: string;
  milestoneIndex: number;
  verifierAddress: string;
}

export interface DisputeDealRequest {
  dealId: string;
  reason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type EventType =
  | 'deal:created'
  | 'deal:funded'
  | 'milestone:verified'
  | 'milestone:released'
  | 'deal:disputed'
  | 'deal:completed';

export interface DealEvent {
  type: EventType;
  dealId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
