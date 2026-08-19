import { Link } from "wouter";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-primary" />
          <CardTitle>Student Help Point</CardTitle>
          <p className="text-sm text-muted-foreground">
            MVP demo access is enabled for the investor presentation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/farmers-help/student">Open Student Help Point</Link>
          </Button>
          <div className="flex gap-2 rounded-md border p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Google verification is temporarily disabled for the MVP demo and
              can be enforced again after the investor review.
            </span>
          </div>
          <a className="block text-center text-sm text-primary underline" href="/login">
            Use marketplace login instead
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
