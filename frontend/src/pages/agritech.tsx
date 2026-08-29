import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { useCurrency } from "@/contexts/currency-context";

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
    titleKey: "tech_iot_title",
    descKey: "tech_iot_desc",
    statsKey: "tech_iot_stat",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: Satellite,
    titleKey: "tech_satellite_title",
    descKey: "tech_satellite_desc",
    statsKey: "tech_satellite_stat",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    icon: Navigation,
    titleKey: "tech_gis_title",
    descKey: "tech_gis_desc",
    statsKey: "tech_gis_stat",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    icon: Bot,
    titleKey: "tech_ai_title",
    descKey: "tech_ai_desc",
    statsKey: "tech_ai_stat",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    icon: Eye,
    titleKey: "tech_drone_title",
    descKey: "tech_drone_desc",
    statsKey: "tech_drone_stat",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    icon: Gauge,
    titleKey: "tech_equipment_title",
    descKey: "tech_equipment_desc",
    statsKey: "tech_equipment_stat",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
];

const caseStudies = [
  {
    nameKey: "case_farm_1_name",
    locationKey: "case_farm_1_location",
    areaKey: "case_farm_1_size",
    techKey: "case_farm_1_techs",
    resultKey: "case_farm_1_yield",
    roiKey: "case_farm_1_roi",
    quoteKey: "case_farm_1_quote",
    authorKey: "case_farm_1_author",
  },
  {
    nameKey: "case_farm_2_name",
    locationKey: "case_farm_2_location",
    areaKey: "case_farm_2_size",
    techKey: "case_farm_2_techs",
    resultKey: "case_farm_2_yield",
    roiKey: "case_farm_2_roi",
    quoteKey: "case_farm_2_quote",
    authorKey: "case_farm_2_author",
  },
  {
    nameKey: "case_farm_3_name",
    locationKey: "case_farm_3_location",
    areaKey: "case_farm_3_size",
    techKey: "case_farm_3_techs",
    resultKey: "case_farm_3_yield",
    roiKey: "case_farm_3_roi",
    quoteKey: "case_farm_3_quote",
    authorKey: "case_farm_3_author",
  },
];

const categoryFilters = ["All", "sensors", "remote-sensing", "gis", "precision"];
const categoryLabels: Record<string, string> = {
  "All": "agritech.filter_all_products",
  "sensors": "agritech.filter_iot_sensors",
  "remote-sensing": "agritech.filter_remote_sensing",
  "gis": "agritech.filter_gis_mapping",
  "precision": "agritech.filter_precision_farming",
};

