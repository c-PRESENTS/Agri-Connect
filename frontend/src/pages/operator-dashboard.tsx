import { useQuery } from "@tanstack/react-query";
import { BarChart3, Package, ShoppingCart, XCircle, type LucideIcon } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OperatorDashboard = { summary: { productCount: number; availableProductCount: number; orderCount: number; completedSales: number; statusCounts: Record<string, number> } };
type Metric = { label: string; value: string | number; Icon: LucideIcon };

export default function OperatorDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<OperatorDashboard>({ queryKey: ["/api/dashboard/operator"] });
  const summary = data?.summary;
  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-5xl px-4 py-6 sm:py-10"><div className="mb-6"><p className="text-sm text-muted-foreground">Platform operations</p><h1 className="text-2xl font-bold">Operator dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Aggregate marketplace health only. No customer or authentication data is shown.</p></div>
    {isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((n) => <div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
    : isError || !summary ? <div className="py-16 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="font-medium">Unable to load platform summary.</p><Button className="mt-4" variant="outline" onClick={() => refetch()}>Try again</Button></div>
    : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([{ label: "Products", value: summary.productCount, Icon: Package }, { label: "Available products", value: summary.availableProductCount, Icon: Package }, { label: "Orders", value: summary.orderCount, Icon: ShoppingCart }, { label: "Order value", value: `£${summary.completedSales.toFixed(2)}`, Icon: BarChart3 }] satisfies Metric[]).map(({ label, value, Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><p className="text-xl font-bold">{String(value)}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}</div><Card className="mt-5"><CardContent className="p-4"><h2 className="font-semibold">Order statuses</h2>{Object.keys(summary.statusCounts).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No orders have been created yet.</p> : <div className="mt-3 flex flex-wrap gap-2">{Object.entries(summary.statusCounts).map(([status, count]) => <span className="rounded-full bg-muted px-3 py-1 text-sm" key={status}>{status}: {count}</span>)}</div>}</CardContent></Card></>}
  </main></div>;
}
