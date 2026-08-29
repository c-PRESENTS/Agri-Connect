import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  HeartHandshake, 
  MapPin, 
  Clock, 
  Utensils, 
  Home, 
  Store, 
  Factory, 
  PartyPopper, 
  Gift,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Globe,
  Leaf,
  Users,
  Target,
  BarChart3,
  MessageSquarePlus,
  Navigation,
  Phone,
  ArrowRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect as useEffectMap } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShareCareListing, ShareCareSummary } from "@shared/schema";

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffectMap(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const urgentIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg animate-pulse"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const mediumIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-lg"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const safeIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div class="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const URGENCY_ICON: Record<string, L.DivIcon> = {
  urgent: urgentIcon, medium: mediumIcon, safe: safeIcon,
};
const URGENCY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500", medium: "border-l-yellow-500", safe: "border-l-green-500",
};
const URGENCY_BADGE: Record<string, string> = {
  urgent: "text-red-600", medium: "text-yellow-600", safe: "text-green-600",
};

type ShareCareFormState = {
  sourceType: ShareCareListing["sourceType"];
  name: string;
  category: string;
  quantity: string;
  unit: string;
  isFree: boolean;
  price: string;
  location: string;
  emoji: string;
  urgency: ShareCareListing["urgency"];
  expiresInHours: string;
  dietaryTags: string[];
};

const EMPTY_SHARE_FORM: ShareCareFormState = {
  sourceType: "home",
  name: "",
  category: "",
  quantity: "",
  unit: "kg",
  isFree: true,
  price: "",
  location: "",
  emoji: "🎁",
  urgency: "safe",
  expiresInHours: "4",
  dietaryTags: [] as string[],
};

function shareCareErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) return "Unable to complete this Share & Care request.";
  const responseText = reason.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(responseText) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error.replace(/^Validation error:\s*/, "") : responseText;
  } catch {
    return responseText;
  }
}

