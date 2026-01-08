"use client";

import { create } from "zustand";
import { api, Deal } from "../api";

interface DealHistory {
  id: string;
  type: string;
  hash: string | null;
  amount: string | null;
  currency: string | null;
  status: string;
  createdAt: string;
}

interface DealsState {
  deals: Deal[];
  currentDeal: Deal | null;
  dealHistory: DealHistory[];
  isLoading: boolean;
  error: string | null;

  fetchDeals: () => Promise<void>;
  fetchDeal: (id: string) => Promise<void>;
  fetchDealByReference: (ref: string) => Promise<void>;
  fetchDealHistory: (id: string) => Promise<void>;
  fetchDealsByWallet: (address: string) => Promise<void>;
  createDeal: (data: {
    name: string;
    description?: string;
    amount: number;
    buyerAddress: string;
    supplierAddress: string;
    facilitatorAddress?: string;
    milestones: Array<{ name: string; percentage: number }>;
  }) => Promise<Deal | null>;
  fundDeal: (id: string) => Promise<boolean>;
  verifyMilestone: (id: string, milestoneIndex: number, verifierAddress: string) => Promise<boolean>;
  releaseMilestone: (id: string, milestoneIndex: number) => Promise<boolean>;
  raisDispute: (id: string, reason: string) => Promise<boolean>;
  setCurrentDeal: (deal: Deal | null) => void;
  clearError: () => void;
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  currentDeal: null,
  dealHistory: [],
  isLoading: false,
  error: null,

  fetchDeals: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.list();
      if (response.success && response.data) {
        set({ deals: response.data, isLoading: false });
      } else {
        set({ error: response.error || "Failed to fetch deals", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
    }
  },

  fetchDeal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.get(id);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
      } else {
        set({ error: response.error || "Failed to fetch deal", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
    }
  },

  fetchDealByReference: async (ref) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.getByReference(ref);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
      } else {
        set({ error: response.error || "Failed to fetch deal", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
    }
  },

  fetchDealHistory: async (id) => {
    try {
      const response = await api.deals.history(id);
      if (response.success && response.data) {
        set({ dealHistory: response.data });
      }
    } catch (err) {
    }
  },

  fetchDealsByWallet: async (address) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.wallets.deals(address);
      if (response.success && response.data) {
        set({ deals: response.data, isLoading: false });
      } else {
        set({ error: response.error || "Failed to fetch deals", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
    }
  },

  createDeal: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.create(data);
      if (response.success && response.data) {
        const newDeal = response.data;
        set((state) => ({
          deals: [newDeal, ...state.deals],
          currentDeal: newDeal,
          isLoading: false,
        }));
        return newDeal;
      } else {
        set({ error: response.error || "Failed to create deal", isLoading: false });
        return null;
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
      return null;
    }
  },

  fundDeal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.fund(id);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
        await get().fetchDeals();
        return true;
      } else {
        set({ error: response.error || "Failed to fund deal", isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
      return false;
    }
  },

  verifyMilestone: async (id, milestoneIndex, verifierAddress) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.verifyMilestone(id, milestoneIndex, verifierAddress);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
        return true;
      } else {
        set({ error: response.error || "Failed to verify milestone", isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
      return false;
    }
  },

  releaseMilestone: async (id, milestoneIndex) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.releaseMilestone(id, milestoneIndex);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
        await get().fetchDeals();
        return true;
      } else {
        set({ error: response.error || "Failed to release milestone", isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
      return false;
    }
  },

  raisDispute: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.deals.dispute(id, reason);
      if (response.success && response.data) {
        set({ currentDeal: response.data, isLoading: false });
        await get().fetchDeals();
        return true;
      } else {
        set({ error: response.error || "Failed to raise dispute", isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: "Network error", isLoading: false });
      return false;
    }
  },

  setCurrentDeal: (deal) => set({ currentDeal: deal }),

  clearError: () => set({ error: null }),
}));
