import { ArrowLeft, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { ProfileCompletionChecklist } from "@/components/profile-completion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileCompletionPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
    <Link href="/my-profile"><Button variant="ghost" className="mb-4 gap-2" data-testid="button-back-my-profile"><ArrowLeft className="h-4 w-4" />Back to My Profile</Button></Link>
    <Card><CardContent className="p-5 sm:p-6"><ProfileCompletionChecklist profile={user} />
      <div className="mt-5 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">These are optional profile improvements. They do not affect sign-in or access to the marketplace.</div>
      <Button className="mt-5" onClick={() => setLocation("/settings")} data-testid="button-review-profile-settings"><Settings className="mr-2 h-4 w-4" />Review profile settings</Button>
    </CardContent></Card>
  </main></div>;
}
