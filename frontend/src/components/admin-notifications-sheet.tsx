import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  Globe,
  LockKeyhole,
  Mail,
  Package,
  Phone,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tractor,
  Trash2,
  TrendingUp,
  Truck,
  UserCheck,
  Volume2,
  VolumeX,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export type AdminNotification = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  category: "verification" | "orders" | "inventory" | "finance" | "security" | "logistics";
  severity: "critical" | "warning" | "info" | "success";
  unread: boolean;
  targetSection: "verification" | "orders" | "products" | "revenue" | "security" | "overview" | "logistics" | "farmers";
  icon: LucideIcon;
  actionLabel: string;
  entityHighlight?: string;
  badgeText: string;
  tone: "amber" | "blue" | "rose" | "emerald" | "indigo" | "teal";
};

const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: "notif-1",
    title: "New Farmer Verification Pending",
    description: "Farmer Ramesh Patel (Nashik, MH) submitted land record title & organic harvest certificates for a 45-acre cluster.",
    timeAgo: "12m ago",
    category: "verification",
    severity: "warning",
    unread: true,
    targetSection: "verification",
    icon: UserCheck,
    actionLabel: "Review KYC Dossier",
    entityHighlight: "Ramesh Patel (Nashik, MH)",
    badgeText: "KYC Pending",
    tone: "amber",
  },
  {
    id: "notif-2",
    title: "High-Value Order Placed",
    description: "Order #AGC26-682288 for ₹21,78,052 entered Direct Escrow protection with T+1 scheduled payout clearance.",
    timeAgo: "45m ago",
    category: "orders",
    severity: "info",
    unread: true,
    targetSection: "orders",
    icon: Package,
    actionLabel: "Inspect Order Escrow",
    entityHighlight: "Order #AGC26-682288 · ₹21,78,052",
    badgeText: "High-Value Escrow",
    tone: "blue",
  },
  {
    id: "notif-3",
    title: "Low Inventory Warning",
    description: "Organic Turmeric stock reached 12 kg (below 15% regional safety buffer of 80 kg at Pune Distribution Hub).",
    timeAgo: "2h ago",
    category: "inventory",
    severity: "critical",
    unread: true,
    targetSection: "products",
    icon: AlertTriangle,
    actionLabel: "Restock Produce Catalogue",
    entityHighlight: "Organic Turmeric · 12 kg left",
    badgeText: "Critical Stock",
    tone: "rose",
  },
  {
    id: "notif-4",
    title: "Escrow Settlement Disbursed",
    description: "₹4,92,835 settled to Western Maharashtra Producer Cluster with zero disputes and instant RTGS confirmation.",
    timeAgo: "5h ago",
    category: "finance",
    severity: "success",
    unread: false,
    targetSection: "revenue",
    icon: TrendingUp,
    actionLabel: "View Settlement Ledger",
    entityHighlight: "₹4,92,835 settled",
    badgeText: "Payout Cleared",
    tone: "emerald",
  },
  {
    id: "notif-5",
    title: "Security Session Authenticated",
    description: "Super Admin biometric session token verified successfully for enterprise command suite.",
    timeAgo: "1d ago",
    category: "security",
    severity: "info",
    unread: false,
    targetSection: "security",
    icon: ShieldCheck,
    actionLabel: "Audit Security Session",
    entityHighlight: "Super Admin Biometrics",
    badgeText: "Auth Verified",
    tone: "indigo",
  },
  {
    id: "notif-6",
    title: "Cold-Chain Logistics In Transit",
    description: "Consignment #TRK-8819 carrying 4.5 MT Alphonso Mangoes cleared Pune Interchange ahead of schedule (Temp: 3.8°C).",
    timeAgo: "1d ago",
    category: "logistics",
    severity: "info",
    unread: false,
    targetSection: "logistics",
    icon: Truck,
    actionLabel: "Track Freight Telemetry",
    entityHighlight: "Consignment #TRK-8819",
    badgeText: "Logistics Active",
    tone: "teal",
  },
  {
    id: "notif-7",
    title: "Commercial Merchant License Verified",
    description: "Merchant Apex Agri-Supplies submitted state APMC trade license and verified GSTIN for interstate grain corridors.",
    timeAgo: "2d ago",
    category: "verification",
    severity: "success",
    unread: false,
    targetSection: "verification",
    icon: FileCheck2,
    actionLabel: "Inspect Merchant License",
    entityHighlight: "Apex Agri-Supplies",
    badgeText: "Trade Verified",
    tone: "emerald",
  },
];

