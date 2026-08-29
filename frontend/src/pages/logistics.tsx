import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, 
  Globe, 
  MapPin, 
  Snowflake, 
  Ship,
  Package, 
  Star, 
  Clock, 
  Shield, 
  CheckCircle, 
  CheckCircle2,
  Thermometer, 
  Route, 
  Users, 
  ArrowRight, 
  Search,
  Send,
  Calendar,
  Building2,
  ChevronRight,
  Leaf,
  Zap,
  Plus,
  Handshake,
  Warehouse,
  AlertTriangle,
  Phone,
  TrendingDown,
  Bell,
} from "lucide-react";
import { logisticsPartners, milkRunRoutes, urgentOrders } from "@/lib/logistics-data";
import type { LogisticsPartner, Shipment, ShipmentStatus } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { SendParcelWizard } from "@/components/shipping/send-parcel-wizard";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const typeIcons: Record<string, typeof Truck> = {
  international: Globe,
  national: MapPin,
  hyperlocal: Package,
  "cold-chain": Snowflake,
  freight: Ship,
};

const typeColors: Record<string, string> = {
  international: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  national: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  hyperlocal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "cold-chain": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  freight: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const statusColor: Record<ShipmentStatus, string> = {
  quote_pending: "bg-muted text-foreground",
  booked: "bg-blue-500/15 text-blue-700",
  assigned: "bg-blue-500/15 text-blue-700",
  picked_up: "bg-amber-500/15 text-amber-700",
  in_transit: "bg-amber-500/15 text-amber-700",
  out_for_delivery: "bg-orange-500/15 text-orange-700",
  delivered: "bg-green-500/15 text-green-700",
  exception: "bg-red-500/15 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<ShipmentStatus, string> = {
  quote_pending: "Quote pending",
  booked: "Booked",
  assigned: "Driver assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
  cancelled: "Cancelled",
};

const opportunities = [
  { icon: Truck, title: "Shared transport capacity", description: "Connect available vehicles with farm, seller, and buyer delivery demand." },
  { icon: Snowflake, title: "Cold-chain partnerships", description: "Coordinate temperature-controlled storage and transport for perishable produce." },
  { icon: Warehouse, title: "Regional fulfilment hubs", description: "Collaborate with warehouses, collection centres, and rural consolidation points." },
  { icon: Route, title: "Smarter route planning", description: "Pool nearby deliveries to reduce empty journeys, delays, and operating costs." },
];

const launchSteps = [
  "Register logistics partners and operating regions",
  "Verify businesses, vehicles, insurance, and service capability",
  "Pilot collaborative routes with selected AgriConnect sellers",
  "Launch booking, tracking, settlement, and performance tools",
];

type InterestForm = {
  contactName: string;
  email: string;
  phone: string;
  organisationName: string;
  collaborationType: string;
  region: string;
  details: string;
};

const emptyForm: InterestForm = {
  contactName: "",
  email: "",
  phone: "",
  organisationName: "",
  collaborationType: "",
  region: "",
  details: "",
};

export default function LogisticsPage() {
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const search = useSearch();

  // Determine initial tab from URL param or current path
  const getInitialTab = () => {
    const params = new URLSearchParams(search);
    const tabParam = params.get("tab");
    if (tabParam) return tabParam;
    if (location === "/ship" || location.startsWith("/ship/")) return "shipping";
    if (location === "/logistics-collaboration") return "collaboration";
    return "partners";
  };

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<LogisticsPartner | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [form, setForm] = useState<InterestForm>(emptyForm);
  const [registered, setRegistered] = useState(false);

  // Sync tab with URL if search param changes
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tabParam = params.get("tab");
    if (tabParam && tabParam !== currentTab) {
      setCurrentTab(tabParam);
    }
  }, [search]);

  // Autofill collaboration form from user profile
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      contactName: current.contactName || user.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: current.email || user.email || "",
      phone: current.phone || user.phone || "",
      region: current.region || user.location || "",
    }));
  }, [user]);

  // Shipments query
  const { data: myShipments, isLoading: loadingMine } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments/me"],
  });

  // Advance shipment status demo mutation
  const advanceMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/shipments/${id}/advance`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/me"] });
      toast({ title: "Status updated" });
    },
  });

  // Collaboration interest registration mutation
  const registerInterest = useMutation({
    mutationFn: async (input: InterestForm) => {
      const response = await apiRequest("POST", "/api/logistics-collaboration/interests", input);
      return response.json() as Promise<{ id: string; status: string; message: string }>;
    },
    onSuccess: () => {
      setRegistered(true);
      toast({
        title: "Interest registered",
        description: "We will contact you when logistics collaboration pilots open in your region.",
      });
    },
    onError: () => {
      toast({
        title: "Registration failed",
        description: "Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  const handleTrack = () => {
    const id = trackInput.trim().toUpperCase();
    if (!id) return;
    navigate(`/ship/track/${encodeURIComponent(id)}`);
  };

  const filteredPartners = logisticsPartners.filter((partner) => {
    if (selectedType !== "all" && partner.type !== selectedType) return false;
    if (searchQuery && !partner.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatPriceRange = (range: string) => {
    if (range.includes("Custom")) return "Custom Quote";
    return range
      .split("-")
      .map((value) => format(Number(value), { includeCode: true }))
      .join(" – ");
  };

  const renderPartnerCard = (partner: LogisticsPartner) => {
    const TypeIcon = typeIcons[partner.type] || Truck;
    return (
      <Card 
        key={partner.id} 
        className="hover-elevate cursor-pointer border border-border/80 rounded-xl shadow-sm hover:shadow-md transition-all"
        onClick={() => setSelectedPartner(partner)}
        data-testid={`card-partner-${partner.id}`}
      >
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2.5 rounded-lg shrink-0 ${typeColors[partner.type]}`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm sm:text-base text-foreground truncate">{partner.name}</h3>
                <p className="text-xs font-bold text-muted-foreground capitalize">{partner.type.replace("-", " ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-black">{partner.rating}</span>
            </div>
          </div>

          <p className="text-xs font-bold text-foreground/80 mb-2.5 line-clamp-2">{partner.coverage}</p>

          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {partner.coldChain && (
              <Badge variant="secondary" className="text-[11px] font-black px-2 py-0.5 rounded-md">
                <Snowflake className="w-3.5 h-3.5 mr-1" />
                Cold Chain
              </Badge>
            )}
            {partner.tracking && (
              <Badge variant="secondary" className="text-[11px] font-black px-2 py-0.5 rounded-md">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Tracking
              </Badge>
            )}
            {partner.insurance && (
              <Badge variant="secondary" className="text-[11px] font-black px-2 py-0.5 rounded-md">
                <Shield className="w-3.5 h-3.5 mr-1" />
                Insured
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-border/40">
            <div className="flex items-center gap-1 font-bold text-muted-foreground min-w-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{partner.deliveryTime}</span>
            </div>
            <span className="font-black text-sm text-primary text-right">
              {formatPriceRange(partner.priceRange)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPartnerDetail = () => {
    if (!selectedPartner) return null;
    const TypeIcon = typeIcons[selectedPartner.type] || Truck;

    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full max-h-[90vh] overflow-auto rounded-3xl border-2 shadow-2xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${typeColors[selectedPartner.type]}`}>
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">{selectedPartner.name}</CardTitle>
                  <p className="text-sm font-bold text-muted-foreground capitalize">
                    {selectedPartner.type.replace("-", " ")} Shipping
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPartner(null)}
                data-testid="button-close-detail"
                className="font-bold"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{selectedPartner.rating}</span>
              </div>
              <span className="text-muted-foreground font-medium">
                {selectedPartner.deliveryCount.toLocaleString()} deliveries
              </span>
            </div>

            <div>
              <h4 className="font-bold mb-1.5">Coverage</h4>
              <p className="text-sm text-muted-foreground">{selectedPartner.coverage}</p>
            </div>

            <div>
              <h4 className="font-bold mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPartner.features.map((feature) => (
                  <Badge key={feature} variant="outline" className="font-bold">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" />
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/60 rounded-xl">
                <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  Delivery Time
                </div>
                <div className="font-black text-sm">{selectedPartner.deliveryTime}</div>
              </div>
              <div className="p-3 bg-muted/60 rounded-xl">
                <div className="text-xs font-bold text-muted-foreground mb-1">Price Range</div>
                <div className="font-black text-sm text-primary">
                  {formatPriceRange(selectedPartner.priceRange)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedPartner.coldChain && (
                <div className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-950 rounded-xl">
                  <Thermometer className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold">Cold Chain Available</span>
                </div>
              )}
              {selectedPartner.tracking && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold">Real-time Tracking</span>
                </div>
              )}
              {selectedPartner.insurance && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-xl">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold">Insurance Included</span>
                </div>
              )}
            </div>

            <Button className="w-full h-11 text-sm font-black uppercase tracking-wider rounded-xl bg-amber-400 hover:bg-amber-500 text-black shadow-md" data-testid="button-select-partner" onClick={() => { setSelectedPartner(null); handleTabChange("shipping"); }}>
              Book with this Partner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <SplitMapLayout mapProps={{ title: "Sellers along your routes", subtitle: "Tap a pin to view seller listings" }}>
        <div className="w-full px-3 py-3 sm:px-5 sm:py-4 lg:px-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight" data-testid="text-logistics-heading">
                  {t("logistics.title", "Logistics & Delivery")}
                </h1>
                <ComingSoonBadge className="!px-3 !py-1.5 !text-sm sm:!text-base" />
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground/80 mt-1">
                {t("logistics.subtitle", "Book parcel shipping, explore trusted carriers, join milk runs, and collaborate on shared regional transport.")}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleTabChange("shipping")}
              className="h-9 px-4 text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-md rounded-lg shrink-0"
              data-testid="button-quick-send"
            >
              <Plus className="h-4 w-4 mr-1" />{t("ship.send_parcel_button", "Send Parcel")}
            </Button>
          </div>

          {/* Quick Tracking Bar */}
          <Card className="bg-amber-500/10 border border-amber-300 rounded-xl shadow-sm">
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder={t("ship_track.tracking_number_placeholder", "Enter tracking ID or order reference (e.g. AGC-789456)...")}
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                  className="border-0 bg-transparent focus-visible:ring-0 px-0 text-sm font-black font-mono h-9"
                  data-testid="input-track-quick"
                />
                <Button 
                  size="sm"
                  onClick={handleTrack} 
                  disabled={!trackInput.trim()} 
                  className="h-9 px-4 text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-sm rounded-lg"
                  data-testid="button-track-quick"
                >
                  {t("ship_track.track_button", "Track")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Unified Tabs */}
          <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="h-auto flex-wrap gap-1.5 border border-emerald-300 bg-emerald-50/90 p-1.5 rounded-xl shadow-sm justify-start">
              <TabsTrigger 
                value="partners" 
                className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs"
                data-testid="tab-partners"
              >
                <Truck className="w-4 h-4 mr-1.5" />
                {t("logistics.partners_tab", "Logistics Partners")}
              </TabsTrigger>

              <TabsTrigger 
                value="shipping" 
                className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs"
                data-testid="tab-shipping"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {t("ship.shipping_management", "Shipping & Send")}
              </TabsTrigger>

              <TabsTrigger 
                value="milk-run" 
                className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs"
                data-testid="tab-milk-run"
              >
                <Route className="w-4 h-4 mr-1.5" />
                {t("logistics.milk_run_tab", "Milk Run Routes")}
              </TabsTrigger>

              <TabsTrigger 
                value="tracking" 
                className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs"
                data-testid="tab-tracking"
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                {t("logistics.tracking_tab", "Track Shipment")}
              </TabsTrigger>

              <TabsTrigger 
                value="collaboration" 
                className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs"
                data-testid="tab-collaboration"
              >
                <Handshake className="w-4 h-4 mr-1.5" />
                {t("logistics.collaboration_tab", "Collaboration Hub")}
              </TabsTrigger>
            </TabsList>

            {/* 1. LOGISTICS PARTNERS TAB */}
            <TabsContent value="partners" className="space-y-4">
              <div className="flex flex-col xl:flex-row gap-2.5 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("logistics.search_placeholder", "Search logistics partners...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm font-bold rounded-lg border"
                    data-testid="input-search-partners"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "international", "national", "hyperlocal", "cold-chain", "freight"].map((type) => (
                    <Button
                      key={type}
                      variant={selectedType === type ? "default" : "outline"}
                      size="sm"
                      className={`h-9 px-3 text-xs sm:text-sm font-black rounded-lg border capitalize ${selectedType === type ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""}`}
                      onClick={() => setSelectedType(type)}
                      data-testid={`button-filter-${type}`}
                    >
                      {type === "all" ? "All" : type.replace("-", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(245px,1fr))] gap-3">
                {filteredPartners.map(renderPartnerCard)}
              </div>

              {filteredPartners.length === 0 && (
                <Card className="py-6 sm:py-12">
                  <CardContent className="text-center">
                    <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Partners Found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Carrier Aggregator Ecosystem */}
              <div className="mt-5 space-y-3">
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Integrated Carrier Network
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
                  {[
                    { name: "Royal Mail", icon: Truck, color: "text-red-600", svc: "UK · Tracked 24/48", from: 4.99 },
                    { name: "Evri", icon: Truck, color: "text-blue-600", svc: "UK · Economical courier", from: 3.95 },
                    { name: "DPD Local", icon: Zap, color: "text-orange-500", svc: "UK + Europe · Next-day", from: 9.99 },
                    { name: "Stuart Same-Day", icon: Zap, color: "text-amber-500", svc: "UK · Same-day local", from: 14.99 },
                    { name: "AgriConnect Cold-Chain Network", icon: Snowflake, color: "text-blue-500", svc: "UK & EU · Refrigerated 2–8°C", from: 18 },
                    { name: "Farmer Milk Run", icon: Leaf, color: "text-green-600", svc: "UK · Shared route · Lowest CO₂", from: 6.99 },
                    { name: "UPS", icon: Truck, color: "text-amber-700", svc: "Worldwide · Tracked next-day", from: 12.5 },
                    { name: "FedEx International Priority", icon: Globe, color: "text-purple-600", svc: "Worldwide · 1–3 day air", from: 25 },
                    { name: "DHL Express Worldwide", icon: Globe, color: "text-yellow-600", svc: "Worldwide · Cold-chain capable", from: 28 },
                  ].map((p) => {
                    const Icon = p.icon;
                    return (
                      <Card key={p.name} className="border hover:border-primary/50 transition-colors shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className={`h-5 w-5 ${p.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.svc}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-primary">from {format(p.from, { includeCode: true })}</p>
                            <Badge variant="secondary" className="text-[9px] h-4 font-black">ACTIVE</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* 2. SHIPPING & SEND MANAGEMENT TAB */}
            <TabsContent value="shipping" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
                {/* Send Parcel Wizard */}
                <Card className="border rounded-2xl shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-lg sm:text-xl font-black flex items-center gap-2 text-foreground">
                      <Send className="h-5 w-5 text-primary" />
                      {t("ship.send_parcel_button", "Send a Parcel")}
                    </CardTitle>
                    <p className="text-xs font-bold text-muted-foreground">
                      Instant multi-carrier rate calculation and scheduled pickup booking.
                    </p>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <SendParcelWizard />
                  </CardContent>
                </Card>

                {/* Active Shipments & Orders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      {t("ship.active_parcels", "My Active Shipments")}
                    </h3>
                    {myShipments && myShipments.length > 0 && (
                      <Badge variant="outline" className="font-bold text-xs">{myShipments.length}</Badge>
                    )}
                  </div>

                  {loadingMine ? (
                    <div className="space-y-3">{[0, 1].map((i) => (<div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />))}</div>
                  ) : !myShipments || myShipments.length === 0 ? (
                    <Card className="border rounded-2xl shadow-xs">
                      <CardContent className="p-6 text-center space-y-3">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                        <p className="text-sm font-bold text-muted-foreground">{t("ship.no_parcels_yet", "No active shipments found.")}</p>
                        <p className="text-xs text-muted-foreground">Book a shipment using the wizard to generate tracking labels.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    myShipments.map((s) => (
                      <Card key={s.id} className="border-2 rounded-2xl shadow-sm hover:border-primary/50 transition-all">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-xs sm:text-sm font-bold">{s.trackingId}</p>
                                <Badge className={`${statusColor[s.status]} border-0 text-[10px]`}>{statusLabel[s.status]}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.partnerName} · {s.items.length} item(s) · {s.weightKg.toFixed(1)} kg</p>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="inline-flex items-center gap-1 font-medium"><MapPin className="h-3 w-3 text-muted-foreground" />{s.pickup.city}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <span className="inline-flex items-center gap-1 font-medium text-primary"><MapPin className="h-3 w-3" />{s.drop.city}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-sm">{format(s.price, { sourceCurrency: s.currency || "GBP", includeCode: true })}</p>
                              <Button size="sm" variant="outline" className="h-7 text-xs font-bold mt-1" onClick={() => navigate(`/ship/track/${s.trackingId}`)}>
                                {t("ship.track_parcel_button", "Track")}
                              </Button>
                            </div>
                          </div>
                          {s.status !== "delivered" && s.status !== "cancelled" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-foreground font-bold p-0" onClick={() => advanceMut.mutate(s.id)} disabled={advanceMut.isPending}>
                              {t("ship.update_status_button", "Advance Status (Demo)")} →
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 3. MILK RUN ROUTES TAB */}
            <TabsContent value="milk-run" className="space-y-4">
              <Card className="bg-primary/5 border-primary/20 rounded-2xl shadow-xs">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Route className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-foreground">What is Milk Run Logistics?</h3>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        Smart batching system that combines multiple pickups and deliveries into optimized routes. 
                        Save up to 60-70% on delivery costs and reduce carbon footprint by 75%.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {urgentOrders.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-500" />
                      <CardTitle className="text-base font-black">Urgent Orders Available for Route Consolidation</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {urgentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-orange-200/60">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <div>
                            <div className="font-bold text-sm">{order.buyer} needs {order.quantity}{order.unit} {order.product}</div>
                            <div className="text-xs text-muted-foreground">Deliver by {order.deliveryBy} to {order.location}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-primary">+{format(order.revenue, { includeCode: true })}</span>
                          <Button size="sm" className="font-bold rounded-lg" data-testid={`button-accept-${order.id}`}>Accept</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {milkRunRoutes.map((route) => (
                  <Card key={route.id} className="rounded-2xl border-2 shadow-xs" data-testid={`card-route-${route.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-xl">
                            <Route className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-black">{route.name}</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium">{route.vehicle} | {route.vehicleNumber}</p>
                          </div>
                        </div>
                        <Badge variant={route.status === "in-progress" ? "default" : "secondary"} className="font-black">
                          {route.status === "in-progress" ? "Live" : route.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-muted/60 rounded-xl">
                          <div className="text-base sm:text-lg font-black text-primary">{format(route.costPerFarmer, { includeCode: true })}</div>
                          <div className="text-[10px] font-bold text-muted-foreground">Per Farmer</div>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-950 rounded-xl">
                          <div className="text-base sm:text-lg font-black text-green-600">{route.savings}%</div>
                          <div className="text-[10px] font-bold text-muted-foreground">Savings</div>
                        </div>
                        <div className="p-2 bg-muted/60 rounded-xl">
                          <div className="text-base sm:text-lg font-black">{route.efficiency}%</div>
                          <div className="text-[10px] font-bold text-muted-foreground">Capacity</div>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-xl">
                          <div className="flex items-center justify-center gap-1">
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-base sm:text-lg font-black text-emerald-600">{route.carbonReduction}%</span>
                          </div>
                          <div className="text-[10px] font-bold text-muted-foreground">CO₂ Saved</div>
                        </div>
                      </div>

                      {route.temperature !== null && (
                        <div className="flex items-center gap-2 p-2.5 bg-cyan-50 dark:bg-cyan-950 rounded-xl">
                          <Thermometer className="w-4 h-4 text-cyan-600" />
                          <span className="text-xs font-bold">Cold Chain Active: {route.temperature}°C</span>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3.5 h-3.5 text-green-500" />
                          Pickups ({route.pickups.length})
                        </h4>
                        <div className="space-y-1.5">
                          {route.pickups.map((pickup, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  pickup.status === "completed" ? "bg-green-500" : 
                                  pickup.status === "in-progress" ? "bg-blue-500 animate-pulse" : "bg-gray-300"
                                }`} />
                                <span className="text-muted-foreground font-mono">{pickup.time}</span>
                                <span className="font-bold">{pickup.farmer}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] font-bold">{pickup.items}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{route.driver}</span>
                        </div>
                        <Button size="sm" className="h-8 text-xs font-bold rounded-lg" data-testid={`button-join-route-${route.id}`}>
                          Join Route <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 4. TRACK SHIPMENT TAB */}
            <TabsContent value="tracking" className="space-y-4">
              <Card className="rounded-2xl border shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="max-w-2xl mx-auto text-center space-y-3">
                    <Package className="w-9 h-9 mx-auto text-primary" />
                    <h3 className="text-xl font-black text-foreground">Live Shipment Tracking</h3>
                    <p className="text-sm font-bold text-muted-foreground">
                      Enter any AgriConnect parcel ID, order number, or partner tracking code to view live status.
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter tracking ID (e.g. AGC-789456)"
                        value={trackInput}
                        onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                        className="flex-1 h-10 text-sm font-mono font-bold rounded-lg border"
                        data-testid="input-tracking-id-full"
                      />
                      <Button size="sm" onClick={handleTrack} disabled={!trackInput.trim()} className="h-10 px-5 font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black rounded-lg shadow-sm" data-testid="button-track-full">
                        Track
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Tracking Progress Preview */}
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle className="text-base font-black flex items-center justify-between">
                    <span>Sample Live Route Progress</span>
                    <Badge className="bg-blue-500 font-bold text-xs">In Transit</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-3">
                    {[
                      { status: "Dispatched from Farm / Hub", time: "08:30 AM", done: true },
                      { status: "Cold-chain pre-cooling check passed (4°C)", time: "09:15 AM", done: true },
                      { status: "In transit (Live route tracking active)", time: "Live", done: false, current: true },
                      { status: "Regional distribution hub arrival", time: "Pending", done: false },
                      { status: "Final doorstep delivery", time: "Pending", done: false },
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          step.done ? "bg-green-500" : step.current ? "bg-blue-500 animate-pulse" : "bg-muted"
                        }`}>
                          {step.done && <CheckCircle className="w-4 h-4 text-white" />}
                          {step.current && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm ${step.current ? "font-black text-foreground" : "font-bold text-muted-foreground"}`}>{step.status}</div>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground">{step.time}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 5. LOGISTICS COLLABORATION TAB */}
            <TabsContent value="collaboration" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {opportunities.map((item) => (
                  <Card key={item.title} className="border rounded-xl shadow-xs">
                    <CardContent className="p-4 space-y-1.5">
                      <div className="p-2.5 bg-primary/10 rounded-xl w-fit">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-black text-base text-foreground">{item.title}</h3>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
                {/* Interest Registration Form */}
                <Card className="border rounded-2xl shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-xl font-black text-foreground">
                      Register Logistics Collaboration Interest
                    </CardTitle>
                    <p className="text-xs font-bold text-muted-foreground">
                      Join regional pilots for shared freight, cold-chain routing, or warehouse fulfilment hubs.
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    {registered ? (
                      <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-300">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
                        <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-200">Interest Registered Successfully!</h4>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Our logistics coordinator will reach out when partner onboarding opens in your region.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setRegistered(false)} className="font-bold">
                          Submit another inquiry
                        </Button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!form.contactName || !form.email) {
                            toast({ title: "Please fill required fields", variant: "destructive" });
                            return;
                          }
                          registerInterest.mutate(form);
                        }}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Contact Name *</Label>
                            <Input
                              required
                              value={form.contactName}
                              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                              placeholder="Your full name"
                              className="rounded-xl border-2"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Email Address *</Label>
                            <Input
                              type="email"
                              required
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              placeholder="name@business.com"
                              className="rounded-xl border-2"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Organisation / Company Name</Label>
                            <Input
                              value={form.organisationName}
                              onChange={(e) => setForm({ ...form, organisationName: e.target.value })}
                              placeholder="Business name"
                              className="rounded-xl border-2"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Phone Number</Label>
                            <Input
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              placeholder="+44 7..."
                              className="rounded-xl border-2"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Collaboration Type</Label>
                            <Select
                              value={form.collaborationType}
                              onValueChange={(val) => setForm({ ...form, collaborationType: val })}
                            >
                              <SelectTrigger className="rounded-xl border-2">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="carrier">Fleet / Vehicle Carrier</SelectItem>
                                <SelectItem value="warehouse">Fulfilment Hub / Warehouse</SelectItem>
                                <SelectItem value="cold-chain">Refrigerated / Cold-Chain</SelectItem>
                                <SelectItem value="seller-shipper">Farm / Producer Shipper</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black">Operating Region</Label>
                            <Input
                              value={form.region}
                              onChange={(e) => setForm({ ...form, region: e.target.value })}
                              placeholder="e.g. Yorkshire, Devon, Midlands"
                              className="rounded-xl border-2"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-black">Fleet / Logistics Capability Details</Label>
                          <Textarea
                            value={form.details}
                            onChange={(e) => setForm({ ...form, details: e.target.value })}
                            placeholder="Tell us about your fleet, daily routes, refrigeration capabilities, or warehouse storage..."
                            className="rounded-lg border min-h-20"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={registerInterest.isPending}
                          className="w-full h-10 text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-sm rounded-lg"
                        >
                          {registerInterest.isPending ? "Submitting..." : "Submit Collaboration Request"}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Launch Steps */}
                <Card className="border rounded-2xl shadow-sm bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-black text-foreground">Pilot Onboarding Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {launchSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-foreground/90 mt-0.5">{step}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {selectedPartner && renderPartnerDetail()}
        </div>
      </SplitMapLayout>
    </div>
  );
}
