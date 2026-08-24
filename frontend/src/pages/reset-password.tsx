import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const action = useMutation({ mutationFn: async () => (await apiRequest("POST", token ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset/request", token ? { token, password } : { email })).json() });
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" data-testid="reset-password-page"><Card className="w-full max-w-md"><CardHeader><CardTitle>{token ? "Choose a new password" : "Reset your password"}</CardTitle></CardHeader><CardContent className="space-y-4">{action.isSuccess ? <><p className="font-bold">{token ? "Your password has been reset and all prior sessions were signed out." : "If an active account exists, a single-use reset link has been sent."}</p><Button asChild><Link href="/login">Return to sign in</Link></Button></> : <>{token ? <div><Label>New password</Label><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><p className="mt-1 text-xs text-muted-foreground">Use at least 12 characters with uppercase, lowercase, and a number.</p></div> : <div><Label>Email</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>}{action.isError && <p className="text-sm text-destructive">{action.error.message}</p>}<Button className="w-full" disabled={action.isPending || (token ? password.length < 12 : !email)} onClick={() => action.mutate()}>{token ? "Reset password" : "Send reset link"}</Button></>}</CardContent></Card></main>;
}
