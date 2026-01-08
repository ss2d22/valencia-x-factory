"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";
import {
  Upload,
  CheckCircle2,
  FileCheck,
  Shield,
  AlertCircle,
  RefreshCw,
  X,
  Camera,
} from "lucide-react";

interface KYCVerificationProps {
  onComplete?: () => void;
}

export function KYCVerification({ onComplete }: KYCVerificationProps) {
  const { selectedWallet, verifyWallet, isLoading } = useAuthStore();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "complete">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedWallet) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep("review");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setStep("review");
    }
  };

  const handleVerify = async () => {
    if (!selectedWallet) return;

    setVerifying(true);
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = await verifyWallet(selectedWallet.address);
    setVerifying(false);

    if (success) {
      setStep("complete");
      onComplete?.();
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setStep("upload");
  };

  if (selectedWallet.verified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">Identity Verified</p>
              <p className="text-sm text-green-600">
                Your wallet has been verified via W3C DID credential
              </p>
            </div>
            <Badge variant="success">KYC Complete</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "complete") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Verification Complete!</h3>
          <p className="text-green-600 mb-4">
            Your identity has been verified and a DID credential has been issued to your wallet.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="success">KYC Verified</Badge>
            <Badge variant="default">DID Issued</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#fd6c0a]" />
          Identity Verification (KYC)
        </CardTitle>
        <CardDescription>
          Upload a government-issued ID to verify your identity and receive a DID credential
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "upload" && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#fd6c0a] transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="font-medium mb-1">Upload ID Document</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop or click to upload
            </p>
            <div className="flex justify-center gap-2 text-xs text-muted-foreground">
              <span>Passport</span>
              <span>•</span>
              <span>Driver&apos;s License</span>
              <span>•</span>
              <span>National ID</span>
            </div>
          </div>
        )}

        {step === "review" && previewUrl && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="ID Preview"
                className="w-full h-48 object-contain"
              />
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#eaeaea] rounded-lg">
              <AlertCircle className="h-5 w-5 text-[#fd6c0a] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Demo Mode</p>
                <p className="text-muted-foreground">
                  This is a simulated KYC verification. In production, this would connect to a real identity verification service.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifying || isLoading}
                className="flex-1"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Verify Identity
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            By verifying, you agree to our terms of service. Your data is processed securely and a W3C DID credential will be issued to your XRPL wallet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
