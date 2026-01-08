"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../api";

interface Wallet {
  address: string;
  role: string;
  name: string;
  did: string | null;
  verified: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  wallets: Wallet[];
  selectedWallet: Wallet | null;
  isLoading: boolean;
  error: string | null;

  register: (email: string, password: string, name: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchWallets: () => Promise<void>;
  selectWallet: (wallet: Wallet | null) => void;
  createWallet: (name: string, role: "buyer" | "supplier" | "facilitator") => Promise<Wallet | null>;
  linkWallet: (address: string) => Promise<boolean>;
  verifyWallet: (address: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      wallets: [],
      selectedWallet: null,
      isLoading: false,
      error: null,

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.register(email, password, name);
          if (response.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({ error: response.error || "Registration failed", isLoading: false });
            return false;
          }
        } catch (err) {
          set({ error: "Network error", isLoading: false });
          return false;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.login(email, password);
          if (response.success && response.data) {
            const { user, token } = response.data;
            if (typeof window !== "undefined") {
              localStorage.setItem("token", token);
            }
            set({ user, token, isLoading: false });
            await get().fetchWallets();
            return true;
          } else {
            set({ error: response.error || "Login failed", isLoading: false });
            return false;
          }
        } catch (err) {
          set({ error: "Network error", isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.auth.logout();
        } catch (err) {
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        set({ user: null, token: null, wallets: [], selectedWallet: null });
      },

      fetchProfile: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await api.auth.me();
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.id,
                email: response.data.email,
                name: response.data.name,
              },
              wallets: response.data.wallets || [],
              isLoading: false,
            });
          } else {
            set({ user: null, token: null, isLoading: false });
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
            }
          }
        } catch (err) {
          set({ isLoading: false });
        }
      },

      fetchWallets: async () => {
        try {
          const response = await api.auth.wallets();
          if (response.success && response.data) {
            set({ wallets: response.data });
          }
        } catch (err) {
        }
      },

      selectWallet: (wallet) => {
        set({ selectedWallet: wallet });
      },

      createWallet: async (name, role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.wallets.create(name, role);
          if (response.success && response.data) {
            const newWallet: Wallet = {
              address: response.data.address,
              role,
              name,
              did: response.data.did,
              verified: false,
            };
            await get().linkWallet(response.data.address);
            await get().fetchWallets();
            set({ isLoading: false });
            return newWallet;
          } else {
            set({ error: response.error || "Failed to create wallet", isLoading: false });
            return null;
          }
        } catch (err) {
          set({ error: "Network error", isLoading: false });
          return null;
        }
      },

      linkWallet: async (address) => {
        try {
          const response = await api.auth.linkWallet(address);
          if (response.success) {
            await get().fetchWallets();
            return true;
          }
          return false;
        } catch (err) {
          return false;
        }
      },

      verifyWallet: async (address) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.wallets.verify(address, address);
          if (response.success) {
            await get().fetchWallets();
            const { selectedWallet, wallets } = get();
            if (selectedWallet?.address === address) {
              const updated = wallets.find(w => w.address === address);
              if (updated) {
                set({ selectedWallet: updated });
              }
            }
            set({ isLoading: false });
            return true;
          }
          set({ error: "Verification failed", isLoading: false });
          return false;
        } catch (err) {
          set({ error: "Network error", isLoading: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedWallet: state.selectedWallet,
      }),
    }
  )
);
