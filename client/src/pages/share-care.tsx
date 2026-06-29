import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";
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

type ShareItem = {
  id: string; name: string; unit: string; qty: number; donor: string;
  location: string; latitude: number; longitude: number; emoji: string;
  postedAgo: string; category: string; urgency: "urgent" | "medium" | "safe";
  expiresIn: string;
};

const URGENCY_ICON: Record<string, L.DivIcon> = {
  urgent: urgentIcon, medium: mediumIcon, safe: safeIcon,
};
const URGENCY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500", medium: "border-l-yellow-500", safe: "border-l-green-500",
};
const URGENCY_BADGE: Record<string, string> = {
  urgent: "text-red-600", medium: "text-yellow-600", safe: "text-green-600",
};

export default function ShareCarePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("marketplace");
  const { data: shareItems = [], isLoading: loadingShare } = useQuery<ShareItem[]>({
    queryKey: ["/api/share-care"],
  });
  const ukCenter: [number, number] = useMemo(() => {
    if (shareItems.length === 0) return [52.5, -1.0];
    const lat = shareItems.reduce((s, i) => s + i.latitude, 0) / shareItems.length;
    const lng = shareItems.reduce((s, i) => s + i.longitude, 0) / shareItems.length;
    return [lat, lng];
  }, [shareItems]);

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <SplitMapLayout mapProps={{ title: "Donors & sellers near you", subtitle: "Live rescue listings from across the UK" }}>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HeartHandshake className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("share_care.title", "Share & Care")}</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {t("share_care.subtitle", "Community Food Rescue - Reducing waste, feeding the community.")}
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 h-auto p-1 bg-muted/50">
            <TabsTrigger value="marketplace" className="py-2.5">
              <Store className="w-4 h-4 mr-2" />
              {t("share_care.marketplace_tab", "Marketplace")}
            </TabsTrigger>
            <TabsTrigger value="list" className="py-2.5">
              <Gift className="w-4 h-4 mr-2" />
              {t("share_care.share_food_tab", "Share Food")}
            </TabsTrigger>
            <TabsTrigger value="ngo" className="py-2.5">
              <Users className="w-4 h-4 mr-2" />
              {t("share_care.charity_tab", "Charity Portal")}
            </TabsTrigger>
            <TabsTrigger value="impact" className="py-2.5">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t("share_care.sdg_impact_tab", "SDG Impact")}
            </TabsTrigger>
            <TabsTrigger value="safety" className="py-2.5 hidden lg:flex">
              <ShieldCheck className="w-4 h-4 mr-2" />
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
                        center={ukCenter}
                        zoom={6}
                        className="h-full w-full z-0"
                        zoomControl={false}
                        key={`map-${shareItems.length}`}
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
                        className={`hover-elevate transition-all border-l-4 ${URGENCY_BORDER[listing.urgency] ?? "border-l-green-500"}`}
                        data-testid={`card-share-${listing.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base line-clamp-1 flex items-center gap-2">
                              <span className="text-lg">{listing.emoji}</span>
                              {listing.name}
                            </CardTitle>
                            <Badge variant="secondary">FREE</Badge>
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
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30"
                            >
                              Verified donor
                            </Badge>
                          </div>
                        </CardContent>
                        <div className="p-4 pt-0 flex gap-2">
                          <Button
                            className="flex-1"
                            size="sm"
                            data-testid={`button-reserve-${listing.id}`}
                          >
                            Reserve now
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
                    <CardTitle className="text-lg">Your Impact Tracker</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-sm font-medium mb-1 italic">"You've rescued 12 meals this month!"</p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Saved</p>
                          <p className="text-lg font-bold text-primary">£42.00</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prevented Waste</p>
                          <p className="text-lg font-bold text-primary">8kg</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rescue Leaderboard</CardTitle>
                    <CardDescription>Top waste warriors this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { name: "Taj Palace", score: "450 shared", icon: "🥇" },
                      { name: "Sunshine Bakery", score: "320 shared", icon: "🥈" },
                      { name: "Priya Sharma", score: "85 shared", icon: "🥉" }
                    ].map((user, i) => (
                      <div key={user.name} className="flex items-center gap-3">
                        <span className="text-lg">{user.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.score}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Level {5-i}</Badge>
                      </div>
                    ))}
                    <div className="pt-2 border-t text-center">
                      <p className="text-xs text-muted-foreground">Your Rank: #247</p>
                      <Button variant="ghost" className="text-xs h-auto p-0 mt-1 hover:bg-transparent">View Full Leaderboard</Button>
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1">
                        <Utensils className="w-4 h-4 text-primary" />
                        <span className="text-xs">Restaurant</span>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3 px-4 flex flex-col items-start gap-1">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-xs">Home</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input placeholder="e.g. Mixed Fruit Basket" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input placeholder="e.g. 5kg or 10 units" />
                  </div>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <div className="flex gap-2">
                      <Input placeholder="£" className="flex-1" />
                      <div className="flex items-center gap-2 border rounded-md px-3 bg-muted/30">
                        <Checkbox id="is-free" />
                        <Label htmlFor="is-free" className="text-xs">FREE</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prepared At</Label>
                    <Input type="time" defaultValue="18:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Best Consumed By</Label>
                    <Input type="time" defaultValue="22:00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dietary Info</Label>
                  <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/10">
                    {["Vegetarian", "Vegan", "Gluten-Free", "Nut-Free"].map(tag => (
                      <div key={tag} className="flex items-center gap-2">
                        <Checkbox id={`tag-${tag}`} />
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

                <Button className="w-full h-12 text-lg">
                  List Now - Expires in 4 hours
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
                    <CardTitle>Registered Charity: Food Bank UK</CardTitle>
                  </div>
                  <CardDescription>Registration #80G-123456 • Verified Partner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-5 bg-background rounded-xl shadow-sm border space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold">Daily Meal Program</h3>
                      <Badge variant="outline" className="bg-primary/10">Active Campaign</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Target: 500 meals/day</span>
                        <span className="font-bold text-primary">64%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: '64%' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="text-xs p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Needed Now</p>
                        <p className="font-bold">180 Portions Cooked Food</p>
                      </div>
                      <div className="text-xs p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Supply Chain</p>
                        <p className="font-bold">30kg Fresh Vegetables</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      Recent Matches for You
                    </h4>
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Utensils className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">15 Portions Biryani</p>
                            <p className="text-xs text-muted-foreground">Taj Palace • 1.2km</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">Claim</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>NGO Impact Dashboard</CardTitle>
                  <CardDescription>This Month's Contributions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-xl space-y-1">
                      <Users className="w-5 h-5 text-blue-500" />
                      <p className="text-2xl font-bold">4,150</p>
                      <p className="text-xs text-muted-foreground">People Served</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Utensils className="w-5 h-5 text-green-500" />
                      <p className="text-2xl font-bold">12,450</p>
                      <p className="text-xs text-muted-foreground">Meals Distributed</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Leaf className="w-5 h-5 text-emerald-500" />
                      <p className="text-2xl font-bold">3,200kg</p>
                      <p className="text-xs text-muted-foreground">Food Rescued</p>
                    </div>
                    <div className="p-4 border rounded-xl space-y-1">
                      <Globe className="w-5 h-5 text-cyan-500" />
                      <p className="text-2xl font-bold">9.6t</p>
                      <p className="text-xs text-muted-foreground">CO2 Saved</p>
                    </div>
                  </div>
                  <Button className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Monthly Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="impact">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  id: "sdg-2", 
                  title: "SDG 2: Zero Hunger", 
                  metric: "1.2M", 
                  label: "Meals Rescued", 
                  details: "450k individuals fed this year",
                  progress: 85,
                  color: "bg-orange-500" 
                },
                { 
                  id: "sdg-12", 
                  title: "SDG 12: Responsible Consumption", 
                  metric: "3,200t", 
                  label: "Waste Prevented", 
                  details: "89% surplus redirection success rate",
                  progress: 92,
                  color: "bg-yellow-600" 
                },
                { 
                  id: "sdg-13", 
                  title: "SDG 13: Climate Action", 
                  metric: "9,600t", 
                  label: "CO2 Avoided", 
                  details: "Equivalent to 480,000 trees planted",
                  progress: 78,
                  color: "bg-emerald-600" 
                },
                { 
                  id: "sdg-1", 
                  title: "SDG 1: No Poverty", 
                  metric: "£2,400", 
                  label: "Avg. Family Savings/Year", 
                  details: "125,000 low-income families supported",
                  progress: 65,
                  color: "bg-red-600" 
                },
                { 
                  id: "sdg-17", 
                  title: "SDG 17: Partnerships", 
                  metric: "4,200", 
                  label: "Partner Restaurants", 
                  details: "180 NGOs and 12,000 volunteers",
                  progress: 95,
                  color: "bg-blue-800" 
                }
              ].map(item => (
                <Card key={item.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: item.color }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-3xl font-bold tracking-tight">{item.metric}</p>
                      <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>PROGRESS</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full">
                        <div className={`h-full ${item.color.replace('bg-', 'bg-')} opacity-80`} style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                    <p className="text-xs bg-muted/30 p-2 rounded italic text-center">
                      "{item.details}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
