"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWallet?: boolean;
}

export function ProtectedRoute({ children, requireWallet = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, token, selectedWallet, wallets, isLoading, fetchProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        router.push("/login");
        return;
      }

      if (!user) {
        await fetchProfile();
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [token, user, fetchProfile, router]);

  useEffect(() => {
    if (!isChecking && !isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      if (requireWallet && !selectedWallet && wallets.length === 0) {
        router.push("/onboarding");
        return;
      }
    }
  }, [isChecking, isLoading, user, selectedWallet, wallets, requireWallet, router]);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#fd6c0a] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
