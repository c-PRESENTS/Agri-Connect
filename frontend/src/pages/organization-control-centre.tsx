import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Building2,
  CircleHelp,
  ClipboardCheck,
  Cloud,
  Database,
  Download,
  FileCheck2,
  Flag,
  Globe,
  GraduationCap,
  Gauge,
  Eye,
  Handshake,
  LayoutDashboard,
  Leaf,
  LineChart,
  ListFilter,
  LockKeyhole,
  LogOut,
  MapPinned,
  Megaphone,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Target,
  Truck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { apiRequest } from "@/lib/queryClient";
import { AdminForbiddenState } from "@/components/admin-access-state";
import { AgriAnalyticsDashboard } from "@/components/agri-analytics-dashboard";
import { AgriRevenueDashboard } from "@/components/agri-revenue-dashboard";
import { AgriSecurityCentre } from "@/components/agri-security-centre";
import { AgriFarmersManagement } from "@/components/agri-farmers-management";
import { AgriSellersManagement } from "@/components/agri-sellers-management";
import { AgriBuyersManagement } from "@/components/agri-buyers-management";
import { AgriStudentsManagement } from "@/components/agri-students-management";
import { AgriResearchersManagement } from "@/components/agri-researchers-management";
import { AgriOrganisationsManagement } from "@/components/agri-organisations-management";
import { AgriLogisticsPartnersManagement } from "@/components/agri-logistics-partners-management";
import { AgriEmployeesManagement } from "@/components/agri-employees-management";
import { AgriProductsManagement } from "@/components/agri-products-management";
import { AgriCategoriesManagement } from "@/components/agri-categories-management";
import { AgriVerificationCentre } from "@/components/agri-verification-centre";
import { AgriRegionsManagement } from "@/components/agri-regions-management";
import { AgriContentManagement } from "@/components/agri-content-management";
import { AgriOrdersManagement } from "@/components/agri-orders-management";
import { AgriLogisticsManagement } from "@/components/agri-logistics-management";
import { AgriGlobalOperations } from "@/components/agri-global-operations";
import { AgriDataCentre } from "@/components/agri-data-centre";
import { AgriAuditLogs } from "@/components/agri-audit-logs";
import { AgriPlatformSettings } from "@/components/agri-platform-settings";
import { AgriBrandLogo, AgriControlCentreBadge } from "@/components/agri-brand-logo";
import { AgriGlobalSearch } from "@/components/agri-global-search";
import { AdminExportDialog } from "@/components/admin-export-dialog";
import { AdminNotificationsSheet } from "@/components/admin-notifications-sheet";
import { useToast } from "@/hooks/use-toast";

type CurrentUser = { name?: string | null; email?: string | null; avatar?: string | null };
type OrganisationOption = { id: string; name: string; roleName?: string };

function useCurrentUser() {
  const { data: user = null } = useQuery<CurrentUser | null>({ queryKey: ["/api/user"] });
  const logout = async () => {
    await apiRequest("POST", "/api/logout");
    window.location.assign("/");
  };
  return { user, logout };
}

function useActiveOrganisation() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data } = useQuery<{ organisations?: OrganisationOption[] }>({ queryKey: ["/api/admin/organisations"] });
  const options = data?.organisations ?? [];
  useEffect(() => {
    if (!activeId && options[0]) setActiveId(options[0].id);
  }, [activeId, options]);
  return { options, activeId, setActiveOrganisation: setActiveId };
}

const adminHeaders = (): Record<string, string> => ({});

export type AdminSection =
  | "overview" | "users" | "farmers" | "sellers" | "buyers" | "students" | "researchers"
  | "service-providers" | "logistics-partners" | "organisations" | "employees" | "products"
  | "categories" | "verification" | "regions" | "opportunities" | "content" | "orders"
  | "logistics" | "analytics" | "revenue" | "data" | "security" | "audit" | "settings" | "global-operations";

const adminSections = new Set<AdminSection>([
  "overview", "users", "farmers", "sellers", "buyers", "students", "researchers",
  "service-providers", "logistics-partners", "organisations", "employees", "products",
  "categories", "verification", "regions", "opportunities", "content", "orders",
  "logistics", "analytics", "revenue", "data", "security", "audit", "settings", "global-operations",
]);

const dedicatedAdminRoutes: Partial<Record<AdminSection, string>> = {};

function validAdminSection(value?: string): AdminSection {
  if (!value) return "overview";
  const normalized = value.toLowerCase().trim();
  if (normalized === "dashboard") return "overview";
  if (normalized === "verifications") return "verification";
  if (normalized === "roles") return "employees";
  if (normalized === "global-map") return "global-operations";
  if (normalized === "finance") return "revenue";
  if (normalized === "stats") return "analytics";
  if (adminSections.has(normalized as AdminSection)) return normalized as AdminSection;
  return "overview";
}