interface AdminNotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateSection: (section: any) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export function AdminNotificationsSheet({
  open,
  onOpenChange,
  onNavigateSection,
  unreadCount,
  setUnreadCount,
}: AdminNotificationsSheetProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "critical" | "verification" | "orders" | "security">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  // Sync unreadCount on initial load or change
  const currentUnreadCount = useMemo(() => {
    return notifications.filter((n) => n.unread).length;
  }, [notifications]);

  const criticalCount = useMemo(() => {
    return notifications.filter((n) => n.severity === "critical").length;
  }, [notifications]);

  const warningCount = useMemo(() => {
    return notifications.filter((n) => n.severity === "warning" || n.unread).length;
  }, [notifications]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    toast({
      title: "All Notifications Marked as Read",
      description: "Cleared unread notification counters across the control centre.",
    });
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const newUnread = !n.unread;
          setUnreadCount(Math.max(0, currentUnreadCount + (newUnread ? 1 : -1)));
          return { ...n, unread: newUnread };
        }
        return n;
      })
    );
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed?.unread) {
      setUnreadCount(Math.max(0, currentUnreadCount - 1));
    }
    toast({
      title: "Notification Dismissed",
      description: removed?.title || "Alert cleared from stream.",
    });
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    toast({
      title: "All Notifications Cleared",
      description: "Alerts cleared from active operational memory.",
    });
  };

  const handleReloadDemo = () => {
    setNotifications(INITIAL_NOTIFICATIONS);
    setUnreadCount(INITIAL_NOTIFICATIONS.filter((n) => n.unread).length);
    toast({
      title: "Alert Feed Reset",
      description: "Reloaded standard enterprise operational alerts stream.",
    });
  };

  const handleNotificationClick = (item: AdminNotification) => {
    if (item.unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
      );
      setUnreadCount(Math.max(0, currentUnreadCount - 1));
    }
    onOpenChange(false);
    onNavigateSection(item.targetSection);
    toast({
      title: item.title,
      description: `Opening ${item.targetSection.toUpperCase()} operations command centre.`,
    });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      if (activeFilter === "unread" && !n.unread) return false;
      if (activeFilter === "critical" && n.severity !== "critical") return false;
      if (activeFilter === "verification" && n.category !== "verification") return false;
      if (activeFilter === "orders" && n.category !== "orders" && n.category !== "finance") return false;
      if (activeFilter === "security" && n.category !== "security" && n.category !== "logistics") return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesDesc = n.description.toLowerCase().includes(query);
        const matchesHighlight = n.entityHighlight?.toLowerCase().includes(query);
        const matchesCategory = n.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesHighlight && !matchesCategory) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[32rem] sm:max-w-[32rem] p-0 flex flex-col bg-[#f8fbf8] dark:bg-card border-l border-slate-200/90 dark:border-border shadow-2xl"
      >
        {/* Executive Command Header */}
        <SheetHeader className="relative p-5 pr-12 bg-gradient-to-r from-[#042f28] via-[#094d42] to-[#0d604e] text-white space-y-3 border-b border-emerald-800/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400/25 to-emerald-500/20 border border-lime-400/40 text-lime-300 shadow-inner">
                <Bell className="h-5 w-5 stroke-[2.2]" />
                {currentUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-lime-400 text-[9px] font-black text-emerald-950 items-center justify-center">
                      {currentUnreadCount}
                    </span>
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-black text-white flex items-center gap-2">
                  <span>Control Centre Alerts</span>
                  <Badge className="bg-lime-400 text-emerald-950 font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-xs">
                    {currentUnreadCount > 0 ? `${currentUnreadCount} new` : "Live Feed"}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-emerald-100/80 font-medium">
                  Operational stream, escrow transactions & verification logs.
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-800/40">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsMuted(!isMuted);
                  toast({
                    title: isMuted ? "Alert Audio Enabled" : "Alert Audio Muted",
                    description: isMuted ? "Audible chimes will sound on new critical alerts." : "Alert notifications muted for this session.",
                  });
                }}
                className={`flex h-7 items-center gap-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isMuted ? "bg-white/10 text-slate-300 hover:bg-white/20" : "bg-lime-400/20 text-lime-300 hover:bg-lime-400/30 border border-lime-400/30"
                }`}
                title={isMuted ? "Unmute alert chimes" : "Mute alert chimes"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isMuted ? "Muted" : "Chimes"}</span>
              </button>

              <button
                type="button"
                onClick={handleReloadDemo}
                className="flex h-7 items-center gap-1 px-2 rounded-lg text-[11px] font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                title="Refresh alerts stream"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>

            {notifications.length > 0 && currentUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex h-7 items-center gap-1 px-2.5 rounded-lg text-[11px] font-black text-emerald-950 bg-lime-400 hover:bg-lime-300 shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Severity Telemetry Status Strip */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
            <button
              onClick={() => setActiveFilter("critical")}
              className={`rounded-xl p-1.5 border transition cursor-pointer ${
                activeFilter === "critical"
                  ? "bg-rose-500/20 border-rose-400 text-rose-200 font-black"
                  : "bg-black/15 border-white/10 text-white/80 hover:bg-black/25"
              }`}
            >
              <span className="block font-mono text-xs font-black text-rose-300">{criticalCount}</span>
              <span className="uppercase text-[9px] tracking-wider">Critical</span>
            </button>

            <button
              onClick={() => setActiveFilter("unread")}
              className={`rounded-xl p-1.5 border transition cursor-pointer ${
                activeFilter === "unread"
                  ? "bg-amber-500/20 border-amber-400 text-amber-200 font-black"
                  : "bg-black/15 border-white/10 text-white/80 hover:bg-black/25"
              }`}
            >
              <span className="block font-mono text-xs font-black text-amber-300">{warningCount}</span>
              <span className="uppercase text-[9px] tracking-wider">Action Req</span>
            </button>

            <button
              onClick={() => setActiveFilter("all")}
              className={`rounded-xl p-1.5 border transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-emerald-500/20 border-emerald-400 text-lime-200 font-black"
                  : "bg-black/15 border-white/10 text-white/80 hover:bg-black/25"
              }`}
            >
              <span className="block font-mono text-xs font-black text-lime-300">{notifications.length}</span>
              <span className="uppercase text-[9px] tracking-wider">Total Stream</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: "all", label: `All (${notifications.length})` },
              { id: "unread", label: `Unread (${currentUnreadCount})` },
              { id: "verification", label: "Verifications" },
              { id: "orders", label: "Orders & Escrow" },
              { id: "security", label: "Security & Logistics" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as never)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? "bg-white text-emerald-950 font-black shadow-xs"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Search Bar */}
        <div className="p-3 bg-white dark:bg-card border-b border-slate-200/80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts by produce, order #, farmer name..."
              className="h-9 pl-9 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scroll Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-muted flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCheck className="h-6 w-6" />
              </div>
              <p className="font-black text-sm text-slate-800 dark:text-slate-200">No matching notifications</p>
              <p className="text-xs text-slate-500 max-w-xs">
                All platform verification queues, trade settlements, and inventory levels are operating normally.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 h-8 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const Icon = notif.icon;

              const toneStyles = {
                amber: {
                  border: "border-l-4 border-l-amber-500",
                  icon: "text-amber-700 bg-amber-50 border-amber-200",
                  badge: "bg-amber-100 text-amber-800 border-amber-200",
                  btn: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-600 hover:text-white",
                },
                blue: {
                  border: "border-l-4 border-l-blue-500",
                  icon: "text-blue-700 bg-blue-50 border-blue-200",
                  badge: "bg-blue-100 text-blue-800 border-blue-200",
                  btn: "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-600 hover:text-white",
                },
                rose: {
                  border: "border-l-4 border-l-rose-500",
                  icon: "text-rose-700 bg-rose-50 border-rose-200",
                  badge: "bg-rose-100 text-rose-800 border-rose-200",
                  btn: "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-600 hover:text-white",
                },
                emerald: {
                  border: "border-l-4 border-l-emerald-500",
                  icon: "text-emerald-700 bg-emerald-50 border-emerald-200",
                  badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
                  btn: "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-600 hover:text-white",
                },
                indigo: {
                  border: "border-l-4 border-l-indigo-500",
                  icon: "text-indigo-700 bg-indigo-50 border-indigo-200",
                  badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
                  btn: "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-600 hover:text-white",
                },
                teal: {
                  border: "border-l-4 border-l-teal-500",
                  icon: "text-teal-700 bg-teal-50 border-teal-200",
                  badge: "bg-teal-100 text-teal-800 border-teal-200",
                  btn: "bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-600 hover:text-white",
                },
              }[notif.tone];

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                    toneStyles.border
                  } ${
                    notif.unread
                      ? "bg-white dark:bg-card border-slate-200"
                      : "bg-[#fcfdfc] dark:bg-muted/15 border-slate-200/80 opacity-95"
                  }`}
                >
                  {/* Top Metadata Row */}
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-border/40">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 ${toneStyles.icon}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${toneStyles.badge}`}>
                        {notif.badgeText}
                      </Badge>
                      {notif.unread && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-slate-400" />
                        {notif.timeAgo}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(notif.id, e)}
                          title={notif.unread ? "Mark as read" : "Mark as unread"}
                          className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-700 cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDismissNotification(notif.id, e)}
                          title="Dismiss alert"
                          className="h-6 w-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="pt-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-800 transition-colors">
                      {notif.title}
                    </h4>

                    {notif.entityHighlight && (
                      <span className="mt-0.5 inline-block font-mono text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                        {notif.entityHighlight}
                      </span>
                    )}

                    <p className="text-[11px] text-slate-600 dark:text-muted-foreground mt-1 leading-relaxed">
                      {notif.description}
                    </p>
                  </div>

                  {/* Action Button Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-border/40 flex items-center justify-between">
                    <button
                      type="button"
                      className={`h-7 px-3 rounded-lg border text-[11px] font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${toneStyles.btn}`}
                    >
                      <span>{notif.actionLabel}</span>
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Target: {notif.targetSection}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Mission Control System Operational Health & Telemetry Deck (Permanently Eliminates the Empty Void!) */}
          <div className="pt-2 space-y-3">
            <div className="rounded-2xl border border-emerald-950/10 bg-white dark:bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Radio className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#163d34] uppercase tracking-wider">
                      Mission Control Telemetry
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Real-Time Ingestion Pipeline</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                  WebSocket 12ms
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Escrow Security</span>
                  <p className="font-black text-slate-800 text-xs mt-0.5">Multi-Sig Guard Active</p>
                  <span className="text-[9px] text-emerald-700 font-bold">100% SLA Guarantee</span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  <span className="text-[9px] font-bold uppercase text-slate-400">KYC Clearance</span>
                  <p className="font-black text-slate-800 text-xs mt-0.5">Automated AI OCR</p>
                  <span className="text-[9px] text-blue-700 font-bold">Avg. 4.2m Response</span>
                </div>
              </div>

              {/* Direct Workspace Quick Jumps */}
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Direct Command Centre Shortcuts
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Security", icon: ShieldCheck, target: "security", tone: "hover:bg-indigo-50 hover:text-indigo-800" },
                    { label: "Logistics", icon: Truck, target: "logistics", tone: "hover:bg-teal-50 hover:text-teal-800" },
                    { label: "Revenue", icon: TrendingUp, target: "revenue", tone: "hover:bg-emerald-50 hover:text-emerald-800" },
                  ].map((shortcut) => {
                    const SIcon = shortcut.icon;
                    return (
                      <button
                        key={shortcut.label}
                        onClick={() => {
                          onOpenChange(false);
                          onNavigateSection(shortcut.target);
                        }}
                        className={`flex items-center justify-center gap-1 h-7 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer ${shortcut.tone}`}
                      >
                        <SIcon className="h-3 w-3" />
                        <span>{shortcut.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Executive Footer */}
        <div className="p-3 bg-white dark:bg-card border-t border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="flex-1 h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span>Clear All Alerts</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onNavigateSection("settings");
                toast({
                  title: "Notification Settings",
                  description: "Opening Platform Settings & Operational Alert Rules.",
                });
              }}
              className="flex-1 h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              <span>Alert Rules</span>
            </Button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>AgriConnect Mission Control Stream</span>
            </span>
            <span>AES-256 TLS Encrypted</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
