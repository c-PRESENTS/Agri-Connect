import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Wheat, Flower2, TrendingUp, Settings, Leaf, TreePine, Fish, 
  Dog, Lightbulb, FileText, MapPin, Users, BarChart3, BookOpen,
  Globe, Phone, Award, Newspaper, Shield, Sprout, Bug, Droplets,
  Sun, Cloud, ThermometerSun, ArrowLeft, Loader2, Sparkles,
  ChevronRight, ExternalLink, Home as HomeIcon, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TopNavigation } from "@/components/top-navigation";
import { TextToSpeech } from "@/components/text-to-speech";
import { TranslateButton } from "@/components/translate-button";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  SidebarProvider,
  SidebarInset,
  SidebarTrigger 
} from "@/components/ui/sidebar";

interface LocationData {
  latitude: number;
  longitude: number;
  region: string;
  state: string;
  district: string;
  climate: string;
  soilType: string;
}

interface AIRecommendation {
  category: string;
  products: string[];
  marketValue: string;
  competitors: number;
  demandLevel: string;
  seasonality: string;
  tips: string[];
}

interface GuidanceCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
  topics: GuidanceTopic[];
  color: string;
}

interface GuidanceTopic {
  title: string;
  description: string;
  content: string;
}

const guidanceCategories: GuidanceCategory[] = [
  {
    id: "agriculture",
    name: "Agriculture",
    icon: Wheat,
    description: "SRI, Rice, Pulses, Oil Seeds, Forage, Millets, Cereals, Seasons, Irrigation, Weed, Pest, Disease",
    color: "bg-green-500",
    topics: [
      { 
        title: "Crop Production", 
        description: "Best practices for growing various crops",
        content: "Comprehensive guide on crop production including land preparation, seed selection, sowing techniques, irrigation management, fertilizer application, and pest control measures. Learn about recommended varieties for your region, optimal planting times, and expected yields."
      },
      { 
        title: "Seed Selection", 
        description: "Choosing the right seeds for your soil and climate",
        content: "Guide to selecting certified seeds based on soil type, climate conditions, and market demand. Includes information on hybrid varieties, disease-resistant varieties, and high-yielding varieties suitable for different agro-climatic zones."
      },
      { 
        title: "Irrigation Management", 
        description: "Efficient water usage and irrigation techniques",
        content: "Learn about drip irrigation, sprinkler systems, flood irrigation, and their applications. Understand crop water requirements, scheduling irrigation, and water conservation techniques for sustainable farming."
      },
      { 
        title: "Pest & Disease Control", 
        description: "Integrated pest management strategies",
        content: "Comprehensive IPM strategies including biological control, cultural practices, mechanical methods, and safe use of pesticides. Disease identification, prevention, and treatment protocols for major crops."
      }
    ]
  },
  {
    id: "horticulture",
    name: "Horticulture",
    icon: Flower2,
    description: "Nursery, Fruits, Vegetables, Flowers, Spices, Plantation, Medicinal, Aromatic Crops, Landscaping",
    color: "bg-pink-500",
    topics: [
      { 
        title: "Fruit Cultivation", 
        description: "Growing and managing fruit orchards",
        content: "Complete guide to establishing and managing fruit orchards including mango, banana, citrus, guava, papaya, and sapota. Covers planting density, training systems, pruning, flowering management, and post-harvest handling."
      },
      { 
        title: "Vegetable Production", 
        description: "Year-round vegetable cultivation techniques",
        content: "Seasonal vegetable cultivation calendar, protected cultivation techniques, organic vegetable production, and high-value vegetable farming. Includes information on tomato, brinjal, chilli, okra, and leafy vegetables."
      },
      { 
        title: "Floriculture", 
        description: "Commercial flower cultivation",
        content: "Guidelines for growing cut flowers, loose flowers, and ornamental plants. Covers rose, jasmine, marigold, chrysanthemum, and orchid cultivation with market linkages and value addition."
      },
      { 
        title: "Spices & Plantation Crops", 
        description: "Growing spices and plantation crops",
        content: "Cultivation practices for turmeric, ginger, pepper, cardamom, coconut, arecanut, and coffee. Includes processing, grading, and marketing of spice crops."
      }
    ]
  },
  {
    id: "marketing",
    name: "Agricultural Marketing",
    icon: TrendingUp,
    description: "Commodity Boards, Schemes, Food Processing, Value Addition, Markets",
    color: "bg-blue-500",
    topics: [
      { 
        title: "Market Intelligence", 
        description: "Current prices and market trends",
        content: "Real-time market prices from wholesale market board markets, price forecasting, demand-supply analysis, and market trends. Information on online agricultural marketplaces, AGMARKNET, and commodity exchanges for informed selling decisions."
      },
      { 
        title: "Value Addition", 
        description: "Processing and value-added products",
        content: "Guidance on setting up processing units, food safety certifications (FSSAI), packaging, branding, and marketing of processed agricultural products. Covers pickles, jams, dried products, and ready-to-eat items."
      },
      { 
        title: "Export Opportunities", 
        description: "International market access",
        content: "Export procedures, quality standards, certification requirements (organic, GlobalGAP), and market access for agricultural commodities. Information on APEDA, MPEDA, and trade agreements."
      },
      { 
        title: "Direct Marketing", 
        description: "Farmer producer organizations and direct sales",
        content: "Benefits of FPOs, collective marketing, contract farming, and direct-to-consumer sales channels. Platform integration for reaching urban consumers and premium markets."
      }
    ]
  },
  {
    id: "engineering",
    name: "Agricultural Engineering",
    icon: Settings,
    description: "Farm Machinery, Bio-energy, Processing, PHT, Machinery, Equipment, Conservation",
    color: "bg-orange-500",
    topics: [
      { 
        title: "Farm Mechanization", 
        description: "Modern farming equipment and machinery",
        content: "Guide to tractors, power tillers, harvesters, and implements suitable for different farm sizes. Includes maintenance tips, custom hiring centers, and subsidy schemes for farm machinery."
      },
      { 
        title: "Post-Harvest Technology", 
        description: "Storage, processing, and preservation",
        content: "Modern storage structures, cold chain management, processing equipment, and quality maintenance during storage. Reduces post-harvest losses and improves shelf life."
      },
      { 
        title: "Renewable Energy", 
        description: "Solar, biogas, and biomass energy",
        content: "Solar pumping systems, solar dryers, biogas plants, and biomass gasifiers for rural energy needs. Subsidy schemes and installation guidelines for clean energy adoption."
      },
      { 
        title: "Precision Agriculture", 
        description: "Technology-driven farming",
        content: "GPS-guided operations, drone applications, IoT sensors, and data-driven decision making in agriculture. Smart farming technologies for resource optimization."
      }
    ]
  },
  {
    id: "organic",
    name: "Organic Farming",
    icon: Leaf,
    description: "Organic Certification, Accreditation, Vermicompost, Pseudomonas, traditional bio-stimulant",
    color: "bg-emerald-500",
    topics: [
      { 
        title: "Organic Certification", 
        description: "Getting certified as organic producer",
        content: "Step-by-step process for organic certification under international standards (IFOAM, USDA Organic, EU Organic). Documentation requirements, conversion period, inspection procedures, and certification bodies. Group certification for smallholders."
      },
      { 
        title: "Organic Inputs", 
        description: "Natural fertilizers and pest control",
        content: "Preparation and application of vermicompost, panchagavya, jeevamrutha, and other organic inputs. Botanical pesticides, bio-fertilizers, and bio-control agents for organic farming."
      },
      { 
        title: "Organic Markets", 
        description: "Selling organic produce at premium",
        content: "Organic market channels, premium pricing, consumer awareness, and building organic brand. Online platforms and organic retail chains for direct marketing."
      }
    ]
  },
  {
    id: "sericulture",
    name: "Sericulture",
    icon: Bug,
    description: "Mulberry, Silk worm Rearing, Cacoon, Sericulture",
    color: "bg-purple-500",
    topics: [
      { 
        title: "Mulberry Cultivation", 
        description: "Growing mulberry for silkworm rearing",
        content: "High-yielding mulberry varieties, planting techniques, fertilizer management, and harvesting practices. Irrigated and rain-fed mulberry cultivation methods."
      },
      { 
        title: "Silkworm Rearing", 
        description: "Commercial silkworm production",
        content: "Silkworm rearing techniques, disease management, quality cocoon production, and grainage practices. Bivoltine and cross-breed silkworm rearing."
      },
      { 
        title: "Silk Reeling", 
        description: "From cocoon to silk yarn",
        content: "Reeling techniques, quality parameters, and marketing of raw silk. Value addition through weaving and garment making."
      }
    ]
  },
  {
    id: "forestry",
    name: "Forestry",
    icon: TreePine,
    description: "Agro Forestry, Social Forestry, Silviculture, Timber, Wildlife",
    color: "bg-green-700",
    topics: [
      { 
        title: "Agroforestry Systems", 
        description: "Trees with crops for sustainable income",
        content: "Popular agroforestry models like agri-silviculture, silvipasture, and home gardens. Tree species selection, spacing, and management with agricultural crops."
      },
      { 
        title: "Tree Farming", 
        description: "Commercial tree plantation",
        content: "Fast-growing tree species for timber, pulpwood, and plywood. Teak, eucalyptus, casuarina, and poplar plantation techniques with expected returns."
      },
      { 
        title: "NTFP Collection", 
        description: "Non-timber forest products",
        content: "Sustainable collection and marketing of honey, medicinal plants, gums, resins, and other forest products. Community forest management and livelihood opportunities."
      }
    ]
  },
  {
    id: "fishery",
    name: "Fishery",
    icon: Fish,
    description: "Fresh water Fish, Marine Fish, Prawn, Fish Species, Riverine Fishery, Ornamental Fish",
    color: "bg-cyan-500",
    topics: [
      { 
        title: "Pond Aquaculture", 
        description: "Freshwater fish farming",
        content: "Pond construction, water quality management, stocking density, feeding practices, and harvesting for carp, tilapia, and pangasius. Integrated fish farming systems."
      },
      { 
        title: "Prawn Farming", 
        description: "Shrimp and prawn culture",
        content: "Vannamei and tiger prawn culture practices, biosecurity measures, disease management, and export-quality production. BMPs for sustainable shrimp farming."
      },
      { 
        title: "Ornamental Fish", 
        description: "Breeding decorative fish",
        content: "Breeding and rearing techniques for goldfish, guppy, molly, and other ornamental species. Setting up home-based ornamental fish units for additional income."
      }
    ]
  },
  {
    id: "animal",
    name: "Animal Husbandry",
    icon: Dog,
    description: "Cattle, Livestock, Poultry, Piggery, Veterinary Services, Goat, Pig",
    color: "bg-amber-600",
    topics: [
      { 
        title: "Dairy Farming", 
        description: "Milk production and management",
        content: "Breed selection, feeding management, housing, health care, and milk production optimization. Clean milk production and dairy cooperative membership."
      },
      { 
        title: "Poultry Farming", 
        description: "Commercial egg and meat production",
        content: "Layer and broiler farming practices, feed management, disease control, and marketing. Backyard poultry for rural livelihoods."
      },
      { 
        title: "Goat & Sheep Rearing", 
        description: "Small ruminant management",
        content: "Breed selection, housing, feeding, health management, and marketing of goats and sheep. Stall-fed and grazing-based systems."
      },
      { 
        title: "Veterinary Care", 
        description: "Animal health and disease prevention",
        content: "Vaccination schedules, common disease symptoms, first aid, and when to call a veterinarian. Government veterinary services and helpline numbers."
      }
    ]
  },
  {
    id: "schemes",
    name: "Schemes & Services",
    icon: FileText,
    description: "Government Schemes, Subsidies, Insurance, Banking, Credit, Development Programs",
    color: "bg-indigo-500",
    topics: [
      { 
        title: "national farmer income support", 
        description: "Direct income support scheme",
        content: "Eligibility criteria, registration process, and payment schedule for national farmer income support. How to check payment status and update KYC details."
      },
      { 
        title: "Crop Insurance", 
        description: "national crop insurance scheme and other insurance schemes",
        content: "Pradhan Mantri Fasal Bima Yojana coverage, premium rates, claim process, and documentation required. Weather-based crop insurance options."
      },
      { 
        title: "Agricultural Credit", 
        description: "Loans and financial support",
        content: "Agricultural Credit Card, crop loans, term loans for farm development, and interest subvention schemes. Tie-up with banks and Rural Development Bank schemes."
      },
      { 
        title: "Subsidy Schemes", 
        description: "Government subsidies for farmers",
        content: "Subsidies for farm machinery, micro-irrigation, solar pumps, organic certification, and greenhouse construction. Application procedures and eligibility."
      }
    ]
  }
];

