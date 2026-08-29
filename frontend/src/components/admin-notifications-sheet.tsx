import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Clock,
  Package,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
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
import { useToast } from "@/hooks/use-toast";

export type AdminNotification = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  category: "verification" | "orders" | "inventory" | "finance" | "security";
  unread: boolean;
  targetSection: "verification" | "orders" | "products" | "revenue" | "security" | "overview";
  icon: LucideIcon;
  color: string;
};

const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: "notif-1",
    title: "New Farmer Verification Pending",
    description: "Farmer Ramesh Patel (Nashik, MH) submitted land record title & organic certificates.",
    timeAgo: "12m ago",
    category: "verification",
    unread: true,
    targetSection: "verification",
    icon: UserCheck,
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300",
  },
  {
    id: "notif-2",
    title: "High-Value Order Placed",
    description: "Order #AGC26-682288 for ₹21,78,052 entered Direct Escrow protection.",
    timeAgo: "45m ago",
    category: "orders",
    unread: true,
    targetSection: "orders",
    icon: Package,
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300",
  },
  {
    id: "notif-3",
    title: "Low Inventory Warning",
    description: "Organic Turmeric stock reached 12 kg (below 15% regional minimum threshold).",
    timeAgo: "2h ago",
    category: "inventory",
    unread: true,
    targetSection: "products",
    icon: AlertTriangle,
    color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300",
  },
  {
    id: "notif-4",
    title: "Escrow Settlement Disbursed",
    description: "₹4,92,835 settled to Western Maharashtra Producer Cluster with zero disputes.",
    timeAgo: "5h ago",
    category: "finance",
    unread: false,
    targetSection: "revenue",
    icon: TrendingUp,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300",
  },
  {
    id: "notif-5",
    title: "Security Session Authenticated",
    description: "Super Admin biometric session token verified successfully for enterprise suite.",
    timeAgo: "1d ago",
    category: "security",
    unread: false,
    targetSection: "security",
    icon: ShieldCheck,
    color: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300",
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
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "verification" | "orders">("all");

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    toast({
      title: "All Notifications Marked as Read",
      description: "Cleared unread notification counter.",
    });
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    toast({
      title: "Notifications Cleared",
      description: "All notifications have been removed.",
    });
  };

  const handleNotificationClick = (item: AdminNotification) => {
    // Mark as read
    if (item.unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
    onOpenChange(false);
    onNavigateSection(item.targetSection);
    toast({
      title: item.title,
      description: `Opening ${item.targetSection.toUpperCase()} workspace.`,
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return n.unread;
    if (activeFilter === "verification") return n.category === "verification";
    if (activeFilter === "orders") return n.category === "orders";
    return true;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-card border-l border-slate-200 dark:border-border shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="p-5 bg-gradient-to-r from-[#042f28] to-[#0d604e] text-white space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lime-300">
                <Bell className="h-4.5 w-4.5 stroke-[2.5]" />
              </div>
              <div>
                <SheetTitle className="text-base font-black text-white flex items-center gap-2">
                  <span>Control Centre Alerts</span>
                  {unreadCount > 0 && (
                    <Badge className="bg-lime-400 text-emerald-950 font-black text-[10px] px-1.5 py-0">
                      {unreadCount} new
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs text-emerald-100/80">
                  Real-time operational alerts, orders, and verification logs.
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeFilter === "all" ? "bg-white text-emerald-900 shadow-2xs font-black" : "text-white/80 hover:text-white"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("unread")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeFilter === "unread" ? "bg-white text-emerald-900 shadow-2xs font-black" : "text-white/80 hover:text-white"
                }`}
              >
                Unread ({notifications.filter((n) => n.unread).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("verification")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  activeFilter === "verification" ? "bg-white text-emerald-900 shadow-2xs font-black" : "text-white/80 hover:text-white"
                }`}
              >
                Verifications
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="text-[11px] font-bold text-lime-300 hover:text-lime-200 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark read</span>
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-400">
                <Bell className="h-6 w-6 opacity-60" />
              </div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No notifications found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                All platform operations and automated verification workflows are currently up to date.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const Icon = notif.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.unread
                      ? "bg-white dark:bg-card border-emerald-500/40 shadow-xs hover:border-emerald-600 hover:shadow-md"
                      : "bg-slate-50/70 dark:bg-muted/20 border-slate-200/80 dark:border-border/60 hover:bg-white dark:hover:bg-card hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${notif.color}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {notif.title}
                        {notif.unread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0 ring-2 ring-emerald-100" />
                        )}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {notif.timeAgo}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-border/40 text-[10px]">
                      <span className="font-bold text-emerald-800 dark:text-emerald-400 capitalize">
                        Go to {notif.targetSection}
                      </span>
                      <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-muted/30 border-t border-slate-100 dark:border-border/60 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-1 rounded-xl"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </Button>

            <span className="text-[10px] font-bold text-slate-400">
              AgriConnect Real-Time Stream
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