export default function AgriTechPage() {
  const { format } = useCurrency();
  const { t } = useTranslation();
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
        <div className="w-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="h-8 px-2 text-xs sm:text-sm text-green-200 hover:text-white hover:bg-green-800/50 mb-2.5 -ml-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("agritech.back_to_marketplace")}
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
            <div>
              <Badge className="bg-green-500/30 text-green-100 border-green-500/50 mb-2 text-[11px]">
                <Cpu className="h-3 w-3 mr-1" /> {t("agritech.precision_catalog_badge")}
              </Badge>
              <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                  {t("agritech.hero_title")}
                </h1>
                <ComingSoonBadge className="!px-4 !py-2 !text-base sm:!text-lg" />
              </div>
              <p className="text-green-100 text-sm sm:text-base mb-3 leading-relaxed max-w-4xl">
                {t("agritech.hero_description")}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-green-800/50 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                  <TrendingUp className="h-4 w-4 text-green-300" />
                  <span>{t("agritech.avg_yield_increase")}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-800/50 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                  <Shield className="h-4 w-4 text-green-300" />
                  <span>{t("agritech.roi_seasons")}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-800/50 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                  <Leaf className="h-4 w-4 text-green-300" />
                  <span>{t("agritech.fewer_inputs")}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 w-full lg:w-auto">
              {[
                { value: "200+", label: t("agritech.stat_products"), icon: Cpu },
                { value: "4,500+", label: t("agritech.stat_uk_farms"), icon: Sprout },
                { value: format(2_800_000, { includeCode: true }), label: t("agritech.stat_farmer_savings"), icon: TrendingUp },
                { value: "94%", label: t("agritech.stat_ai_accuracy"), icon: Bot },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-green-800/40 rounded-lg px-3 py-2.5 text-center border border-green-600/30 min-w-[112px]">
                  <Icon className="h-4 w-4 text-green-300 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-bold text-white leading-none">{value}</div>
                  <div className="text-green-200 text-[11px] sm:text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <Tabs defaultValue="catalog">
          <div className="overflow-x-auto mb-4 no-scrollbar">
          <TabsList className="h-auto flex-wrap gap-1.5 border border-emerald-300 bg-emerald-50/90 p-1.5 rounded-xl shadow-sm" data-testid="tabs-agritech">
            <TabsTrigger value="catalog" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">{t("agritech.tab_catalog")}</TabsTrigger>
            <TabsTrigger value="technology" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">{t("agritech.tab_technologies")}</TabsTrigger>
            <TabsTrigger value="casestudies" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">{t("agritech.tab_case_studies")}</TabsTrigger>
            <TabsTrigger value="roi" className="px-3 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wide rounded-lg text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/60 shadow-xs">{t("agritech.tab_roi_calculator")}</TabsTrigger>
          </TabsList>
          </div>

          {/* CATALOG TAB */}
          <TabsContent value="catalog" className="mt-0">
            <div className="flex flex-col xl:flex-row gap-2.5 mb-3">
              <Input
                placeholder={t("agritech.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 xl:max-w-sm text-sm"
                data-testid="input-agritech-search"
              />
              <div className="flex flex-wrap gap-1.5">
                {categoryFilters.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={activeCategory === cat ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat)}
                    className="h-9 px-3 text-xs sm:text-sm font-bold rounded-lg"
                    data-testid={`filter-cat-${cat}`}
                  >
                    {t(categoryLabels[cat] || cat)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 items-stretch">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="h-full flex flex-col hover:shadow-md transition-shadow duration-200 cursor-pointer group border-border/60 rounded-xl"
                  onClick={() => setSelectedProduct(product)}
                  data-testid={`card-agritech-${product.id}`}
                >
                  <CardHeader className="p-3.5 pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {product.badge && (
                          <Badge className="mb-1.5 text-[10px]" variant="secondary">
                            <Award className="h-3 w-3 mr-1" /> {product.badge}
                          </Badge>
                        )}
                        <CardTitle className="text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-green-600 transition-colors">
                          {product.name}
                        </CardTitle>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 shrink-0">
                        <Cpu className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] w-fit">{product.subcategory}</Badge>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0 flex flex-1 flex-col">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2.5 leading-snug line-clamp-2">{product.description}</p>

                    <div className="space-y-1.5 mb-2.5">
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

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {product.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-[10px] sm:text-xs bg-muted px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                      {product.features.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{product.features.length - 3} more</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div>
                        <div className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400 leading-tight">
                          {format(product.price, { includeCode: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">per {product.unit}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
                      </div>
                    </div>

                    <Button className="w-full h-9 mt-2.5 text-xs sm:text-sm font-bold" size="sm" data-testid={`button-enquire-${product.id}`}>
                      Enquire Now <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-10 sm:py-16 text-muted-foreground">
                <Cpu className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{t("agritech.no_products_found")}</p>
                <p className="text-sm">{t("agritech.try_different_search")}</p>
              </div>
            )}
          </TabsContent>

          {/* TECHNOLOGIES TAB */}
          <TabsContent value="technology" className="mt-0">
            <div className="mb-3">
              <h2 className="text-xl sm:text-2xl font-bold mb-1">{t("agritech.stack_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("agritech.stack_subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
              {technologies.map((tech) => {
                const Icon = tech.icon;
                return (
                  <Card key={tech.titleKey} className="border-border/60 rounded-xl shadow-sm">
                    <CardContent className="p-4">
                      <div className={`${tech.bg} rounded-lg p-2.5 w-fit mb-2.5`}>
                        <Icon className={`h-5 w-5 ${tech.color}`} />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1.5">{t(`agritech.${tech.titleKey}`)}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2.5 leading-snug">{t(`agritech.${tech.descKey}`)}</p>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">{t(`agritech.${tech.statsKey}`)}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Technology Stack Diagram */}
            <Card className="mt-3 border-border/60 rounded-xl shadow-sm">
              <CardHeader className="p-4 pb-2.5">
                <CardTitle className="text-base">{t("agritech.stack_title")}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t("agritech.stack_subtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                  {[
                    { layerKey: "stack_layer_collection", toolsKey: "stack_layer_collection_techs", color: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", icon: Wifi },
                    { layerKey: "stack_layer_transmission", toolsKey: "stack_layer_transmission_techs", color: "bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800", icon: Radio },
                    { layerKey: "stack_layer_processing", toolsKey: "stack_layer_processing_techs", color: "bg-green-100 dark:bg-green-950/40 border-green-200 dark:border-green-800", icon: FlaskConical },
                    { layerKey: "stack_layer_decisions", toolsKey: "stack_layer_decisions_techs", color: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", icon: BarChart3 },
                    { layerKey: "stack_layer_application", toolsKey: "stack_layer_application_techs", color: "bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-800", icon: Sprout },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.layerKey} className={`flex items-center p-2.5 rounded-lg border ${item.color}`}>
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="font-semibold text-sm w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-xs border shadow-sm shrink-0">
                            {index + 1}
                          </div>
                          <Icon className="h-4 w-4 shrink-0" />
                          <div>
                            <div className="font-medium text-sm">{t(`agritech.${item.layerKey}`)}</div>
                            <div className="text-xs text-muted-foreground">{t(`agritech.${item.toolsKey}`)}</div>
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
          <TabsContent value="casestudies" className="mt-0">
            <div className="mb-3">
              <h2 className="text-xl sm:text-2xl font-bold mb-1">{t("agritech.case_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("agritech.case_subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {caseStudies.map((cs, i) => (
                <Card key={i} className="border-border/60 rounded-xl shadow-sm">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex flex-col gap-3 h-full">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">{t(`agritech.${cs.locationKey}`)}</Badge>
                          <Badge variant="outline" className="text-[10px] sm:text-xs">{t(`agritech.${cs.areaKey}`)}</Badge>
                        </div>
                        <h3 className="font-bold text-base mb-1">{t(`agritech.${cs.nameKey}`)}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2.5 leading-snug">{t(`agritech.${cs.techKey}`)}</p>
                        <blockquote className="border-l-2 border-green-500 pl-3 text-xs sm:text-sm italic text-muted-foreground mb-3">
                          "{t(`agritech.${cs.quoteKey}`)}"
                          <cite className="block not-italic font-medium text-foreground mt-1">— {t(`agritech.${cs.authorKey}`)}</cite>
                        </blockquote>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                            <TrendingUp className="h-3 w-3 mr-1" /> {t(`agritech.${cs.resultKey}`)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-auto bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 border border-green-100 dark:border-green-900">
                        <div>
                          <div className="text-xl font-bold text-green-700 dark:text-green-400">{t(`agritech.${cs.roiKey}`)}</div>
                          <div className="text-xs text-muted-foreground">{t("agritech.roi_results_title")}</div>
                        </div>
                        <TrendingUp className="h-5 w-5 text-green-500 opacity-60" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ROI CALCULATOR TAB */}
          <TabsContent value="roi" className="mt-0">
            <div className="max-w-6xl mx-auto">
              <Card className="border-border/60 rounded-xl shadow-sm">
                <CardHeader className="p-4 pb-2.5">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    {t("agritech.roi_title")}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {t("agritech.roi_subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
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
            className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="dialog-product-detail"
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  {selectedProduct.badge && (
                    <Badge className="mb-1.5">{selectedProduct.badge}</Badge>
                  )}
                  <CardTitle>{selectedProduct.name}</CardTitle>
                  <CardDescription className="mt-1">{selectedProduct.subcategory}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>

              <div className="grid grid-cols-2 gap-3">
                {selectedProduct.accuracy && (
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                    <div className="font-semibold">{selectedProduct.accuracy}</div>
                  </div>
                )}
                {selectedProduct.connectivity && (
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <div className="text-xs text-muted-foreground">Connectivity</div>
                    <div className="font-semibold">{selectedProduct.connectivity}</div>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Rating</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {selectedProduct.rating} ({selectedProduct.reviewCount} reviews)
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="font-semibold text-green-600">{format(selectedProduct.price, { includeCode: true })}</div>
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
  const { format } = useCurrency();
  const { t } = useTranslation();
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("agritech.roi_farm_size_label")}</label>
        <Input
          type="number"
          value={farmSize}
          onChange={(e) => setFarmSize(e.target.value)}
          className="h-9"
          data-testid="input-farm-size"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("agritech.roi_crop_type_label")}</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(cropPrices).map((crop) => {
            const cropKey = `roi_crop_${crop}`;
            const isSelected = cropType === crop;
            const CROP_FALLBACKS: Record<string, string> = {
              wheat: "Wheat",
              barley: "Barley",
              osr: "Oilseed Rape (OSR)",
              maize: "Maize / Corn",
              potatoes: "Potatoes",
              sugar_beet: "Sugar Beet",
            };
            return (
              <Button
                key={crop}
                size="sm"
                variant="outline"
                onClick={() => setCropType(crop)}
                data-testid={`crop-${crop}`}
                className={`h-8 px-2.5 text-xs transition-all rounded-lg font-black ${
                  isSelected
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-500 border-2 border-amber-500 shadow-sm"
                    : "bg-emerald-50/90 text-emerald-900 border-2 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                }`}
              >
                {t(`agritech.${cropKey}`, CROP_FALLBACKS[crop] || crop.toUpperCase())}
              </Button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("agritech.roi_investment_label")}</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(bundles).map(([key, b]) => {
            const isSelected = techBundle === key;
            return (
              <Button
                key={key}
                size="sm"
                variant="outline"
                onClick={() => setTechBundle(key)}
                data-testid={`bundle-${key}`}
                className={`h-8 px-2.5 text-xs transition-all rounded-lg font-black ${
                  isSelected
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-500 border-2 border-amber-500 shadow-sm"
                    : "bg-emerald-50/90 text-emerald-900 border-2 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                }`}
              >
                {b.name} ({format(b.cost, { includeCode: true })})
              </Button>
            );
          })}
        </div>
      </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 space-y-2.5 border border-green-100 dark:border-green-900">
        <h4 className="font-bold text-base">{t("agritech.roi_results_title")}</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("agritech.roi_yield_increase")}</span>
            <span className="font-semibold text-green-600">+{format(extraRevenue, { includeCode: true })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("agritech.roi_input_savings")}</span>
            <span className="font-semibold text-green-600">+{format(inputSaving, { includeCode: true })}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>{t("agritech.roi_total_benefit")}</span>
            <span className="text-green-700 dark:text-green-400">{format(totalAnnualBenefit, { includeCode: true })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-white dark:bg-gray-900/50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold">{paybackYears} yrs</div>
            <div className="text-xs text-muted-foreground">{t("agritech.roi_payback_period")}</div>
          </div>
          <div className="bg-white dark:bg-gray-900/50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-green-600">{format(fiveYearReturn, { includeCode: true })}</div>
            <div className="text-xs text-muted-foreground">{t("agritech.roi_net_profit")}</div>
          </div>
        </div>

        <Progress value={Math.min(100, (1 / paybackYears) * 100 * 3)} className="h-2" />
        <p className="text-xs text-muted-foreground">{t("agritech.roi_disclaimer")}</p>
      </div>

      <Button className="w-full h-9" data-testid="button-get-quote">
        {t("agritech.roi_button")}
      </Button>
    </div>
  );
}
