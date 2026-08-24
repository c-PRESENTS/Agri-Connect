import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmailPage() {
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const verify = useMutation({ mutationFn: async () => (await apiRequest("POST", "/api/auth/email-verification/confirm", { token })).json() });
  useEffect(() => { if (token && verify.isIdle) verify.mutate(); }, [token, verify.isIdle]);
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" data-testid="verify-email-page"><Card className="w-full max-w-md"><CardContent className="space-y-4 p-8 text-center">{verify.isPending ? <p>Verifying your email…</p> : verify.isSuccess ? <><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="text-2xl font-black">Email verified</h1><Button asChild><Link href="/login">Continue to sign in</Link></Button></> : <><h1 className="text-2xl font-black">Email could not be verified</h1><p className="text-sm text-muted-foreground">The link is invalid, expired, or already used.</p><Button asChild variant="outline"><Link href="/login">Return to sign in</Link></Button></>}</CardContent></Card></main>;
}