export default function ShareCarePage() {
  const { currency, format } = useCurrency();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("marketplace");
  const [shareForm, setShareForm] = useState(EMPTY_SHARE_FORM);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(() => new URLSearchParams(window.location.search).get("item"));
  const listingRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { data: shareItems = [], isLoading: loadingShare } = useQuery<ShareCareListing[]>({
    queryKey: ["/api/share-care?status=available"],
  });
  const { data: shareSummary } = useQuery<ShareCareSummary>({
    queryKey: ["/api/share-care/summary"],
  });
  const createListing = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) throw new Error("Sign in before sharing an item.");
      const quantity = Number(shareForm.quantity);
      const price = shareForm.isFree ? 0 : Number(shareForm.price);
      const expiresInHours = Number(shareForm.expiresInHours);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Enter a valid whole-number quantity.");
      if (!shareForm.isFree && (!Number.isFinite(price) || price <= 0)) throw new Error("Enter a price or mark the item as free.");
      if (!Number.isFinite(expiresInHours) || expiresInHours <= 0) throw new Error("Enter a valid expiry time.");
      const response = await apiRequest("POST", "/api/share-care", {
        ...shareForm,
        quantity,
        price,
        expiresInHours,
      });
      return response.json() as Promise<ShareCareListing>;
    },
    onSuccess: async (listing) => {
      await Promise.all([
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/share-care") }),
        queryClient.invalidateQueries({ queryKey: ["/api/platform/stats"] }),
      ]);
      setShareForm(EMPTY_SHARE_FORM);
      setShareMessage("Your Share & Care listing is now live.");
      setActiveTab("marketplace");
      setSelectedItemId(listing.id);
      window.history.replaceState(null, "", `/share-care?item=${encodeURIComponent(listing.id)}`);
      window.setTimeout(() => listingRefs.current[listing.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    },
    onError: (reason) => setShareMessage(shareCareErrorMessage(reason)),
  });
  const reserveListing = useMutation({
    mutationFn: async (listingId: string) => {
      if (!isAuthenticated) {
        navigate(`/login?returnTo=${encodeURIComponent(`/share-care?item=${listingId}`)}`);
        throw new Error("Sign in to reserve this item.");
      }
      const response = await apiRequest("POST", `/api/share-care/${encodeURIComponent(listingId)}/reserve`, {});
      return response.json() as Promise<ShareCareListing>;
    },
    onSuccess: async () => {
      setShareMessage("Item reserved. Contact the donor to arrange collection.");
      await Promise.all([
        queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/share-care") }),
        queryClient.invalidateQueries({ queryKey: ["/api/platform/stats"] }),
      ]);
    },
    onError: (reason) => {
      if (isAuthenticated) setShareMessage(shareCareErrorMessage(reason));
    },
  });
  useEffect(() => {
    if (!selectedItemId || shareItems.length === 0) return;
    window.setTimeout(() => listingRefs.current[selectedItemId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, [selectedItemId, shareItems]);
  const mapCenter: [number, number] = useMemo(() => {
    if (shareItems.length === 0) return [20.5937, 78.9629];
    const lat = shareItems.reduce((s, i) => s + i.latitude, 0) / shareItems.length;
    const lng = shareItems.reduce((s, i) => s + i.longitude, 0) / shareItems.length;
    return [lat, lng];
  }, [shareItems]);
  const mapZoom = useMemo(() => {
    if (shareItems.length === 0) return 5;
    const latitudes = shareItems.map((item) => item.latitude);
    const longitudes = shareItems.map((item) => item.longitude);
    const latitudeSpread = Math.max(...latitudes) - Math.min(...latitudes);
    const longitudeSpread = Math.max(...longitudes) - Math.min(...longitudes);
    return Math.max(latitudeSpread, longitudeSpread) < 0.15 ? 12 : 6;
  }, [shareItems]);
  const viewerRank = user?.id
    ? (shareSummary?.leaderboard.findIndex((entry) => entry.donorId === user.id) ?? -1) + 1
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <SplitMapLayout mapProps={{ title: "Donors & sellers near you", subtitle: "Live database-backed rescue listings" }}>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HeartHandshake className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("share_care.title", "Share & Care")}</h1>
            <ComingSoonBadge />
          </div>
          <p className="text-muted-foreground text-lg">
            {t("share_care.subtitle", "Community Food Rescue - Reducing waste, feeding the community.")}
          </p>
          {shareMessage && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {shareMessage}
            </p>
          )}
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto grid-cols-2 border border-emerald-200 bg-emerald-50 p-1.5 shadow-sm md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="marketplace" className="py-3 font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60">
              <Store className="mr-2 h-5 w-5" />
              {t("share_care.marketplace_tab", "Marketplace")}
            </TabsTrigger>
            <TabsTrigger value="list" className="py-3 font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60">
              <Gift className="mr-2 h-5 w-5" />
              {t("share_care.share_food_tab", "Share Food")}
            </TabsTrigger>
            <TabsTrigger value="ngo" className="py-3 font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60">
              <Users className="mr-2 h-5 w-5" />
              {t("share_care.charity_tab", "Charity Portal")}
            </TabsTrigger>
            <TabsTrigger value="impact" className="py-3 font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60">
              <TrendingUp className="mr-2 h-5 w-5" />
              {t("share_care.sdg_impact_tab", "SDG Impact")}
            </TabsTrigger>
            <TabsTrigger value="safety" className="hidden py-3 font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-amber-500/60 lg:flex">
              <ShieldCheck className="mr-2 h-5 w-5" />
              {t("share_care.safety_tab", "Safety Rules")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-primary/5">
                  <CardContent className="p-0">
                    <div className="aspect-[21/9] relative bg-muted">
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        className="h-full w-full z-0"
                        zoomControl={false}
                        key={`map-${shareItems.map((item) => `${item.id}:${item.latitude}:${item.longitude}`).join("|")}`}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <InvalidateSizeOnMount />
                        {shareItems.map((item) => (
                          <Marker
                            key={item.id}
                            position={[item.latitude, item.longitude]}
                            icon={URGENCY_ICON[item.urgency] ?? safeIcon}
                          >
                            <Popup>
                              <div className="p-1 min-w-[160px]">
                                <p className="font-bold text-sm flex items-center gap-1">
                                  <span>{item.emoji}</span> {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.qty} {item.unit} • {item.donor}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.location}</p>
                                <p className={`text-xs font-bold mt-1 ${URGENCY_BADGE[item.urgency]}`}>
                                  Expires in {item.expiresIn}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                      
                      <div className="absolute top-4 left-4 z-10 pointer-events-none">
                        <div className="bg-background/90 backdrop-blur p-3 rounded-lg border shadow-lg pointer-events-auto">
                          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <Navigation className="w-3 h-3" />
                            Live Rescue Map
                          </h3>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[10px] font-medium text-muted-foreground">Urgent (&lt;1h)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                              <span className="text-[10px] font-medium text-muted-foreground">1-3 hours</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                              <span className="text-[10px] font-medium text-muted-foreground">3+ hours</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold" data-testid="text-share-count">
                    Available now ({shareItems.length} listings)
                  </h2>
                  <Button variant="outline" size="sm" data-testid="button-share-filters">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {loadingShare ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : shareItems.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground text-sm">
                    No live rescue listings right now — please check back shortly.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shareItems.map((listing) => (
                      <Card
                        key={listing.id}
                        ref={(node) => { listingRefs.current[listing.id] = node; }}
                        className={`hover-elevate transition-all border-l-4 ${URGENCY_BORDER[listing.urgency] ?? "border-l-green-500"} ${selectedItemId === listing.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        data-testid={`card-share-${listing.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base line-clamp-1 flex items-center gap-2">
                              <span className="text-lg">{listing.emoji}</span>
                              {listing.name}
                            </CardTitle>
                            <Badge variant="secondary">
                              {listing.isFree ? "FREE" : format(listing.price, { sourceCurrency: listing.currency })}
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center gap-1">
                            <Store className="w-3 h-3" /> {listing.donor} • {listing.location}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2 space-y-3">
                          <div className={`flex items-center gap-2 text-sm font-medium ${URGENCY_BADGE[listing.urgency]}`}>
                            <Clock className="w-4 h-4" />
                            Expires in {listing.expiresIn} • posted {listing.postedAgo}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider capitalize">
                              {listing.qty} {listing.unit}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider capitalize">
                              {listing.category}
                            </Badge>
                            {listing.donorIsVerified && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wider border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30"
                              >
                                Verified donor
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                        <div className="p-4 pt-0 flex gap-2">
                          <Button
                            className="flex-1"
                            size="sm"
                            data-testid={`button-reserve-${listing.id}`}
                            disabled={reserveListing.isPending}
                            onClick={() => reserveListing.mutate(listing.id)}
                          >
                            {reserveListing.isPending && reserveListing.variables === listing.id ? "Reserving…" : "Reserve now"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            data-testid={`button-directions-${listing.id}`}
                            asChild
                          >
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=14/${listing.latitude}/${listing.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open in maps"
                            >
                              <Navigation className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{isAuthenticated ? "Your Share & Care Activity" : "Community Activity"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-sm font-medium mb-1">
                        {isAuthenticated
                          ? "Calculated from your live listings and reservations."
                          : "Calculated from live Share & Care records."}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Listings shared</p>
                          <p className="text-lg font-bold text-primary">
                            {shareSummary?.viewer?.listingsShared ?? shareSummary?.community.totalListings ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Active listings</p>
                          <p className="text-lg font-bold text-primary">
                            {shareSummary?.viewer?.activeListings ?? shareSummary?.community.activeListings ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Units offered</p>
                          <p className="text-lg font-bold text-primary">
                            {shareSummary?.viewer?.quantityOffered ?? shareSummary?.community.quantityOffered ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reservations</p>
                          <p className="text-lg font-bold text-primary">
                            {shareSummary?.viewer?.reservations ?? shareSummary?.community.reservations ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rescue Leaderboard</CardTitle>
                    <CardDescription>Top waste warriors this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(shareSummary?.leaderboard ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No database-backed donor activity yet.</p>
                    ) : (
                      (shareSummary?.leaderboard ?? []).map((entry, index) => (
                        <div key={entry.donorId} className="flex items-center gap-3">
                          <span className="text-lg">{["🥇", "🥈", "🥉"][index] ?? "🌱"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entry.donorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.listingsShared} listings • {entry.quantityOffered} units
                            </p>
                          </div>
                          {entry.donorIsVerified && <Badge variant="outline" className="text-[10px]">Verified</Badge>}
                        </div>
                      ))
                    )}
                    {viewerRank > 0 && (
                      <div className="pt-2 border-t text-center">
                        <p className="text-xs text-muted-foreground">Your current rank: #{viewerRank}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Share Surplus Food</CardTitle>
                <CardDescription>Enter details of the food you want to share with the community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={shareForm.sourceType === "restaurant" ? "default" : "outline"} onClick={() => setShareForm({ ...shareForm, sourceType: "restaurant" })} className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1">
                        <Utensils className="w-4 h-4 text-primary" />
                        <span className="text-xs">Restaurant</span>
                      </Button>
                      <Button type="button" variant={shareForm.sourceType === "home" ? "default" : "outline"} onClick={() => setShareForm({ ...shareForm, sourceType: "home" })} className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-xs">Home</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input value={shareForm.name} onChange={(event) => setShareForm({ ...shareForm, name: event.target.value })} placeholder="e.g. Mixed Fruit Basket" data-testid="input-share-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Food category</Label>
                    <Input value={shareForm.category} onChange={(event) => setShareForm({ ...shareForm, category: event.target.value })} placeholder="e.g. fruit, bakery" data-testid="input-share-category" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min="1" step="1" value={shareForm.quantity} onChange={(event) => setShareForm({ ...shareForm, quantity: event.target.value })} placeholder="e.g. 5" data-testid="input-share-quantity" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={shareForm.unit} onChange={(event) => setShareForm({ ...shareForm, unit: event.target.value })} placeholder="kg, portions, packs…" data-testid="input-share-unit" />
                  </div>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <div className="flex gap-2">
                      <Input type="number" min="0" step="0.01" value={shareForm.price} onChange={(event) => setShareForm({ ...shareForm, price: event.target.value })} placeholder={currency} className="flex-1" disabled={shareForm.isFree} data-testid="input-share-price" />
                      <div className="flex items-center gap-2 border rounded-md px-3 bg-muted/30">
                        <Checkbox id="is-free" checked={shareForm.isFree} onCheckedChange={(checked) => setShareForm({ ...shareForm, isFree: checked === true, price: checked === true ? "" : shareForm.price })} />
                        <Label htmlFor="is-free" className="text-xs">FREE</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Collection location</Label>
                    <Input value={shareForm.location} onChange={(event) => setShareForm({ ...shareForm, location: event.target.value })} placeholder="Uses your profile location when empty" data-testid="input-share-location" />
                  </div>
                  <div className="space-y-2">
                    <Label>Available for</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0.5" max="720" step="0.5" value={shareForm.expiresInHours} onChange={(event) => setShareForm({ ...shareForm, expiresInHours: event.target.value })} data-testid="input-share-expiry" />
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dietary Info</Label>
                  <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/10">
                    {["Vegetarian", "Vegan", "Gluten-Free", "Nut-Free"].map(tag => (
                      <div key={tag} className="flex items-center gap-2">
                        <Checkbox id={`tag-${tag}`} checked={shareForm.dietaryTags.includes(tag)} onCheckedChange={(checked) => setShareForm({ ...shareForm, dietaryTags: checked === true ? [...shareForm.dietaryTags, tag] : shareForm.dietaryTags.filter((item) => item !== tag) })} />
                        <Label htmlFor={`tag-${tag}`} className="text-xs">{tag}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <div className="text-xs text-yellow-800 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Food Safety Commitment</p>
                    <p>By listing, you confirm food was stored at safe temperatures and handled in a hygienic environment.</p>
                  </div>
                </div>

                <Button className="w-full h-12 text-lg" disabled={createListing.isPending} onClick={() => { setShareMessage(null); createListing.mutate(); }} data-testid="button-create-share-listing">
                  {createListing.isPending ? "Publishing…" : `List Now - Expires in ${shareForm.expiresInHours || "0"} hours`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ngo">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary">
                    <Users className="w-6 h-6" />
                    <CardTitle>Charity collaboration portal</CardTitle>
                  </div>
                  <CardDescription>No verified charity organisation is connected yet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-5 bg-background rounded-xl shadow-sm border space-y-2">
                    <h3 className="font-bold">Organisation onboarding is coming soon</h3>
                    <p className="text-sm text-muted-foreground">
                      Verified charities will be able to claim live donations after organisation verification is connected.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      Live database listings
                    </h4>
                    {shareItems.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <span aria-hidden="true">{listing.emoji}</span>
                          </div>
                          <div>
                            <p className="font-medium">{listing.name}</p>
                            <p className="text-xs text-muted-foreground">{listing.donor} • {listing.location}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{listing.qty} {listing.unit}</Badge>
                      </div>
                    ))}
                    {shareItems.length === 0 && (
                      <p className="text-sm text-muted-foreground">No live donor listings are available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Community data</CardTitle>
                  <CardDescription>Live Share & Care records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-xl space-y-1">
                      <Users className="w-5 h-5 text-blue-500" />
                      <p className="text-2xl font-bold">{shareSummary?.community.totalDonors ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Database donors</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Utensils className="w-5 h-5 text-green-500" />
                      <p className="text-2xl font-bold">{shareSummary?.community.activeListings ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Available listings</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Leaf className="w-5 h-5 text-emerald-500" />
                      <p className="text-2xl font-bold">{shareSummary?.community.quantityOffered ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Units offered</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Globe className="w-5 h-5 text-cyan-500" />
                      <p className="text-2xl font-bold">{shareSummary?.community.reservations ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Reservations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="impact">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: "active-listings",
                  title: "Available now",
                  metric: shareSummary?.community.activeListings ?? 0,
                  label: "Active rescue listings",
                  details: "Live listings that have not expired",
                  accent: "border-l-orange-500",
                },
                {
                  id: "database-donors",
                  title: "Community donors",
                  metric: shareSummary?.community.totalDonors ?? 0,
                  label: "Database-backed accounts",
                  details: "Active accounts with Share & Care records",
                  accent: "border-l-blue-500",
                },
                {
                  id: "quantity-offered",
                  title: "Food offered",
                  metric: shareSummary?.community.quantityOffered ?? 0,
                  label: "Listing units shared",
                  details: "Total quantity from non-cancelled records",
                  accent: "border-l-emerald-500",
                },
                {
                  id: "reservations",
                  title: "Community response",
                  metric: shareSummary?.community.reservations ?? 0,
                  label: "Active or collected reservations",
                  details: "Reservations recorded by the backend",
                  accent: "border-l-violet-500",
                },
              ].map(item => (
                <Card key={item.id} className={`overflow-hidden border-l-4 ${item.accent}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-3xl font-bold tracking-tight">{item.metric}</p>
                      <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                    </div>
                    <p className="text-xs bg-muted/30 p-2 rounded text-center">
                      {item.details}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              These figures come directly from Share & Care listings and reservations. Environmental and SDG conversions will be added only after a production measurement methodology is approved.
            </p>
          </TabsContent>

          <TabsContent value="safety">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      For Businesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "Health License verification mandatory",
                      "Kitchen hygiene rating must be visible",
                      "Temperature logs required for hot/cold food",
                      "Packaging must be food-grade standard"
                    ].map(rule => (
                      <div key={rule} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-primary" />
                      For Home Sharers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "ID & Phone verification required",
                      "Community food safety training completion",
                      "Profile ratings visible to all claimants",
                      "Acceptance of 'Share Responsibly' guidelines"
                    ].map(rule => (
                      <div key={rule} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <CardTitle className="text-base">Liability Disclaimer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-800 italic">
                    "Receiver acknowledges food is surplus or near-expiry. AgriConnect facilitates community connection only. Always inspect food before consuming and follow standard food safety guidelines."
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </SplitMapLayout>
    </div>
  );
}
