import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import type {
  AdminDashboardSummary,
  AdminPendingWorkResponse,
  AdminSystemStatus,
} from "@shared/models/admin-portal";
import { OperatorRegionalMarketplace } from "@/components/operator-regional-marketplace";
import { OperatorRegionalOrganisations } from "@/components/operator-regional-organisations";
import { OperatorSellerVerifications } from "@/components/operator-seller-verifications";
import { OperatorDisputeControls } from "@/components/payments/operator-dispute-controls";
import { OperatorPaymentOperations } from "@/components/payments/operator-payment-operations";
import { OperatorPayoutRecovery } from "@/components/payments/operator-payout-recovery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { AdminLayout } from "@/components/admin-layout";

type Metric = {
  id: string;
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
};

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusBadge(status: AdminSystemStatus["status"]) {
  if (status === "operational") return <Badge className="bg-emerald-600">Operational</Badge>;
  if (status === "degraded") return <Badge variant="secondary" className="text-amber-700">Needs attention</Badge>;
  if (status === "unavailable") return <Badge variant="destructive">Unavailable</Badge>;
  return <Badge variant="outline">Not configured</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="admin-overview-skeleton">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index}><CardContent className="space-y-3 p-5"><Skeleton className="h-5 w-28" /><Skeleton className="h-9 w-20" /><Skeleton className="h-4 w-full" /></CardContent></Card>
      ))}
    </div>
  );
}

