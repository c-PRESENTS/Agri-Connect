import { AlertTriangle, LogIn, ShieldX } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginPath } from "@/lib/auth-utils";

export function AdminForbiddenState() {
  const [, setLocation] = useLocation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" data-testid="admin-forbidden-state">
      <Card className="w-full max-w-lg border-amber-200 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldX className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your AgriConnect account is signed in, but its active organisation membership does not grant access to this page.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setLocation("/dashboard")}>Return to dashboard</Button>
            <Button variant="outline" onClick={() => setLocation("/settings")}>Account settings</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function AdminSessionExpiredState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" data-testid="admin-session-expired-state">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <LogIn className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Your session has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in again to restore your protected Organisation Portal session.
          </p>
          <Button className="mt-6" onClick={() => { window.location.href = getLoginPath(window.location.pathname); }}>
            Sign in again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export function AdminAccessErrorState({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4" data-testid="admin-access-error-state">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-black">Unable to verify admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">The rest of AgriConnect is still available. Retry this access check locally.</p>
          <Button className="mt-6" variant="outline" onClick={retry}>Retry access check</Button>
        </CardContent>
      </Card>
    </main>
  );
}
