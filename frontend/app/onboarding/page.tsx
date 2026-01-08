"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Building2, ShoppingBag, Plus, Wallet, CheckCircle2, ArrowRight, Shield } from "lucide-react";

type WalletRole = "buyer" | "supplier" | "facilitator";

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { user, wallets, selectedWallet, selectWallet, createWallet, fetchWallets, isLoading } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [walletRole, setWalletRole] = useState<WalletRole>("buyer");
  const [creating, setCreating] = useState(false);

  const [walletsLoaded, setWalletsLoaded] = useState(false);

  useEffect(() => {
    fetchWallets().then(() => setWalletsLoaded(true));
  }, [fetchWallets]);

  useEffect(() => {
    if (walletsLoaded && selectedWallet) {
      const walletBelongsToUser = wallets.some(w => w.address === selectedWallet.address);
      if (walletBelongsToUser) {
        router.push("/dashboard");
      } else {
        selectWallet(null);
      }
    }
  }, [walletsLoaded, selectedWallet, wallets, router, selectWallet]);

  const handleSelectWallet = (wallet: typeof wallets[0]) => {
    selectWallet(wallet);
    router.push("/dashboard");
  };

  const handleCreateWallet = async () => {
    if (!walletName) return;

    setCreating(true);
    const wallet = await createWallet(walletName, walletRole);
    setCreating(false);

    if (wallet) {
      selectWallet(wallet);
      router.push("/dashboard");
    }
  };

  const roleIcons = {
    buyer: <ShoppingBag className="h-5 w-5" />,
    supplier: <Building2 className="h-5 w-5" />,
    facilitator: <Shield className="h-5 w-5" />,
  };

  const roleColors = {
    buyer: "text-[#fd6c0a]",
    supplier: "text-green-600",
    facilitator: "text-blue-600",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">
            {wallets.length > 0
              ? "Select a wallet to continue or create a new one"
              : "Create your first wallet to get started"}
          </p>
        </div>

        {wallets.length > 0 && !showCreateForm && (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold">Your Wallets</h2>
            {wallets.map((wallet) => (
              <Card
                key={wallet.address}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#fd6c0a]"
                onClick={() => handleSelectWallet(wallet)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-gray-100 ${roleColors[wallet.role as WalletRole]}`}>
                      {roleIcons[wallet.role as WalletRole]}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {wallet.name}
                        <Badge variant="outline" className="text-xs capitalize">
                          {wallet.role}
                        </Badge>
                        {wallet.verified && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </p>
                      {wallet.did && (
                        <p className="text-xs text-muted-foreground">
                          DID: {wallet.did.slice(0, 30)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {(showCreateForm || wallets.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Create New Wallet
              </CardTitle>
              <CardDescription>
                Your wallet will be created on XRPL testnet with a DID and trust line for RLUSD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="walletName">Wallet Name</Label>
                <Input
                  id="walletName"
                  placeholder="My Company Ltd"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Role</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["buyer", "supplier", "facilitator"] as WalletRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setWalletRole(role)}
                      disabled={creating}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        walletRole === role
                          ? "border-[#fd6c0a] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`mb-2 ${roleColors[role]}`}>
                        {roleIcons[role]}
                      </div>
                      <p className="text-sm font-medium capitalize">{role}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {wallets.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={handleCreateWallet}
                  disabled={creating || !walletName}
                >
                  {creating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Wallet...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Wallet
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {wallets.length > 0 && !showCreateForm && (
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Another Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
