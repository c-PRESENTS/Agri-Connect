import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, 
  Droplets, 
  Zap, 
  Star, 
  Phone, 
  MessageSquare, 
  Search,
  Filter,
  ChevronRight,
  Check,
  Wheat,
  TreePine,
  Building2,
  Sprout,
  Clock,
  ArrowLeft
} from "lucide-react";
import { sampleLandListings, governmentLandPrograms, sampleLeases } from "@/lib/logistics-data";
import type { LandListing } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { SplitMapLayout } from "@/components/split-map-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, FileText, Users, Award, ExternalLink, Calendar, CreditCard, Activity, MessageSquarePlus } from "lucide-react";

const landTypeIcons: Record<string, typeof Wheat> = {
  agricultural: Wheat,
  irrigated: Droplets,
  government: Building2,
  specialty: Sprout,
  "short-term": Clock,
};

const landTypeColors: Record<string, string> = {
  agricultural: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  irrigated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  government: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  specialty: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "short-term": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const salePlots = [
  { id: "s1", title: "Prime Arable Farmland — Oxfordshire", location: "Witney, Oxfordshire", area: "45 acres", soilType: "Loam", price: 675000, verified: true },
  { id: "s2", title: "Market Garden Holding — Kent", location: "Faversham, Kent", area: "12 acres", soilType: "Sandy loam", price: 310000, verified: true },
  { id: "s3", title: "Organic Certified Estate — Somerset", location: "Taunton, Somerset", area: "80 acres", soilType: "Clay loam", price: 1250000, verified: false },
  { id: "s4", title: "Smallholding with Barn — Norfolk", location: "Dereham, Norfolk", area: "18 acres", soilType: "Silt loam", price: 425000, verified: true },
  { id: "s5", title: "Hill Farm with River — Cumbria", location: "Penrith, Cumbria", area: "120 acres", soilType: "Peaty loam", price: 890000, verified: false },
  { id: "s6", title: "Vineyard Plot — Sussex", location: "Lewes, East Sussex", area: "8 acres", soilType: "Chalk", price: 280000, verified: true },
];

const investmentOpportunities = [
  { id: "i1", title: "AgriREIT — Diversified UK Farmland", location: "UK-wide portfolio", type: "Land Fund", projectedReturn: 8.5, minInvestment: 5000, duration: "5 years", description: "Pooled investment across 2,400+ acres of prime UK farmland with quarterly distributions." },
  { id: "i2", title: "Regenerative Farm Bond — Cornwall", location: "Bodmin, Cornwall", type: "Green Bond", projectedReturn: 7.2, minInvestment: 10000, duration: "7 years", description: "Fixed-rate bond financing a 340-acre regenerative transition. Carbon credit revenue sharing." },
  { id: "i3", title: "Vertical Farm Equity — Yorkshire", location: "Leeds, Yorkshire", type: "Equity", projectedReturn: 15.0, minInvestment: 25000, duration: "3–7 years", description: "Early-stage equity in a commercial-scale hydroponic facility. High risk, high reward." },
  { id: "i4", title: "Forestry & Carbon — Scotland", location: "Highlands, Scotland", type: "Carbon Credits", projectedReturn: 9.0, minInvestment: 2500, duration: "10 years", description: "Long-term forestry investment with Woodland Carbon Code credits issued annually." },
  { id: "i5", title: "Solar Agrivoltaic Share — Lincolnshire", location: "Lincoln, Lincolnshire", type: "Co-ownership", projectedReturn: 6.8, minInvestment: 1000, duration: "20 years", description: "Co-invest in dual-use solar + arable land. Electricity income + crop production revenue." },
];

const communityPlots = [
  { id: "c1", title: "Springfield Community Allotments", location: "Bristol, Avon", type: "Allotment", plotSize: "10m × 5m", feePerMonth: 8, description: "Traditional allotment site with water points, compost bays, and a communal tool shed. Organic ethos encouraged.", amenities: ["Water", "Tool store", "Compost", "Community hub"], totalSpots: 40, spotsAvailable: 7 },
  { id: "c2", title: "Green Fingers Urban Farm", location: "Manchester, GM", type: "Urban Farm", plotSize: "Shared beds", feePerMonth: 0, description: "Free community growing space on reclaimed brownfield land. Volunteer-run with workshops every weekend.", amenities: ["Free entry", "Workshops", "Kids area", "Café"], totalSpots: 60, spotsAvailable: 22 },
  { id: "c3", title: "Permaculture Co-op — Totnes", location: "Totnes, Devon", type: "Co-operative", plotSize: "Shared 5 acres", feePerMonth: 35, description: "Worker co-op farming 5 acres using permaculture principles. Members share produce and labour hours.", amenities: ["Training", "Produce share", "CSA box", "Camping"], totalSpots: 20, spotsAvailable: 3 },
  { id: "c4", title: "City Farm Plots — Leeds", location: "Leeds, Yorkshire", type: "City Farm", plotSize: "4m × 8m raised beds", feePerMonth: 15, description: "Raised bed plots on a city farm with animals, orchards, and regular community events for all ages.", amenities: ["Raised beds", "Animals", "Orchard", "Events"], totalSpots: 50, spotsAvailable: 14 },
  { id: "c5", title: "Heritage Seed Garden — Oxford", location: "Oxford, Oxfordshire", type: "Heritage", plotSize: "Individual plot", feePerMonth: 12, description: "Specialist heritage and heirloom seed cultivation project. Seed saving library and expert mentorship.", amenities: ["Seed library", "Mentoring", "Expert advice", "Café"], totalSpots: 25, spotsAvailable: 0 },
];

export default function LandLeasingPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [areaRange, setAreaRange] = useState([0, 50]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLand, setSelectedLand] = useState<LandListing | null>(null);
  const [filters, setFilters] = useState({
    hasWater: false,
    hasElectricity: false,
    isVerified: false,
    organicOnly: false,
  });

  const filteredListings = sampleLandListings.filter((land) => {
    if (searchQuery && !land.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !land.location.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedType !== "all" && land.type !== selectedType) return false;
    if (land.rentPerMonth < priceRange[0] || land.rentPerMonth > priceRange[1]) return false;
    if (land.area < areaRange[0] || land.area > areaRange[1]) return false;
    if (filters.hasWater && land.waterSources.length === 0) return false;
    if (filters.hasElectricity && !land.infrastructure.includes("Electricity")) return false;
    if (filters.isVerified && !land.isVerified) return false;
    if (filters.organicOnly) {
      const isOrganic = land.permissions.some(p => 
        p.toLowerCase().includes("organic") || 
        land.title.toLowerCase().includes("organic")
      );
      if (!isOrganic) return false;
    }
    return true;
  });

  const renderLandCard = (land: LandListing) => {
    const TypeIcon = landTypeIcons[land.type] || Wheat;
    return (
      <Card 
        key={land.id} 
        className="hover-elevate cursor-pointer"
        onClick={() => setSelectedLand(land)}
        data-testid={`card-land-${land.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${landTypeColors[land.type]}`}>
                <TypeIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm line-clamp-1">{land.title}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{land.location}</span>
                </div>
              </div>
            </div>
            {land.isVerified && (
              <Badge variant="secondary" className="text-xs">
                <Check className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <TreePine className="w-3 h-3 text-muted-foreground" />
              <span>{land.area} {land.areaUnit}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Soil:</span>
              <span>{land.soilType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>{land.waterSources.length > 0 ? "Water Available" : "No Water"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>{land.infrastructure.includes("Electricity") ? "Power" : "No Power"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-primary">
                £{land.rentPerMonth}
              </span>
              <span className="text-xs text-muted-foreground">/month/acre</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{land.rating}</span>
              <span className="text-xs text-muted-foreground">({land.reviewCount})</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLandDetail = () => {
    if (!selectedLand) return null;
    const TypeIcon = landTypeIcons[selectedLand.type] || Wheat;

    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        <div className="max-w-3xl mx-auto p-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedLand(null)}
            className="mb-4"
            data-testid="button-back-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-md ${landTypeColors[selectedLand.type]}`}>
                    <TypeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle>{selectedLand.title}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedLand.location}</span>
                    </div>
                  </div>
                </div>
                {selectedLand.isVerified && (
                  <Badge variant="secondary">
                    <Check className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{selectedLand.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-md text-center">
                  <div className="text-2xl font-bold">{selectedLand.area}</div>
                  <div className="text-xs text-muted-foreground">{selectedLand.areaUnit}</div>
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <div className="text-2xl font-bold text-primary">£{selectedLand.rentPerMonth}</div>
                  <div className="text-xs text-muted-foreground">per month/acre</div>
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <div className="text-2xl font-bold">£{selectedLand.deposit}</div>
                  <div className="text-xs text-muted-foreground">deposit</div>
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <div className="text-2xl font-bold">{selectedLand.minLeaseDuration}</div>
                  <div className="text-xs text-muted-foreground">min months</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Land Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">Soil Type</span>
                    <span>{selectedLand.soilType}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">Topography</span>
                    <span className="capitalize">{selectedLand.topography}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">Condition</span>
                    <span className="capitalize">{selectedLand.condition}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded-md">
                    <span className="text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{selectedLand.rating} ({selectedLand.reviewCount})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Water Sources</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLand.waterSources.length > 0 ? (
                    selectedLand.waterSources.map((source) => (
                      <Badge key={source} variant="outline">
                        <Droplets className="w-3 h-3 mr-1 text-blue-500" />
                        {source}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No water sources available</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Infrastructure</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLand.infrastructure.map((item) => (
                    <Badge key={item} variant="outline">
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLand.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">{selectedLand.ownerName}</h4>
                    <p className="text-sm text-muted-foreground">Land Owner</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" data-testid="button-contact-owner">
                    <Phone className="w-4 h-4 mr-2" />
                    {t("land_leasing.contact_owner", "Contact Owner")}
                  </Button>
                  <Button variant="outline" className="flex-1" data-testid="button-message-owner">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t("land_leasing.send_message", "Send Message")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <SplitMapLayout mapProps={{ title: "Sellers near these plots", subtitle: "Live farmer activity in the area" }}>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("land_leasing.title", "Land Leasing Marketplace")}</h1>
            <p className="text-muted-foreground">{t("land_leasing.subtitle", "Find and lease agricultural land across the UK")}</p>
          </div>
          <Button disabled title="Land posting is not available yet" data-testid="button-post-land">
            {t("land_leasing.post_land", "Post Your Land")}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("land_leasing.search_placeholder", "Search by location or title...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-land"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full lg:w-48" data-testid="select-land-type">
              <SelectValue placeholder="Land Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agricultural">Agricultural</SelectItem>
              <SelectItem value="irrigated">Irrigated</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="specialty">Specialty</SelectItem>
              <SelectItem value="short-term">Short-Term</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            {t("land_leasing.filters", "Filters")}
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Price Range (£/month)
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={2000}
                    step={50}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>£{priceRange[0]}</span>
                    <span>£{priceRange[1]}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Area Range (acres)
                  </label>
                  <Slider
                    value={areaRange}
                    onValueChange={setAreaRange}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{areaRange[0]} acres</span>
                    <span>{areaRange[1]} acres</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasWater"
                      checked={filters.hasWater}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, hasWater: checked as boolean })
                      }
                    />
                    <label htmlFor="hasWater" className="text-sm">Water Available</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasElectricity"
                      checked={filters.hasElectricity}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, hasElectricity: checked as boolean })
                      }
                    />
                    <label htmlFor="hasElectricity" className="text-sm">Electricity</label>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isVerified"
                      checked={filters.isVerified}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, isVerified: checked as boolean })
                      }
                    />
                    <label htmlFor="isVerified" className="text-sm">Verified Only</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="organicOnly"
                      checked={filters.organicOnly}
                      onCheckedChange={(checked) => 
                        setFilters({ ...filters, organicOnly: checked as boolean })
                      }
                    />
                    <label htmlFor="organicOnly" className="text-sm">Organic Zone</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="lease" className="space-y-4 mb-6">
          <TabsList className="h-10 flex-wrap">
            <TabsTrigger value="lease" data-testid="tab-lease">
              <MapPin className="w-4 h-4 mr-1.5" />
              Lease
            </TabsTrigger>
            <TabsTrigger value="sale" data-testid="tab-sale">
              <CreditCard className="w-4 h-4 mr-1.5" />
              For Sale
            </TabsTrigger>
            <TabsTrigger value="investment" data-testid="tab-investment">
              <Activity className="w-4 h-4 mr-1.5" />
              Investment
            </TabsTrigger>
            <TabsTrigger value="community" data-testid="tab-community">
              <Users className="w-4 h-4 mr-1.5" />
              Community
            </TabsTrigger>
            <TabsTrigger value="government" data-testid="tab-government">
              <Landmark className="w-4 h-4 mr-1.5" />
              Gov. Programs
            </TabsTrigger>
            <TabsTrigger value="my-leases" data-testid="tab-my-leases">
              <Calendar className="w-4 h-4 mr-1.5" />
              My Leases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lease">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredListings.length} land listings available to lease
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map(renderLandCard)}
            </div>
            {filteredListings.length === 0 && (
              <div className="text-center py-10 sm:py-16 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No lease listings match your filters</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sale">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Agricultural land plots available for permanent purchase</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salePlots.map((plot) => (
                <Card key={plot.id} className="hover-elevate" data-testid={`card-sale-${plot.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{plot.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />{plot.location}
                        </div>
                      </div>
                      {plot.verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />Verified
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-1"><TreePine className="w-3 h-3 text-green-600" />{plot.area}</div>
                      <div className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-600" />{plot.soilType}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">£{plot.price.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">total</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0">For Sale</Badge>
                    </div>
                    <Button className="w-full mt-3" size="sm" data-testid={`button-enquire-${plot.id}`}>
                      Enquire Now <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="investment">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Agricultural land investment opportunities with projected returns</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {investmentOpportunities.map((opp) => (
                <Card key={opp.id} className="hover-elevate border-amber-200 dark:border-amber-800" data-testid={`card-investment-${opp.id}`}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0 mb-2">{opp.type}</Badge>
                        <span className="text-xs font-semibold text-green-600">+{opp.projectedReturn}% p.a.</span>
                      </div>
                      <h3 className="font-semibold text-sm">{opp.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />{opp.location}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opp.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-muted rounded p-2">
                        <div className="text-muted-foreground">Min. Investment</div>
                        <div className="font-semibold">£{opp.minInvestment.toLocaleString()}</div>
                      </div>
                      <div className="bg-muted rounded p-2">
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-semibold">{opp.duration}</div>
                      </div>
                    </div>
                    <Button className="w-full" size="sm" data-testid={`button-invest-${opp.id}`}>
                      View Prospectus <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="community">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Community farming plots, allotments, and shared agricultural spaces</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityPlots.map((plot) => (
                <Card key={plot.id} className="hover-elevate border-teal-200 dark:border-teal-800" data-testid={`card-community-${plot.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-0 mb-1.5">{plot.type}</Badge>
                        <h3 className="font-semibold text-sm">{plot.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />{plot.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {plot.feePerMonth === 0 ? "Free" : `£${plot.feePerMonth}/mo`}
                        </div>
                        <div className="text-xs text-muted-foreground">{plot.plotSize}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{plot.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {plot.amenities.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{plot.spotsAvailable} of {plot.totalSpots} spots available</span>
                      <span className={plot.spotsAvailable < 5 ? "text-orange-600 font-medium" : "text-green-600 font-medium"}>
                        {plot.spotsAvailable < 5 ? "Almost full!" : "Spots open"}
                      </span>
                    </div>
                    <Button className="w-full" size="sm" variant={plot.spotsAvailable === 0 ? "secondary" : "default"} disabled={plot.spotsAvailable === 0} data-testid={`button-join-${plot.id}`}>
                      {plot.spotsAvailable === 0 ? "Join Waitlist" : "Join Community"}
                      <Users className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="government" className="space-y-4">
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                    <Landmark className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Government Land Programs</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Access subsidized agricultural land through government schemes. Get priority access, training, and financial support.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {governmentLandPrograms.map((program) => (
                <Card key={program.id} className="overflow-visible" data-testid={`card-program-${program.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                        <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <CardTitle className="text-base">{program.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted rounded-md text-center">
                        <div className="text-lg font-bold text-primary">
                          {program.acresAvailable.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Acres Available</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded-md text-center">
                        <div className="text-lg font-bold text-green-600">
                          £{program.subsidizedRent}/acre
                        </div>
                        <div className="text-xs text-muted-foreground">Subsidized Rent</div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Lease Term:</span>
                      </div>
                      <span className="font-medium">{program.leaseTerm}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Award className="w-3 h-3 text-green-500" />
                        <span className="text-sm font-medium">Benefits</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {program.benefits.map((benefit) => (
                          <Badge key={benefit} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span className="text-sm font-medium">Eligibility</span>
                      </div>
                      <div className="space-y-1">
                        {program.eligibility.map((req) => (
                          <div key={req} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-500" />
                            {req}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" size="sm" data-testid={`button-eligibility-${program.id}`}>
                        <FileText className="w-3 h-3 mr-1" />
                        Check Eligibility
                      </Button>
                      <Button className="flex-1" size="sm" data-testid={`button-apply-${program.id}`}>
                        Apply Now
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-leases" className="space-y-4">
            {sampleLeases.length === 0 ? (
              <Card className="py-6 sm:py-12">
                <CardContent className="text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Leases</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by browsing available land listings or government programs
                  </p>
                  <Button onClick={() => {}}>
                    Browse Land Listings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sampleLeases.map((lease) => {
                const land = sampleLandListings.find(l => l.id === lease.landId);
                return (
                  <Card key={lease.id} data-testid={`card-lease-${lease.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">
                            {land?.title || `Plot #${lease.landId}`}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {land?.location} | {land?.area} {land?.areaUnit}
                          </p>
                        </div>
                        <Badge variant={lease.status === "active" ? "default" : "secondary"}>
                          {lease.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3" />
                            Lease Period
                          </div>
                          <div className="text-sm font-medium">
                            {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <CreditCard className="w-3 h-3" />
                            Monthly Rent
                          </div>
                          <div className="text-sm font-semibold text-primary">£{lease.monthlyRent}/month</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-sm text-muted-foreground mb-1">Deposit Paid</div>
                          <div className="text-sm font-medium">£{lease.depositPaid}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-sm text-muted-foreground mb-1">Lessee</div>
                          <div className="text-sm font-medium">{lease.lesseeName}</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <CreditCard className="w-4 h-4 text-green-500" />
                          Payment Status
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {lease.payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <span className="text-sm">{payment.month}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">£{payment.amount}</span>
                                <Badge 
                                  variant={payment.status === "paid" ? "default" : payment.status === "overdue" ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {payment.status === "paid" ? (
                                    <><Check className="w-3 h-3 mr-1" />{payment.status}</>
                                  ) : (
                                    payment.status
                                  )}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Activity className="w-4 h-4 text-blue-500" />
                          Activity Log
                        </h4>
                        <div className="space-y-2">
                          {lease.activityLog.slice(0, 4).map((activity) => (
                            <div key={activity.id} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="text-xs text-muted-foreground">{activity.date}</span>
                              <span>{activity.description}</span>
                              <Badge variant="outline" className="text-xs ml-auto">{activity.type}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" className="flex-1" size="sm" data-testid={`button-message-lessee-${lease.id}`}>
                          <MessageSquarePlus className="w-4 h-4 mr-1" />
                          Message Lessee
                        </Button>
                        <Button variant="outline" className="flex-1" size="sm" data-testid={`button-call-lessee-${lease.id}`}>
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                        <Button className="flex-1" size="sm" data-testid={`button-view-reports-${lease.id}`}>
                          <FileText className="w-4 h-4 mr-1" />
                          Reports
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {filteredListings.length === 0 && (
          <Card className="py-6 sm:py-12">
            <CardContent className="text-center">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Land Listings Found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search criteria
              </p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
                setPriceRange([0, 2000]);
                setAreaRange([0, 50]);
                setFilters({ hasWater: false, hasElectricity: false, isVerified: false, organicOnly: false });
              }}>
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedLand && renderLandDetail()}
      </div>
      </SplitMapLayout>
    </div>
  );
}
