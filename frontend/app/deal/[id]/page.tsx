"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/stores/auth";
import { useDealsStore } from "@/lib/stores/deals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Shield,
  FileCheck,
  Zap,
  RefreshCw,
} from "lucide-react";

export default function DealDetailsPage() {
  return (
    <ProtectedRoute requireWallet>
      <DealDetailsContent />
    </ProtectedRoute>
  );
}

function DealDetailsContent() {
  const params = useParams();
  const dealId = params.id as string;
  const { selectedWallet } = useAuthStore();
  const { currentDeal, fetchDeal, releaseMilestone, raisDispute, verifyMilestone, error, clearError } = useDealsStore();
  const [releasing, setReleasing] = useState<number | null>(null);
  const [verifying, setVerifying] = useState<number | null>(null);

  useEffect(() => {
    if (dealId) {
      fetchDeal(dealId);
    }
  }, [dealId, fetchDeal]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!currentDeal || !selectedWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#fd6c0a]" />
      </div>
    );
  }

  const buyer = currentDeal.participants.buyer;
  const supplier = currentDeal.participants.supplier;
  const facilitator = currentDeal.participants.facilitator;

  const isBuyer = selectedWallet.address === buyer?.xrplAddress;
  const isSupplier = selectedWallet.address === supplier?.xrplAddress;
  const isFacilitator = facilitator && selectedWallet.address === facilitator.xrplAddress;
  const userRole = isBuyer ? "buyer" : isSupplier ? "supplier" : isFacilitator ? "facilitator" : null;

  const releasedPercentage = currentDeal.milestones.reduce(
    (acc, m) => acc + (m.status === "Released" ? m.percentage : 0),
    0
  );

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "Released":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "Disputed":
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getMilestoneStatusColor = (status: string): "success" | "destructive" | "pending" => {
    switch (status) {
      case "Released":
        return "success";
      case "Disputed":
        return "destructive";
      default:
        return "pending";
    }
  };

  const nextMilestoneIndex = currentDeal.milestones.findIndex((m) => m.status === "Pending");
  const canReleaseNext =
    nextMilestoneIndex !== -1 &&
    (nextMilestoneIndex === 0 || currentDeal.milestones[nextMilestoneIndex - 1].status === "Released");

  const handleRelease = async (index: number) => {
    setReleasing(index);
    await releaseMilestone(currentDeal.id, index);
    setReleasing(null);
  };

  const handleVerify = async (index: number) => {
    setVerifying(index);
    const success = await verifyMilestone(currentDeal.id, index, selectedWallet.address);
    if (success) {
      await fetchDeal(dealId);
    }
    setVerifying(null);
  };

  const handleDispute = async () => {
    await raisDispute(currentDeal.id, "Dispute raised by buyer");
  };

  const participants = [
    buyer && {
      role: "Buyer",
      name: buyer.name,
      did: buyer.did || "Pending DID",
      verified: buyer.verified,
      issuer: "X-Factory Platform",
    },
    supplier && {
      role: "Supplier",
      name: supplier.name,
      did: supplier.did || "Pending DID",
      verified: supplier.verified,
      issuer: "X-Factory Platform",
    },
    facilitator && {
      role: "Facilitator",
      name: facilitator.name,
      did: facilitator.did || "Pending DID",
      verified: facilitator.verified,
      issuer: "X-Factory Platform",
    },
  ].filter(Boolean) as Array<{ role: string; name: string; did: string; verified: boolean; issuer: string }>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea]">
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentDeal.name}</h1>
              <p className="text-muted-foreground">Deal ID: {currentDeal.dealReference}</p>
            </div>
            <div className="flex items-center gap-2">
              {userRole && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Viewing as {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Badge>
              )}
              <Badge
                variant={currentDeal.dispute ? "destructive" : currentDeal.status === "completed" ? "success" : "default"}
                className="text-lg px-4 py-2"
              >
                {currentDeal.dispute ? "Disputed" : currentDeal.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
          </div>
        </div>

        <Card className="mb-4 bg-[#eaeaea] border-black">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#fd6c0a]" />
                  <span className="text-sm font-medium">W3C DID Verification</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {participants.map((p, idx) => (
                    <span key={idx}>
                      {p.role}: {p.verified ? "✓ Verified" : "Pending"}
                      {idx < participants.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{currentDeal.complianceStatus}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Deal Overview</CardTitle>
            <CardDescription>Transaction details and progress tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Deal Amount</p>
                <p className="text-3xl font-bold">
                  ${currentDeal.amount.toLocaleString()} {currentDeal.settlementAsset}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Zero FX volatility - settled in stablecoin</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Verified Parties (DID)</p>
                {participants.map((participant, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">
                        {participant.role}: {participant.name}
                      </p>
                      {participant.verified && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {participant.did.length > 40 ? participant.did.slice(0, 40) + "..." : participant.did}
                    </p>
                    <p className="text-xs text-muted-foreground ml-6">Issuer: {participant.issuer}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-semibold text-[#fd6c0a]">{releasedPercentage}%</span>
              </div>
              <Progress value={releasedPercentage} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone Timeline</CardTitle>
            <CardDescription>Track progress and release payments for each milestone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {currentDeal.milestones.map((milestone, index) => {
                const isReleased = milestone.status === "Released";
                const isDisputed = milestone.status === "Disputed";
                const isCurrentMilestone = index === nextMilestoneIndex && canReleaseNext;
                const verificationStatus = milestone.verification?.status || "Pending";
                const isVerified = verificationStatus === "Verified";

                return (
                  <div key={milestone.id} className="relative">
                    {index < currentDeal.milestones.length - 1 && (
                      <div
                        className={`absolute left-6 top-12 w-0.5 h-full ${isReleased ? "bg-green-500" : "bg-gray-300"}`}
                      />
                    )}

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 relative z-10">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isReleased ? "bg-green-100" : isDisputed ? "bg-red-100" : "bg-yellow-100"
                          }`}
                        >
                          {getMilestoneIcon(milestone.status)}
                        </div>
                      </div>

                      <div className="flex-1 pb-8">
                        <Card className={isCurrentMilestone && isBuyer ? "border-2 border-[#fd6c0a]" : ""}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-semibold">{milestone.name}</h3>
                                  <Badge variant={getMilestoneStatusColor(milestone.status)}>{milestone.status}</Badge>
                                  {isCurrentMilestone && isBuyer && <Badge variant="default">Next to Release</Badge>}
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Milestone Percentage</p>
                                    <p className="text-lg font-semibold">{milestone.percentage}%</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                                    <p className="text-lg font-semibold">
                                      ${milestone.amount.toLocaleString()} {currentDeal.settlementAsset}
                                    </p>
                                  </div>
                                </div>
                                {milestone.verification?.verifier && (
                                  <div className="mt-3 p-3 bg-[#eaeaea] rounded-lg border border-black">
                                    <div className="flex items-center gap-2 mb-1">
                                      <FileCheck className="h-4 w-4 text-[#fd6c0a]" />
                                      <span className="text-sm font-medium">Verification Status</span>
                                      <Badge variant={isVerified ? "success" : "pending"} className="ml-auto">
                                        {verificationStatus}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Verifier: {milestone.verification.verifier.slice(0, 50)}...
                                    </p>
                                  </div>
                                )}
                                {isReleased && isVerified && (
                                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 text-green-700">
                                      <Zap className="h-5 w-5" />
                                      <span className="font-medium">Auto-released via verified proof from Facilitator</span>
                                    </div>
                                  </div>
                                )}
                                {isDisputed && (
                                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div className="flex items-center gap-2 text-red-700">
                                      <AlertTriangle className="h-5 w-5" />
                                      <span className="font-medium">This milestone is under dispute</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {isFacilitator && milestone.status === "Pending" && !isVerified && !currentDeal.dispute && (
                                <Button
                                  onClick={() => handleVerify(index)}
                                  disabled={verifying !== null}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  {verifying === index ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FileCheck className="mr-2 h-4 w-4" />
                                      Verify Milestone
                                    </>
                                  )}
                                </Button>
                              )}
                              {isBuyer && isCurrentMilestone && !currentDeal.dispute && (
                                <Button
                                  onClick={() => handleRelease(index)}
                                  disabled={releasing !== null}
                                  className="flex-1"
                                >
                                  {releasing === index ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      Release Payment
                                      <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isBuyer && (
          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => {
                if (canReleaseNext && !currentDeal.dispute) {
                  handleRelease(nextMilestoneIndex);
                }
              }}
              disabled={!canReleaseNext || currentDeal.dispute || releasing !== null}
              className="flex-1"
              size="lg"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Release Next Milestone
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={handleDispute} variant="destructive" disabled={currentDeal.dispute} size="lg">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Raise Dispute
            </Button>
          </div>
        )}

        <div className="mt-8">
          <Link href={`/transaction/${currentDeal.id}`}>
            <Button variant="outline" className="w-full">
              View Transaction Summary
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
