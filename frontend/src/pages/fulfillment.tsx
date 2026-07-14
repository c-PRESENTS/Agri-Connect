import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Loader2, PackageSearch, Truck, XCircle } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderStatus } from "@shared/schema";

const statuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];

export default function FulfillmentPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading, isError, refetch } = useQuery<{ orders: Order[] }>({ queryKey: ["/api/dashboard/seller"] });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => (await apiRequest("PATCH", `/api/orders/${id}/status`, { status })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/seller"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      toast({ title: "Fulfillment status updated" });
    },
    onError: () => toast({ title: "Unable to update this order", variant: "destructive" }),
  });
  const orders = (data?.orders ?? []).filter((order) => filter === "all" || order.status === filter);

  return <div className="min-h-screen bg-background"><TopNavigation />
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">Seller workspace</p><h1 className="text-2xl font-bold">Order fulfillment</h1><p className="mt-1 text-sm text-muted-foreground">Update only orders containing your products.</p></div>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
      : isError ? <div className="py-16 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="font-medium">Unable to load fulfillment orders.</p><Button className="mt-4" variant="outline" onClick={() => refetch()}>Try again</Button></div>
      : orders.length === 0 ? <div className="py-16 text-center"><PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">No orders to fulfill</p><p className="mt-1 text-sm text-muted-foreground">New seller orders will appear here.</p></div>
      : <div className="space-y-3">{orders.map((order) => <Card key={order.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><span className="font-semibold">{order.orderNumber}</span><Badge variant="secondary">{order.status}</Badge></div><p className="mt-2 truncate text-sm text-muted-foreground">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}</p><p className="mt-1 text-sm font-medium">£{order.total.toFixed(2)} · {order.paymentStatus}</p></div><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /><Select value={order.status} onValueChange={(status) => update.mutate({ id: order.id, status: status as OrderStatus })} disabled={update.isPending}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>{update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}</div></CardContent></Card>)}</div>}
    </main>
  </div>;
}
