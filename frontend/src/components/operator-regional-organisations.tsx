import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Region = { id: string; name: string; type: string };

export function OperatorRegionalOrganisations() {
  const { toast } = useToast();
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/marketplace/regions"] });
  const [form, setForm] = useState({ name: "", officialEmail: "", managerEmail: "", regionId: "" });
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/operator/regional-marketplace/organisations", form)).json(),
    onSuccess: () => {
      setForm({ name: "", officialEmail: "", managerEmail: "", regionId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/organisations"] });
      toast({ title: "Regional organisation activated" });
    },
    onError: () => toast({ title: "Unable to create regional organisation", variant: "destructive" }),
  });
  return <Card className="mt-5"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" />Verified regional organisations</CardTitle><p className="text-sm text-muted-foreground">Assign an existing AgriConnect user as a manager whose seller-approval authority is restricted to one approved region.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><Label>Organisation</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div><Label>Official email</Label><Input type="email" value={form.officialEmail} onChange={(event) => setForm({ ...form, officialEmail: event.target.value })} /></div><div><Label>Manager account email</Label><Input type="email" value={form.managerEmail} onChange={(event) => setForm({ ...form, managerEmail: event.target.value })} /></div><div><Label>Assigned region</Label><Select value={form.regionId} onValueChange={(regionId) => setForm({ ...form, regionId })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{regions.filter((region) => !["country", "state", "province"].includes(region.type)).map((region) => <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>)}</SelectContent></Select></div></div><Button className="mt-3" disabled={!form.name || !form.officialEmail || !form.managerEmail || !form.regionId || create.isPending} onClick={() => create.mutate()}>Create regional partner</Button></CardContent></Card>;
}
