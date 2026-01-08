"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";
import { useDealsStore } from "@/lib/stores/deals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  ArrowLeft,
  DollarSign,
  Wallet,
  TrendingUp,
  FileText,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Zap,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function TransactionSummaryPage() {
  return (
    <ProtectedRoute requireWallet>
      <TransactionContent />
    </ProtectedRoute>
  );
}

function TransactionContent() {
  const params = useParams();
  const dealId = params.id as string;
  const { selectedWallet } = useAuthStore();
  const { currentDeal, dealHistory, fetchDeal, fetchDealHistory } = useDealsStore();

  useEffect(() => {
    if (dealId) {
      fetchDeal(dealId);
      fetchDealHistory(dealId);
    }
  }, [dealId, fetchDeal, fetchDealHistory]);

  if (!currentDeal || !selectedWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#fd6c0a]" />
      </div>
    );
  }

  const totalReleased = currentDeal.supplierBalance;
  const remainingEscrow = currentDeal.escrowBalance;
  const isSettled = remainingEscrow === 0 && !currentDeal.dispute && currentDeal.status === "completed";
  const isDisputed = currentDeal.dispute;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const buyer = currentDeal.participants.buyer;
  const supplier = currentDeal.participants.supplier;
  const facilitator = currentDeal.participants.facilitator;

  const participants = [
    buyer && {
      role: "Buyer",
      name: buyer.name,
      did: buyer.did || "Pending DID",
      verified: buyer.verified,
      issuer: "X-Factory Platform",
      address: buyer.xrplAddress,
    },
    supplier && {
      role: "Supplier",
      name: supplier.name,
      did: supplier.did || "Pending DID",
      verified: supplier.verified,
      issuer: "X-Factory Platform",
      address: supplier.xrplAddress,
    },
    facilitator && {
      role: "Facilitator",
      name: facilitator.name,
      did: facilitator.did || "Pending DID",
      verified: facilitator.verified,
      issuer: "X-Factory Platform",
      address: facilitator.xrplAddress,
    },
  ].filter(Boolean) as Array<{ role: string; name: string; did: string; verified: boolean; issuer: string; address: string }>;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DEAL_CREATED":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "DEAL_FUNDED":
        return <Wallet className="h-4 w-4 text-green-600" />;
      case "MILESTONE_VERIFIED":
        return <CheckCircle2 className="h-4 w-4 text-purple-600" />;
      case "MILESTONE_RELEASED":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "DISPUTE_RAISED":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Summary</h1>
              <p className="text-muted-foreground">Complete settlement details and blockchain transaction information</p>
            </div>
            <Badge
              variant={isDisputed ? "destructive" : isSettled ? "success" : "default"}
              className="text-lg px-4 py-2"
            >
              {isDisputed ? "Disputed" : isSettled ? "Settled" : "In Progress"}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Deal Amount</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">${currentDeal.amount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">{currentDeal.settlementAsset}</p>
                  <p className="text-xs text-muted-foreground mt-1">Zero FX volatility</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#fd6c0a]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Released</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">${totalReleased.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentDeal.milestones.filter((m) => m.status === "Released").length} milestones
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Remaining Escrow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-yellow-600">${remainingEscrow.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentDeal.milestones.filter((m) => m.status === "Pending").length} pending
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Settlement Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {isDisputed ? "Disputed" : isSettled ? "Fully Settled" : "Partial Settlement"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isDisputed ? "Awaiting resolution" : isSettled ? "All funds released" : "Milestone-based release"}
                  </p>
                </div>
                {isDisputed ? (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                ) : isSettled ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <FileText className="h-8 w-8 text-[#fd6c0a]" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-[#eaeaea] border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#fd6c0a]" />
              Identity Verification & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Verified Participants (W3C DID)</p>
              <div className="space-y-2">
                {participants.map((participant, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {participant.role}: {participant.name}
                          </span>
                          {participant.verified && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{participant.did}</p>
                        <p className="text-xs text-muted-foreground">Issuer: {participant.issuer}</p>
                      </div>
                      <Badge variant={participant.verified ? "success" : "pending"}>
                        {participant.verified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Compliance Status</p>
              <p className="text-sm text-muted-foreground">{currentDeal.complianceStatus}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Credential Provider: {currentDeal.credentialProvider}
              </p>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  SWIFT Bypassed
                </Badge>
                <Badge variant="default" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  No Letter of Credit Required
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Blockchain transaction information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Deal Reference</label>
              <div className="flex items-center gap-2">
                <Card className="flex-1">
                  <CardContent className="py-3 px-4">
                    <code className="text-sm font-mono break-all">{currentDeal.dealReference}</code>
                  </CardContent>
                </Card>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(currentDeal.dealReference)}
                  title="Copy reference"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Deal Name</label>
                <Card>
                  <CardContent className="py-3 px-4">
                    <p className="font-medium">{currentDeal.name}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Settlement Asset</label>
                <Card>
                  <CardContent className="py-3 px-4">
                    <p className="font-medium">{currentDeal.settlementAsset} (USD-denominated stable asset)</p>
                    <p className="text-xs text-muted-foreground mt-1">Zero FX volatility - settled in stablecoin</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {participants.slice(0, 2).map((participant, idx) => (
                <div key={idx}>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    {participant.role} (Verified DID)
                  </label>
                  <Card>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{participant.name}</p>
                        {participant.verified && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{participant.did}</p>
                      <p className="text-xs text-muted-foreground">
                        Address: {participant.address.slice(0, 10)}...{participant.address.slice(-6)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Milestone Breakdown</label>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {currentDeal.milestones.map((milestone) => (
                      <div key={milestone.id} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{milestone.name}</p>
                          <p className="text-sm text-muted-foreground">{milestone.percentage}% of total deal</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">
                              ${milestone.amount.toLocaleString()} {currentDeal.settlementAsset}
                            </p>
                            {milestone.verificationStatus === "Verified" && (
                              <p className="text-xs text-green-600 mt-1">Auto-released via verified proof</p>
                            )}
                            <Badge
                              variant={
                                milestone.status === "Released"
                                  ? "success"
                                  : milestone.status === "Disputed"
                                  ? "destructive"
                                  : "pending"
                              }
                              className="mt-1"
                            >
                              {milestone.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Settlement Summary</label>
              <Card className="bg-[#eaeaea] border-[#eaeaea]">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Initial Escrow</span>
                      <span className="font-semibold">${currentDeal.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Released to Supplier</span>
                      <span className="font-semibold text-green-600">${totalReleased.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Remaining in Escrow</span>
                      <span className="font-semibold text-yellow-600">${remainingEscrow.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Status</span>
                        <Badge variant={isDisputed ? "destructive" : isSettled ? "success" : "pending"}>
                          {isDisputed ? "Disputed" : isSettled ? "Fully Settled" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {dealHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete audit trail of all transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dealHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <p className="font-medium text-sm">{tx.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {tx.amount && (
                        <p className="font-semibold text-sm">
                          ${parseFloat(tx.amount).toLocaleString()} {tx.currency}
                        </p>
                      )}
                      <Badge variant={tx.status === "completed" ? "success" : "pending"} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Link href={`/deal/${currentDeal.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Deal Details
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
