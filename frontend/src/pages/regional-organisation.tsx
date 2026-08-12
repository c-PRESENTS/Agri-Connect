import { ArrowLeft, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { OperatorRegionalMarketplace } from "@/components/operator-regional-marketplace";
import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";

export default function RegionalOrganisationPage() {
  const [, navigate] = useLocation();
  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-6xl px-4 py-7 sm:px-6"><Button variant="ghost" className="mb-3" onClick={() => navigate("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" />Back to dashboard</Button><div className="rounded-2xl bg-gradient-to-r from-emerald-700 to-green-600 p-6 text-white"><Building2 className="h-8 w-8" /><h1 className="mt-3 text-2xl font-black">Regional organisation workspace</h1><p className="mt-1 max-w-2xl text-sm text-emerald-50">Review seller requests only inside the fulfilment regions delegated to your approved organisation.</p></div><OperatorRegionalMarketplace organisationMode /></main></div>;
}
