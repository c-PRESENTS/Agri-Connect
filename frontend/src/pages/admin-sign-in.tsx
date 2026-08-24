import { useEffect, useState } from "react";
import { KeyRound, Leaf, ShieldCheck } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getSafeReturnPath } from "@/lib/auth-utils";

export default function AdminSignInPage() {
  const { login, verifyMfa, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const returnPath = getSafeReturnPath(new URLSearchParams(useSearch()).get("returnTo"), "/admin");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [mfa, setMfa] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (!isLoading && isAuthenticated) setLocation(returnPath); }, [isAuthenticated, isLoading, returnPath, setLocation]);
  const submit = async () => {
    setError("");
    try {
      if (mfa) { await verifyMfa.mutateAsync(code); setLocation(returnPath); }
      else { const result = await login.mutateAsync(credentials); if (result.requiresMfa) setMfa(true); else setLocation(returnPath); }
    } catch { setError(mfa ? "Invalid or expired authenticator/recovery code." : "Email, password, or account status is invalid."); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-lime-900 p-4" data-testid="admin-sign-in-page"><Card className="w-full max-w-md border-white/20 shadow-2xl"><CardHeader><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Leaf className="h-6 w-6" /></div><CardTitle className="text-2xl">Organisation Portal sign in</CardTitle><p className="text-sm text-muted-foreground">Use your invited AgriConnect employee account. There is no separate administrator identity.</p></CardHeader><CardContent className="space-y-4">{mfa ? <><div className="rounded-xl border bg-muted/40 p-3 text-sm"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-600" />Password accepted. Complete two-factor authentication.</div><div><Label>Authenticator or recovery code</Label><Input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /></div></> : <><div><Label>Email</Label><Input type="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} autoComplete="email" /></div><div><Label>Password</Label><Input type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" /></div></>}{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={login.isPending || verifyMfa.isPending || (mfa ? code.trim().length < 6 : !credentials.email || credentials.password.length < 8)} onClick={submit}>{mfa ? <><KeyRound className="mr-2 h-4 w-4" />Verify and sign in</> : "Sign in"}</Button><div className="flex justify-between text-sm"><Link href="/reset-password" className="text-primary hover:underline">Forgot password?</Link><Link href="/login" className="text-muted-foreground hover:underline">Use phone or Google</Link></div></CardContent></Card></main>;
}
