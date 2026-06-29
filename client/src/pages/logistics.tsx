import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Thermometer,
  Route,
  Users,
  ArrowRight,
  Search
} from "lucide-react";
import { logisticsPartners, milkRunRoutes, urgentOrders } from "@/lib/logistics-data";
import type { LogisticsPartner } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";
import { 
  AlertTriangle, 
  Phone, 
  Leaf,
  TrendingDown,
  Zap,
  Bell
} from "lucide-react";

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

export default function LogisticsPage() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<LogisticsPartner | null>(null);

  const filteredPartners = logisticsPartners.filter((partner) => {
    if (selectedType !== "all" && partner.type !== selectedType) return false;
    if (searchQuery && !partner.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const renderPartnerCard = (partner: LogisticsPartner) => {
    const TypeIcon = typeIcons[partner.type] || Truck;
    return (
      <Card 
        key={partner.id} 
        className="hover-elevate cursor-pointer"
        onClick={() => setSelectedPartner(partner)}
        data-testid={`card-partner-${partner.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${typeColors[partner.type]}`}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{partner.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{partner.type.replace("-", " ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{partner.rating}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{partner.coverage}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {partner.coldChain && (
              <Badge variant="secondary" className="text-xs">
                <Snowflake className="w-3 h-3 mr-1" />
                Cold Chain
              </Badge>
            )}
            {partner.tracking && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="w-3 h-3 mr-1" />
                Tracking
              </Badge>
            )}
            {partner.insurance && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Insured
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{partner.deliveryTime}</span>
            </div>
            <span className="font-semibold text-primary">
              {partner.priceRange.includes("Custom") ? "Custom Quote" : `£${partner.priceRange}`}
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
        <Card className="max-w-lg w-full max-h-[90vh] overflow-auto">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-md ${typeColors[selectedPartner.type]}`}>
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>{selectedPartner.name}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedPartner.type.replace("-", " ")} Shipping
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPartner(null)}
                data-testid="button-close-detail"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{selectedPartner.rating}</span>
              </div>
              <span className="text-muted-foreground">
                {selectedPartner.deliveryCount.toLocaleString()} deliveries
              </span>
            </div>

            <div>
              <h4 className="font-medium mb-2">Coverage</h4>
              <p className="text-sm text-muted-foreground">{selectedPartner.coverage}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPartner.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  Delivery Time
                </div>
                <div className="font-semibold">{selectedPartner.deliveryTime}</div>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground mb-1">Price Range</div>
                <div className="font-semibold text-primary">
                  {selectedPartner.priceRange.includes("Custom") ? "Custom Quote" : `£${selectedPartner.priceRange}`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedPartner.coldChain && (
                <div className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-950 rounded-md">
                  <Thermometer className="w-4 h-4 text-cyan-600" />
                  <span className="text-sm">Cold Chain Available</span>
                </div>
              )}
              {selectedPartner.tracking && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Real-time Tracking</span>
                </div>
              )}
              {selectedPartner.insurance && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Insurance Included</span>
                </div>
              )}
            </div>

            <Button className="w-full" data-testid="button-select-partner">
              Select This Partner
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
      <div className="p-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("logistics.title", "Logistics & Delivery")}</h1>
          <p className="text-muted-foreground">
            {t("logistics.subtitle", "Choose from trusted logistics partners or join efficient milk run routes")}
          </p>
        </div>

        <Tabs defaultValue="partners" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="partners" data-testid="tab-partners">
              <Truck className="w-4 h-4 mr-2" />
              {t("logistics.partners_tab", "Logistics Partners")}
            </TabsTrigger>
            <TabsTrigger value="milk-run" data-testid="tab-milk-run">
              <Route className="w-4 h-4 mr-2" />
              {t("logistics.milk_run_tab", "Milk Run Routes")}
            </TabsTrigger>
            <TabsTrigger value="tracking" data-testid="tab-tracking">
              <MapPin className="w-4 h-4 mr-2" />
              {t("logistics.tracking_tab", "Track Shipment")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("logistics.search_placeholder", "Search logistics partners...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-partners"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "international", "national", "hyperlocal", "cold-chain", "freight"].map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className={`capitalize toggle-elevate ${selectedType === type ? "toggle-elevated" : ""}`}
                    onClick={() => setSelectedType(type)}
                    data-testid={`button-filter-${type}`}
                  >
                    {type === "all" ? "All" : type.replace("-", " ")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </TabsContent>

          <TabsContent value="milk-run" className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Route className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">What is Milk Run Logistics?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Smart batching system that combines multiple pickups and deliveries into optimized routes. 
                      Save up to 60-70% on delivery costs and reduce carbon footprint by 75%.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {urgentOrders.length > 0 && (
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-base">Urgent Orders Available</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {urgentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-background rounded-md">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="font-medium">{order.buyer} needs {order.quantity}{order.unit} {order.product}</div>
                          <div className="text-xs text-muted-foreground">Deliver by {order.deliveryBy} to {order.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">+£{order.revenue}</span>
                        <Button size="sm" data-testid={`button-accept-${order.id}`}>Accept</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {milkRunRoutes.map((route) => (
                <Card key={route.id} className="overflow-visible" data-testid={`card-route-${route.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <Route className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{route.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{route.vehicle} | {route.vehicleNumber}</p>
                        </div>
                      </div>
                      <Badge variant={route.status === "in-progress" ? "default" : "secondary"}>
                        {route.status === "in-progress" ? "Live" : route.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold text-primary">£{route.costPerFarmer}</div>
                        <div className="text-xs text-muted-foreground">Per Farmer</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded-md">
                        <div className="text-lg font-bold text-green-600">{route.savings}%</div>
                        <div className="text-xs text-muted-foreground">Savings</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{route.efficiency}%</div>
                        <div className="text-xs text-muted-foreground">Capacity</div>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-md">
                        <div className="flex items-center justify-center gap-1">
                          <Leaf className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-600">{route.carbonReduction}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">CO2 Saved</div>
                      </div>
                    </div>

                    {route.temperature !== null && (
                      <div className="flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-950 rounded-md">
                        <Thermometer className="w-4 h-4 text-cyan-600" />
                        <span className="text-sm">Cold Chain Active: {route.temperature}°C</span>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Package className="w-4 h-4 text-green-500" />
                        Pickups ({route.pickups.length})
                      </h4>
                      <div className="space-y-2">
                        {route.pickups.map((pickup, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                pickup.status === "completed" ? "bg-green-500" : 
                                pickup.status === "in-progress" ? "bg-blue-500 animate-pulse" : "bg-gray-300"
                              }`} />
                              <span className="text-xs text-muted-foreground">{pickup.time}</span>
                              <span>{pickup.farmer}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{pickup.items}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Truck className="w-4 h-4 text-blue-500" />
                        Deliveries ({route.deliveries.length})
                      </h4>
                      <div className="space-y-2">
                        {route.deliveries.map((delivery, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                delivery.status === "completed" ? "bg-green-500" : 
                                delivery.status === "in-progress" ? "bg-blue-500 animate-pulse" : "bg-gray-300"
                              }`} />
                              <span className="text-xs text-muted-foreground">{delivery.time}</span>
                              <span>{delivery.buyer}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{delivery.items}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{route.driver}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-call-driver-${route.id}`}>
                          <Phone className="w-3 h-3" />
                          Call
                        </Button>
                      </div>
                      <Button size="sm" data-testid={`button-join-route-${route.id}`}>
                        Join Route
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-500" />
                    Farmer Pickup View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                    <div className="text-sm font-medium">Pickup Scheduled</div>
                    <div className="text-lg font-bold">Tomorrow, 6:30-7:00 AM</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your products:</div>
                    <div className="space-y-1">
                      <Badge variant="outline">Tomatoes (50kg)</Badge>
                      <Badge variant="outline" className="ml-1">Chilies (20kg)</Badge>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span>UK-01-AB-1234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver:</span>
                      <span>John Smith</span>
                    </div>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-md text-sm">
                    <Clock className="w-4 h-4 inline mr-1 text-amber-600" />
                    Keep products ready by 6:15 AM | Pre-cool if possible (-2°C)
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      Track Vehicle
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      <Phone className="w-4 h-4 mr-1" />
                      Call Driver
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-500" />
                    Buyer Delivery View
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <div className="text-sm font-medium">Delivery Window</div>
                    <div className="text-lg font-bold">Today, 9:30-10:30 AM</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your order:</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tomatoes (30kg)</span>
                        <span className="text-muted-foreground">Raj Kumar</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spinach (20kg)</span>
                        <span className="text-muted-foreground">Priya Farms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carrots (20kg)</span>
                        <span className="text-muted-foreground">Green Valley</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                    <span>Total: £285.00</span>
                    <Badge variant="secondary" className="text-green-600">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Saved £34
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md text-sm">
                    <MapPin className="w-4 h-4 text-primary animate-pulse" />
                    Vehicle 15 mins away
                  </div>
                  <Button className="w-full" size="sm">
                    <Bell className="w-4 h-4 mr-1" />
                    Notify on Arrival
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="max-w-md mx-auto text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Track Your Shipment</h3>
                  <p className="text-muted-foreground mb-4">
                    Enter your order ID or tracking number to see real-time delivery status
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter order ID (e.g., AGC-789456)"
                      className="flex-1"
                      data-testid="input-tracking-id"
                    />
                    <Button data-testid="button-track">
                      Track
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample Tracking View</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-3 bg-muted rounded-md">
                  <div>
                    <div className="font-medium">Order #AGC-789456</div>
                    <div className="text-sm text-muted-foreground">50kg Organic Tomatoes</div>
                  </div>
                  <Badge className="bg-blue-500">In Transit</Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { status: "Picked up", time: "8:30 AM", done: true },
                    { status: "Quality check passed", time: "9:15 AM", done: true },
                    { status: "In transit (Cold chain: -2 C)", time: "Live", done: false, current: true },
                    { status: "Hub sorting", time: "Pending", done: false },
                    { status: "Delivered", time: "Pending", done: false },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.done ? "bg-green-500" : step.current ? "bg-blue-500 animate-pulse" : "bg-muted"
                      }`}>
                        {step.done && <CheckCircle className="w-4 h-4 text-white" />}
                        {step.current && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm ${step.current ? "font-medium" : ""}`}>{step.status}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{step.time}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-cyan-50 dark:bg-cyan-950 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="w-4 h-4 text-cyan-600" />
                    <span className="font-medium">Temperature Log:</span>
                    <span className="text-muted-foreground">8:30 AM: -1 C | 10:00 AM: -2 C | 12:30 PM: -2 C</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedPartner && renderPartnerDetail()}
      </div>
      </SplitMapLayout>
    </div>
  );
}
