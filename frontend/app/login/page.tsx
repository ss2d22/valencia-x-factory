"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth";
import { ArrowLeft, LogIn, UserPlus, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, error, isLoading, clearError } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (user) {
      router.push("/onboarding");
    }
  }, [user, router]);

  useEffect(() => {
    clearError();
    setLocalError("");
  }, [isRegister, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email || !password) {
      setLocalError("Email and password are required");
      return;
    }

    if (isRegister && !name) {
      setLocalError("Name is required");
      return;
    }

    if (isRegister) {
      const success = await register(email, password, name);
      if (success) {
        const loginSuccess = await login(email, password);
        if (loginSuccess) {
          router.push("/onboarding");
        }
      }
    } else {
      const success = await login(email, password);
      if (success) {
        router.push("/onboarding");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaeaea] via-white to-[#eaeaea] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">
              {isRegister ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Sign up to start trading on X-Factory"
                : "Sign in to access your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {(error || localError) && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {error || localError}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isRegister ? "Creating Account..." : "Signing In..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    {isRegister ? "Create Account" : "Sign In"}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {isRegister ? (
                <p>
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsRegister(false)}
                    className="text-[#fd6c0a] hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setIsRegister(true)}
                    className="text-[#fd6c0a] hover:underline font-medium"
                  >
                    Create Account
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
