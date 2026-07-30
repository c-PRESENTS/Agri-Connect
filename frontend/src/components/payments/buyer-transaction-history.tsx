import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/currency-context";

interface BuyerTransaction {
  id: string;
  order_id: string;
  order_number: string;
  provider: string;
  currency: string;
  amount_minor: string;
  payment_status: string;
  refunded_minor: string;
  dispute_count: number;
  created_at: string;
}

export function BuyerTransactionHistory() {
  const { format } = useCurrency();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading } = useQuery<{ items: BuyerTransaction[]; total: number }>({
    queryKey: ["/api/payments/buyer/transactions", page],
    queryFn: async () => {
      const response = await fetch(
        `/api/payments/buyer/transactions?page=${page}&pageSize=${pageSize}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Could not load transaction history");
      return response.json();
    },
  });
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  return (
    <section className="mb-6" aria-labelledby="buyer-transactions-heading">
      <h2 id="buyer-transactions-heading" className="mb-3 flex items-center gap-2 text-base font-bold">
        <CreditCard className="h-4 w-4 text-primary" /> Payment transactions
      </h2>
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading transactions…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No protected payment transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{transaction.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.provider} · {new Date(transaction.created_at).toLocaleString()}
                    </p>
                    {(Number(transaction.refunded_minor) > 0 || transaction.dispute_count > 0) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Number(transaction.refunded_minor) > 0
                          ? `Refunded ${format(Number(transaction.refunded_minor) / 100, {
                              sourceCurrency: transaction.currency,
                              includeCode: true,
                            })}`
                          : ""}
                        {transaction.dispute_count > 0
                          ? ` · ${transaction.dispute_count} dispute${transaction.dispute_count === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {format(Number(transaction.amount_minor) / 100, {
                        sourceCurrency: transaction.currency,
                        includeCode: true,
                      })}
                    </p>
                    <Badge variant={transaction.payment_status === "succeeded" ? "default" : "secondary"}>
                      {transaction.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Previous transaction page"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Next transaction page"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
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
