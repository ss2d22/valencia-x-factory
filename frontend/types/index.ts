export type UserRole = "buyer" | "supplier" | "facilitator" | null;

export type MilestoneStatus = "Pending" | "Released" | "Disputed";

export type VerificationStatus = "Pending" | "Verified" | "Disputed";

export type DealStatus = "draft" | "funded" | "active" | "completed" | "cancelled" | "disputed";

export interface MilestoneVerification {
  verifier: string;
  credential: string;
  status: VerificationStatus;
}

export interface Milestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  verification?: MilestoneVerification;
  escrow?: {
    sequence: number;
    owner: string;
    destination: string;
    amount: string;
    condition: string;
    fulfillment: string;
    cancelAfter: number;
    status: string;
    transactionHash: string;
  };
}

export interface Participant {
  id: string;
  role: "buyer" | "supplier" | "facilitator";
  name: string;
  xrplAddress: string;
  did?: string;
  verified: boolean;
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

export interface Wallet {
  address: string;
  role: string;
  name: string;
  did: string | null;
  verified: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DealData {
  dealName: string;
  amount: number;
  currency: string;
  settlementAsset: string;
  supplier: string;
  escrowBalance: number;
  milestones: Array<{
    name: string;
    percentage: number;
    status: MilestoneStatus;
    verification?: MilestoneVerification;
  }>;
  dispute: boolean;
  supplierBalance: number;
  transactionHash: string;
  participants: Array<{
    role: "Buyer" | "Supplier" | "Facilitator";
    name: string;
    did: string;
    issuer: string;
    verified: boolean;
  }>;
  credentialProvider: string;
  complianceStatus: string;
  fxProtectionNote: string;
}
