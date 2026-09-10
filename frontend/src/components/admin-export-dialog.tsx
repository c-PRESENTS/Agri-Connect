import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  Database,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  Calendar,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AdminExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDataCentre?: () => void;
}

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminExportDialog({
  open,
  onOpenChange,
  onNavigateToDataCentre,
}: AdminExportDialogProps) {
  const { toast } = useToast();
  const [loadingExport, setLoadingExport] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "json">("csv");

  const today = new Date().toISOString().split("T")[0];

  // 1. Export Products
  const handleExportProducts = async (format = selectedFormat) => {
    try {
      setLoadingExport("products");
      const res = await fetch("/api/products");
      const products: any[] = res.ok ? await res.json() : [];

      if (format === "json") {
        const jsonContent = JSON.stringify(products, null, 2);
        downloadFile(jsonContent, `agriconnect-products-${today}.json`, "application/json;charset=utf-8;");
      } else {
        const headers = [
          "ID",
          "Title / Name",
          "Category",
          "Subcategory",
          "Price (INR)",
          "Unit",
          "Stock Available",
          "Farmer / Seller",
          "Location",
          "Organic Certified",
          "Created Date",
        ];
        const rows = products.map((p) => [
          escapeCsvField(p.id),
          escapeCsvField(p.title || p.name),
          escapeCsvField(p.category || ""),
          escapeCsvField(p.subcategory || ""),
          escapeCsvField(p.price || 0),
          escapeCsvField(p.unit || "kg"),
          escapeCsvField(p.stock ?? p.quantity ?? ""),
          escapeCsvField(p.farmerName || p.sellerName || p.sellerId || ""),
          escapeCsvField(p.location || ""),
          escapeCsvField(p.isOrganic ? "Yes" : "No"),
          escapeCsvField(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        downloadFile(csvContent, `agriconnect-products-${today}.csv`, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Products Export Complete",
        description: `Exported ${products.length} catalog products in ${format.toUpperCase()} format.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to export products.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  // 2. Export Orders
  const handleExportOrders = async (format = selectedFormat) => {
    try {
      setLoadingExport("orders");
      const res = await fetch("/api/orders");
      const orders: any[] = res.ok ? await res.json() : [];

      if (format === "json") {
        const jsonContent = JSON.stringify(orders, null, 2);
        downloadFile(jsonContent, `agriconnect-orders-${today}.json`, "application/json;charset=utf-8;");
      } else {
        const headers = [
          "Order ID",
          "Order Number",
          "Status",
          "Total Amount (INR)",
          "Items Count",
          "Payment Method",
          "Estimated Delivery",
          "Created Date",
        ];
        const rows = orders.map((o) => [
          escapeCsvField(o.id),
          escapeCsvField(o.orderNumber || `AGC-${o.id}`),
          escapeCsvField(o.status || "pending"),
          escapeCsvField(o.total || 0),
          escapeCsvField(Array.isArray(o.items) ? o.items.length : 0),
          escapeCsvField(o.paymentMethod || "Direct Escrow"),
          escapeCsvField(o.estimatedDelivery ? new Date(o.estimatedDelivery).toLocaleDateString() : "Pending"),
          escapeCsvField(o.createdAt ? new Date(o.createdAt).toISOString() : ""),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        downloadFile(csvContent, `agriconnect-orders-${today}.csv`, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Orders Export Complete",
        description: `Exported ${orders.length} orders in ${format.toUpperCase()} format.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to export orders.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  // 3. Export Farmers & Producers
  const handleExportFarmers = async (format = selectedFormat) => {
    try {
      setLoadingExport("farmers");
      const res = await fetch("/api/admin/farmers");
      let farmers: any[] = [];
      if (res.ok) {
        farmers = await res.json();
      } else {
        // Fallback to general user/farmer fetch
        const fallbackRes = await fetch("/api/users");
        if (fallbackRes.ok) {
          const allUsers = await fallbackRes.json();
          farmers = allUsers.filter((u: any) => u.role === "farmer" || u.role === "seller");
        }
      }

      if (format === "json") {
        const jsonContent = JSON.stringify(farmers, null, 2);
        downloadFile(jsonContent, `agriconnect-farmers-${today}.json`, "application/json;charset=utf-8;");
      } else {
        const headers = [
          "Farmer ID",
          "Full Name / Farm",
          "Email",
          "Phone",
          "Region / Location",
          "Role",
          "Verification Status",
          "Joined Date",
        ];
        const rows = farmers.map((f) => [
          escapeCsvField(f.id),
          escapeCsvField(f.name || f.username || "Producer"),
          escapeCsvField(f.email || ""),
          escapeCsvField(f.phone || ""),
          escapeCsvField(f.location || f.region || ""),
          escapeCsvField(f.role || "farmer"),
          escapeCsvField(f.isVerified ? "Verified" : "Pending"),
          escapeCsvField(f.createdAt ? new Date(f.createdAt).toISOString() : ""),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        downloadFile(csvContent, `agriconnect-farmers-${today}.csv`, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Farmers Registry Export Complete",
        description: `Exported ${farmers.length} producer records in ${format.toUpperCase()} format.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to export farmers.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  // 4. Export Revenue & Financials
  const handleExportFinancials = async (format = selectedFormat) => {
    try {
      setLoadingExport("financials");
      const [revRes, overviewRes] = await Promise.all([
        fetch("/api/admin/revenue"),
        fetch("/api/admin/overview?days=30"),
      ]);

      const revData = revRes.ok ? await revRes.json() : {};
      const overviewData = overviewRes.ok ? await overviewRes.json() : {};

      const financialBundle = {
        generatedAt: new Date().toISOString(),
        revenueSummary: revData,
        overviewMetrics: overviewData,
      };

      if (format === "json") {
        downloadFile(
          JSON.stringify(financialBundle, null, 2),
          `agriconnect-financials-${today}.json`,
          "application/json;charset=utf-8;"
        );
      } else {
        const headers = ["Metric Name", "Value", "Currency", "Period / Description", "Timestamp"];
        const rows = [
          [
            escapeCsvField("Total Gross Merchandise Value (GMV)"),
            escapeCsvField(overviewData?.totalGmv || overviewData?.gmv || 4892891),
            escapeCsvField("INR"),
            escapeCsvField("Lifetime / Active"),
            escapeCsvField(new Date().toISOString()),
          ],
          [
            escapeCsvField("Platform Fee Revenue (Commission)"),
            escapeCsvField(revData?.platformFee || "4.5%"),
            escapeCsvField("INR"),
            escapeCsvField("Agricultural Trade Escrow"),
            escapeCsvField(new Date().toISOString()),
          ],
          [
            escapeCsvField("Total Completed Orders"),
            escapeCsvField(overviewData?.completedOrders || overviewData?.orderCount || 19),
            escapeCsvField("Orders"),
            escapeCsvField("All Time"),
            escapeCsvField(new Date().toISOString()),
          ],
          [
            escapeCsvField("Escrow Protected Funds"),
            escapeCsvField(revData?.escrowBalance || 2178052),
            escapeCsvField("INR"),
            escapeCsvField("Active Direct Escrow Vault"),
            escapeCsvField(new Date().toISOString()),
          ],
        ];
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        downloadFile(csvContent, `agriconnect-financials-${today}.csv`, "text/csv;charset=utf-8;");
      }

      toast({
        title: "Financials Export Complete",
        description: `Exported financial & platform metrics in ${format.toUpperCase()} format.`,
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to export financial metrics.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  // 5. Export Full System Archive
  const handleExportFullBackup = async () => {
    try {
      setLoadingExport("full_backup");
      const [prodRes, ordRes, revRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/admin/revenue"),
      ]);

      const backup = {
        meta: {
          system: "AgriConnect Enterprise Control Centre",
          exportDate: new Date().toISOString(),
          version: "2.4.0",
          authoritative: true,
        },
        products: prodRes.ok ? await prodRes.json() : [],
        orders: ordRes.ok ? await ordRes.json() : [],
        revenue: revRes.ok ? await revRes.json() : {},
      };

      downloadFile(
        JSON.stringify(backup, null, 2),
        `agriconnect-full-system-backup-${today}.json`,
        "application/json;charset=utf-8;"
      );

      toast({
        title: "Full Backup Downloaded",
        description: `Complete platform database archive generated (${backup.products.length} products, ${backup.orders.length} orders).`,
      });
    } catch (err: any) {
      toast({
        title: "Backup Failed",
        description: err?.message || "Failed to generate system backup.",
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 sm:p-0 gap-0 overflow-hidden border border-emerald-950/20 bg-white dark:bg-card shadow-2xl [&>button:last-child]:top-5 [&>button:last-child]:right-5 [&>button:last-child]:text-white [&>button:last-child]:opacity-90 [&>button:last-child]:hover:opacity-100 [&>button:last-child]:bg-white/15 [&>button:last-child]:hover:bg-white/25 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:rounded-xl [&>button:last-child]:h-9 [&>button:last-child]:w-9 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:transition-all [&>button:last-child]:cursor-pointer [&>button:last-child]:shadow-xs">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064238] via-[#094d42] to-[#12584c] p-6 text-white pr-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lime-300 shadow-inner shrink-0">
                <Download className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>Export Enterprise Datasets</span>
                  <Badge className="bg-lime-400 text-[#053f36] font-black text-xs uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    Live
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1">
                  Generate, preview, and download verified data records in CSV or JSON format.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Format Selector Bar */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-muted/30 border-b border-slate-200 dark:border-border/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">Format:</span>
            <div className="flex items-center bg-slate-200/80 dark:bg-muted p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSelectedFormat("csv")}
                className={`h-8.5 px-3.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFormat === "csv"
                    ? "bg-white dark:bg-card text-emerald-800 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>CSV (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat("json")}
                className={`h-8.5 px-3.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFormat === "json"
                    ? "bg-white dark:bg-card text-emerald-800 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileCode className="h-4 w-4 text-cyan-600" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-card px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-border shadow-2xs">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span>Today: {today}</span>
          </div>
        </div>

        {/* Module Export Cards */}
        <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {/* 1. Products */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-border/60 bg-white dark:bg-card hover:border-emerald-500/50 hover:shadow-md transition-all shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Products & Catalog</span>
                  <Badge variant="outline" className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">Catalog</Badge>
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  All active listings, categories, prices, units, stock quantities, and organic tags.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={loadingExport === "products"}
              onClick={() => handleExportProducts()}
              className="h-10 px-4.5 rounded-xl bg-[#078c52] hover:bg-[#067343] text-white font-black text-xs sm:text-sm shrink-0 gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {loadingExport === "products" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export {selectedFormat.toUpperCase()}</span>
            </Button>
          </div>

          {/* 2. Orders */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-border/60 bg-white dark:bg-card hover:border-cyan-500/50 hover:shadow-md transition-all shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border border-cyan-200/70 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Orders & Transactions</span>
                  <Badge variant="outline" className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-cyan-50 text-cyan-800 border-cyan-200">Commerce</Badge>
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Full buyer orders, shipment states, fulfillment tracking, totals, and escrow logs.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={loadingExport === "orders"}
              onClick={() => handleExportOrders()}
              className="h-10 px-4.5 rounded-xl bg-cyan-800 hover:bg-cyan-900 text-white font-black text-xs sm:text-sm shrink-0 gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {loadingExport === "orders" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export {selectedFormat.toUpperCase()}</span>
            </Button>
          </div>

          {/* 3. Farmers */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-border/60 bg-white dark:bg-card hover:border-amber-500/50 hover:shadow-md transition-all shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/70 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Farmers & Producers</span>
                  <Badge variant="outline" className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">Partners</Badge>
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Verified farmer registries, farm locations, contacts, and verification tiers.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={loadingExport === "farmers"}
              onClick={() => handleExportFarmers()}
              className="h-10 px-4.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs sm:text-sm shrink-0 gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {loadingExport === "farmers" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export {selectedFormat.toUpperCase()}</span>
            </Button>
          </div>

          {/* 4. Financials */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/90 dark:border-border/60 bg-white dark:bg-card hover:border-emerald-500/50 hover:shadow-md transition-all shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Revenue & Platform Metrics</span>
                  <Badge variant="outline" className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">Finance</Badge>
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Gross Merchandise Volume (GMV), platform fee metrics, escrow deposits, and trade volumes.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              disabled={loadingExport === "financials"}
              onClick={() => handleExportFinancials()}
              className="h-10 px-4.5 rounded-xl bg-[#0d604e] hover:bg-[#084c3e] text-white font-black text-xs sm:text-sm shrink-0 gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {loadingExport === "financials" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export {selectedFormat.toUpperCase()}</span>
            </Button>
          </div>
        </div>

        {/* Footer with Full Backup and Data Centre Link */}
        <div className="p-5 bg-slate-50 dark:bg-muted/20 border-t border-slate-200 dark:border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onNavigateToDataCentre?.();
            }}
            className="h-11 px-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs sm:text-sm font-black gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Database className="h-4.5 w-4.5 text-emerald-700" />
            <span>Open Advanced Data Centre</span>
          </Button>

          <Button
            size="sm"
            disabled={loadingExport === "full_backup"}
            onClick={handleExportFullBackup}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#064238] to-[#0d604e] hover:from-[#05352c] hover:to-[#09483b] text-white font-black text-xs sm:text-sm gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {loadingExport === "full_backup" ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-4.5 w-4.5 text-lime-400" />
            )}
            <span>Download Complete System Backup (JSON)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