type KnowledgeArticle = {
  title: string;
  section: string;
  intro: string;
  bullets: string[];
  practice: string;
  cta?: { label: string; href: string };
};

const articleLibrary: Record<string, Omit<KnowledgeArticle, "title" | "section">> = {
  "Crop Production Systems": {
    intro: "Production systems organise the calendar, inputs and rotations that turn a parcel of land into a sustained yield. Choice of system depends on agro-ecological zone, water availability, soil texture and labour.",
    bullets: [
      "Match cropping intensity (single, double or relay) to rainfall and irrigation reliability.",
      "Use legume rotations every 2–3 seasons to fix nitrogen and break pest cycles.",
      "Maintain residue cover ≥30% to protect soil structure between crops.",
      "Plan sowing windows around the 10-day climate forecast, not a fixed calendar date.",
    ],
    practice: "Audit your last three seasons against rainfall records — most yield gaps trace back to sowing 7–14 days outside the optimum window.",
  },
  "Crop Protection & IPM": {
    intro: "Integrated Pest Management (IPM) layers cultural, biological, mechanical and — only as a last resort — chemical controls to keep pest pressure below the economic threshold.",
    bullets: [
      "Scout fields weekly; record pest counts per 10 plants in a logbook.",
      "Conserve natural enemies — avoid broad-spectrum sprays during flowering.",
      "Rotate active ingredients (FRAC/IRAC groups) to delay resistance.",
      "Use pheromone traps for early-warning of moth and fruit-fly pressure.",
    ],
    practice: "An IPM programme typically reduces pesticide use 40–60% within two seasons while maintaining or improving yield.",
  },
  "Crop Improvement & Breeding": {
    intro: "Genetic improvement delivers the largest single gain in agriculture — often 1–2% yield per year in major cereals. Modern programmes blend conventional crossing with marker-assisted selection.",
    bullets: [
      "Choose certified seed of cultivars released for your agro-climatic zone.",
      "Replace farm-saved seed every 3–4 generations to preserve vigour.",
      "Participatory variety selection trials let growers compare 4–6 cultivars on-farm.",
      "Stress-tolerant lines (drought, heat, salinity) often out-yield in poor seasons.",
    ],
    practice: "Insist on the seed lot's germination percentage (>85%) and physical purity (>98%) on the certification label.",
  },
  "Agricultural Biotechnology": {
    intro: "Tissue culture, marker-assisted selection and gene editing accelerate trait introgression. Adoption is regulated and varies by jurisdiction — always verify local approvals.",
    bullets: [
      "Tissue-cultured planting material gives uniform, disease-free banana, sugarcane and potato stock.",
      "Marker-assisted backcrossing introgresses single-gene traits (rust, blight) in 2–3 generations.",
      "Diagnostic kits (LAMP, ELISA) confirm seed-borne pathogens within hours.",
      "Bio-pesticides based on Bt, Trichoderma and Pseudomonas reduce chemical load.",
    ],
    practice: "When sourcing tissue-cultured plantlets, demand the lab's virus-indexing report — not just a phytosanitary certificate.",
  },
  "Post-Harvest Technology": {
    intro: "Up to 30% of food never reaches the consumer because of poor handling between field and market. Post-harvest technology recovers that loss with cooling, drying, grading and packaging.",
    bullets: [
      "Pre-cool leafy greens within 4 hours of harvest to extend shelf life by 3–5 days.",
      "Dry grain to 12–13% moisture before storage to prevent aflatoxin.",
      "Grade by size and colour — premium grades fetch 15–40% higher prices.",
      "Use modified-atmosphere packaging for high-value horticulture exports.",
    ],
    practice: "A simple shaded collection point at the field edge with crates and a thermometer can pay back its cost in one season.",
  },
  "Plant Nutrition & Fertility": {
    intro: "Crops need 17 essential elements in balanced ratios. Over-application of NPK without micronutrients is the most common cause of stagnant yields on intensively-cropped soil.",
    bullets: [
      "Test soil every 2–3 years; correct pH before adjusting nutrients.",
      "Split nitrogen across 2–3 applications to match crop demand and reduce leaching.",
      "Foliar sprays of zinc, boron and iron correct deficiencies within 7–10 days.",
      "Combine organic manure with mineral fertiliser — yields are 10–20% higher than either alone.",
    ],
    practice: "If leaves yellow between veins on younger growth, suspect zinc or iron — confirm with a tissue test before broadcasting.",
  },
  "Soil Health Management": {
    intro: "Soil is a living system. Organic matter, microbial biomass and aggregate stability govern water-holding capacity and nutrient cycling far more than the bag of fertiliser applied.",
    bullets: [
      "Aim for soil organic carbon ≥1.5% in the top 20 cm.",
      "Cover crops in fallow windows add 1–3 t/ha of biomass and suppress weeds.",
      "Reduced tillage preserves soil structure and earthworm populations.",
      "Liming acid soils (pH <5.5) often unlocks more yield than extra fertiliser.",
    ],
    practice: "A spade test — count earthworms in a 20×20×20 cm block — is a free, reliable proxy for biological health.",
  },
  "Water & Irrigation Engineering": {
    intro: "Water productivity (kg of crop per m³ of water) matters more than total volume applied. Drip and micro-sprinkler systems can double water productivity over flood irrigation.",
    bullets: [
      "Schedule irrigation by soil moisture sensors or evapotranspiration data, not by calendar.",
      "Drip irrigation cuts water use 30–60% and reduces weed pressure.",
      "Mulching (organic or plastic) reduces evaporation losses by 25–40%.",
      "Maintain laterals and emitters — clogged drippers waste pumped water.",
    ],
    practice: "Install a simple tensiometer at root depth — irrigate when reading reaches –40 kPa for vegetables, –60 kPa for cereals.",
  },
  "Precision Agriculture": {
    intro: "Precision agriculture matches inputs to within-field variability using GPS, sensors and analytics. The aim is the right rate, in the right place, at the right time.",
    bullets: [
      "Yield maps reveal management zones — often 20–30% of a field underperforms the average.",
      "Variable-rate fertiliser saves 10–25% input cost without yield loss.",
      "Satellite NDVI imagery monitors crop vigour weekly at near-zero cost.",
      "Auto-steer GPS reduces overlap on sprayer and seeder passes.",
    ],
    practice: "Start small: collect one season of yield-monitor data before investing in variable-rate equipment.",
  },
  "System of Rice Intensification (SRI)": {
    intro: "The System of Rice Intensification (SRI) raises rice yields 20–50% with less seed, water and chemical input by changing how the crop is established and managed.",
    bullets: [
      "Transplant young (8–12 day) single seedlings at wide spacing (25×25 cm).",
      "Keep soil moist but not flooded during vegetative growth.",
      "Use a mechanical weeder to aerate soil and incorporate weeds.",
      "Apply organic compost (5–10 t/ha) to support strong root growth.",
    ],
    practice: "SRI works best on well-levelled fields with reliable drainage — uneven plots concentrate water and lose the aeration benefit.",
  },
  "Drone-based Crop Monitoring": {
    intro: "Multi-spectral drones produce field maps of crop vigour, water stress and pest hotspots that would take days to walk and survey manually.",
    bullets: [
      "Fly at 80–120 m altitude for 5–10 cm/pixel resolution sufficient for vigour mapping.",
      "Repeat flights every 7–14 days to track crop development.",
      "NDVI and NDRE indices flag stress 7–10 days before visible symptoms.",
      "Spray drones apply 15–20 L/ha at narrow swaths — saving 30% chemical.",
    ],
    practice: "Always check national drone regulations and obtain operator certification before commercial flights.",
  },
  "Hydroponics & Aeroponics": {
    intro: "Soilless cultivation grows crops in nutrient solution. Yields per square metre are 5–10× field production, with year-round output and 90% less water.",
    bullets: [
      "Maintain nutrient solution EC at 1.6–2.4 mS/cm and pH 5.5–6.5 for most leafy greens.",
      "Replace solution every 7–10 days to prevent salt build-up.",
      "Aeroponic root chambers need 100% humidity and dark conditions.",
      "Backup pumps and generators are essential — a 4-hour outage can kill a crop.",
    ],
    practice: "Start with deep-water culture (DWC) lettuce before scaling to aeroponic strawberries or tomatoes.",
  },
  "Vertical & Urban Farming": {
    intro: "Stacked growing systems under LEDs deliver fresh produce close to consumers, with controlled climate eliminating seasonal variation.",
    bullets: [
      "Photosynthetic photon flux density (PPFD) of 200–400 µmol/m²/s suits most leafy greens.",
      "16-hour photoperiods accelerate growth without bolting.",
      "Energy is the dominant cost — choose efficient LEDs (2.5+ µmol/J).",
      "High-value, short-cycle crops (herbs, microgreens, lettuce) deliver best ROI.",
    ],
    practice: "Vertical farms break even fastest when supplying restaurants and grocers within 50 km, where freshness commands premium pricing.",
  },
  "Protected Cultivation (Greenhouse)": {
    intro: "Polyhouses, net houses and shade structures extend growing seasons, protect against extreme weather and lift yields 2–4× over open-field production.",
    bullets: [
      "Naturally ventilated polyhouses suit temperate crops; fan-pad systems are needed in hot zones.",
      "Insect-proof nets (40 mesh) prevent thrips and whitefly entry.",
      "Drip fertigation and CO₂ enrichment maximise the controlled environment.",
      "Sanitise structures between crops — humidity favours Botrytis and powdery mildew.",
    ],
    practice: "Budget 20% of capital cost for annual maintenance — film replacement, fan motors and irrigation lines.",
  },
  "IoT Field Sensors & Telemetry": {
    intro: "Low-cost wireless sensors stream soil moisture, temperature, humidity and leaf-wetness data to growers' phones — turning intuition into evidence.",
    bullets: [
      "Place soil-moisture probes at active root depth (20 cm and 40 cm typically).",
      "LoRaWAN gateways cover 3–5 km in open fields with one base station.",
      "Set SMS/push alerts for irrigation thresholds and frost risk.",
      "Calibrate sensors against gravimetric soil samples once per season.",
    ],
    practice: "Two well-placed soil-moisture sensors per hectare are enough to make irrigation decisions — more is rarely better.",
  },
  "National Crop Insurance Schemes": {
    intro: "Crop insurance cushions growers against weather, pest and price shocks. Index-based products pay out automatically when an objective trigger (rainfall, NDVI) is breached.",
    bullets: [
      "Yield-based insurance compares your harvest against a regional benchmark.",
      "Weather-index policies pay if rainfall falls below or above set thresholds.",
      "Premium subsidies are common — check national agriculture ministry portals.",
      "Document inputs, sowing date and field boundaries to support claims.",
    ],
    practice: "File enrolment within the cut-off (usually 15 days before sowing) — late applications are routinely rejected.",
  },
  "Online Agricultural Marketplaces": {
    intro: "Digital marketplaces shorten the chain between grower and consumer, capturing 20–60% of margin that would otherwise go to intermediaries.",
    bullets: [
      "List with clear photos, weights and harvest dates — buyers respond to transparency.",
      "Bundle complementary products (vegetable boxes, recipe kits) to lift order value.",
      "Maintain a 4.5+ star rating to secure repeat customers.",
      "Use cold-chain couriers for perishables — quality complaints are the top churn driver.",
    ],
    practice: "Track your unit-economics weekly: net price per kg after platform fee, packing and delivery — many growers discover their bestsellers are loss-leaders.",
  },
  "Daily Press Notes": {
    intro: "Daily agricultural bulletins compile commodity prices, weather warnings, policy updates and pest alerts relevant to the day's decisions.",
    bullets: [
      "Subscribe to your country's official agriculture-ministry press feed.",
      "Set price alerts for the 3–5 commodities you trade.",
      "Cross-reference national bulletins with FAO GIEWS for global context.",
      "Archive bulletins monthly — they are valuable for trend analysis.",
    ],
    practice: "Spend 10 minutes with the morning bulletin before opening the WhatsApp group — it changes how you read peer rumours.",
  },
  "Agro-meteorological Advisory": {
    intro: "Agromet advisories translate weather forecasts into farm operations: when to spray, irrigate, sow or harvest given the next 5 days of conditions.",
    bullets: [
      "Use 24–72 hour forecasts for spraying and irrigation decisions.",
      "Plan harvest around the 5-day rainfall outlook to avoid spoilage.",
      "Combine forecast with crop-stage knowledge — flowering crops are most weather-sensitive.",
      "Record the forecast and the actual outcome — calibrates your trust in the source.",
    ],
    practice: "If two independent forecasts diverge sharply, default to the more conservative operation — the cost of wrong action exceeds the cost of waiting a day.",
  },
};

