import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Cpu, Satellite, Map, Wifi, CloudRain, Thermometer, Sprout, Zap, BarChart3,
  Bot, ArrowLeft, ChevronRight, TrendingUp, Shield, Layers, Eye, Radio,
  FlaskConical, Gauge, Navigation, Star, Award, Leaf
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";

interface AgriTechProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  unit: string;
  rating: number;
  reviewCount: number;
  features: string[];
  badge?: string;
  accuracy?: string;
  connectivity?: string;
}

const agriTechProducts: AgriTechProduct[] = [
  {
    id: "at-1",
    name: "SmartField Pro Soil Sensor Array",
    category: "sensors",
    subcategory: "Soil Monitoring",
    description: "Multi-depth soil moisture, temperature, and NPK sensor with real-time cloud dashboard. Covers up to 2 acres per unit.",
    price: 12500,
    unit: "unit",
    rating: 4.8,
    reviewCount: 142,
    features: ["0–100cm depth monitoring", "NPK + pH measurement", "LoRaWAN connectivity", "Solar powered", "IP67 waterproof"],
    badge: "Best Seller",
    accuracy: "±2%",
    connectivity: "LoRaWAN / 4G",
  },
  {
    id: "at-2",
    name: "AgriWX Compact Weather Station",
    category: "sensors",
    subcategory: "Weather Monitoring",
    description: "Professional-grade farm weather station with ET₀ calculation, disease pressure alerts, and frost prediction.",
    price: 18500,
    unit: "unit",
    rating: 4.7,
    reviewCount: 89,
    features: ["Temperature & humidity", "Wind speed & direction", "Rainfall & solar radiation", "Automatic ET₀ calculation", "Frost alerts"],
    badge: "Top Rated",
    accuracy: "±0.3°C",
    connectivity: "4G + WiFi",
  },
  {
    id: "at-3",
    name: "CropSense NDVI Drone (6-Axis)",
    category: "remote-sensing",
    subcategory: "Aerial Imaging",
    description: "Professional agricultural drone with 20MP multispectral camera. Generates NDVI, NDRE, and chlorophyll maps in minutes.",
    price: 185000,
    unit: "unit",
    rating: 4.9,
    reviewCount: 56,
    features: ["45 min flight time", "200 acre/hour coverage", "RTK GPS precision", "Auto-mission planning", "AI analysis included"],
    badge: "Premium",
    accuracy: "2cm RTK",
    connectivity: "5.8GHz Radio",
  },
  {
    id: "at-4",
    name: "FieldMap GPS Boundary Mapper",
    category: "gis",
    subcategory: "Field Mapping",
    description: "Sub-meter GPS accuracy for field boundary mapping, soil sampling grids, and yield zone delineation.",
    price: 22000,
    unit: "unit",
    rating: 4.6,
    reviewCount: 203,
    features: ["Sub-meter accuracy", "QZSS/SBAS supported", "Offline mapping", "GeoJSON export", "2000hr battery"],
    accuracy: "<1m",
    connectivity: "GNSS + Bluetooth",
  },
  {
    id: "at-5",
    name: "VRS AutoSteer System",
    category: "precision",
    subcategory: "Guidance Systems",
    description: "Retrofit auto-steering system compatible with most tractors. Reduces input overlap by 15% and increases field efficiency.",
    price: 125000,
    unit: "set",
    rating: 4.8,
    reviewCount: 78,
    features: ["±2.5cm RTK accuracy", "Universal bracket kit", "Headland management", "Variable rate control", "A+B line guidance"],
    badge: "Best Value",
    accuracy: "±2.5cm",
    connectivity: "RTK GNSS",
  },
  {
    id: "at-6",
    name: "SmartSpray Variable-Rate Controller",
    category: "precision",
    subcategory: "Variable Rate",
    description: "Prescription-based sprayer controller that applies inputs only where needed, reducing chemical use by 20–40%.",
    price: 55000,
    unit: "set",
    rating: 4.7,
    reviewCount: 91,
    features: ["Section control (24 sections)", "Prescription map import", "ISO Bus compatible", "Data logging", "Real-time flow monitoring"],
    accuracy: "±1%",
    connectivity: "ISOBUS / CAN",
  },
  {
    id: "at-7",
    name: "FarmOS Gateway Hub",
    category: "sensors",
    subcategory: "Farm IoT Hub",
    description: "Central data hub connecting all farm sensors, drones, and machinery into one cloud platform. Supports 50+ device connections.",
    price: 28000,
    unit: "unit",
    rating: 4.5,
    reviewCount: 167,
    features: ["50 device capacity", "Edge AI processing", "4G failover", "5-year warranty", "Open API"],
    connectivity: "4G + LoRaWAN + WiFi",
  },
  {
    id: "at-8",
    name: "SatAgri Crop Monitoring Subscription",
    category: "remote-sensing",
    subcategory: "Satellite Intelligence",
    description: "Weekly satellite-derived NDVI, yield prediction, and stress mapping for your entire farm. No hardware needed.",
    price: 25000,
    unit: "year",
    rating: 4.4,
    reviewCount: 312,
    features: ["Weekly NDVI reports", "Yield prediction", "3m resolution", "Unlimited hectares", "AI anomaly detection"],
    badge: "New",
    connectivity: "Cloud / Web App",
  },
];

