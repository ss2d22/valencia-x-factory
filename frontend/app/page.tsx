"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Globe, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Cross-Border B2B Payments
              <span className="block text-4xl mt-2 text-[#fd6c0a]">Made Simple & Secure</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Trustless, instant, and verified cross-border payments for SME manufacturers. 
              Eliminate letters of credit and bypass SWIFT delays while remaining fully compliant.
            </p>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-[#fd6c0a] mb-4" />
                <CardTitle>Decentralized Identity</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  W3C-compliant DIDs issued by regulated credential providers. Cryptographic verification without bilateral trust.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-[#fd6c0a] mb-4" />
                <CardTitle>RLUSD Settlement</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  USD-denominated stable asset ensuring price stability and eliminating FX volatility during transactions.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Globe className="h-12 w-12 text-[#fd6c0a] mb-4" />
                <CardTitle>Programmable Escrow</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Milestone-based escrow contracts that release automatically upon verified completion of agreed stages.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Table */}
          <Card className="mb-16">
            <CardHeader>
              <CardTitle className="text-2xl text-center">SWIFT vs Our Platform</CardTitle>
              <CardDescription className="text-center">
                See how we compare to traditional payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4 font-semibold">Feature</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-600">SWIFT</th>
                      <th className="text-center py-4 px-4 font-semibold text-[#fd6c0a]">Our Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-4 px-4">Transaction Speed</td>
                      <td className="text-center py-4 px-4 text-gray-600">3-5 business days</td>
                      <td className="text-center py-4 px-4 text-[#fd6c0a]">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Instant (SWIFT bypassed)
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 px-4">Letter of Credit</td>
                      <td className="text-center py-4 px-4 text-gray-600">Required</td>
                      <td className="text-center py-4 px-4 text-[#fd6c0a]">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Not required (trustless DID)
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 px-4">FX Volatility</td>
                      <td className="text-center py-4 px-4 text-gray-600">Exposed</td>
                      <td className="text-center py-4 px-4 text-[#fd6c0a]">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Zero (RLUSD stablecoin)
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 px-4">Identity Verification</td>
                      <td className="text-center py-4 px-4 text-gray-600">Manual KYC</td>
                      <td className="text-center py-4 px-4 text-[#fd6c0a]">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          W3C DID (cryptographic)
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4">Compliance</td>
                      <td className="text-center py-4 px-4 text-gray-600">Per jurisdiction</td>
                      <td className="text-center py-4 px-4 text-[#fd6c0a]">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Fully compliant (regulated providers)
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Demo CTA */}
          <div className="text-center">
            <Card className="bg-black text-white border-black">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Ready to see it in action?</CardTitle>
                <CardDescription className="text-[#eaeaea]">
                  Explore our interactive demo showcasing a $100,000 B2B transaction between Singapore and Algeria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login">
                  <Button variant="secondary" size="lg" className="text-lg px-8">
                    Start Demo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