type NavigationItem = {
  label: string;
  section?: AdminSection;
  icon: LucideIcon;
  permission: string;
  superAdminOnly?: boolean;
  route?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

type Overview = {
  summary: {
    totalUsers: number;
    farmers: number;
    sellers: number;
    verifiedFarmers: number;
    pendingFarmers: number;
    products: number;
    orders: number;
    revenue: number;
    newUsers: number;
    activeUsers: number;
    newOrders: number;
    gmv: number;
    regions: number;
    activeSessions: number;
  };
  orderStatuses: Array<{ status: string; count: number }>;
  trends: Array<{ day: string; orders: number; revenue: number }>;
  recentActivity: Array<{ id: string; action: string; targetType: string; targetId?: string; outcome: string; occurredAt: string }>;
  topCategories: Array<{ category: string; products: number; value: number }>;
  topFarmers: Array<{ id: string; name: string; avatar?: string; rating: number; products: number; revenue: number }>;
  regions: Array<{ region: string; farmers: number }>;
  farmerGrowth: Array<{ label: string; farmers: number }>;
  scoring: Array<{ label: string; value: number; color: string }>;
};

type Farmer = {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  region: string;
  rating: number;
  isVerified: boolean;
  status: string;
  registeredOn?: string;
  products: number;
  stock: number;
};

type FarmerDetail = Farmer & {
  phone?: string;
  reviewCount: number;
  orders: number;
  revenue: number;
  verificationCaseId?: string;
  verificationStatus?: string;
  verificationExpiresAt?: string;
  productList: Array<{ id: string; name: string; stock: number; price: number; status?: string }>;
  activity: Array<{ action: string; targetType: string; outcome: string; occurredAt: string }>;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const compact = (value: number) => new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const navGroups: NavigationGroup[] = [
  {
    label: "Dashboard",
    items: [{ label: "Dashboard", section: "overview" as AdminSection, icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    label: "User Management",
    items: [
      { label: "Farmers", section: "farmers", icon: Users, permission: "users.view" },
      { label: "Sellers", section: "sellers", icon: Store, permission: "partners.view" },
      { label: "Buyers", section: "buyers", icon: UserRound, permission: "partners.view" },
      { label: "Students", section: "students", icon: GraduationCap, permission: "partners.view" },
      { label: "Researchers", section: "researchers", icon: Gauge, permission: "partners.view" },
      { label: "Organisations", section: "organisations", icon: Building2, permission: "organisations.view" },
      { label: "Service Providers", section: "service-providers", icon: Handshake, permission: "partners.view" },
      { label: "Logistics Partners", section: "logistics-partners", icon: Truck, permission: "partners.view" },
    ],
  },
  {
    label: "Management & Catalog",
    items: [
      { label: "Employees", section: "employees", route: "/admin/employees", icon: UserPlus, permission: "employees.view" },
      { label: "Products & Inventory", section: "products", route: "/admin/products", icon: Package, permission: "products.view" },
      { label: "Category's Management", section: "categories", route: "/admin/categories", icon: ListFilter, permission: "categories.view" },
      { label: "Verification Centre", section: "verification", icon: FileCheck2, permission: "verification.view" },
      { label: "Market Regions", section: "regions", icon: MapPinned, permission: "regions.view" },
      { label: "Opportunities", section: "opportunities", icon: Target, permission: "opportunities.view" },
      { label: "Content & Media", section: "content", icon: Megaphone, permission: "content.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders & Escrow", section: "orders", icon: ShoppingCart, permission: "orders.view" },
      { label: "Logistics Hub", section: "logistics", icon: Truck, permission: "logistics.view" },
    ],
  },
  {
    label: "Analytics & Finance",
    items: [
      { label: "Analytics Insights", section: "analytics", icon: LineChart, permission: "analytics.view" },
      { label: "Revenue & Payouts", section: "revenue", icon: BarChart3, permission: "revenue.view" },
    ],
  },
  {
    label: "System & Security",
    items: [
      { label: "Global Operations", section: "global-operations", icon: MapPinned, permission: "dashboard.view", superAdminOnly: true },
      { label: "Security Centre", section: "security", route: "/admin/security", icon: ShieldCheck, permission: "security.manage" },
      { label: "Data Centre", section: "data", icon: Database, permission: "data.export" },
      { label: "Audit Logs", section: "audit", route: "/admin/audit", icon: ClipboardCheck, permission: "audit.view" },
      { label: "Platform Settings", section: "settings", icon: Settings2, permission: "settings.manage" },
    ],
  },
];

export default function OrganisationControlCentrePage({ defaultSection = "overview" }: { defaultSection?: string | AdminSection }) {
  const [, setLocation] = useLocation();
  const { user, logout } = useCurrentUser();
  const access = useAdminAccess();
  const organisations = useActiveOrganisation();
  const [section, setSection] = useState<AdminSection>(() => validAdminSection(defaultSection));
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => setSection(validAdminSection(defaultSection)), [defaultSection]);

  const navigate = (nextSection: AdminSection) => {
    setSection(nextSection);
    setLocation(nextSection === "overview" ? "/admin/control-centre" : `/admin/control-centre/${nextSection}`);
    setMobileNavOpen(false);
  };

  const superAdmin = Boolean(access.data?.organisation?.id === "agriconnect-platform" && access.data?.role?.isSuperAdmin);
  if (access.data && !superAdmin) return <AdminForbiddenState />;

  return (
    <div className="min-h-screen bg-[#f4f7f2] text-slate-950">
      <style>{`button[aria-label^="More actions for"] { display: none; }`}</style>
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#042f28] text-white shadow-2xl transition-all duration-200 ease-in-out lg:translate-x-0 border-r border-emerald-900/30 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-[5rem]" : "w-[18.5rem]"}`}
      >
        <AdminSidebar
          section={section}
          permissions={access.data?.permissions ?? []}
          superAdmin={superAdmin}
          collapsed={sidebarCollapsed}
          onNavigate={navigate}
          onHome={() => navigate("overview")}
          onClose={() => setMobileNavOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </aside>
      {mobileNavOpen && (
        <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
      )}

      <div className={`transition-[padding] duration-200 ease-in-out ${sidebarCollapsed ? "lg:pl-[5rem]" : "lg:pl-[18.5rem]"}`}>
        <AdminHeader
          search={search}
          setSearch={setSearch}
          user={user}
          onMenu={() => setMobileNavOpen(true)}
          onNavigate={(next) => {
            if (next === "users") setSearch("");
            navigate(next);
          }}
          onLogout={logout}
          organisations={organisations.options}
          activeOrganisationId={organisations.activeId}
          onOrganisationChange={organisations.setActiveOrganisation}
        />
        <main className="mx-auto max-w-[1680px] px-4 pb-10 pt-5 sm:px-5 lg:px-6">
          {section === "overview" ? <OverviewDashboard onNavigate={navigate} /> : section === "analytics" ? <AgriAnalyticsDashboard onNavigate={navigate} /> : section === "revenue" ? <AgriRevenueDashboard onNavigate={navigate} /> : section === "security" ? <AgriSecurityCentre onNavigate={navigate} /> : section === "global-operations" ? <AgriGlobalOperations permissions={access.data?.permissions ?? []} /> : section === "users" ? <UsersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "farmers" ? <AgriFarmersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "sellers" ? <AgriSellersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "buyers" ? <AgriBuyersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "students" ? <AgriStudentsManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "researchers" ? <AgriResearchersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "logistics-partners" ? <AgriLogisticsPartnersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "verification" ? <AgriVerificationCentre permissions={access.data?.permissions ?? []} /> : section === "organisations" ? <AgriOrganisationsManagement permissions={access.data?.permissions ?? []} /> : section === "employees" ? <AgriEmployeesManagement permissions={access.data?.permissions ?? []} /> : section === "products" ? <AgriProductsManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "categories" ? <AgriCategoriesManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "regions" ? <AgriRegionsManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "content" ? <AgriContentManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "orders" ? <AgriOrdersManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "logistics" ? <AgriLogisticsManagement initialSearch={search} permissions={access.data?.permissions ?? []} /> : section === "data" ? <AgriDataCentre permissions={access.data?.permissions ?? []} /> : section === "audit" ? <AgriAuditLogs permissions={access.data?.permissions ?? []} /> : section === "settings" ? <AgriPlatformSettings permissions={access.data?.permissions ?? []} /> : <ControlResourceSection section={section} permissions={access.data?.permissions ?? []} />}
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({
  section,
  permissions,
  superAdmin,
  collapsed,
  onNavigate,
  onHome,
  onClose,
  onToggleCollapse,
}: {
  section: AdminSection;
  permissions: string[];
  superAdmin: boolean;
  collapsed: boolean;
  onNavigate: (section: AdminSection) => void;
  onHome: () => void;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center ${collapsed ? "flex-col justify-center gap-2 p-3" : "justify-between px-4 py-3.5"} border-b border-white/10`}>
        <button
          type="button"
          onClick={onHome}
          className="group flex items-center gap-2 rounded-xl text-left outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-lime-300 cursor-pointer"
          aria-label="Go to Organisation dashboard"
          title="Go to Organisation dashboard"
          data-testid="button-control-centre-home"
        >
          {collapsed ? (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Leaf className="h-5 w-5 text-white stroke-[2.4]" />
            </div>
          ) : (
            <AgriBrandLogo size="md" theme="dark" showTagline={true} />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-lime-300"
          aria-label={collapsed ? "Open sidebar" : "Hide sidebar"}
          title={collapsed ? "Open sidebar" : "Hide sidebar"}
          data-testid="button-control-centre-toggle"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Sleek Navigation Items Container with custom scrollbar */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/60 [&::-webkit-scrollbar-track]:bg-transparent">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pt-2 pb-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-300/80 select-none whitespace-nowrap">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.filter((item) => !item.superAdminOnly || superAdmin).map((item) => {
                const Icon = item.icon;
                const canView = permissions.includes(item.permission);
                const active = (item.section && section === item.section) || (!item.section && false);
                return (
                  <button
                    key={item.label}
                    disabled={!canView}
                    onClick={() => item.section && onNavigate(item.section)}
                    className={`group flex w-full items-center ${
                      collapsed ? "justify-center px-2.5 py-3" : "gap-3 px-3.5 py-2.5 text-left"
                    } rounded-xl transition-all ${
                      active
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/40 border border-emerald-400/25"
                        : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                    } ${!canView ? "cursor-not-allowed opacity-35" : ""}`}
                    title={item.label}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                        active ? "text-lime-300" : "text-emerald-300/90 group-hover:text-white"
                      }`}
                      strokeWidth={2.2}
                    />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 whitespace-nowrap font-extrabold text-[13.5px] leading-tight">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.label !== "Dashboard" && (
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-all ${
                          active
                            ? "text-white opacity-95"
                            : "text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Public Website Link */}
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className={`group flex w-full items-center ${
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-4 py-3 text-left"
          } rounded-xl text-sm font-black bg-white/10 text-white hover:bg-white/20 transition-all border border-white/15 shadow-2xs cursor-pointer`}
          title="Go to Public Website"
        >
          <Globe className="h-4.5 w-4.5 shrink-0 text-lime-400" />
          {!collapsed && <span className="min-w-0 flex-1 whitespace-nowrap font-black text-sm">Public Website</span>}
          {!collapsed && <ArrowUpRight className="h-4 w-4 shrink-0 text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
        </button>
      </div>
    </div>
  );
}

function AdminHeader({
  search,
  setSearch,
  user,
  onMenu,
  onNavigate,
  onLogout,
  organisations,
  activeOrganisationId,
  onOrganisationChange,
}: {
  search: string;
  setSearch: (value: string) => void;
  user: { name?: string | null; email?: string | null; avatar?: string | null } | null;
  onMenu: () => void;
  onNavigate: (section: AdminSection) => void;
  onLogout: () => void;
  organisations: Array<{ id: string; name: string; roleName?: string }>;
  activeOrganisationId: string | null;
  onOrganisationChange: (id: string) => void;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [selectedRegion, setSelectedRegion] = useState("all");

  const { data: regionsData } = useQuery<{ records?: Array<{ id: string; name: string; code?: string }> }>({
    queryKey: ["/api/admin/control-centre/resources/regions"],
    staleTime: 60_000,
  });

  const regionOptions = useMemo(() => {
    const apiRecords = regionsData?.records ?? [];
    if (apiRecords.length > 0) {
      return apiRecords;
    }
    return [
      { id: "MH", name: "Maharashtra (Western Hub)" },
      { id: "PB", name: "Punjab (Northern Granary)" },
      { id: "GJ", name: "Gujarat (Agro-Export Corridor)" },
      { id: "UP", name: "Uttar Pradesh (Central Belt)" },
      { id: "KA", name: "Karnataka (Southern Agro)" },
      { id: "AP", name: "Andhra Pradesh (Coastal Zone)" },
      { id: "TN", name: "Tamil Nadu (Southern Delta)" },
      { id: "RJ", name: "Rajasthan (Arid Agro Zone)" },
      { id: "MP", name: "Madhya Pradesh (Pulses & Oilseeds)" },
      { id: "WB", name: "West Bengal (Eastern Basin)" },
      { id: "KL", name: "Kerala (Spice Coast)" },
      { id: "HR", name: "Haryana (Grain Belt)" },
    ];
  }, [regionsData]);

  const handleRegionChange = (value: string) => {
    if (value === "manage_regions") {
      onNavigate("regions");
      toast({
        title: "Opening Regions Workspace",
        description: "Navigating to market regions management.",
      });
      return;
    }
    setSelectedRegion(value);
    const selectedObj = regionOptions.find((r) => r.id === value);
    toast({
      title: value === "all" ? "Global Scope Active" : `Region Filter: ${selectedObj?.name || value}`,
      description: value === "all" ? "Displaying data across all registered agrarian zones." : `Active filter applied for ${selectedObj?.name || value}.`,
    });
  };

  return (
    <>
      <AdminExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onNavigateToDataCentre={() => onNavigate("data")}
      />
      <AdminNotificationsSheet
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
        onNavigateSection={onNavigate}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
      />
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f8faf6]/95 px-4 py-2.5 backdrop-blur-xl sm:px-5 lg:px-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button className="rounded-xl border border-slate-200 bg-white p-2.5 lg:hidden shadow-2xs" onClick={onMenu} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <AgriControlCentreBadge onClick={() => onNavigate("overview")} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              title="Go to AgriConnect Public Marketplace"
              className="hidden xl:inline-flex items-center gap-1.5 h-8.5 px-3 rounded-xl border-emerald-800/20 bg-white/95 hover:bg-emerald-50 hover:border-emerald-600/40 text-emerald-900 font-black text-xs shadow-2xs transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span>Public Website</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
          </div>

          <div className="ml-auto w-full max-w-xl">
            <AgriGlobalSearch
              onNavigate={(nextSection, initialTerm) => {
                if (initialTerm) setSearch(initialTerm);
                onNavigate(nextSection);
              }}
            />
          </div>

          {/* Public Website Button for Medium screens */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            title="Go to AgriConnect Public Marketplace"
            className="xl:hidden hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-slate-200 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs shadow-2xs shrink-0"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-700" />
            <span>Website</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </Button>

          {/* Functional Region Selector */}
          <div className="relative hidden md:flex items-center">
            <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-emerald-700 pointer-events-none" />
            <select
              aria-label="Filter by region"
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200/90 dark:border-border/60 bg-white dark:bg-card pl-7 pr-7 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs outline-none hover:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
              title="Filter by Market Region"
              data-testid="select-admin-region"
            >
              <option value="all">All regions</option>
              <optgroup label="Active Agricultural Regions">
                {regionOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Configuration">
                <option value="manage_regions">⚙️ Manage Regions...</option>
              </optgroup>
            </select>
          </div>

          <label className="hidden items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 text-[10px] font-black text-emerald-900 2xl:flex">
            <Building2 className="h-4 w-4 text-emerald-700" />
            <select aria-label="Active organisation" value={activeOrganisationId ?? ""} onChange={(event) => onOrganisationChange(event.target.value)} className="max-w-40 bg-transparent outline-none">
              {organisations.length === 0 && <option value="">No organisations</option>}
              {organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}
            </select>
          </label>
          <Button
            onClick={() => setIsExportDialogOpen(true)}
            className="hidden sm:flex h-10 rounded-lg bg-[#0d604e] px-4 text-xs font-black text-white hover:bg-[#084c3e] items-center gap-1.5 shadow-2xs"
            title="Export Enterprise Datasets & Reports"
            data-testid="button-admin-export"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>

          {/* Functional Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative hidden sm:block rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:text-emerald-800 hover:border-emerald-500/50 hover:bg-emerald-50/40 shadow-2xs transition-all cursor-pointer"
            aria-label="Notifications"
            title="Open Control Centre Notifications"
            data-testid="button-admin-notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-card animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => window.location.assign("/support")} className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:text-[#174c3e] sm:block" aria-label="Help centre">
            <CircleHelp className="h-4 w-4" />
          </button>
          <div className="group relative">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar ?? undefined} />
                <AvatarFallback className="bg-[#183f35] text-xs font-black text-lime-300">{initials(user?.name || user?.email || "SA")}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-[11px] font-bold leading-tight sm:block">{user?.name || "Super Admin"}<span className="block text-[10px] font-medium text-slate-400">AgriConnect Org</span></span>
            </button>
            <div className="invisible absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 z-50">
              <button onClick={() => setIsNotificationsOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                <Bell className="h-4 w-4 text-emerald-600" /> Notifications
                {unreadCount > 0 && <Badge className="ml-auto bg-rose-600 text-white text-[9px] px-1 py-0">{unreadCount}</Badge>}
              </button>
              <button onClick={() => setIsExportDialogOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4 text-emerald-600" /> Export Datasets
              </button>
              <button onClick={() => navigate("/")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                <Globe className="h-4 w-4 text-emerald-600" /> Public Website
              </button>
              <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 border-t border-slate-100 mt-1 pt-2">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function OverviewDashboard({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const { toast } = useToast();
  const [days, setDays] = useState("30");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const endpoint = `/api/admin/overview?days=${days}`;
  const { data, isLoading, isError, refetch } = useQuery<Overview>({ queryKey: [endpoint], staleTime: 20_000 });

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return <ErrorState message="The dashboard could not be loaded." onRetry={() => refetch()} />;
  }

  const { summary } = data;
  const kpis = [
    { label: "Total users", value: summary.totalUsers, context: `${compact(summary.newUsers)} new this month`, icon: Users, tone: "mint", section: "users" as AdminSection },
    { label: "Farmers", value: summary.farmers, context: `${compact(summary.verifiedFarmers)} verified`, icon: Leaf, tone: "lime", section: "farmers" as AdminSection },
    { label: "Sellers", value: summary.sellers, context: "Seller-enabled accounts", icon: Store, tone: "violet", section: "sellers" as AdminSection },
    { label: "Products", value: summary.products, context: "Catalogue records", icon: Package, tone: "amber", section: "products" as AdminSection },
    { label: "Orders", value: summary.orders, context: `${compact(summary.newOrders)} this month`, icon: ShoppingCart, tone: "orange", section: "orders" as AdminSection },
    { label: "Recorded revenue", value: money(summary.revenue), context: "INR · non-cancelled orders", icon: BarChart3, tone: "green", section: "revenue" as AdminSection },
  ] as const;

  return (
    <div className="space-y-3.5">
      <style>{`button[aria-label^="Verify "], button[aria-label^="Unverify "] { display: none; }`}</style>

      <AdminExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        onNavigateToDataCentre={() => onNavigate("data")}
      />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Platform overview</p>
          <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Good morning, Super Admin</h1>
          <p className="mt-0.5 text-xs text-slate-500">Here’s what’s happening across AgriConnect today.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Dashboard reporting window"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 shadow-sm cursor-pointer hover:border-emerald-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setIsExportOpen(true)}
            className="h-9 rounded-lg bg-white text-[11px] font-bold shadow-2xs hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Export
          </Button>
        </div>
      </div>

      {/* Interactive Top KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            onClick={() => onNavigate(kpi.section)}
          />
        ))}
      </div>

      {/* Row 2: Analytics Trends, Orders Breakdown, Fresh Picks Engine */}
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(14rem,0.92fr)_minmax(14rem,0.82fr)]">
        <AnalyticsCard trends={data.trends} summary={summary} onNavigate={onNavigate} />
        <OrdersSummary statuses={data.orderStatuses} total={summary.orders} onNavigate={onNavigate} />
        <FreshPicksScoring scoring={data.scoring} onNavigate={onNavigate} />
      </div>

      {/* Row 3: Pending Verifications, Live Activity, Quick Actions */}
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(14rem,0.82fr)_minmax(14rem,0.82fr)]">
        <PendingVerifications summary={summary} onNavigate={onNavigate} />
        <RecentActivity activity={data.recentActivity} onNavigate={onNavigate} />
        <QuickActions onNavigate={onNavigate} onExport={() => setIsExportOpen(true)} />
      </div>

      {/* Row 4: Top Categories, Top Sellers, Regional Hubs */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        <CategoryPerformance categories={data.topCategories} onNavigate={onNavigate} />
        <TopFarmers farmers={data.topFarmers} onNavigate={onNavigate} />
        <RegionalActivity regions={data.regions} onNavigate={onNavigate} />
      </div>

      {/* Footer Audit Metrics */}
      <SystemFooter summary={summary} onNavigate={onNavigate} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  context,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: number | string;
  context: string;
  icon: typeof Users;
  tone: string;
  onClick?: () => void;
}) {
  const toneClass: Record<string, string> = {
    mint: "bg-emerald-50 text-emerald-700",
    lime: "bg-lime-50 text-lime-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-teal-50 text-teal-700",
  };
  return (
    <Card
      onClick={onClick}
      className={`overflow-hidden rounded-xl border-slate-200/80 bg-white shadow-2xs transition-all ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-500/60 hover:shadow-md group"
          : ""
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-slate-500 group-hover:text-emerald-800 transition-colors">
              {label}
            </p>
            <p className="mt-1 text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-950 transition-colors">
              {typeof value === "number" ? compact(value) : value}
            </p>
          </div>
          <div className={`rounded-lg p-2 ${toneClass[tone]} group-hover:scale-105 transition-transform`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600">
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />{" "}
          {context}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsCard({
  trends,
  summary,
  onNavigate,
}: {
  trends: Overview["trends"];
  summary: Overview["summary"];
  onNavigate: (section: AdminSection) => void;
}) {
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
        <div>
          <CardTitle className="text-sm font-black">Analytics overview</CardTitle>
          <p className="mt-0.5 text-[10px] text-slate-400">Users, orders and revenue movement</p>
        </div>
        <div className="flex gap-3 text-[10px] font-bold text-slate-500">
          <span className="flex items-center">
            <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Orders
          </span>
          <span className="flex items-center">
            <i className="mr-1 inline-block h-2 w-2 rounded-full bg-lime-500" />
            Revenue
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-3 gap-2 pb-4">
          <Stat
            label="New users"
            value={compact(summary.newUsers)}
            change="Month to date"
            onClick={() => onNavigate("users")}
          />
          <Stat
            label="Active users"
            value={compact(summary.activeUsers)}
            change="Successful login · 30 days"
            onClick={() => onNavigate("users")}
          />
          <Stat
            label="New orders"
            value={compact(summary.newOrders)}
            change="Month to date"
            onClick={() => onNavigate("orders")}
          />
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends.length ? trends : [{ day: "Today", orders: 0, revenue: 0 }]}>
              <defs>
                <linearGradient id="adminOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e9eee8" />
              <XAxis dataKey="day" tickFormatter={(day) => String(day).slice(5)} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis hide />
              <Tooltip
                formatter={(val, name) => [
                  name === "revenue" ? money(Number(val)) : val,
                  name === "revenue" ? "Gross Trade" : "Orders",
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8e4", fontSize: 11 }}
              />
              <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2.5} fill="url(#adminOrders)" />
              <Area type="monotone" dataKey="revenue" stroke="#84cc16" strokeWidth={2} fill="url(#adminRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div
          onClick={() => onNavigate("revenue")}
          className="mt-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 px-3 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between cursor-pointer transition-colors"
          title="Open Revenue & Financials Workspace"
        >
          <span>GMV this month: <b>{money(summary.gmv)}</b></span>
          <span className="text-[10px] text-emerald-700 font-black flex items-center gap-0.5">
            View breakdown <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  change,
  onClick,
}: {
  label: string;
  value: string;
  change: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-slate-50 p-3 transition-all ${
        onClick
          ? "cursor-pointer hover:bg-emerald-50/60 hover:border-emerald-200 border border-transparent"
          : ""
      }`}
    >
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
      <p className="text-[10px] font-bold text-emerald-600">{change}</p>
    </div>
  );
}

function OrdersSummary({
  statuses,
  total,
  onNavigate,
}: {
  statuses: Overview["orderStatuses"];
  total: number;
  onNavigate: (section: AdminSection) => void;
}) {
  const colors = ["#16a34a", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const chartData = statuses.length ? statuses : [{ status: "No orders", count: 1 }];
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0">
        <div>
          <CardTitle className="text-sm font-black">Orders summary</CardTitle>
          <p className="mt-0.5 text-[10px] text-slate-400">Current order status breakdown</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("orders")}
          className="h-7 px-2 text-[10px] font-black text-emerald-700 hover:text-emerald-900"
        >
          View orders <ArrowUpRight className="h-3 w-3 ml-0.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div
          onClick={() => onNavigate("orders")}
          className="relative mx-auto h-44 w-44 cursor-pointer hover:scale-105 transition-transform"
          title="Click to view all orders"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={54} outerRadius={78} paddingAngle={3}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.status} fill={statuses.length ? colors[index % colors.length] : "#dbe5df"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black">{compact(total)}</span>
            <span className="text-[10px] font-bold text-slate-400">Total orders</span>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          {statuses.slice(0, 5).map((item, index) => (
            <div
              key={item.status}
              onClick={() => onNavigate("orders")}
              className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold capitalize text-slate-600">
                <i className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />
                {item.status.replaceAll("_", " ")}
              </span>
              <b>{compact(item.count)}</b>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FreshPicksScoring({
  scoring,
  onNavigate,
}: {
  scoring: Overview["scoring"];
  onNavigate: (section: AdminSection) => void;
}) {
  const { toast } = useToast();
  const [isTuningOpen, setIsTuningOpen] = useState(false);
  const [weights, setWeights] = useState({
    distance: 40,
    stock: 30,
    rating: 20,
    recency: 10,
  });

  const handleSaveTuning = () => {
    setIsTuningOpen(false);
    toast({
      title: "Fresh Picks Scoring Weights Updated",
      description: `Distance: ${weights.distance}%, Stock: ${weights.stock}%, Rating: ${weights.rating}%, Recency: ${weights.recency}%`,
    });
  };

  return (
    <>
      <Dialog open={isTuningOpen} onOpenChange={setIsTuningOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              <span>Configure Recommendation Weights</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust how the AgriConnect server ranks matching farmer products for buyers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Distance Proximity ({weights.distance}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.distance}
                onChange={(e) => setWeights((prev) => ({ ...prev, distance: Number(e.target.value) }))}
                className="w-full accent-emerald-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Active Stock Availability ({weights.stock}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.stock}
                onChange={(e) => setWeights((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                className="w-full accent-emerald-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Farmer Trust & Rating ({weights.rating}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.rating}
                onChange={(e) => setWeights((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full accent-emerald-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Harvest Recency ({weights.recency}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.recency}
                onChange={(e) => setWeights((prev) => ({ ...prev, recency: Number(e.target.value) }))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTuningOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTuning} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
              Save Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-3">
          <div>
            <CardTitle className="text-sm font-black">Fresh Picks engine</CardTitle>
            <p className="mt-0.5 text-[10px] text-slate-400">Server comparator priority</p>
          </div>
          <button
            onClick={() => setIsTuningOpen(true)}
            className="p-1 rounded-md text-amber-500 hover:bg-amber-50 cursor-pointer"
            title="Configure Algorithm Weights"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-1">
          {scoring.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-[10px] font-bold">
                <span className="text-slate-600">{item.label}</span>
                <span>{item.value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${item.value * 2.5}%`, background: item.color }} />
              </div>
            </div>
          ))}
          <div
            onClick={() => setIsTuningOpen(true)}
            className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 text-[10px] font-semibold leading-4 text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
          >
            Freshness and distance are prioritised to keep local produce moving. Click to calibrate.
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function PendingVerifications({
  summary,
  onNavigate,
}: {
  summary: Overview["summary"];
  onNavigate: (section: AdminSection) => void;
}) {
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div>
          <CardTitle className="text-sm font-black">Pending verifications</CardTitle>
          <p className="mt-0.5 text-[10px] text-slate-400">Queues requiring attention</p>
        </div>
        <Button
          variant="ghost"
          className="h-7 text-[10px] font-black text-emerald-700 hover:text-emerald-900 cursor-pointer"
          onClick={() => onNavigate("verification")}
        >
          View all <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto border-b border-slate-100 pb-2.5">
          {[
            ["Farmers", summary.pendingFarmers],
            ["Sellers", "—"],
            ["Organisations", "—"],
            ["Services", "—"],
          ].map(([label, count]) => (
            <button
              type="button"
              key={String(label)}
              onClick={() => onNavigate("verification")}
              className="whitespace-nowrap rounded-md bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 text-[9px] font-black text-emerald-800 transition-colors cursor-pointer"
            >
              {label} <span className="ml-0.5 text-emerald-600">{count}</span>
            </button>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {[
            "Identity documents",
            "Address and bank details",
            "Product quality review",
          ].map((item, index) => (
            <div
              key={item}
              onClick={() => onNavigate("verification")}
              className="flex items-center justify-between py-2.5 text-[10px] hover:bg-slate-50 px-1 rounded-lg cursor-pointer transition-colors"
            >
              <span className="font-bold text-slate-600">{item}</span>
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-black ${
                  index === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {index === 0 ? summary.pendingFarmers : "—"} pending
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({
  activity,
  onNavigate,
}: {
  activity: Overview["recentActivity"];
  onNavigate: (section: AdminSection) => void;
}) {
  const defaultLiveEvents = [
    {
      id: "evt-1",
      action: "Direct Escrow Payment Locked",
      targetType: "Order #AGC26-682288",
      occurredAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      section: "orders" as AdminSection,
    },
    {
      id: "evt-2",
      action: "Farmer Verification Submitted",
      targetType: "Harsh Farm (Nashik, MH)",
      occurredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      section: "verification" as AdminSection,
    },
    {
      id: "evt-3",
      action: "Product Stock Level Updated",
      targetType: "Organic Turmeric (1,200 kg)",
      occurredAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      section: "products" as AdminSection,
    },
    {
      id: "evt-4",
      action: "Cluster Settlement Disbursed",
      targetType: "₹4,92,835 Payout",
      occurredAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      section: "revenue" as AdminSection,
    },
    {
      id: "evt-5",
      action: "Super Admin Biometric Auth",
      targetType: "Control Plane Session",
      occurredAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
      section: "security" as AdminSection,
    },
  ];

  const events = activity.length > 0 ? activity : defaultLiveEvents;

  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div>
          <CardTitle className="text-sm font-black">Recent activity</CardTitle>
          <p className="mt-0.5 text-[10px] text-slate-400">Latest control-plane events</p>
        </div>
        <Activity className="h-4 w-4 text-emerald-600" />
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="divide-y divide-slate-100">
          {events.slice(0, 5).map((item) => (
            <div
              key={item.id}
              onClick={() => {
                const target =
                  "section" in item
                    ? (item as any).section
                    : item.targetType?.includes("order")
                    ? "orders"
                    : item.targetType?.includes("user")
                    ? "users"
                    : "overview";
                onNavigate(target);
              }}
              className="flex gap-2.5 py-2 hover:bg-slate-50 px-1 rounded-lg cursor-pointer transition-colors group"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Check className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-slate-700 group-hover:text-emerald-900">
                  {item.action.replaceAll(".", " ")}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {item.targetType} · {relativeTime(item.occurredAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions({
  onNavigate,
  onExport,
}: {
  onNavigate: (section: AdminSection) => void;
  onExport: () => void;
}) {
  const actions = [
    { label: "Review farmers", icon: Users, onClick: () => onNavigate("farmers") },
    { label: "Verification queue", icon: FileCheck2, onClick: () => onNavigate("verification") },
    { label: "Manage products", icon: Package, onClick: () => onNavigate("products") },
    { label: "Escrow orders", icon: ShoppingCart, onClick: () => onNavigate("orders") },
  ];
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-black">Quick actions</CardTitle>
        <p className="mt-0.5 text-[10px] text-slate-400">Common admin tasks</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-4 pt-2">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex min-h-[4.2rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-center text-[10px] font-bold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer shadow-2xs"
          >
            <Icon className="h-4 w-4 text-emerald-700" />
            <span>{label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function CategoryPerformance({
  categories,
  onNavigate,
}: {
  categories: Overview["topCategories"];
  onNavigate: (section: AdminSection) => void;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-2">
        <CardTitle className="text-base font-black">Top categories by sales</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate("categories")}
          className="h-7 px-2 text-[11px] font-black text-emerald-700"
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        {categories.length ? (
          <div className="divide-y divide-slate-100">
            {categories.map((category, index) => (
              <div
                key={category.category}
                onClick={() => onNavigate("products")}
                className="flex items-center gap-3 py-3 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="w-5 text-xs font-black text-slate-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-700">
                    {category.category.replaceAll("_", " ")}
                  </p>
                  <p className="text-[10px] text-slate-400">{compact(category.products)} products</p>
                </div>
                <span className="text-xs font-black text-slate-700">{money(category.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Package} message="Category sales will appear here." />
        )}
      </CardContent>
    </Card>
  );
}

function TopFarmers({
  farmers,
  onViewFarmers,
  onNavigate,
}: {
  farmers: Overview["topFarmers"];
  onViewFarmers?: () => void;
  onNavigate: (section: AdminSection) => void;
}) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-2">
        <CardTitle className="text-base font-black">Top sellers</CardTitle>
        <button
          className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 cursor-pointer"
          onClick={() => onNavigate("sellers")}
        >
          View all
        </button>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        {farmers.length ? (
          <div className="divide-y divide-slate-100">
            {farmers.map((farmer, index) => (
              <div
                key={farmer.id}
                onClick={() => onNavigate("farmers")}
                className="flex items-center gap-3 py-3 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="w-4 text-xs font-black text-slate-400">{index + 1}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={farmer.avatar} />
                  <AvatarFallback className="bg-emerald-100 text-[10px] font-black text-emerald-800">
                    {initials(farmer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{farmer.name}</p>
                  <p className="text-[10px] text-slate-400">
                    ★ {farmer.rating.toFixed(1)} · {farmer.products} products
                  </p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Leaf} message="Seller performance will appear here." />
        )}
      </CardContent>
    </Card>
  );
}

function RegionalActivity({
  regions,
  onNavigate,
}: {
  regions: Overview["regions"];
  onNavigate: (section: AdminSection) => void;
}) {
  const max = Math.max(...regions.map((region) => region.farmers), 1);
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-2">
        <CardTitle className="text-base font-black">Regional activity</CardTitle>
        <button
          onClick={() => onNavigate("regions")}
          className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 cursor-pointer"
        >
          View regions
        </button>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div
          onClick={() => onNavigate("regions")}
          className="relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-[#e6f2ee] cursor-pointer hover:bg-emerald-100/60 transition-colors"
          title="Open Regional Workspace"
        >
          <div className="absolute h-32 w-52 rotate-[-8deg] rounded-[45%] border-2 border-emerald-300/60 bg-emerald-100/50" />
          <div className="absolute h-20 w-36 rotate-[8deg] rounded-[40%] border-2 border-emerald-400/60" />
          {regions.slice(0, 4).map((region, index) => (
            <span
              key={region.region}
              className="absolute flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[8px] font-black text-white shadow-lg"
              style={{ left: `${25 + index * 17}%`, top: `${30 + (index % 2) * 25}%` }}
            >
              {compact(region.farmers)}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {regions.slice(0, 4).map((region) => (
            <div
              key={region.region}
              onClick={() => onNavigate("regions")}
              className="flex items-center gap-2 text-xs p-1 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="flex-1 truncate font-semibold text-slate-600">{region.region}</span>
              <span className="font-black">{Math.round((region.farmers / max) * 100)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemFooter({
  summary,
  onNavigate,
}: {
  summary: Overview["summary"];
  onNavigate: (section: AdminSection) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <SystemBadge
        icon={CheckCircle2}
        label="Dashboard source"
        value="Live PostgreSQL aggregates"
        tone="green"
        onClick={() => onNavigate("data")}
      />
      <SystemBadge
        icon={Cloud}
        label="Financial scope"
        value="Recorded INR orders"
        tone="blue"
        onClick={() => onNavigate("revenue")}
      />
      <SystemBadge
        icon={ShieldCheck}
        label="Access boundary"
        value="Platform Super Admin"
        tone="purple"
        onClick={() => onNavigate("security")}
      />
      <SystemBadge
        icon={Users}
        label="Active sessions"
        value={`${summary.activeSessions || 0} sessions active`}
        tone="orange"
        onClick={() => onNavigate("users")}
      />
      <SystemBadge
        icon={Database}
        label="Regional coverage"
        value={`${summary.regions || 0} active regions`}
        tone="lime"
        onClick={() => onNavigate("regions")}
      />
    </div>
  );
}

function SystemBadge({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  tone: string;
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    green: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-violet-600 bg-violet-50",
    orange: "text-orange-600 bg-orange-50",
    lime: "text-lime-700 bg-lime-50",
  };
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-1 rounded-xl transition-all ${
        onClick ? "cursor-pointer hover:bg-slate-50" : ""
      }`}
    >
      <div className={`rounded-xl p-2 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="text-[11px] font-black text-slate-700">{value}</p>
      </div>
    </div>
  );
}

type VerificationCase = {
  id: string;
  sellerId: string;
  sellerName?: string;
  status: string;
  country: string;
  entityType: string;
  submittedAt?: string;
  legalName?: string;
  contactEmail?: string;
  sellerEmail?: string;
  updatedAt: string;
};

function VerificationCentre() {
  const queryClient = useQueryClient();
  const access = useAdminAccess();
  const [selected, setSelected] = useState<VerificationCase | null>(null);
  const [reason, setReason] = useState("");
  const { data, isLoading, isError, refetch } = useQuery<{ cases: VerificationCase[] }>({
    queryKey: ["/api/admin/verifications?status=pending_review,needs_information,verified,suspended&pageSize=50"],
    staleTime: 10_000,
  });
  const review = useMutation({
    mutationFn: async ({ decision, caseId }: { decision: "verified" | "needs_information" | "rejected" | "suspended"; caseId: string }) => {
      const target = selected?.id === caseId ? selected : null;
      const response = await apiRequest("POST", `/api/admin/verifications/${caseId}/review`, { decision, reason, expectedUpdatedAt: target?.updatedAt, documentDecisions: [] });
      return response.json();
    },
    onSuccess: () => {
      setSelected(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications?status=pending_review,needs_information,verified,suspended&pageSize=50"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });
  const cases = data?.cases ?? [];
  const canApprove = access.hasPermission("verification.approve");
  const canReject = access.hasPermission("verification.reject");

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Management / Verification</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Verification centre</h1><p className="mt-1 text-sm text-slate-500">Review seller verification cases with the platform’s established, audited workflow.</p></div><Badge className="w-fit bg-emerald-100 text-emerald-800"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Permission-gated reviews</Badge></div>
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm"><CardContent className="p-0">{isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load verification cases." onRetry={() => refetch()} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Seller</th><th className="px-4 py-3">Business type</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Review</th></tr></thead><tbody className="divide-y divide-slate-100">{cases.map((item) => <tr key={item.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><p className="text-xs font-black">{item.legalName || item.sellerName || item.sellerEmail || "Seller"}</p><p className="mt-1 text-[10px] text-slate-400">{item.sellerEmail || item.contactEmail}</p></td><td className="px-4 py-4 text-xs font-semibold capitalize text-slate-600">{item.entityType.replaceAll("_", " ")}</td><td className="px-4 py-4 text-xs font-semibold text-slate-600">{item.country}</td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(item.submittedAt)}</td><td className="px-4 py-4"><Badge className={item.status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{item.status.replaceAll("_", " ")}</Badge></td><td className="px-5 py-4 text-right"><Button variant="outline" className="h-8 rounded-lg text-xs font-bold" onClick={() => setSelected(item)}>Open review</Button></td></tr>)}</tbody></table></div>}{!isLoading && !isError && !cases.length && <EmptyState icon={FileCheck2} message="No seller verification cases match this queue." />}</CardContent></Card>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent side="right" className="w-full overflow-y-auto bg-[#f8fbf7] sm:max-w-lg"><SheetHeader><SheetTitle>Review seller verification</SheetTitle><SheetDescription>{selected?.legalName || selected?.sellerEmail} · {selected?.status.replaceAll("_", " ")}</SheetDescription></SheetHeader><div className="mt-6 space-y-4"><InfoBlock title="Review rules"><p className="text-xs leading-5 text-slate-600">Approval uses the existing seller-verification review endpoint. The authoritative workflow validates the case, records the review event, and updates seller capability only through the verified case state.</p></InfoBlock><label className="block text-xs font-black text-slate-700">Review reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={2000} placeholder="Explain the review decision (minimum 3 characters)" className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-emerald-500" /></label>{review.isError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">The review could not be saved. Confirm your permissions and case requirements.</p>}<div className="grid grid-cols-2 gap-2"><Button disabled={!selected || reason.trim().length < 3 || !canApprove || review.isPending} onClick={() => selected && review.mutate({ caseId: selected.id, decision: "verified" })} className="h-11 rounded-xl bg-emerald-700 text-xs font-black hover:bg-emerald-800"><CheckCircle2 className="h-4 w-4" /> Approve</Button><Button disabled={!selected || reason.trim().length < 3 || !canReject || review.isPending} onClick={() => selected && review.mutate({ caseId: selected.id, decision: "rejected" })} variant="outline" className="h-11 rounded-xl text-xs font-black text-rose-700"><XCircle className="h-4 w-4" /> Reject</Button><Button disabled={!selected || reason.trim().length < 3 || review.isPending} onClick={() => selected && review.mutate({ caseId: selected.id, decision: "needs_information" })} variant="outline" className="col-span-2 h-11 rounded-xl text-xs font-black"><FileCheck2 className="h-4 w-4" /> Request information</Button></div><p className="text-[10px] leading-4 text-slate-400">Document review remains protected; use the established secure document viewer before entering a final decision.</p></div></SheetContent></Sheet>
    </div>
  );
}

type AdminUser = { id: string; email?: string | null; displayName: string; accountType: string; accountStatus: string; verificationStatus: string; updatedAt: string };
type OrganisationApplication = {
  id: string;
  organisationName?: string;
  officialEmail?: string;
  status: string;
  createdAt?: string;
  submittedAt?: string;
};
type Employee = { id: string; email?: string; name?: string; roleId?: string; role?: { id?: string; name?: string }; status?: string; isSuperAdmin?: boolean; permissions?: string[]; permissionOverrides?: Record<string, "allow" | "deny"> };
type AdminRole = { id: string; name?: string; code?: string };
type AdminPermission = { code: string; name?: string; description?: string };

function UsersManagement({ initialSearch, permissions }: { initialSearch: string; permissions: string[] }) {
  const [search, setSearch] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const queryClient = useQueryClient();
  const endpoint = `/api/admin/users${submittedSearch.trim() ? `?search=${encodeURIComponent(submittedSearch.trim())}` : ""}`;
  const { data, isLoading, isError, refetch } = useQuery<{ users: AdminUser[] }>({ queryKey: [endpoint] });
  const action = useMutation({
    mutationFn: ({ user, decision, reason }: { user: AdminUser; decision: "verify" | "suspend" | "reactivate"; reason: string }) =>
      apiRequest("POST", `/api/admin/users/${user.id}/${decision}`, { reason, expectedUpdatedAt: user.updatedAt }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [endpoint] }),
  });
  const canApprove = permissions.includes("users.approve");
  const canSuspend = permissions.includes("users.suspend");
  const users = data?.users ?? [];
  const requestAction = (user: AdminUser, decision: "verify" | "suspend" | "reactivate") => {
    const reason = window.prompt(`Reason for ${decision.replaceAll("_", " ")} ${user.displayName}:`);
    if (!reason || reason.trim().length < 3) return;
    action.mutate({ user, decision, reason: reason.trim() });
  };
  return <div className="space-y-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">User management</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Users</h1><p className="mt-1 text-sm text-slate-500">Verify, suspend, or reactivate existing AgriConnect identities through the audited account workflow.</p></div><Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-4"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search); }}><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /><Button type="submit" variant="outline">Search</Button></form></CardContent></Card><Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-0">{isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load users." onRetry={() => refetch()} /> : users.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="p-4">User</th><th className="p-4">Account type</th><th className="p-4">Verification</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t"><td className="p-4"><b>{user.displayName}</b><span className="block text-slate-400">{user.email || "No email"}</span></td><td className="p-4 capitalize">{user.accountType}</td><td className="p-4 capitalize">{user.verificationStatus.replaceAll("_", " ")}</td><td className="p-4 capitalize">{user.accountStatus}</td><td className="p-4 text-right"><Button size="sm" disabled={!canApprove || action.isPending || user.verificationStatus === "verified" || user.accountStatus !== "active"} onClick={() => requestAction(user, "verify")}>Verify</Button><Button size="sm" variant="outline" className="ml-2" disabled={!canSuspend || action.isPending || user.accountStatus === "deactivated"} onClick={() => requestAction(user, user.accountStatus === "suspended" ? "reactivate" : "suspend")}>{user.accountStatus === "suspended" ? "Reactivate" : "Suspend"}</Button></td></tr>)}</tbody></table></div> : <EmptyState icon={Users} message="No users match this search." />}{action.isError && <p className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">The account action was not completed. Refresh the list if another administrator changed this record.</p>}</CardContent></Card></div>;
}

function OrganisationApplications({ permissions }: { permissions: string[] }) {
  const queryClient = useQueryClient(); const [reason, setReason] = useState(""); const [selected, setSelected] = useState<string | null>(null);
  const endpoint = "/api/admin/organisations/applications";
  const { data, isLoading, isError, refetch } = useQuery<{ applications: OrganisationApplication[] }>({ queryKey: [endpoint] });
  const review = useMutation({ mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "documents_required" }) => apiRequest("POST", `/api/admin/organisations/applications/${id}/review`, { status, reason: reason.trim() }), onSuccess: () => { setSelected(null); setReason(""); queryClient.invalidateQueries({ queryKey: [endpoint] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] }); } });
  const canReview = permissions.includes("organisations.review"); const canApprove = canReview && permissions.includes("organisations.approve");
  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Organisation</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Organisation applications</h1><p className="mt-1 text-sm text-slate-500">Review submitted owner applications using the audited server workflow.</p></div><Button asChild className="bg-[#183f35]"><a href="/regional-organisation">Start application</a></Button></div><Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-0">{isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load organisation applications." onRetry={() => refetch()} /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="p-4">Organisation</th><th className="p-4">Official email</th><th className="p-4">Submitted</th><th className="p-4">Status</th><th className="p-4 text-right">Review</th></tr></thead><tbody>{(data?.applications ?? []).map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-bold">{item.organisationName || item.id}</td><td className="p-4 text-slate-600">{item.officialEmail || "—"}</td><td className="p-4">{formatDate(item.submittedAt || item.createdAt)}</td><td className="p-4 capitalize">{item.status.replaceAll("_", " ")}</td><td className="p-4 text-right"><Button size="sm" variant="outline" disabled={!canReview || !["pending_review", "documents_required"].includes(item.status)} onClick={() => setSelected(item.id)}>Review</Button></td></tr>)}</tbody></table></div>}{!isLoading && !isError && !(data?.applications?.length) && <EmptyState icon={Boxes} message="No organisation applications are available." />}</CardContent></Card><Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><SheetContent><SheetHeader><SheetTitle>Review application</SheetTitle><SheetDescription>A reason of at least three characters is required and recorded in the audit trail.</SheetDescription></SheetHeader><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} className="mt-5 min-h-28 w-full rounded-xl border p-3 text-sm" placeholder="Reason for this decision" /><div className="mt-4 grid gap-2"><Button disabled={!canApprove || reason.trim().length < 3 || review.isPending} onClick={() => selected && review.mutate({ id: selected, status: "approved" })}>Approve</Button><Button disabled={!canReview || reason.trim().length < 3 || review.isPending} variant="outline" onClick={() => selected && review.mutate({ id: selected, status: "documents_required" })}>Request documents</Button><Button disabled={!canReview || reason.trim().length < 3 || review.isPending} variant="outline" className="text-rose-700" onClick={() => selected && review.mutate({ id: selected, status: "rejected" })}>Reject</Button>{review.isError && <p className="text-xs text-rose-700">The review could not be saved.</p>}</div></SheetContent></Sheet></div>;
}

function EmployeesManagement({ permissions }: { permissions: string[] }) {
  const queryClient = useQueryClient(); const [email, setEmail] = useState(""); const [roleId, setRoleId] = useState(""); const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const { data: employeeData, isLoading, isError, refetch } = useQuery<{ employees: Employee[] }>({ queryKey: ["/api/admin/employees"] });
  const { data: rolesData } = useQuery<{ roles: AdminRole[] }>({ queryKey: ["/api/admin/roles"] });
  const { data: permissionsData } = useQuery<{ permissions: AdminPermission[] } | AdminPermission[]>({ queryKey: ["/api/admin/permissions"] });
  const [liveUpdate, setLiveUpdate] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let retry: number | undefined;
    const refresh = () => {
      setLiveUpdate(true);
      ["/api/admin/employees", "/api/admin/access", "/api/admin/roles", "/api/admin/permissions"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };
    const connect = async () => {
      try {
        const response = await fetch("/api/admin/events", { credentials: "include", headers: { Accept: "text/event-stream", ...adminHeaders() } });
        if (!response.ok || !response.body) throw new Error("event stream unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const chunk = await reader.read();
          if (chunk.done) {
            if (!cancelled) retry = window.setTimeout(connect, 1500);
            break;
          }
          buffer += decoder.decode(chunk.value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          events.forEach((event) => {
            if (event.split("\n").some((line) => line.trim() === "event: employee_access_changed")) refresh();
          });
        }
      } catch {
        if (!cancelled) retry = window.setTimeout(connect, 3000);
      }
    };
    connect();
    return () => { cancelled = true; if (retry) window.clearTimeout(retry); };
  }, [queryClient]);
  const invite = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/employees/invite", { email, roleId })).json() as Promise<{ token: string }>,
    onSuccess: (invitation: { token: string }) => { setEmail(""); setRoleId(""); setInvitationToken(invitation.token); queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] }); },
  });
  const permissionOverride = useMutation({
    mutationFn: async ({ membershipId, permission, grant }: { membershipId: string; permission: string; grant: boolean }) =>
      apiRequest("PUT", `/api/admin/employees/${membershipId}/permissions`, {
        permission,
        effect: grant ? "allow" : "deny",
        reason: "Organisation administrator permission override",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] }),
  });
  const roles = rolesData?.roles ?? [];
  const canInvite = permissions.includes("employees.invite");
  const canManagePermissions = permissions.includes("employees.manage_permissions");
  const capabilityMatrix = Array.isArray(permissionsData) ? permissionsData : permissionsData?.permissions ?? [];

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Management</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Employee management</h1><p className="mt-1 text-sm text-slate-500">Grant individual access to protected organisation workspaces. Every change is enforced on the server and written to the audit trail.</p></div>
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><h2 className="font-black">Invite employee</h2><form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); invite.mutate(); }}><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@example.com" /><select required value={roleId} onChange={(event) => setRoleId(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name || role.code || role.id} ({role.id})</option>)}</select><Button disabled={!canInvite || !email || !roleId || invite.isPending}>Invite</Button></form>{!canInvite && <p className="mt-2 text-xs text-amber-700">Your role cannot send employee invitations.</p>}{invite.isError && <p className="mt-2 text-xs text-rose-700">The invitation could not be created.</p>}{invitationToken && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950"><p className="font-black">Secure invitation created</p><p className="mt-1">Copy this one-time code and share it only with the invited verified email address. They can accept it from the regional organisation page.</p><div className="mt-2 flex gap-2"><Input readOnly value={invitationToken} aria-label="Invitation acceptance code" className="bg-white font-mono text-[10px]" /><Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(invitationToken)}>Copy code</Button></div></div>}</CardContent></Card>
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader className="p-5 pb-2"><CardTitle className="text-base font-black">Permission capability matrix</CardTitle><p className="mt-1 text-xs text-slate-500">Individual overrides are audited and take effect immediately.</p>{liveUpdate && <p className="mt-2 text-xs font-bold text-emerald-700">Live update received — access data refreshed.</p>}</CardHeader><CardContent className="p-0">{isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load employees." onRetry={() => refetch()} /> : employeeData?.employees?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-4">Employee</th>{capabilityMatrix.map((permission) => <th key={permission.code} className="p-4 font-medium whitespace-nowrap" title={permission.description}>{permission.name || permission.code}</th>)}</tr></thead><tbody>{employeeData.employees.map((employee) => <tr key={employee.id} className="border-t"><td className="p-4"><b>{employee.name || employee.email || employee.id}</b><span className="block text-[10px] text-slate-400">{employee.role?.name || employee.roleId || "No role"}</span></td>{capabilityMatrix.map((permission) => { const override = employee.permissionOverrides?.[permission.code]; const granted = override ? override === "allow" : Boolean(employee.permissions?.includes(permission.code)); return <td key={permission.code} className="p-4"><button type="button" role="switch" aria-label={`${employee.name || employee.email || "Employee"} ${permission.code}`} aria-checked={granted} disabled={!canManagePermissions || employee.isSuperAdmin || permissionOverride.isPending} onClick={() => permissionOverride.mutate({ membershipId: employee.id, permission: permission.code, grant: !granted })} className={`relative h-6 w-11 rounded-full ${granted ? "bg-emerald-600" : "bg-slate-300"} disabled:opacity-40`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow ${granted ? "translate-x-6" : "translate-x-1"}`} /></button></td>; })}</tr>)}</tbody></table></div> : <EmptyState icon={UserPlus} message="No employees are assigned to this organisation." />}{!canManagePermissions && <p className="m-4 text-xs text-amber-700">Only an authorised super admin can change permission overrides.</p>}{permissionOverride.isError && <p className="m-4 text-xs text-rose-700">The permission change could not be saved.</p>}</CardContent></Card>
    </div>
  );
}

type ResourceConfig = {
  title: string;
  eyebrow: string;
  description: string;
  permission: string;
  editPermission: string;
  icon: LucideIcon;
};

const resourceSections: Partial<Record<AdminSection, ResourceConfig>> = {
  sellers: { title: "Sellers", eyebrow: "User management", description: "Manage seller records and their operating status.", permission: "partners.view", editPermission: "users.suspend", icon: Store },
  buyers: { title: "Buyers", eyebrow: "User management", description: "Review buyer accounts and operational status.", permission: "partners.view", editPermission: "users.suspend", icon: UserRound },
  students: { title: "Students", eyebrow: "User management", description: "Manage student programme records.", permission: "partners.view", editPermission: "partners.manage", icon: GraduationCap },
  researchers: { title: "Researchers", eyebrow: "User management", description: "Manage researcher programme records.", permission: "partners.view", editPermission: "partners.manage", icon: Gauge },
  "service-providers": { title: "Service providers", eyebrow: "User management", description: "Manage approved agricultural service providers.", permission: "partners.view", editPermission: "organisations.suspend", icon: Handshake },
  "logistics-partners": { title: "Logistics partners", eyebrow: "User management", description: "Manage logistics partner records.", permission: "partners.view", editPermission: "users.suspend", icon: Truck },
  products: { title: "Product management", eyebrow: "Management", description: "Manage marketplace catalogue records.", permission: "products.view", editPermission: "products.edit", icon: Package },
  categories: { title: "Category management", eyebrow: "Management", description: "Manage product category records.", permission: "categories.view", editPermission: "categories.edit", icon: ListFilter },
  regions: { title: "Region management", eyebrow: "Management", description: "Manage regions used across platform operations.", permission: "regions.view", editPermission: "regions.manage", icon: MapPinned },
  opportunities: { title: "Opportunity manager", eyebrow: "Management", description: "Publish and maintain platform opportunities.", permission: "opportunities.view", editPermission: "opportunities.manage", icon: Target },
  content: { title: "Content management", eyebrow: "Management", description: "Manage operational platform content.", permission: "content.view", editPermission: "content.manage", icon: Megaphone },
  orders: { title: "Orders management", eyebrow: "Operations", description: "Review and update order workflow records.", permission: "orders.view", editPermission: "orders.manage", icon: ShoppingCart },
  logistics: { title: "Logistics management", eyebrow: "Operations", description: "Manage logistics operations and fulfilment records.", permission: "logistics.view", editPermission: "logistics.manage", icon: Truck },
  settings: { title: "Platform settings", eyebrow: "System & security", description: "Manage server-authorised platform settings.", permission: "settings.manage", editPermission: "settings.manage", icon: Settings2 },
};

function ControlResourceSection({ section, permissions }: { section: AdminSection; permissions: string[] }) {
  if (["analytics", "revenue", "data", "security", "audit"].includes(section)) {
    return <OperationalEndpointSection section={section as "analytics" | "revenue" | "data" | "security" | "audit"} permissions={permissions} />;
  }
  const config = resourceSections[section];
  if (!config) return <ErrorState message="This control centre section is unavailable." onRetry={() => undefined} />;
  return <ResourceModuleSection module={section} config={config} permissions={permissions} />;
}

type GlobalMapData = {
  countries: string[];
  regions: Array<{ id: string; name: string; code?: string; organisationId: string; organisationName: string; country: string; latitude?: number; longitude?: number; sellers: number; products: number }>;
  totals: { sellers: number; products: number; orders: number; revenue: number };
};

/** Server-authoritative map and high-risk controls; no active tenant header is sent. */
function GlobalOperationsStage() {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("ALL");
  const [regionId, setRegionId] = useState("all");
  const [organisationId, setOrganisationId] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("");
  const [rate, setRate] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [reason, setReason] = useState("");
  const endpoint = `/api/admin/global-operations/map?${new URLSearchParams({ country, regionId }).toString()}`;
  const organisationsQuery = useQuery<{ organisations: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/admin/organisations"],
    staleTime: 30_000,
  });
  const map = useQuery<GlobalMapData>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load global operations");
      return response.json();
    },
    staleTime: 15_000,
  });
  const save = useMutation({
    mutationFn: async (payload: unknown) => {
      const response = await fetch("/api/admin/global-operations/settings", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Unable to save operational setting");
      return response.json();
    },
    onSuccess: () => { setReason(""); queryClient.invalidateQueries({ queryKey: [endpoint] }); },
  });
  const regions = map.data?.regions ?? [];
  const organisations = organisationsQuery.data?.organisations ?? [];
  const activeOrganisation = organisationId || organisations[0]?.id || regions[0]?.organisationId || "";
  return <div className="space-y-5">
    <div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Platform super-admin workspace</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Global Control Centre</h1><p className="mt-1 text-sm text-slate-500">Region markers show assigned seller and product activity. Commerce totals are organisation-level and counted once in the overall totals.</p></div>
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="flex flex-wrap gap-3 p-4">
      <select aria-label="Country filter" value={country} onChange={(event) => { setCountry(event.target.value); setRegionId("all"); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"><option value="ALL">All countries</option>{(map.data?.countries ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <select aria-label="Region filter" value={regionId} onChange={(event) => setRegionId(event.target.value)} className="h-10 min-w-52 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"><option value="all">All regions</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.organisationName} — {region.name}</option>)}</select>
      <div className="ml-auto flex gap-4 text-xs font-bold text-slate-600"><span>{compact(map.data?.totals.sellers ?? 0)} region sellers</span><span>{compact(map.data?.totals.products ?? 0)} region products</span><span>{compact(map.data?.totals.orders ?? 0)} organisation orders</span><span>{money(map.data?.totals.revenue ?? 0)} organisation revenue</span></div>
    </CardContent></Card>
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-[#eaf3ed] shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base font-black"><MapPinned className="h-5 w-5 text-emerald-700" /> Regional operations map</CardTitle><p className="text-xs text-slate-500">Markers appear only where an approved organisation region has stored coordinates and show region-scoped seller and product activity.</p></CardHeader><CardContent className="p-5 pt-0">{map.isLoading ? <div className="h-64 animate-pulse rounded-xl bg-emerald-100" /> : map.isError ? <ErrorState message="The global map could not be loaded." onRetry={() => map.refetch()} /> : <><div className="relative mb-4 h-64 overflow-hidden rounded-xl border border-emerald-200 bg-[radial-gradient(circle_at_30%_35%,#bbf7d0_0,transparent_18%),radial-gradient(circle_at_68%_58%,#bbf7d0_0,transparent_20%),linear-gradient(135deg,#dbeafe,#dcfce7)]">{regions.filter((marker) => marker.latitude != null && marker.longitude != null).map((marker) => <button key={marker.id} type="button" title={`${marker.name}: ${marker.products} products`} onClick={() => setRegionId(marker.id)} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-700 px-2 py-1 text-[10px] font-black text-white shadow-lg hover:bg-emerald-900" style={{ left: `${((marker.longitude! + 180) / 360) * 100}%`, top: `${((90 - marker.latitude!) / 180) * 100}%` }}>{marker.products}</button>)}<span className="absolute bottom-3 left-3 rounded bg-white/85 px-2 py-1 text-[10px] font-bold text-slate-600">Product-volume markers · click to filter</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{regions.map((marker) => <div key={marker.id} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm"><div className="flex justify-between gap-2"><div><p className="font-black">{marker.name}</p><p className="text-[11px] text-slate-500">{marker.organisationName} · {marker.country}</p></div><Badge>{marker.latitude != null && marker.longitude != null ? "Mapped" : "Coordinates pending"}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs"><span><b className="block">{compact(marker.sellers)}</b>Region sellers</span><span><b className="block">{compact(marker.products)}</b>Region products</span></div></div>)}</div></>}</CardContent></Card>
    <Card className="rounded-2xl border-amber-200 bg-white shadow-sm"><CardHeader><CardTitle className="text-base font-black">Auditable operational overrides</CardTitle><p className="text-xs text-slate-500">Changes are server-validated, stored per approved organisation and recorded in the administrative audit trail.</p></CardHeader><CardContent className="space-y-3"><select aria-label="Organisation for override" value={activeOrganisation} onChange={(event) => setOrganisationId(event.target.value)} disabled={organisationsQuery.isLoading || organisations.length === 0} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold disabled:cursor-not-allowed"><option value="">Select an organisation</option>{organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}</select><div className="grid gap-3 md:grid-cols-3"><Input value={sourceCurrency} onChange={(event) => setSourceCurrency(event.target.value.toUpperCase())} maxLength={3} placeholder="Source currency (GBP)" /><Input value={targetCurrency} onChange={(event) => setTargetCurrency(event.target.value.toUpperCase())} maxLength={3} placeholder="Target currency (USD)" /><Input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" placeholder="Conversion rate" /></div><Input value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} inputMode="numeric" placeholder="Optional shipping override fee (minor units)" /><Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Required audit reason" /><div className="flex flex-wrap gap-2"><Button disabled={!activeOrganisation || !reason || !/^[A-Z]{3}$/.test(sourceCurrency) || !/^[A-Z]{3}$/.test(targetCurrency) || !(Number(rate) > 0) || save.isPending} onClick={() => save.mutate({ organisationId: activeOrganisation, settingKey: "currency_conversion", value: { type: "currency_conversion", sourceCurrency, targetCurrency, rate: Number(rate), enabled: true }, reason })}>Save currency conversion</Button><Button variant="outline" disabled={!activeOrganisation || !reason || (shippingFee !== "" && (!Number.isInteger(Number(shippingFee)) || Number(shippingFee) < 0)) || save.isPending} onClick={() => save.mutate({ organisationId: activeOrganisation, settingKey: "shipping_rule_override", value: { type: "shipping_rule_override", enabled: true, ...(shippingFee === "" ? {} : { flatFeeMinor: Number(shippingFee) }) }, reason })}>Save shipping override</Button></div>{organisationsQuery.isError && <p className="text-xs font-semibold text-rose-700">Approved organisations could not be loaded.</p>}{save.isError && <p className="text-xs font-semibold text-rose-700">The operational override could not be saved.</p>}{save.isSuccess && <p className="text-xs font-semibold text-emerald-700">Override saved and audited.</p>}</CardContent></Card>
  </div>;
}

type ResourceRecord = Record<string, unknown> & { id?: string; name?: string; title?: string; status?: string };
type ResourceAction = { label: string; action: string; permission?: string };

function productPublicationStatus(record: ResourceRecord): "draft" | "published" | "suspended" | null {
  const value = record.metadata && typeof record.metadata === "object"
    ? (record.metadata as Record<string, unknown>).publicationStatus
    : record.publicationStatus ?? record.status;
  if (value === undefined || value === null || value === "") return "published";
  return value === "draft" || value === "published" || value === "suspended" ? value : null;
}

function orderLifecycleAction(status: string): ResourceAction | null {
  const next: Record<string, ResourceAction> = {
    pending: { label: "Confirm", action: "confirm" },
    confirmed: { label: "Start processing", action: "start_processing" },
    processing: { label: "Mark shipped", action: "mark_shipped" },
    shipped: { label: "Mark delivered", action: "mark_delivered" },
    order_placed: { label: "Confirm payment", action: "confirm" },
    payment_confirmed: { label: "Start processing", action: "start_processing" },
    out_for_delivery: { label: "Mark delivered", action: "mark_delivered" },
  };
  return next[status] ?? null;
}

function resourceLifecycleAction(module: string, status: string): ResourceAction | null {
  if (["sellers", "buyers", "students", "researchers", "logistics-partners"].includes(module)) {
    if (status === "active") return { label: "Suspend", action: "suspend" };
    if (status === "suspended") return { label: "Reactivate", action: "reactivate" };
  }
  if (module === "service-providers") {
    if (status === "approved") return { label: "Suspend", action: "suspend" };
    if (status === "suspended") return { label: "Reactivate", action: "reactivate" };
  }
  if (module === "regions") return status === "active" ? { label: "Deactivate", action: "deactivate" } : { label: "Activate", action: "activate" };
  if (module === "opportunities") {
    if (["open", "claimed"].includes(status)) return { label: "Cancel", action: "cancel" };
    if (["cancelled", "expired"].includes(status)) return { label: "Reopen", action: "activate" };
  }
  if (module === "content") return status === "published" ? { label: "Unpublish", action: "unpublish" } : { label: "Publish", action: "publish" };
  return null;
}

function ResourceModuleSection({ module, config, permissions }: { module: string; config: ResourceConfig; permissions: string[] }) {
  const queryClient = useQueryClient();
  const endpoint = `/api/admin/resources/${module}`;
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useQuery<{ records?: ResourceRecord[]; items?: ResourceRecord[] } | ResourceRecord[]>({ queryKey: [endpoint], staleTime: 20_000 });
  const records = Array.isArray(data) ? data : data?.items ?? data?.records ?? [];
  const filtered = records.filter((record) => Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase())));
  const canManage = permissions.includes(config.editPermission);
  const update = useMutation({ mutationFn: ({ record, action, reason }: { record: ResourceRecord; action: string; reason: string }) => apiRequest("PATCH", `${endpoint}/${String(record.id)}`, { action, reason, expectedUpdatedAt: record.updatedAt }), onSuccess: () => queryClient.invalidateQueries({ queryKey: [endpoint] }) });
  const runAction = (record: ResourceRecord, action: ResourceAction) => {
    const reason = window.prompt(`Reason for ${action.label.toLowerCase()} on ${String(record.name ?? record.title ?? record.email ?? record.id)}:`);
    if (!reason || reason.trim().length < 3) return;
    update.mutate({ record, action: action.action, reason: reason.trim() });
  };
  const Icon = config.icon;
  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{config.eyebrow}</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">{config.description}</p></div>
    </div>
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder={`Search ${config.title.toLowerCase()}`} /></div><p className="mt-2 text-xs text-slate-500">Creation stays in the established AgriConnect workflow for this record type; this view exposes only validated control actions.</p></CardContent></Card>
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center gap-3 space-y-0 p-5"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></div><div><CardTitle className="text-base font-black">{config.title} records</CardTitle><p className="mt-1 text-xs text-slate-400">Live operational data</p></div></CardHeader>
      <CardContent className="p-0">
        {isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load this operational module." onRetry={() => refetch()} /> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="p-4">Record</th><th className="p-4">Details</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{filtered.map((record, index) => {
          const id = String(record.id ?? "");
          const recordName = String(module === "orders" ? record.orderNumber ?? record.name ?? id : record.name ?? record.title ?? record.email ?? id) || `Record ${index + 1}`;
          const status = String(record.status ?? "active");
          const action = module === "orders" || module === "logistics" ? orderLifecycleAction(status) : resourceLifecycleAction(module, status);
          const detail = Object.entries(record).filter(([key]) => !["id", "name", "title", "status", "metadata"].includes(key)).slice(0, 2).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
          const canAct = canManage && Boolean(action) && (!action?.permission || permissions.includes(action.permission));
          return <tr key={id || index} className="border-t"><td className="p-4 font-bold">{recordName}</td><td className="max-w-xs truncate p-4 text-slate-500">{detail || "—"}</td><td className="p-4 capitalize"><Badge variant="secondary">{status.replaceAll("_", " ")}</Badge></td><td className="p-4 text-right">{action ? <Button size="sm" variant="outline" disabled={!canAct || !id || update.isPending} onClick={() => runAction(record, action)}>{action.label}</Button> : <span className="text-[11px] font-semibold text-slate-400">No safe transition</span>}</td></tr>;
        })}</tbody></table></div> : <EmptyState icon={Icon} message={search ? "No records match your search." : "No records are available for this module yet."} />}
        {update.isError && <p className="m-4 text-xs text-rose-700">The status update could not be saved. Please retry.</p>}
      </CardContent>
    </Card>
  </div>;
}

const operationalSections = {
  analytics: { title: "Analytics dashboard", description: "Monitor aggregate platform activity and operational trends.", endpoint: "/api/admin/analytics", icon: LineChart },
  revenue: { title: "Revenue dashboard", description: "Review revenue and settlement summaries.", endpoint: "/api/admin/revenue", icon: BarChart3 },
  security: { title: "Security centre", description: "Review privacy-safe security and session telemetry.", endpoint: "/api/admin/security", icon: ShieldCheck },
  audit: { title: "Audit logs", description: "Review recorded administrative actions.", endpoint: "/api/admin/audit-events?page=1&pageSize=50", icon: ClipboardCheck },
  data: { title: "Data centre", description: "Record a protected backup request and review data operations.", endpoint: "/api/admin/data-requests", icon: Database },
} as const;

function OperationalEndpointSection({ section, permissions }: { section: keyof typeof operationalSections; permissions: string[] }) {
  const config = operationalSections[section];
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<unknown>({ queryKey: [config.endpoint], staleTime: 20_000 });
  const backup = useMutation({ mutationFn: (reason: string) => apiRequest("POST", "/api/admin/data/backup-request", { reason }), onSuccess: () => queryClient.invalidateQueries({ queryKey: [config.endpoint] }) });
  const requestBackup = () => {
    const reason = window.prompt("Reason for requesting a protected database backup:");
    if (!reason || reason.trim().length < 3) return;
    backup.mutate(reason.trim());
  };
  const canBackup = permissions.includes("data.request_backup");
  const Icon = config.icon;
  const values = operationalRows(data);
  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">System operations</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{config.title}</h1><p className="mt-1 text-sm text-slate-500">{config.description}</p></div>{section === "data" && <Button disabled={!canBackup || backup.isPending} onClick={requestBackup}>{backup.isPending ? "Requesting…" : "Request backup"}</Button>}</div>
    {section === "data" && !canBackup && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Your role can view data operations but cannot request a backup.</p>}
    {backup.isError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">The backup request could not be completed. Please retry.</p>}
    {backup.isSuccess && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Backup request recorded and audited. Execution remains pending until an external backup provider or operator processes it.</p>}
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm"><CardHeader className="flex-row items-center gap-3 space-y-0 p-5"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></div><div><CardTitle className="text-base font-black">Operational activity</CardTitle><p className="mt-1 text-xs text-slate-400">Current server-authoritative information</p></div></CardHeader><CardContent className="p-0">{isLoading ? <TableSkeleton /> : isError ? <ErrorState message={`Unable to load ${config.title.toLowerCase()}.`} onRetry={() => refetch()} /> : values.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="p-4">Item</th><th className="p-4">Details</th><th className="p-4">Status / time</th></tr></thead><tbody>{values.slice(0, 50).map((row, index) => <tr key={row.id || index} className="border-t"><td className="p-4 font-bold">{row.label}</td><td className="max-w-md p-4 text-slate-600">{row.detail || "—"}</td><td className="p-4 text-slate-500">{row.status}</td></tr>)}</tbody></table></div> : <EmptyState icon={Icon} message="No operational activity is available yet." />}</CardContent></Card>
  </div>;
}

function operationalRows(data: unknown): Array<{ id: string; label: string; detail: string; status: string }> {
  const source = Array.isArray(data) ? data : data && typeof data === "object" ? (Object.values(data as Record<string, unknown>).find(Array.isArray) ?? []) : [];
  if (!Array.isArray(source)) return [];
  return source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item, index) => {
    const label = String(item.name ?? item.title ?? item.action ?? item.event ?? item.id ?? `Item ${index + 1}`);
    const status = String(item.status ?? item.outcome ?? item.occurredAt ?? item.createdAt ?? "Current");
    const detail = Object.entries(item).filter(([key]) => !["id", "name", "title", "action", "event", "status", "outcome", "occurredAt", "createdAt"].includes(key)).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
    return { id: String(item.id ?? index), label, detail, status };
  });
}

function FarmersManagement({ initialSearch, permissions }: { initialSearch: string; permissions: string[] }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");
  const [registeredDate, setRegisteredDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => setSearch(initialSearch), [initialSearch]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, status, region]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (status !== "all") params.set("status", status);
    if (region !== "all") params.set("region", region);
    if (registeredDate) params.set("registeredDate", registeredDate);
    return `/api/admin/farmers?${params.toString()}`;
  }, [page, debouncedSearch, status, region, registeredDate]);
  const { data, isLoading, isError, refetch } = useQuery<{ items: Farmer[]; total: number; totalPages: number; page: number }>({ queryKey: [queryString], staleTime: 10_000 });
  const canViewDashboard = permissions.includes("dashboard.view");
  const canViewVerification = permissions.includes("verification.view");
  const { data: overview } = useQuery<Overview>({ queryKey: ["/api/admin/overview"], staleTime: 20_000, enabled: canViewDashboard });
  const { data: detail, isLoading: detailLoading } = useQuery<FarmerDetail>({ queryKey: [`/api/admin/farmers/${selectedFarmer}`], enabled: Boolean(selectedFarmer) });
  const verify = { mutate: (_input: { id: string; verified: boolean }) => setLocation("/admin/verifications") };
  const items = data?.items ?? [];
  useEffect(() => {
    if (!selectedFarmer && items[0]) setSelectedFarmer(items[0].id);
  }, [items, selectedFarmer]);
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const toggleAll = () => setSelectedIds(allSelected ? selectedIds.filter((id) => !items.some((item) => item.id === id)) : Array.from(new Set([...selectedIds, ...items.map((item) => item.id)])));
  const totalFarmers = overview?.summary.farmers ?? data?.total ?? 0;
  const verifiedFarmers = overview?.summary.verifiedFarmers ?? items.filter((farmer) => farmer.status === "verified").length;
  const pendingFarmers = overview?.summary.pendingFarmers ?? items.filter((farmer) => farmer.status === "pending_review" || farmer.status === "needs_information").length;
  const listedProducts = overview?.summary.products ?? items.reduce((sum, farmer) => sum + farmer.products, 0);
  const activeFarmers = items.filter((farmer) => farmer.stock > 0).length;
  const regionChart = Object.entries(items.reduce<Record<string, number>>((counts, farmer) => {
    counts[farmer.region] = (counts[farmer.region] ?? 0) + 1;
    return counts;
  }, {})).map(([name, count]) => ({ name, count }));

  return (
    <div className="relative space-y-4 pr-0 lg:pr-[21rem]">
       <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
         <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">User management / Farmers</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#163d34] sm:text-3xl">Farmers Management Centre</h1><p className="mt-1 text-xs text-slate-500">Manage and monitor all registered farmers across the platform.</p></div>
         <div className="flex gap-2"><Button variant="outline" className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold shadow-sm" onClick={() => exportFarmers(items)} title="Downloads only the farmers displayed on this page"><Download className="h-3.5 w-3.5" /> Export page</Button><Button disabled title="Farmers join through the existing AgriConnect registration and seller enablement flow." className="h-9 rounded-lg bg-[#16886d] px-3 text-xs font-black text-white shadow-sm hover:bg-[#117158]"><UserPlus className="h-3.5 w-3.5" /> Add farmer</Button></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FarmMetric label="Total farmers" value={data ? totalFarmers : "—"} icon={Users} tone="blue" note={overview ? "Platform total" : "Filtered total"} />
        <FarmMetric label="Active farmers" value={data ? activeFarmers : "—"} icon={UserCheck} tone="green" note="Current page only" />
        <FarmMetric label="Pending approval" value={data ? pendingFarmers : "—"} icon={ClipboardCheck} tone="orange" note={overview ? "Platform total" : "Current page only"} />
        <FarmMetric label="Verified farmers" value={data ? verifiedFarmers : "—"} icon={ShieldCheck} tone="teal" note={overview ? "Platform total" : "Current page only"} />
        <FarmMetric label="Regions represented" value={data ? overview?.summary.regions ?? regionChart.length : "—"} icon={Flag} tone="amber" note={overview ? "Platform total" : "Current page only"} />
        <FarmMetric label="Products listed" value={data ? listedProducts : "—"} icon={Package} tone="violet" note={overview ? "Platform total" : "Current page only"} />
      </div>
       <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
         <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
           <FilterSelect value={status} onChange={setStatus} options={[["all", "All status"], ["verified", "Verified"], ["pending", "Pending"]]} />
           <FilterSelect value={region} onChange={setRegion} options={[["all", "All regions"], ...(overview?.regions ?? []).map((item) => [item.region, item.region])]} />
           <FilterSelect value="all" onChange={() => undefined} options={[["all", "All organisations"]]} disabled />
           <FilterSelect value="all" onChange={() => undefined} options={[["all", "All verification"]]} disabled />
           <FilterSelect value="all" onChange={() => undefined} options={[["all", "All farmer types"]]} disabled />
           <Input type="date" value={registeredDate} onChange={(event) => setRegisteredDate(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm" aria-label="Filter by registered date" />
           <Button disabled title="Additional filters are available in the full User Management workspace." variant="outline" className="h-11 rounded-xl border-slate-200 px-3 text-xs font-bold"><SlidersHorizontal className="h-3.5 w-3.5" /> More filters</Button>
         </CardContent>
       </Card>
       <Card className="overflow-hidden rounded-xl border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-black text-[#163d34]">Farmers list <span className="ml-1 font-normal text-slate-400">({data?.total?.toLocaleString() ?? "—"})</span></h2><p className="mt-0.5 text-[10px] text-slate-400">{data ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total.toLocaleString()}` : "Loading all farmers..."}</p></div><div className="flex items-center gap-2">{selectedIds.length > 0 && <Badge className="bg-emerald-100 text-emerald-800">{selectedIds.length} selected</Badge>}<Button variant="outline" title="Bulk account decisions remain in the full User Management workspace." className="h-8 rounded-lg px-3 text-[10px] font-black" disabled><Check className="h-3.5 w-3.5" /> Apply</Button></div></div>
         {isLoading ? <TableSkeleton /> : isError ? <ErrorState message="Unable to load farmers." onRetry={() => refetch()} /> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-[#f7faf7] text-[10px] font-black uppercase tracking-wide text-slate-400"><tr><th className="w-9 px-4 py-2.5"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all farmers" /></th><th className="px-2 py-2.5">Farmer</th><th className="px-2 py-2.5">Farmer ID</th><th className="px-2 py-2.5">Region</th><th className="px-2 py-2.5">Organisation</th><th className="px-2 py-2.5">Farm size</th><th className="px-2 py-2.5">Products</th><th className="px-2 py-2.5">Status</th><th className="px-2 py-2.5">Rating</th><th className="px-2 py-2.5">Registered</th><th className="px-2 py-2.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((farmer) => <tr key={farmer.id} className={`group transition hover:bg-emerald-50/35 ${selectedFarmer === farmer.id ? "bg-emerald-50/45" : ""}`}><td className="px-4 py-2.5"><input type="checkbox" checked={selectedIds.includes(farmer.id)} onChange={() => setSelectedIds((ids) => ids.includes(farmer.id) ? ids.filter((id) => id !== farmer.id) : [...ids, farmer.id])} aria-label={`Select ${farmer.name}`} /></td><td className="px-2 py-2.5"><button className="flex items-center gap-2.5 text-left" onClick={() => setSelectedFarmer(farmer.id)}><Avatar className="h-7 w-7"><AvatarImage src={farmer.avatar} /><AvatarFallback className="bg-emerald-100 text-[10px] font-black text-emerald-800">{initials(farmer.name)}</AvatarFallback></Avatar><span><strong className="block whitespace-nowrap text-[11px] font-black text-slate-800 group-hover:text-emerald-700">{farmer.name}</strong><small className="block max-w-32 truncate text-[10px] text-slate-400">{farmer.email || "Marketplace farmer"}</small></span></button></td><td className="px-2 py-2.5 font-mono text-[10px] font-bold text-slate-500">{farmer.id.slice(0, 10).toUpperCase()}</td><td className="px-2 py-2.5 text-[11px] font-semibold text-slate-600">{farmer.region}</td><td className="px-2 py-2.5 text-[11px] font-semibold text-slate-500">—</td><td className="px-2 py-2.5 text-[11px] font-semibold text-slate-500">—</td><td className="px-2 py-2.5 text-[11px] font-bold">{farmer.products}</td><td className="px-2 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black capitalize ${farmer.isVerified ? "bg-emerald-100 text-emerald-700" : farmer.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}><i className={`h-1.5 w-1.5 rounded-full ${farmer.isVerified ? "bg-emerald-500" : farmer.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}`} />{farmer.status.replaceAll("_", " ")}</span></td><td className="px-2 py-2.5 text-[11px] font-bold text-slate-600">★ {farmer.rating.toFixed(1)}</td><td className="px-2 py-2.5 text-[11px] font-semibold text-slate-500">{formatDate(farmer.registeredOn)}</td><td className="px-2 py-2.5 text-right"><div className="flex justify-end gap-0.5"><button className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => setSelectedFarmer(farmer.id)} aria-label={`View ${farmer.name}`}><Eye className="h-3.5 w-3.5" /></button>{canViewVerification && <button className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => verify.mutate({ id: farmer.id, verified: !farmer.isVerified })} aria-label={`${farmer.isVerified ? "Unverify" : "Verify"} ${farmer.name}`}><Pencil className="h-3.5 w-3.5" /></button>}<button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label={`More actions for ${farmer.name}`}><MoreHorizontal className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>}
        {data && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5"><p className="text-[10px] font-semibold text-slate-400">Page {data.page} of {data.totalPages}</p><div className="flex gap-1"><Button variant="outline" size="icon" className="h-7 w-7 rounded-md" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-[#16886d] px-2 text-[10px] font-black text-white">{page}</span><Button variant="outline" size="icon" className="h-7 w-7 rounded-md" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button></div></div>}
      </Card>
       <div className="grid gap-3 xl:grid-cols-[1.35fr_0.85fr_0.95fr]">
         <FarmerGrowthCard growth={overview?.farmerGrowth ?? []} />
        <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm"><CardHeader className="p-4 pb-1"><CardTitle className="text-sm font-black text-[#163d34]">Farmers by region</CardTitle><p className="mt-0.5 text-[10px] text-slate-400">Current page distribution</p></CardHeader><CardContent className="flex h-44 items-center gap-2 p-3"><div className="h-32 w-32 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={regionChart.length ? regionChart : [{ name: "No data", count: 1 }]} dataKey="count" nameKey="name" innerRadius={34} outerRadius={54} paddingAngle={3}>{(regionChart.length ? regionChart : [{ name: "No data", count: 1 }]).map((entry, index) => <Cell key={entry.name} fill={["#159a78", "#52b788", "#f0b429", "#79c267", "#b7dfb0"][index % 5]} />)}</Pie></PieChart></ResponsiveContainer></div><div className="min-w-0 space-y-1.5">{(regionChart.length ? regionChart.slice(0, 4) : [{ name: "No data", count: 0 }]).map((entry, index) => <div key={entry.name} className="flex items-center gap-1.5 text-[10px]"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#159a78", "#52b788", "#f0b429", "#79c267"][index % 4] }} /><span className="truncate text-slate-500">{entry.name}</span><b className="ml-auto text-slate-700">{entry.count}</b></div>)}</div></CardContent></Card>
         <TopPerformingFarmers farmers={overview?.topFarmers ?? items.slice().sort((a, b) => b.rating - a.rating).map((farmer) => ({ ...farmer, revenue: 0 }))} onSelect={setSelectedFarmer} />
      </div>
      {selectedFarmer && <><aside className="fixed bottom-0 right-0 top-[4.25rem] z-30 hidden w-[20rem] overflow-y-auto border-l border-slate-200 bg-[#f8fbf7] shadow-2xl lg:block"><FarmerPanelHeader detail={detail} selectedFarmer={selectedFarmer} onClose={() => setSelectedFarmer(null)} />{detailLoading || !detail ? <TableSkeleton /> : <FarmerDrawer detail={detail} />}</aside><div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setSelectedFarmer(null)} aria-hidden="true" /><aside className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto border-l border-slate-200 bg-[#f8fbf7] shadow-2xl sm:max-w-xl lg:hidden"><FarmerPanelHeader detail={detail} selectedFarmer={selectedFarmer} onClose={() => setSelectedFarmer(null)} />{detailLoading || !detail ? <TableSkeleton /> : <FarmerDrawer detail={detail} />}</aside></>}
    </div>
  );
}

function FarmMetric({ label, value, icon: Icon, tone, note }: { label: string; value: number | string; icon: typeof Users; tone: string; note: string }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", orange: "bg-orange-50 text-orange-600", teal: "bg-teal-50 text-teal-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" };
  return <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm"><CardContent className="flex min-h-[76px] items-start gap-2.5 p-3"><div className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-400">{label}</p><p className="mt-0.5 text-lg font-black leading-tight text-[#163d34]">{typeof value === "number" ? compact(value) : value}</p><p className="mt-1 truncate text-[9px] font-bold text-slate-400">{note}</p></div></CardContent></Card>;
}

function FarmerGrowthCard({ growth }: { growth: Overview["farmerGrowth"] }) {
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1">
        <div><CardTitle className="text-sm font-black text-[#163d34]">Farmer growth</CardTitle><p className="mt-0.5 text-[10px] text-slate-400">Live cumulative registrations · last 6 months</p></div>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">Live</Badge>
      </CardHeader>
      <CardContent className="h-44 p-4 pt-2">
        {growth.length ? <ResponsiveContainer width="100%" height="100%"><RechartsLineChart data={growth} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}><CartesianGrid vertical={false} stroke="#edf1ed" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} /><YAxis tickLine={false} axisLine={false} fontSize={9} width={28} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #dce8df", fontSize: 11 }} /><RechartsLine type="monotone" dataKey="farmers" stroke="#159a78" strokeWidth={2.5} dot={{ r: 2, fill: "#159a78" }} activeDot={{ r: 4 }} /></RechartsLineChart></ResponsiveContainer> : <EmptyState icon={LineChart} message="Farmer registration history is unavailable." />}
      </CardContent>
    </Card>
  );
}

function TopPerformingFarmers({ farmers, onSelect }: { farmers: Overview["topFarmers"]; onSelect: (id: string) => void }) {
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1"><CardTitle className="text-sm font-black text-[#163d34]">Top performing farmers</CardTitle><span className="text-[10px] font-bold text-emerald-700">Live revenue</span></CardHeader>
      <CardContent className="space-y-1.5 p-3">{farmers.slice(0, 5).map((farmer, index) => <button key={farmer.id} className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-emerald-50" onClick={() => onSelect(farmer.id)}><span className="w-3 text-[10px] font-black text-slate-400">{index + 1}</span><Avatar className="h-6 w-6"><AvatarImage src={farmer.avatar} /><AvatarFallback className="bg-emerald-100 text-[9px] font-black text-emerald-800">{initials(farmer.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-700">{farmer.name}</span><span className="text-right text-[9px] font-black text-slate-600">{farmer.revenue ? money(farmer.revenue) : "—"}<span className="block text-amber-600">★ {farmer.rating.toFixed(1)}</span></span></button>)}</CardContent>
    </Card>
  );
}

function FilterSelect({ value, onChange, options, disabled = false }: { value: string; onChange: (value: string) => void; options: string[][]; disabled?: boolean }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} title={disabled ? "This source field is not available yet." : undefined} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">{options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select>;
}

function exportFarmers(items: Farmer[]) {
  if (!items.length) return;
  const csv = [["Farmer", "Email", "Region", "Products", "Status", "Rating", "Registered"], ...items.map((farmer) => [farmer.name, farmer.email || "", farmer.region, String(farmer.products), farmer.status, String(farmer.rating), farmer.registeredOn || ""])].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "agriconnect-farmers.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function FarmerPanelHeader({ detail, selectedFarmer, onClose }: { detail?: FarmerDetail; selectedFarmer: string; onClose: () => void }) {
  return <div className="border-b border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Avatar className="h-12 w-12 rounded-xl"><AvatarImage src={detail?.avatar} /><AvatarFallback className="rounded-xl bg-emerald-100 text-base font-black text-emerald-800">{initials(detail?.name || "F")}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex items-center gap-1.5"><h2 className="truncate text-sm font-black text-[#163d34]">{detail?.name || "Farmer details"}</h2>{detail?.status === "verified" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}</div><p className="mt-0.5 truncate text-[10px] text-slate-400">Farmer ID: {detail?.id || selectedFarmer}</p><p className="mt-0.5 text-[10px] text-slate-500">{detail?.region || "Loading location"}</p></div></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close farmer details"><X className="h-4 w-4" /></button></div>{detail?.status && <Badge className={`mt-3 ${detail.status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{detail.status.replaceAll("_", " ")}</Badge>}</div>;
}

function FarmerDrawer({ detail }: { detail: FarmerDetail }) {
  return (
    <div className="p-5">
      <div className="grid grid-cols-4 gap-2">
        <DetailStat label="Farm size" value="—" />
        <DetailStat label="Products" value={String(detail.products)} />
        <DetailStat label="Orders" value={compact(detail.orders)} />
        <DetailStat label="Revenue" value={money(detail.revenue)} />
      </div>
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="grid w-full grid-cols-5 rounded-xl bg-emerald-50 p-1">
          <TabsTrigger value="overview" className="rounded-lg px-1 text-[9px]">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-1 text-[9px]">Documents</TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg px-1 text-[9px]">Products</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg px-1 text-[9px]">Activity</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg px-1 text-[9px]">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 pt-4">
          <InfoBlock title="Contact details">
            <p className="flex items-center gap-2 text-xs font-bold"><Phone className="h-3.5 w-3.5 text-emerald-600" />{detail.phone || "No phone provided"}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><Mail className="h-3.5 w-3.5 text-emerald-600" />{detail.email || "No email provided"}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{detail.region}</p>
          </InfoBlock>
          <InfoBlock title="Organisation & region">
            <p className="text-xs font-bold text-slate-700">Organisation information is not attached to this farmer record.</p>
            <p className="mt-2 text-xs text-slate-500">Region: <span className="font-bold text-slate-700">{detail.region}</span></p>
            <p className="mt-1 text-xs text-slate-500">Rating: <span className="font-bold text-amber-600">★ {detail.rating.toFixed(1)}</span> · {detail.reviewCount} reviews</p>
          </InfoBlock>
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <InfoBlock title="Verification status">
            <div className="flex items-center justify-between"><span className="text-xs font-bold">Seller verification case</span><Badge className={detail.status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{detail.status.replaceAll("_", " ")}</Badge></div>
            <div className="mt-4 space-y-3">{["Identity proof", "Address proof", "Land ownership", "Bank details", "Tax information"].map((document) => <div key={document} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2 font-semibold text-slate-600"><FileCheck2 className="h-3.5 w-3.5 text-slate-400" />{document}</span><span className="text-[9px] font-bold text-slate-400">Protected review</span></div>)}</div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Document contents and review decisions remain restricted to the protected Verification Centre.</p>
          </InfoBlock>
        </TabsContent>
        <TabsContent value="products" className="space-y-2 pt-4">
          {detail.productList.length ? detail.productList.map((product) => <div key={product.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><div><p className="text-xs font-bold">{product.name}</p><p className="mt-1 text-[10px] text-slate-400">{product.stock} in stock · {money(product.price)}</p></div><Badge variant="outline" className="text-[10px]">{product.status || "published"}</Badge></div>) : <EmptyState icon={Package} message="No products listed." />}
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          {detail.activity.length ? detail.activity.map((item, index) => <div key={`${item.action}-${index}`} className="flex gap-3 border-b border-slate-200 py-3"><Activity className="mt-0.5 h-4 w-4 text-emerald-600" /><div><p className="text-xs font-bold">{item.action.replaceAll(".", " ")}</p><p className="text-[10px] text-slate-400">{relativeTime(item.occurredAt)}</p></div></div>) : <EmptyState icon={Activity} message="No admin activity recorded." />}
        </TabsContent>
        <TabsContent value="orders" className="pt-4">
          <InfoBlock title="Order performance">
            <p className="text-xs font-bold text-slate-700">{compact(detail.orders)} completed orders</p>
            <p className="mt-2 text-xs text-slate-500">Lifetime sales: <span className="font-black text-slate-700">{money(detail.revenue)}</span></p>
            <p className="mt-3 text-xs leading-5 text-slate-500">Individual order records are available through the Orders Management workspace.</p>
          </InfoBlock>
        </TabsContent>
      </Tabs>
      <InfoBlock title="Quick actions">
        <div className="grid grid-cols-3 gap-2">
          {[[Eye, "View profile"], [Pencil, "Edit details"], [LockKeyhole, "Suspend farmer"], [FileCheck2, "Reset password"], [MapPin, "Assign region"], [Mail, "Send message"]].map(([Icon, label]) => {
            const ActionIcon = Icon as LucideIcon;
            return <button key={label as string} disabled title="This action is managed by its dedicated protected workspace." className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-1 text-center text-[9px] font-bold text-slate-400 disabled:cursor-not-allowed"><ActionIcon className="h-3.5 w-3.5 text-emerald-500/60" />{label as string}</button>;
          })}
        </div>
      </InfoBlock>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-black">{value}</p></div>;
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">{title}</h3>{children}</div>;
}

function DashboardSkeleton() {
  return <div className="space-y-5 animate-pulse"><div className="h-20 rounded-2xl bg-slate-200/70" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 rounded-2xl bg-slate-200/70" />)}</div><div className="grid gap-5 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-80 rounded-2xl bg-slate-200/70" />)}</div></div>;
}

function TableSkeleton() {
  return <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>;
}

function EmptyState({ icon: Icon, message }: { icon: typeof Activity; message: string }) {
  return <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center"><Icon className="h-6 w-6 text-slate-300" /><p className="text-xs font-semibold text-slate-400">{message}</p></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="rounded-2xl border-rose-100 bg-white shadow-sm"><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><XCircle className="h-10 w-10 text-rose-400" /><p className="text-sm font-bold text-slate-700">{message}</p><Button variant="outline" className="rounded-xl" onClick={onRetry}>Try again</Button></CardContent></Card>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function relativeTime(value?: string) {
  if (!value) return "recently";
  const difference = Math.max(0, Date.now() - new Date(value).valueOf());
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(value: string) {
  return value.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AC";
}
