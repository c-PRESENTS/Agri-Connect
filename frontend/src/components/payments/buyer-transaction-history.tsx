import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CreditCard, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
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
    <div className="space-y-4" aria-labelledby="buyer-transactions-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 id="buyer-transactions-heading" className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Payment Transactions & Receipts
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified gateway transactions secured by Stripe and Razorpay Escrow
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4" />
          <span>Buyer Protection Active</span>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/60 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No payment transactions recorded</p>
              <p className="text-xs text-muted-foreground">Transactions made for verified orders will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((transaction) => {
                const isSuccess = transaction.payment_status === "succeeded" || transaction.payment_status === "paid";
                const isPending = transaction.payment_status === "created" || transaction.payment_status === "pending";
                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-border/60 bg-slate-50/50 dark:bg-muted/20 hover:bg-slate-50 dark:hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/orders/${transaction.order_id}`}
                          className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-600 transition-colors flex items-center gap-1"
                        >
                          <span>{transaction.order_number}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white dark:bg-card"
                        >
                          {transaction.provider}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {(Number(transaction.refunded_minor) > 0 || transaction.dispute_count > 0) && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {Number(transaction.refunded_minor) > 0 && (
                            <span>
                              Refunded{" "}
                              {format(Number(transaction.refunded_minor) / 100, {
                                sourceCurrency: transaction.currency,
                                includeCode: true,
                              })}
                            </span>
                          )}
                          {transaction.dispute_count > 0 && (
                            <span>
                              · {transaction.dispute_count} dispute{transaction.dispute_count === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-border/40">
                      <span className="text-base font-black text-slate-900 dark:text-slate-100">
                        {format(Number(transaction.amount_minor) / 100, {
                          sourceCurrency: transaction.currency,
                          includeCode: true,
                        })}
                      </span>
                      <Badge
                        className={`text-[10px] font-bold h-5 px-2 capitalize gap-1 ${
                          isSuccess
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-none"
                            : isPending
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-none"
                              : "bg-slate-100 text-slate-700 dark:bg-muted dark:text-slate-300 border-none"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isPending ? (
                          <Clock className="h-3 w-3" />
                        ) : null}
                        {transaction.payment_status}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold">
                    Page {page} of {pageCount} ({data?.total ?? 0} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1"
                      disabled={page <= 1}
                      onClick={() => setPage((v) => v - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1"
                      disabled={page >= pageCount}
                      onClick={() => setPage((v) => v + 1)}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