const technologies = [
  {
    icon: Wifi,
    title: "IoT Sensor Networks",
    description: "Real-time soil, weather, and crop monitoring with wireless sensor arrays covering your entire farm.",
    stats: "99.8% uptime",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: Satellite,
    title: "Satellite Imagery",
    description: "Weekly multispectral satellite images providing NDVI stress maps and growth stage analysis.",
    stats: "3m resolution",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    icon: Navigation,
    title: "GPS & GIS Mapping",
    description: "Sub-meter precision field mapping, boundary delineation, and soil sampling grid generation.",
    stats: "<1m accuracy",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    icon: Bot,
    title: "AI & Machine Learning",
    description: "Predictive models for yield forecasting, disease risk, and optimal application timing.",
    stats: "94% accuracy",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    icon: Eye,
    title: "Drone & UAV Imaging",
    description: "On-demand aerial NDVI, RGB, and thermal imaging for scouting and precision applications.",
    stats: "200 acres/hr",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    icon: Gauge,
    title: "Precision Equipment",
    description: "Auto-steer, variable-rate seeding and spraying, and yield monitoring for data-driven operations.",
    stats: "±2.5cm precision",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
];

const caseStudies = [
  {
    farm: "Hartley Arable Farm",
    location: "Cambridgeshire, UK",
    area: "850 acres",
    technology: "Variable-Rate Seeding + NDVI Mapping",
    result: "18% yield increase, 12% input cost reduction",
    roi: "£42,000 annual saving",
    testimonial: "The prescription maps from satellite imagery transformed how we manage the farm. Every part of the field now gets exactly what it needs.",
    farmer: "James Hartley",
  },
  {
    farm: "Willowbrook Vegetable Growers",
    location: "Kent, UK",
    area: "120 acres",
    technology: "IoT Sensor Network + Weather Station",
    result: "30% reduction in irrigation water use",
    roi: "£18,500 annual saving",
    testimonial: "The soil moisture sensors pay for themselves in the first season. We irrigate only when the data says so, not by guesswork.",
    farmer: "Sarah Mitchell",
  },
  {
    farm: "Penrhyn Organic Farms",
    location: "Wales, UK",
    area: "340 acres",
    technology: "Drone Scouting + Disease Forecasting",
    result: "25% reduction in fungicide applications",
    roi: "£28,000 annual saving",
    testimonial: "Early disease detection from drone flights means we treat exactly where needed, when needed. Our spray costs have plummeted.",
    farmer: "Tom Penrhyn",
  },
];

const categoryFilters = ["All", "sensors", "remote-sensing", "gis", "precision"];
const categoryLabels: Record<string, string> = {
  "All": "All Products",
  "sensors": "IoT Sensors",
  "remote-sensing": "Remote Sensing",
  "gis": "GIS & Mapping",
  "precision": "Precision Farming",
};

export default function AgriTechPage() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AgriTechProduct | null>(null);

  const filteredProducts = agriTechProducts.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subcategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <SplitMapLayout mapProps={{ title: "Sellers using AgriTech", subtitle: "Live farms visible on the map" }}>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-14">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-green-200 hover:text-white hover:bg-green-800/50 mb-4 sm:mb-6 -ml-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 items-center">
            <div>
              <Badge className="bg-green-500/30 text-green-100 border-green-500/50 mb-3 sm:mb-4">
                <Cpu className="h-3 w-3 mr-1" /> Precision AgriTech Catalog
              </Badge>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
                Farm Smarter with Precision Technology
              </h1>
              <p className="text-green-100 text-sm sm:text-lg mb-4 sm:mb-6 leading-relaxed">
                From soil sensors to satellite imagery, auto-steer to AI-powered analytics — discover the complete range of precision farming tools trusted by UK farmers.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-green-800/50 rounded-lg px-3 py-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-300" />
                  <span>Avg 22% yield increase</span>
                </div>
                <div className="flex items-center gap-2 bg-green-800/50 rounded-lg px-3 py-2 text-sm">
                  <Shield className="h-4 w-4 text-green-300" />
                  <span>ROI in 2–3 seasons</span>
                </div>
                <div className="flex items-center gap-2 bg-green-800/50 rounded-lg px-3 py-2 text-sm">
                  <Leaf className="h-4 w-4 text-green-300" />
                  <span>30% fewer inputs</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "200+", label: "Products", icon: Cpu },
                { value: "4,500+", label: "UK Farms Equipped", icon: Sprout },
                { value: "£2.8M", label: "Farmer Savings/Year", icon: TrendingUp },
                { value: "94%", label: "AI Accuracy Rate", icon: Bot },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-green-800/40 rounded-xl p-4 text-center border border-green-600/30">
                  <Icon className="h-6 w-6 text-green-300 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-green-200 text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-10">
        <Tabs defaultValue="catalog">
          <div className="overflow-x-auto -mx-4 px-4 mb-6 sm:mb-8 no-scrollbar">
          <TabsList className="h-10 sm:h-12 p-1 flex w-max min-w-full" data-testid="tabs-agritech">
            <TabsTrigger value="catalog" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">Product Catalog</TabsTrigger>
            <TabsTrigger value="technology" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Technologies</TabsTrigger>
            <TabsTrigger value="casestudies" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Case Studies</TabsTrigger>
            <TabsTrigger value="roi" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">ROI Calculator</TabsTrigger>
          </TabsList>
          </div>

          {/* CATALOG TAB */}
          <TabsContent value="catalog">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
                data-testid="input-agritech-search"
              />
              <div className="flex flex-wrap gap-2">
                {categoryFilters.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={activeCategory === cat ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat)}
                    data-testid={`filter-cat-${cat}`}
                  >
                    {categoryLabels[cat] || cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/60"
                  onClick={() => setSelectedProduct(product)}
                  data-testid={`card-agritech-${product.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {product.badge && (
                          <Badge className="mb-2 text-xs" variant="secondary">
                            <Award className="h-3 w-3 mr-1" /> {product.badge}
                          </Badge>
                        )}
                        <CardTitle className="text-base leading-snug group-hover:text-green-600 transition-colors">
                          {product.name}
                        </CardTitle>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 shrink-0">
                        <Cpu className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs w-fit">{product.subcategory}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>

                    <div className="space-y-2 mb-4">
                      {product.accuracy && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Gauge className="h-3 w-3" /> Accuracy
                          </span>
                          <span className="font-medium">{product.accuracy}</span>
                        </div>
                      )}
                      {product.connectivity && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Radio className="h-3 w-3" /> Connectivity
                          </span>
                          <span className="font-medium">{product.connectivity}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-xs bg-muted px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                      {product.features.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{product.features.length - 3} more</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">
                          £{product.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">per {product.unit}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
                      </div>
                    </div>

                    <Button className="w-full mt-3" size="sm" data-testid={`button-enquire-${product.id}`}>
                      Enquire Now <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-10 sm:py-16 text-muted-foreground">
                <Cpu className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </TabsContent>

          {/* TECHNOLOGIES TAB */}
          <TabsContent value="technology">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Core Technologies</h2>
              <p className="text-muted-foreground">The building blocks of modern precision farming</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technologies.map((tech) => {
                const Icon = tech.icon;
                return (
                  <Card key={tech.title} className="border-border/60">
                    <CardContent className="pt-6">
                      <div className={`${tech.bg} rounded-xl p-3 w-fit mb-4`}>
                        <Icon className={`h-6 w-6 ${tech.color}`} />
                      </div>
                      <h3 className="font-semibold text-base mb-2">{tech.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{tech.description}</p>
                      <Badge variant="secondary" className="text-xs">{tech.stats}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Technology Stack Diagram */}
            <Card className="mt-8 border-border/60">
              <CardHeader>
                <CardTitle>Precision Farming Technology Stack</CardTitle>
                <CardDescription>How the layers connect to power your farm decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { layer: "Data Collection", tools: "IoT Sensors, Drones, GPS, Weather Stations", color: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", icon: Wifi },
                    { layer: "Data Transmission", tools: "LoRaWAN, 4G, Satellite, WiFi Gateway", color: "bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800", icon: Radio },
                    { layer: "Data Processing", tools: "Cloud Platform, Edge AI, NDVI Analysis", color: "bg-green-100 dark:bg-green-950/40 border-green-200 dark:border-green-800", icon: FlaskConical },
                    { layer: "Decision Support", tools: "Prescription Maps, Alerts, Forecasting, Reports", color: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", icon: BarChart3 },
                    { layer: "Field Application", tools: "Auto-Steer, Variable Rate, Smart Irrigation", color: "bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-800", icon: Sprout },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.layer} className={`flex items-center gap-4 p-3 rounded-lg border ${item.color}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="font-semibold text-sm w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-xs border shadow-sm shrink-0">
                            {index + 1}
                          </div>
                          <Icon className="h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{item.layer}</div>
                            <div className="text-xs text-muted-foreground">{item.tools}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CASE STUDIES TAB */}
          <TabsContent value="casestudies">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">UK Farmer Success Stories</h2>
              <p className="text-muted-foreground">Real results from real farms using precision technology</p>
            </div>
            <div className="space-y-6">
              {caseStudies.map((cs, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary">{cs.location}</Badge>
                          <Badge variant="outline">{cs.area}</Badge>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{cs.farm}</h3>
                        <p className="text-sm text-muted-foreground mb-3">Technology: {cs.technology}</p>
                        <blockquote className="border-l-4 border-green-500 pl-4 text-sm italic text-muted-foreground mb-4">
                          "{cs.testimonial}"
                          <cite className="block not-italic font-medium text-foreground mt-1">— {cs.farmer}</cite>
                        </blockquote>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                            <TrendingUp className="h-3 w-3 mr-1" /> {cs.result}
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-green-100 dark:border-green-900">
                        <div className="text-3xl font-bold text-green-700 dark:text-green-400">{cs.roi}</div>
                        <div className="text-sm text-muted-foreground mt-1">Annual ROI</div>
                        <TrendingUp className="h-8 w-8 text-green-500 mt-3 opacity-60" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ROI CALCULATOR TAB */}
          <TabsContent value="roi">
            <div className="max-w-2xl mx-auto">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Precision Farming ROI Estimator
                  </CardTitle>
                  <CardDescription>
                    Estimate your potential return on investment from precision farming technology
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ROICalculator />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <Card
            className="max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-product-detail"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  {selectedProduct.badge && (
                    <Badge className="mb-2">{selectedProduct.badge}</Badge>
                  )}
                  <CardTitle>{selectedProduct.name}</CardTitle>
                  <CardDescription className="mt-1">{selectedProduct.subcategory}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>

              <div className="grid grid-cols-2 gap-3">
                {selectedProduct.accuracy && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                    <div className="font-semibold">{selectedProduct.accuracy}</div>
                  </div>
                )}
                {selectedProduct.connectivity && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Connectivity</div>
                    <div className="font-semibold">{selectedProduct.connectivity}</div>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Rating</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {selectedProduct.rating} ({selectedProduct.reviewCount} reviews)
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="font-semibold text-green-600">£{selectedProduct.price.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Key Features</h4>
                <ul className="space-y-1">
                  {selectedProduct.features.map((f) => (
                    <li key={f} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" data-testid="button-add-to-quote">Add to Quote</Button>
                <Button variant="outline" className="flex-1" data-testid="button-download-spec">Download Spec</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </SplitMapLayout>
    </div>
  );
}

function ROICalculator() {
  const [farmSize, setFarmSize] = useState("200");
  const [cropType, setCropType] = useState("wheat");
  const [techBundle, setTechBundle] = useState("starter");

  const bundles: Record<string, { name: string; cost: number; yieldBoost: number; inputSaving: number }> = {
    starter: { name: "Starter Kit", cost: 25000, yieldBoost: 8, inputSaving: 5 },
    intermediate: { name: "Intermediate", cost: 75000, yieldBoost: 15, inputSaving: 12 },
    premium: { name: "Full Precision", cost: 180000, yieldBoost: 22, inputSaving: 20 },
  };

  const cropPrices: Record<string, number> = { wheat: 180, barley: 155, osr: 420, maize: 165, potatoes: 190 };
  const cropYields: Record<string, number> = { wheat: 8, barley: 7, osr: 4, maize: 12, potatoes: 45 };

  const size = parseInt(farmSize) || 200;
  const bundle = bundles[techBundle];
  const cropPrice = cropPrices[cropType];
  const baseYield = cropYields[cropType];

  const extraRevenue = Math.round(size * baseYield * (bundle.yieldBoost / 100) * cropPrice);
  const inputSaving = Math.round(size * 80 * (bundle.inputSaving / 100));
  const totalAnnualBenefit = extraRevenue + inputSaving;
  const paybackYears = Math.round((bundle.cost / totalAnnualBenefit) * 10) / 10;
  const fiveYearReturn = totalAnnualBenefit * 5 - bundle.cost;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium">Farm size (acres)</label>
        <Input
          type="number"
          value={farmSize}
          onChange={(e) => setFarmSize(e.target.value)}
          data-testid="input-farm-size"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Main crop</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(cropPrices).map((crop) => (
            <Button
              key={crop}
              size="sm"
              variant={cropType === crop ? "default" : "outline"}
              onClick={() => setCropType(crop)}
              data-testid={`crop-${crop}`}
            >
              {crop.charAt(0).toUpperCase() + crop.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Technology bundle</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(bundles).map(([key, b]) => (
            <Button
              key={key}
              size="sm"
              variant={techBundle === key ? "default" : "outline"}
              onClick={() => setTechBundle(key)}
              data-testid={`bundle-${key}`}
            >
              {b.name} (£{(b.cost / 1000).toFixed(0)}k)
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-5 space-y-3 border border-green-100 dark:border-green-900">
        <h4 className="font-bold text-base">Estimated Annual Returns</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Extra yield revenue</span>
            <span className="font-semibold text-green-600">+£{extraRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Input cost savings</span>
            <span className="font-semibold text-green-600">+£{inputSaving.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total annual benefit</span>
            <span className="text-green-700 dark:text-green-400">£{totalAnnualBenefit.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold">{paybackYears} yrs</div>
            <div className="text-xs text-muted-foreground">Payback period</div>
          </div>
          <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-600">£{(fiveYearReturn / 1000).toFixed(0)}k</div>
            <div className="text-xs text-muted-foreground">5-year net return</div>
          </div>
        </div>

        <Progress value={Math.min(100, (1 / paybackYears) * 100 * 3)} className="h-2" />
        <p className="text-xs text-muted-foreground">Investment confidence score: {Math.min(99, Math.round(100 - paybackYears * 8))}%</p>
      </div>

      <Button className="w-full" data-testid="button-get-quote">
        Get Full ROI Report & Quote
      </Button>
    </div>
  );
}