function AdminOverviewContent() {
  const access = useAdminAccess();
  const summary = useQuery<AdminDashboardSummary>({ queryKey: ["/api/admin/dashboard/summary"], staleTime: 30_000 });
  const pending = useQuery<AdminPendingWorkResponse>({ queryKey: ["/api/admin/dashboard/pending-work"], staleTime: 30_000 });
  const permissions = access.data?.permissions ?? [];
  const has = (permission: typeof permissions[number]) => permissions.includes(permission);
  const refresh = () => { void Promise.all([summary.refetch(), pending.refetch()]); };

  const metrics: Metric[] = summary.data ? [
    { id: "users", label: "Registered users", value: summary.data.totals.users, detail: "Existing AgriConnect identities", icon: Users },
    { id: "sellers", label: "Seller accounts", value: summary.data.totals.sellers, detail: "Farmer or seller-enabled users", icon: Store },
    { id: "products", label: "Products", value: summary.data.totals.products, detail: `${summary.data.totals.availableProducts} currently in stock`, icon: Package },
    { id: "orders", label: "Orders", value: summary.data.totals.orders, detail: "Recorded marketplace orders", icon: ShoppingCart },
    { id: "organisations", label: "Organisations", value: summary.data.totals.approvedOrganisations, detail: "Approved external partners", icon: Building2 },
    { id: "employees", label: "Admin employees", value: summary.data.totals.activeEmployees, detail: "Active platform memberships", icon: Activity },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-7" data-testid="admin-overview-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Live platform operations</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Organisation overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Real totals and operational queues from the existing AgriConnect database and services.
          </p>
          {summary.data && <p className="mt-2 text-xs text-muted-foreground">Last updated {timeLabel(summary.data.generatedAt)}</p>}
        </div>
        <Button variant="outline" onClick={refresh} disabled={summary.isFetching || pending.isFetching} data-testid="admin-overview-refresh">
          <RefreshCw className={`mr-2 h-4 w-4 ${(summary.isFetching || pending.isFetching) ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {summary.isLoading ? <DashboardSkeleton /> : summary.isError || !summary.data ? (
        <Card data-testid="admin-overview-error"><CardContent className="p-8 text-center"><XCircle className="mx-auto h-9 w-9 text-destructive" /><h2 className="mt-3 font-black">Dashboard totals are unavailable</h2><p className="mt-1 text-sm text-muted-foreground">No other admin section has been discarded. Retry this dashboard request locally.</p><Button className="mt-4" variant="outline" onClick={() => void summary.refetch()}>Retry totals</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => <Card key={metric.id} data-testid={`admin-kpi-${metric.id}`}><CardContent className="flex items-start gap-4 p-5"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><metric.icon className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-muted-foreground">{metric.label}</p><p className="mt-1 text-3xl font-black tabular-nums">{metric.value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div></CardContent></Card>)}
        </div>
      )}

      {(summary.data?.errors.length ?? 0) > 0 && <Alert><Clock3 className="h-4 w-4" /><AlertTitle>Some optional widgets could not be refreshed</AlertTitle><AlertDescription>{summary.data!.errors.map((error) => error.widget).join(", ")}. Core totals remain current.</AlertDescription></Alert>}

      <section aria-labelledby="pending-work-heading">
        <div className="mb-3 flex items-center justify-between"><div><h2 id="pending-work-heading" className="text-xl font-black">Pending work</h2><p className="text-sm text-muted-foreground">Counts link to the matching permission-controlled section.</p></div></div>
        {pending.isLoading ? <div className="grid gap-3 lg:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}</div> : pending.isError ? <Card><CardContent className="p-6"><p className="font-bold">Pending work is temporarily unavailable.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void pending.refetch()}>Retry pending work</Button></CardContent></Card> : !pending.data?.items.length ? <Card><CardContent className="py-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><p className="mt-3 font-black">No pending queues are visible for this role</p><p className="text-sm text-muted-foreground">Navigation and counts follow your current organisation permissions.</p></CardContent></Card> : <div className="grid gap-3 lg:grid-cols-3">{pending.data.items.map((item) => <Link href={item.href} key={item.id} className="group"><Card className="h-full transition-colors group-hover:border-primary/60"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div><Badge variant={item.tone === "critical" && item.count > 0 ? "destructive" : "secondary"} className="text-base tabular-nums">{item.count}</Badge></div></CardContent></Card></Link>)}</div>}
        {(pending.data?.errors.length ?? 0) > 0 && <Alert className="mt-3"><Clock3 className="h-4 w-4" /><AlertTitle>Some pending-work counts are unavailable</AlertTitle><AlertDescription>{pending.data!.errors.map((error) => error.widget).join(", ")}. Available queues remain usable.</AlertDescription></Alert>}
      </section>

      {summary.data && <div id={has("revenue.view") ? "payments" : undefined} className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent admin activity</CardTitle></CardHeader>
          <CardContent>
            {!has("audit.view") ? <p className="text-sm text-muted-foreground">Audit activity is hidden because this role does not have audit access.</p> : summary.data.recentActivity.length === 0 ? <div className="py-8 text-center"><Activity className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-semibold">No audit activity in this view</p></div> : <div className="space-y-3">{summary.data.recentActivity.map((event) => <div className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0" key={event.id}><span className={`mt-1 h-2.5 w-2.5 rounded-full ${event.outcome === "success" ? "bg-emerald-500" : event.outcome === "denied" ? "bg-amber-500" : "bg-destructive"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{event.action.replaceAll("_", " ")}</p><p className="truncate text-xs text-muted-foreground">{event.actor.name} · {event.targetType}{event.targetId ? ` · ${event.targetId}` : ""}</p></div><time className="text-xs text-muted-foreground">{timeLabel(event.occurredAt)}</time></div>)}</div>}
            {has("audit.view") && <Button asChild className="mt-4" size="sm" variant="outline"><Link href="/admin/audit">Open audit logs</Link></Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Provider and system status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary.data.systemStatus.map((status) => <div className="flex items-start justify-between gap-3 rounded-xl border p-3" key={status.id}><div><p className="text-sm font-bold">{status.label}</p><p className="mt-1 text-xs text-muted-foreground">{status.detail}</p></div>{statusBadge(status.status)}</div>)}
            {summary.data.providerStatus.map((provider) => <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3" key={provider.provider}><div><p className="text-sm font-bold capitalize">{provider.provider}</p><p className="text-xs text-muted-foreground">{provider.mode} · updated {timeLabel(provider.updatedAt)}</p></div><Badge variant={provider.status === "active" ? "default" : "secondary"}>{provider.status}</Badge></div>)}
          </CardContent>
        </Card>
      </div>}

      {has("verification.view") && <section id="verification" className="scroll-mt-24"><OperatorSellerVerifications /></section>}
      {has("users.view") && <section id="regional" className="scroll-mt-24"><OperatorRegionalMarketplace canReview={has("users.approve")} canManageTargets={has("products.approve")} /></section>}
      {has("organisations.manage") && <section id="regional-organisations" className="scroll-mt-24"><OperatorRegionalOrganisations /></section>}
      {has("revenue.manage_payouts") && <section id="payment-actions" className="scroll-mt-24"><OperatorPayoutRecovery /><OperatorDisputeControls /></section>}
      {has("security.manage") && <section id="payment-operations" className="scroll-mt-24"><OperatorPaymentOperations /></section>}
    </div>
  );
}

export default function AdminOverviewPage() {
  return <AdminLayout><AdminOverviewContent /></AdminLayout>;
}