function getArticle(label: string, section: string): KnowledgeArticle {
  const entry = articleLibrary[label];
  if (entry) {
    return { title: label, section, ...entry };
  }
  return {
    title: label,
    section,
    intro: `${label} is part of the ${section.toLowerCase()} curriculum in the Knowledge Hub. Below is a concise practitioner brief; full-length references and field manuals are linked at the foot of this article.`,
    bullets: [
      "Understand the core principle before adopting the technology on your farm.",
      "Pilot on 5–10% of land for one season; measure cost, labour and yield response.",
      "Document inputs and outcomes — your own data is more reliable than catalogue claims.",
      "Engage your local extension officer or agronomist before scaling.",
    ],
    practice: "Most innovations succeed or fail on disciplined record-keeping. A simple farm notebook is the cheapest, highest-return tool in agriculture.",
  };
}

export default function FarmersHelp() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GuidanceCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<GuidanceTopic | null>(null);
  const [openArticle, setOpenArticle] = useState<KnowledgeArticle | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    let resolved = false;
    const finish = (data: LocationData) => {
      if (resolved) return;
      resolved = true;
      setLocationData(data);
      analyzeLocationAndRecommend(data);
    };
    // Hard timeout so the page never hangs waiting on a permission prompt.
    setTimeout(() => {
      resolved = true;
    }, 8000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        finish({
          latitude,
          longitude,
          region: "Your region",
          state: "Your area",
          district: "Local district",
          climate: "Temperate",
          soilType: "Mixed loam",
        });
      },
      () => { /* permission denied — page already renders without location */ },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  const analyzeLocationAndRecommend = async (location: LocationData) => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/chat", {
        message: `As an agricultural expert, analyze this location and provide product recommendations:
Location: ${location.district}, ${location.state}
Climate: ${location.climate}
Soil: ${location.soilType}

Provide 5 product categories farmers can sell with:
1. Category name
2. Top 3 products in that category
3. Estimated market value (Low/Medium/High)
4. Number of competitors (estimate 1-50)
5. Current demand level (Low/Medium/High)
6. Best season to sell
7. 2 quick tips for success

Format as JSON array.`,
        conversationHistory: []
      });
      
      const data = await response.json();
      
      const mockRecommendations: AIRecommendation[] = [
        {
          category: "Vegetables",
          products: ["Tomatoes", "Onions", "Green Chillies"],
          marketValue: "High",
          competitors: 23,
          demandLevel: "High",
          seasonality: "Year-round with peak in summer",
          tips: ["Focus on organic certification for premium prices", "Partner with local restaurants for steady demand"]
        },
        {
          category: "Fruits",
          products: ["Mangoes", "Bananas", "Coconuts"],
          marketValue: "High",
          competitors: 15,
          demandLevel: "High",
          seasonality: "Mangoes: Apr-Jun, Others: Year-round",
          tips: ["Invest in cold storage for longer shelf life", "Consider export markets for alphonso mangoes"]
        },
        {
          category: "Grains & Pulses",
          products: ["Rice", "Black Gram", "Groundnut"],
          marketValue: "Medium",
          competitors: 45,
          demandLevel: "Medium",
          seasonality: "wet and dry seasons",
          tips: ["Get MSP benefits through government procurement", "Join FPO for better bargaining power"]
        },
        {
          category: "Dairy Products",
          products: ["Fresh Milk", "Curd", "Paneer"],
          marketValue: "High",
          competitors: 12,
          demandLevel: "Very High",
          seasonality: "Year-round",
          tips: ["Maintain quality standards for cooperative membership", "Consider value-added products like ghee"]
        },
        {
          category: "Spices",
          products: ["Turmeric", "Chilli Powder", "Coriander"],
          marketValue: "High",
          competitors: 8,
          demandLevel: "High",
          seasonality: "Post-harvest processing year-round",
          tips: ["Get organic certification for export", "Focus on quality grading for premium markets"]
        }
      ];
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBack = () => {
    if (selectedTopic) {
      setSelectedTopic(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      setLocation("/");
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <SidebarInset className="flex flex-col flex-1">
          <TopNavigation
            cartItemCount={0}
            onSearch={() => {}}
            onHome={() => setLocation("/")}
          />
          
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="container max-w-7xl mx-auto px-4 py-6">
                <div className="relative mb-8 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-transparent">
                  <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,#16a34a_0,transparent_50%),radial-gradient(circle_at_80%_80%,#0ea5e9_0,transparent_50%)]" />
                  <div className="relative flex flex-wrap items-center gap-4 px-6 py-6">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                      <Sprout className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider gap-1">
                          <Globe className="h-3 w-3" /> Global
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider gap-1">
                          <Sparkles className="h-3 w-3" /> AI-personalized
                        </Badge>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-knowledge-hub-title">
                        {t("farmers_help.title", "Knowledge Hub")}
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                        {t("farmers_help.subtitle", "Practical agricultural guidance for growers worldwide — agronomy, horticulture, livestock, post-harvest, climate-smart practices and market intelligence.")}
                      </p>
                    </div>
                    {!locationData && (
                      <Button
                        onClick={detectLocation}
                        size="sm"
                        variant="default"
                        className="gap-1.5"
                        data-testid="button-personalize"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Personalize for my region
                      </Button>
                    )}
                  </div>
                </div>

                {locationData && (
                  <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-medium">{locationData.district}, {locationData.state}</span>
                        </div>
                        <Badge variant="secondary">{locationData.climate}</Badge>
                        <Badge variant="secondary">{locationData.soilType}</Badge>
                        <Badge variant="outline" className="ml-auto">
                          <Globe className="h-3 w-3 mr-1" />
                          {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI personalised insights — only when user opted in */}
                {locationData && (
                  <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 via-emerald-500/5 to-transparent">
                    <CardContent className="py-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="font-medium">{locationData.district}, {locationData.state}</span>
                        </div>
                        <Badge variant="secondary">{locationData.climate}</Badge>
                        <Badge variant="secondary">{locationData.soilType}</Badge>
                        <Badge variant="outline" className="ml-auto">
                          <Globe className="h-3 w-3 mr-1" />
                          {locationData.latitude.toFixed(3)}, {locationData.longitude.toFixed(3)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => locationData && analyzeLocationAndRecommend(locationData)}
                          disabled={isAnalyzing}
                          data-testid="button-refresh-ai"
                        >
                          {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {isAnalyzing ? "Analysing…" : "Refresh insights"}
                        </Button>
                      </div>
                      {recommendations.length > 0 && (
                        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-card/50 p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold">{rec.category}</span>
                                <Badge variant={rec.demandLevel === "High" || rec.demandLevel === "Very High" ? "default" : "secondary"} className="text-[10px]">
                                  {rec.demandLevel}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2">{rec.tips[0]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Drill-down: selected topic detail */}
                {selectedTopic && (
                  <Card className="mb-8" data-testid="card-topic-detail">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="font-serif text-2xl">{selectedTopic.title}</CardTitle>
                          <CardDescription className="mt-1">{selectedTopic.description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTopic(null)} data-testid="button-close-topic">
                          Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[15px] leading-relaxed text-foreground/90 max-w-3xl">
                        {selectedTopic.content}
                      </p>
                      <div className="mt-6 grid md:grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <h4 className="font-medium flex items-center gap-2 mb-1 text-sm">
                            <Play className="h-4 w-4 text-primary" /> Video tutorial
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">Step-by-step demonstration on this topic.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-watch-tutorial"
                            onClick={() => {
                              const q = encodeURIComponent(`${selectedTopic.title} agriculture tutorial`);
                              window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Watch now
                          </Button>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <h4 className="font-medium flex items-center gap-2 mb-1 text-sm">
                            <Phone className="h-4 w-4 text-primary" /> Talk to an expert
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">Connect with a qualified agronomist for tailored advice.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-contact-expert"
                            onClick={() => {
                              toast({
                                title: "Request sent",
                                description: `An agronomist will reach out about "${selectedTopic.title}" within 24 hours.`,
                              });
                            }}
                          >
                            Contact expert
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Drill-down: selected category topic list */}
                {selectedCategory && !selectedTopic && (
                  <Card className="mb-8" data-testid="card-category-topics">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-lg ${selectedCategory.color} flex items-center justify-center shrink-0`}>
                            <selectedCategory.icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="font-serif text-2xl">{selectedCategory.name}</CardTitle>
                            <CardDescription>{selectedCategory.description}</CardDescription>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} data-testid="button-close-category">
                          Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-3">
                      {selectedCategory.topics.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedTopic(topic)}
                          className="text-left rounded-lg border border-border/60 bg-card hover:bg-accent/40 hover:border-primary/40 transition-colors p-4 group"
                          data-testid={`button-topic-${i}`}
                        >
                          <h4 className="font-medium text-sm group-hover:text-primary flex items-center justify-between gap-2">
                            {topic.title}
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{topic.description}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* SECTION 1 — Subject areas (academic portal style) */}
                <section className="mb-12">
                  <div className="flex items-end justify-between mb-5 border-b border-border pb-2">
                    <h2 className="font-serif text-2xl font-semibold tracking-tight">Subject Areas</h2>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">10 disciplines · curated by agronomists</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {guidanceCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => { setSelectedCategory(category); setSelectedTopic(null); }}
                        className="group text-left rounded-xl border border-border/60 bg-card overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all"
                        data-testid={`card-subject-${category.id}`}
                      >
                        <div className={`relative h-28 ${category.color} flex items-center justify-center overflow-hidden`}>
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
                          <category.icon className="h-12 w-12 text-white/95 drop-shadow-md group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="p-3 border-t border-border/40">
                          <h3 className="font-serif text-base font-semibold leading-tight">{category.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3 leading-snug">
                            {category.description}
                          </p>
                          <span className="text-[11px] text-primary font-medium mt-2 inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                            read more <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* SECTION 2 — Core technologies & programmes */}
                <section className="mb-12">
                  <div className="flex items-end justify-between mb-5 border-b border-border pb-2">
                    <h2 className="font-serif text-2xl font-semibold tracking-tight">Core Technologies & Programmes</h2>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">peer-reviewed practice notes</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Technologies"
                      links={[
                        "Crop Production Systems",
                        "Crop Protection & IPM",
                        "Crop Improvement & Breeding",
                        "Agricultural Biotechnology",
                        "Post-Harvest Technology",
                        "Plant Nutrition & Fertility",
                        "Soil Health Management",
                        "Water & Irrigation Engineering",
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Special Technologies"
                      links={[
                        { label: "Precision Agriculture", isNew: true },
                        "System of Rice Intensification (SRI)",
                        "Drone-based Crop Monitoring",
                        { label: "Hydroponics & Aeroponics", isNew: true },
                        "Vertical & Urban Farming",
                        "Protected Cultivation (Greenhouse)",
                        "IoT Field Sensors & Telemetry",
                        "Reed-Bed Wastewater Treatment",
                        "Bio-stimulants & PGPR",
                        "Good Agricultural Practices (GAP)",
                        "GLP & GMP Standards",
                        { label: "Drone Application SOPs", isNew: true },
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Programmes & Services"
                      links={[
                        "National Farmer Income Support",
                        "National Crop Insurance Schemes",
                        "Agricultural Credit & Loans",
                        "Rural Development Banks",
                        "Agri-Extension Services",
                        "Farmer Producer Organisations",
                        "Self-Help Group Networks",
                        "Agri Clinics & Advisory Centres",
                        "Sustainable Development Goals",
                        "Crop-Specific SOP Library",
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Recent Publications"
                      links={[
                        { label: "FAO Climate Change Report 2024", isNew: true },
                        { label: "Agricultural Outlook 2024–2033", isNew: true },
                        "Global Soil Health Atlas",
                        "World Food Security Index",
                        { label: "Policy Brief — Climate-Smart Agriculture", isNew: true },
                        "Market Intelligence Quarterly",
                        "Pesticide Residue Standards Update",
                        "Open Data Initiative for Agriculture",
                      ]}
                    />
                  </div>
                </section>

                {/* SECTION 3 — Information & resources */}
                <section className="mb-10">
                  <div className="flex items-end justify-between mb-5 border-b border-border pb-2">
                    <h2 className="font-serif text-2xl font-semibold tracking-tight">Information & Resources</h2>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">handbooks, markets & daily updates</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Agri Information"
                      links={[
                        "Input Sources & Suppliers",
                        "Indigenous Knowledge Systems",
                        "Sustainable Agriculture Practices",
                        "Farm Enterprise Planning",
                        "Women in Agriculture",
                        "Pesticide Residue & Dietary Risk",
                        "Food Safety & Standards",
                        "Environment & Pollution Control",
                        "Disaster Management",
                        "District Contingency Planning",
                        "Agricultural Statistics Handbook",
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Market Information"
                      links={[
                        { label: "Online Agricultural Marketplaces", isNew: true },
                        "Wholesale Market Boards",
                        "Patents & Intellectual Property",
                        "Press Notes & Bulletins",
                        "Producer Organisations",
                        "Minimum Support Price",
                        "Export & Import Regulations",
                        "Commodity Futures & Derivatives",
                        { label: "Certification Standards", isNew: true },
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="Related Information"
                      links={[
                        "E-Learning & Courses",
                        "Farm Cost Management Studies",
                        "Government E-Service Portals",
                        "Land Records & Revenue",
                        "Planning Commission Reports",
                        "Crop & Season Reports",
                        "Open & Distance Learning",
                        "Important External Links",
                        "Research Blogs & Journals",
                        "ICT Initiatives in Agriculture",
                      ]}
                    />
                    <DirectoryColumn
                      onSelect={(label, section) => setOpenArticle(getArticle(label, section))}
                      title="News & Daily Events"
                      links={[
                        { label: "Daily Press Notes", isNew: true },
                        { label: "Agro-meteorological Advisory", isNew: true },
                        "Government Announcements",
                        "Community Radio Programmes",
                        "Television Programmes",
                        "Farm Radio Broadcasts",
                        "Reservoir & Water Updates",
                        "Training Calendar & Events",
                        "Weather Nowcasting",
                      ]}
                    />
                  </div>
                </section>

                <footer className="mt-10 pt-6 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground italic max-w-2xl mx-auto">
                    AgriConnect Knowledge Hub — curated reference material for growers, researchers and extension officers worldwide. Content reviewed by agricultural scientists and agronomists.
                  </p>
                </footer>

                <Dialog open={!!openArticle} onOpenChange={(o) => !o && setOpenArticle(null)}>
                  <DialogContent className="max-w-2xl" data-testid="dialog-article">
                    {openArticle && (
                      <>
                        <DialogHeader>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary mb-1">
                            {openArticle.section}
                          </p>
                          <DialogTitle className="font-serif text-2xl" data-testid="text-article-title">
                            {openArticle.title}
                          </DialogTitle>
                          <DialogDescription className="text-[14px] leading-relaxed pt-2 text-foreground/85">
                            {openArticle.intro}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div>
                            <h4 className="font-medium text-sm mb-2 text-foreground">Key practices</h4>
                            <ul className="space-y-2">
                              {openArticle.bullets.map((b, i) => (
                                <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed">
                                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3">
                            <p className="text-[12px] font-semibold uppercase tracking-wider text-primary mb-1">
                              Practitioner note
                            </p>
                            <p className="text-[13.5px] leading-relaxed text-foreground/90">
                              {openArticle.practice}
                            </p>
                          </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-article-watch"
                            onClick={() => {
                              const q = encodeURIComponent(`${openArticle.title} agriculture`);
                              window.open(
                                `https://www.youtube.com/results?search_query=${q}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            <Play className="h-3.5 w-3.5 mr-1.5" /> Watch tutorial
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-article-expert"
                            onClick={() => {
                              toast({
                                title: "Request sent",
                                description: `An agronomist will be in touch about "${openArticle.title}" within 24 hours.`,
                              });
                              setOpenArticle(null);
                            }}
                          >
                            <Phone className="h-3.5 w-3.5 mr-1.5" /> Talk to an expert
                          </Button>
                          <Button
                            size="sm"
                            data-testid="button-article-close"
                            onClick={() => setOpenArticle(null)}
                          >
                            Close
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </ScrollArea>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

type DirectoryLink = string | { label: string; isNew?: boolean };

function DirectoryColumn({
  title,
  links,
  onSelect,
}: {
  title: string;
  links: DirectoryLink[];
  onSelect: (label: string, section: string) => void;
}) {
  return (
    <div data-testid={`directory-col-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <h3 className="font-serif text-[13px] font-bold uppercase tracking-[0.16em] text-primary border-b border-primary/30 pb-1.5 mb-3">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {links.map((link, i) => {
          const label = typeof link === "string" ? link : link.label;
          const isNew = typeof link === "string" ? false : !!link.isNew;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(label, title)}
                data-testid={`link-article-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="text-left text-[13px] text-foreground/85 hover:text-primary hover:underline underline-offset-2 leading-snug inline-flex items-baseline gap-1.5"
              >
                <span>{label}</span>
                {isNew && (
                  <span className="text-[9px] font-bold text-white bg-rose-500 px-1 py-px rounded uppercase tracking-wider">
                    new
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
