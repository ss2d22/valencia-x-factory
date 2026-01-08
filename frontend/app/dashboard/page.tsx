"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/stores/auth";
import { useDealsStore } from "@/lib/stores/deals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { KYCVerification } from "@/components/KYCVerification";
import {
  ShoppingBag,
  Building2,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Shield,
  CheckCircle2,
  FileCheck,
  Zap,
  Plus,
  LogOut,
  Wallet,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Deal } from "@/lib/api";

export default function DashboardPage() {
  return (
    <ProtectedRoute requireWallet>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, selectedWallet, logout, selectWallet } = useAuthStore();
  const { deals, currentDeal, fetchDealsByWallet, releaseMilestone, raisDispute, setCurrentDeal, isLoading } = useDealsStore();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    if (selectedWallet) {
      fetchDealsByWallet(selectedWallet.address);
    }
  }, [selectedWallet, fetchDealsByWallet]);

  useEffect(() => {
    if (deals.length > 0 && !selectedDeal) {
      setSelectedDeal(deals[0]);
      setCurrentDeal(deals[0]);
    }
  }, [deals, selectedDeal, setCurrentDeal]);

  const handleLogout = async () => {
    await logout();
  };

  const handleSwitchWallet = () => {
    selectWallet(null);
  };

  if (!selectedWallet) {
    return null;
  }

  const isBuyer = selectedWallet.role === "buyer";
  const isSupplier = selectedWallet.role === "supplier";

  const getRoleBadge = () => {
    if (isBuyer) return { icon: <ShoppingBag className="h-4 w-4" />, label: "Buyer", color: "default" as const };
    if (isSupplier) return { icon: <Building2 className="h-4 w-4" />, label: "Supplier", color: "success" as const };
    return { icon: <Shield className="h-4 w-4" />, label: "Facilitator", color: "secondary" as const };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isBuyer ? "Buyer" : isSupplier ? "Supplier" : "Facilitator"} Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {selectedWallet.verified ? (
                <>
                  <Badge variant="success" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    DID Verified
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    SWIFT Bypassed
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    <FileCheck className="h-3 w-3 mr-1" />
                    Fully Compliant
                  </Badge>
                </>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  KYC Required
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{selectedWallet.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {selectedWallet.address.slice(0, 6)}...{selectedWallet.address.slice(-4)}
              </p>
            </div>
            <Badge variant={roleBadge.color} className="flex items-center gap-1">
              {roleBadge.icon}
              {roleBadge.label}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSwitchWallet}>
              <Wallet className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedWallet.verified ? (
          <Card className="mb-4 bg-[#eaeaea] border-black">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Identity verified via W3C DID</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Issuer: X-Factory Platform
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  KYC Complete | AML Screened | Compliant
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-4">
            <KYCVerification />
          </div>
        )}

        {deals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="max-w-md mx-auto">
                <ExternalLink className="h-12 w-12 text-[#fd6c0a] mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Deals Yet</h2>
                <p className="text-muted-foreground mb-6">
                  {isBuyer
                    ? "Create your first deal to start trading with suppliers"
                    : "You'll see deals here once a buyer includes you in a trade"}
                </p>
                {isBuyer && (
                  <Link href="/deals/new">
                    <Button size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Deal
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Deals ({deals.length})</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDealsByWallet(selectedWallet.address)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                {isBuyer && (
                  <Link href="/deals/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Deal
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  walletAddress={selectedWallet.address}
                  isBuyer={isBuyer}
                  onReleaseMilestone={releaseMilestone}
                  onRaiseDispute={raisDispute}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  walletAddress: string;
  isBuyer: boolean;
  onReleaseMilestone: (dealId: string, index: number) => Promise<boolean>;
  onRaiseDispute: (dealId: string, reason: string) => Promise<boolean>;
}

function DealCard({ deal, walletAddress, isBuyer, onReleaseMilestone, onRaiseDispute }: DealCardProps) {
  const [releasing, setReleasing] = useState<number | null>(null);
  const [disputing, setDisputing] = useState(false);

  const releasedPercentage = deal.milestones.reduce(
    (acc, m) => acc + (m.status === "Released" ? m.percentage : 0),
    0
  );

  const nextMilestoneIndex = deal.milestones.findIndex((m) => m.status === "Pending");
  const canReleaseNext =
    nextMilestoneIndex !== -1 &&
    (nextMilestoneIndex === 0 || deal.milestones[nextMilestoneIndex - 1].status === "Released");

  const handleRelease = async (index: number) => {
    setReleasing(index);
    await onReleaseMilestone(deal.id, index);
    setReleasing(null);
  };

  const handleDispute = async () => {
    setDisputing(true);
    await onRaiseDispute(deal.id, "Dispute raised by buyer");
    setDisputing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{deal.name}</CardTitle>
            <CardDescription className="mt-1">
              {deal.dealReference} • Settled in {deal.settlementAsset} - Zero FX volatility
            </CardDescription>
          </div>
          <Badge
            variant={deal.dispute ? "destructive" : deal.status === "completed" ? "success" : "default"}
            className="text-sm px-3 py-1"
          >
            {deal.dispute ? "Disputed" : deal.status === "completed" ? "Completed" : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold text-[#fd6c0a]">{releasedPercentage}%</span>
          </div>
          <Progress value={releasedPercentage} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-lg font-bold">
                    ${deal.amount.toLocaleString()} {deal.settlementAsset}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-[#fd6c0a]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {isBuyer ? "Escrow Balance" : "Received"}
                  </p>
                  <p className="text-lg font-bold">
                    ${isBuyer ? deal.escrowBalance.toLocaleString() : deal.supplierBalance.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Milestones</p>
                  <p className="text-lg font-bold">
                    {deal.milestones.filter((m) => m.status === "Released").length} / {deal.milestones.length}
                  </p>
                </div>
                <ExternalLink className="h-6 w-6 text-[#fd6c0a]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>View Milestones</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {deal.milestones.map((milestone, index) => (
              <Card key={milestone.id} className="bg-gray-50">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#eaeaea] flex items-center justify-center text-sm font-semibold text-[#fd6c0a]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{milestone.name}</p>
                        {milestone.verificationStatus === "Verified" && (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {milestone.percentage}% • ${milestone.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        milestone.status === "Released"
                          ? "success"
                          : milestone.status === "Disputed"
                          ? "destructive"
                          : "pending"
                      }
                      className="text-xs"
                    >
                      {milestone.status}
                    </Badge>
                    {isBuyer && milestone.status === "Pending" && index === nextMilestoneIndex && canReleaseNext && !deal.dispute && (
                      <Button
                        size="sm"
                        onClick={() => handleRelease(index)}
                        disabled={releasing !== null}
                      >
                        {releasing === index ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          "Release"
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-3 pt-2">
          <Link href={`/deal/${deal.id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <Link href={`/transaction/${deal.id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              Transaction Summary
            </Button>
          </Link>
          {isBuyer && !deal.dispute && deal.status !== "completed" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDispute}
              disabled={disputing}
            >
              {disputing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
