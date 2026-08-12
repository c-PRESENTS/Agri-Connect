import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  MapPin,
  Network,
  PackageCheck,
  Route,
  ShieldCheck,
  Snowflake,
  Truck,
  Warehouse,
} from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const opportunities = [
  { icon: Truck, title: "Shared transport capacity", description: "Connect available vehicles with farm, seller, and buyer delivery demand." },
  { icon: Snowflake, title: "Cold-chain partnerships", description: "Coordinate temperature-controlled storage and transport for perishable produce." },
  { icon: Warehouse, title: "Regional fulfilment hubs", description: "Collaborate with warehouses, collection centres, and rural consolidation points." },
  { icon: Route, title: "Smarter route planning", description: "Pool nearby deliveries to reduce empty journeys, delays, and operating costs." },
];

const launchSteps = [
  "Register logistics partners and operating regions",
  "Verify businesses, vehicles, insurance, and service capability",
  "Pilot collaborative routes with selected AgriConnect sellers",
  "Launch booking, tracking, settlement, and performance tools",
];

type InterestForm = {
  contactName: string;
  email: string;
  phone: string;
  organisationName: string;
  collaborationType: string;
  region: string;
  details: string;
};

const emptyForm: InterestForm = {
  contactName: "",
  email: "",
  phone: "",
  organisationName: "",
  collaborationType: "",
  region: "",
  details: "",
};

export default function LogisticsCollaborationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<InterestForm>(emptyForm);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      contactName: current.contactName || user.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: current.email || user.email || "",
      phone: current.phone || user.phone || "",
      region: current.region || user.location || "",
    }));
  }, [user]);

  const registerInterest = useMutation({
    mutationFn: async (input: InterestForm) => {
      const response = await apiRequest("POST", "/api/logistics-collaboration/interests", input);
      return response.json() as Promise<{ id: string; status: string; message: string }>;
    },
    onSuccess: () => {
      setRegistered(true);
      toast({
        title: "Interest registered",
        description: "We will contact you when logistics collaboration pilots open in your region.",
      });
    },
    onError: () => {
      toast({
        title: "Registration failed",
        description: "Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  const updateField = (field: keyof InterestForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registerInterest.mutate(form);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-background">
      <TopNavigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-5 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-amber-300/10 blur-2xl" />
          <div className="relative max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <ComingSoonBadge />
              <Badge variant="outline" className="border-white/30 bg-white/10 text-white">Partner network</Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Logistics Collaboration</h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-emerald-50 sm:text-lg">
              A shared workspace for carriers, cold-chain providers, warehouses, farmers, and sellers to coordinate reliable agricultural deliveries.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-emerald-50">
              <span className="inline-flex items-center gap-2"><Network className="h-4 w-4 text-amber-300" />Shared delivery network</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" />Verified partners</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-300" />Regional collaboration</span>
            </div>
            <Button asChild className="mt-8 bg-amber-400 font-black text-emerald-950 hover:bg-amber-300">
              <a href="#early-access">Join early access <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          </div>
        </section>

        <section className="py-10 sm:py-14" aria-labelledby="collaboration-opportunities">
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-wider text-emerald-700">Planned capabilities</p>
            <h2 id="collaboration-opportunities" className="mt-2 text-2xl font-black sm:text-3xl">Work together across the delivery chain</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {opportunities.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-emerald-900/10 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 pb-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <Card className="border-emerald-900/10 shadow-sm">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3"><PackageCheck className="h-6 w-6 text-emerald-700" /><h2 className="text-xl font-black">How the rollout will work</h2></div>
              <ol className="mt-6 space-y-5">
                {launchSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">{index + 1}</span>
                    <span className="pt-1 text-sm font-semibold leading-5">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <strong>Current status:</strong> partner discovery and regional demand validation. Bookings and live operations are not yet available.
              </div>
            </CardContent>
          </Card>

          <Card id="early-access" className="scroll-mt-24 border-emerald-200 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              {registered ? (
                <div className="flex min-h-[430px] flex-col items-center justify-center text-center" role="status">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
                  <h2 className="mt-5 text-2xl font-black">You’re on the collaboration list</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your details are saved. The AgriConnect team can contact you when a suitable pilot opens in your region.</p>
                  <Button variant="outline" className="mt-6" onClick={() => setRegistered(false)}>Update my details</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><Handshake className="h-6 w-6" /></div>
                    <div><h2 className="text-2xl font-black">Register collaboration interest</h2><p className="mt-1 text-sm text-muted-foreground">Tell us what capacity or service your organisation can contribute.</p></div>
                  </div>
                  <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
                    <div className="space-y-2"><Label htmlFor="collaboration-name">Contact name</Label><Input id="collaboration-name" value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} required minLength={2} maxLength={120} /></div>
                    <div className="space-y-2"><Label htmlFor="collaboration-email">Work email</Label><Input id="collaboration-email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required maxLength={254} /></div>
                    <div className="space-y-2"><Label htmlFor="collaboration-organisation">Organisation</Label><Input id="collaboration-organisation" value={form.organisationName} onChange={(event) => updateField("organisationName", event.target.value)} required minLength={2} maxLength={160} /></div>
                    <div className="space-y-2"><Label htmlFor="collaboration-phone">Phone (optional)</Label><Input id="collaboration-phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} maxLength={40} /></div>
                    <div className="space-y-2"><Label htmlFor="collaboration-type">Collaboration type</Label><Select value={form.collaborationType} onValueChange={(value) => updateField("collaborationType", value)} required><SelectTrigger id="collaboration-type"><SelectValue placeholder="Select a service" /></SelectTrigger><SelectContent><SelectItem value="carrier">Transport carrier</SelectItem><SelectItem value="cold_chain">Cold-chain provider</SelectItem><SelectItem value="warehouse">Warehouse or hub</SelectItem><SelectItem value="last_mile">Last-mile delivery</SelectItem><SelectItem value="technology">Logistics technology</SelectItem><SelectItem value="other">Other collaboration</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="collaboration-region">Operating region</Label><Input id="collaboration-region" value={form.region} onChange={(event) => updateField("region", event.target.value)} required minLength={2} maxLength={160} placeholder="City, state, or country" /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="collaboration-details">Capacity and collaboration details (optional)</Label><Textarea id="collaboration-details" value={form.details} onChange={(event) => updateField("details", event.target.value)} maxLength={1000} placeholder="Vehicles, temperature control, storage capacity, coverage, or technology…" /></div>
                    <div className="sm:col-span-2"><Button type="submit" disabled={registerInterest.isPending || !form.collaborationType} className="w-full bg-emerald-700 font-black hover:bg-emerald-800" data-testid="button-register-logistics-collaboration">{registerInterest.isPending ? "Registering…" : "Join early access"}</Button><p className="mt-3 text-center text-xs text-muted-foreground">Registration records interest only and does not create a service agreement.</p></div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
