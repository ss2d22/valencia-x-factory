"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";
import { useDealsStore } from "@/lib/stores/deals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { ArrowLeft, Plus, Trash2, Building2, DollarSign, CheckCircle2 } from "lucide-react";

interface WalletOption {
  id: string;
  address: string;
  name: string;
  role: string;
  did?: string;
  verified: boolean;
}

export default function NewDealPage() {
  return (
    <ProtectedRoute requireWallet>
      <NewDealContent />
    </ProtectedRoute>
  );
}

function NewDealContent() {
  const router = useRouter();
  const { selectedWallet } = useAuthStore();
  const { createDeal, fundDeal, isLoading } = useDealsStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [facilitatorAddress, setFacilitatorAddress] = useState("");
  const [milestones, setMilestones] = useState([
    { name: "Initial Payment", percentage: 30 },
    { name: "Delivery", percentage: 70 },
  ]);
  const [suppliers, setSuppliers] = useState<WalletOption[]>([]);
  const [facilitators, setFacilitators] = useState<WalletOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"create" | "fund">("create");
  const [createdDealId, setCreatedDealId] = useState<string | null>(null);

  useEffect(() => {
    const loadParticipants = async () => {
      const [suppliersRes, facilitatorsRes] = await Promise.all([
        api.wallets.listSuppliers(),
        api.wallets.listFacilitators(),
      ]);

      if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(
          suppliersRes.data.map((w) => ({
            id: w.id,
            address: w.xrplAddress,
            name: w.name,
            role: w.role,
            did: w.did,
            verified: w.verified,
          }))
        );
      }

      if (facilitatorsRes.success && facilitatorsRes.data) {
        setFacilitators(
          facilitatorsRes.data.map((w) => ({
            id: w.id,
            address: w.xrplAddress,
            name: w.name,
            role: w.role,
            did: w.did,
            verified: w.verified,
          }))
        );
      }
    };
    loadParticipants();
  }, []);

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const isValidPercentage = totalPercentage === 100;

  const addMilestone = () => {
    setMilestones([...milestones, { name: "", percentage: 0 }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: "name" | "percentage", value: string | number) => {
    const updated = [...milestones];
    if (field === "percentage") {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = value as string;
    }
    setMilestones(updated);
  };

  const handleCreate = async () => {
    if (!selectedWallet || !name || !amount || !supplierAddress || !isValidPercentage) return;

    setCreating(true);
    const deal = await createDeal({
      name,
      description: description || undefined,
      amount: parseFloat(amount),
      buyerAddress: selectedWallet.address,
      supplierAddress,
      facilitatorAddress: facilitatorAddress || undefined,
      milestones: milestones.filter((m) => m.name && m.percentage > 0),
    });

    if (deal) {
      setCreatedDealId(deal.id);
      setStep("fund");
    }
    setCreating(false);
  };

  const handleFund = async () => {
    if (!createdDealId) return;

    setCreating(true);
    const success = await fundDeal(createdDealId);
    setCreating(false);

    if (success) {
      router.push(`/deal/${createdDealId}`);
    }
  };

  const handleSkipFunding = () => {
    if (createdDealId) {
      router.push(`/deal/${createdDealId}`);
    }
  };

  if (selectedWallet?.role !== "buyer") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Buyer Access Only</h2>
            <p className="text-muted-foreground mb-4">Only buyers can create new deals. Switch to a buyer wallet to continue.</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "fund" && createdDealId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Deal Created Successfully
            </CardTitle>
            <CardDescription>Your deal has been created. Would you like to fund it now?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#eaeaea] rounded-lg">
              <p className="text-sm font-medium">Deal: {name}</p>
              <p className="text-2xl font-bold mt-1">${parseFloat(amount).toLocaleString()} RLUSD</p>
              <p className="text-xs text-muted-foreground mt-1">
                {milestones.length} milestones configured
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={handleFund} disabled={creating} className="w-full">
                {creating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Funding Escrow...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fund Deal Now
                  </div>
                )}
              </Button>
              <Button variant="outline" onClick={handleSkipFunding} className="w-full" disabled={creating}>
                Skip - Fund Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Deal</CardTitle>
            <CardDescription>Set up a new trade finance deal with milestone-based escrow payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Deal Name</Label>
              <Input
                id="name"
                placeholder="Equipment Purchase Order #123"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the deal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Deal Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">Will be settled in RLUSD stablecoin</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              {suppliers.length > 0 ? (
                <select
                  id="supplier"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  disabled={creating}
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.address} value={s.address}>
                      {s.name} ({s.address.slice(0, 8)}...{s.address.slice(-4)})
                      {s.verified ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  No suppliers available. Ask a supplier to create a wallet first.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilitator">Facilitator (Optional)</Label>
              {facilitators.length > 0 ? (
                <select
                  id="facilitator"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={facilitatorAddress}
                  onChange={(e) => setFacilitatorAddress(e.target.value)}
                  disabled={creating}
                >
                  <option value="">No facilitator</option>
                  {facilitators.map((f) => (
                    <option key={f.address} value={f.address}>
                      {f.name} ({f.address.slice(0, 8)}...{f.address.slice(-4)})
                      {f.verified ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">No facilitators available</p>
              )}
              <p className="text-xs text-muted-foreground">Facilitator can verify milestones before release</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Milestones</Label>
                <Badge variant={isValidPercentage ? "success" : "destructive"}>
                  Total: {totalPercentage}%
                </Badge>
              </div>

              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Milestone name"
                      value={milestone.name}
                      onChange={(e) => updateMilestone(index, "name", e.target.value)}
                      disabled={creating}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="%"
                      value={milestone.percentage || ""}
                      onChange={(e) => updateMilestone(index, "percentage", e.target.value)}
                      disabled={creating}
                    />
                  </div>
                  {milestones.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMilestone(index)}
                      disabled={creating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addMilestone} disabled={creating} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>

              {!isValidPercentage && (
                <p className="text-sm text-destructive">Milestone percentages must total 100%</p>
              )}
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !name || !amount || !supplierAddress || !isValidPercentage}
              className="w-full"
              size="lg"
            >
              {creating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Deal...
                </div>
              ) : (
                "Create Deal"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
