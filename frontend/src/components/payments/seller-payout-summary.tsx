import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Balance {
  currency: "GBP" | "INR";
  held_minor: string;
  failed_minor: string;
  released_minor: string;
  refunded_minor: string;
}

interface PayoutRow {
  id: string;
  order_id: string;
  currency: "GBP" | "INR";
  seller_net_minor: string;
  refunded_minor: string;
  allocation_status: string;
  payout_status?: string | null;
  release_due_at?: string | null;
  failure_code?: string | null;
}

export function SellerPayoutSummary() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: balanceData } = useQuery<{ balances: Balance[] }>({
    queryKey: ["/api/payments/seller/balance"],
  });
  const { data, isLoading } = useQuery<{ items: PayoutRow[]; total: number }>({
    queryKey: ["/api/payments/seller/payout-history", page],
    queryFn: async () => {
      const response = await fetch(
        `/api/payments/seller/payout-history?page=${page}&pageSize=${pageSize}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Could not load payout history");
      return response.json();
    },
  });
  const payouts = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  return (
    <section aria-labelledby="seller-payouts-heading">
      <div className="mb-3">
        <h2 id="seller-payouts-heading" className="text-base font-bold">Protected seller funds</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Balances are derived server-side from allocations, refunds, and provider transfers.
        </p>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(balanceData?.balances ?? []).flatMap((balance) => [
          ["On hold", balance.held_minor, balance.currency],
          ["Released", balance.released_minor, balance.currency],
          ["Payout failed", balance.failed_minor, balance.currency],
          ["Refunded", balance.refunded_minor, balance.currency],
        ]).map(([label, amount, currency]) => (
          <Card key={`${currency}-${label}`}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label} · {currency}</p>
              <p className="mt-1 font-bold">
                {new Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency,
                }).format(Number(amount) / 100)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payout history…</p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No protected payment allocations yet.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <WalletCards className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Order {payout.order_id}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: payout.currency,
                      }).format((Number(payout.seller_net_minor) - Number(payout.refunded_minor)) / 100)}
                      {payout.release_due_at
                        ? ` · release after ${new Date(payout.release_due_at).toLocaleString()}`
                        : " · awaiting delivery confirmation"}
                    </p>
                    {payout.failure_code && <p className="mt-1 text-xs text-destructive">{payout.failure_code}</p>}
                  </div>
                  <Badge variant={payout.allocation_status === "released" ? "default" : "secondary"}>
                    <Clock className="mr-1 h-3 w-3" />
                    {payout.allocation_status.replaceAll("_", " ")}
                  </Badge>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2">
                <Button size="icon" variant="outline" aria-label="Previous payout page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
                <Button size="icon" variant="outline" aria-label="Next payout page" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
