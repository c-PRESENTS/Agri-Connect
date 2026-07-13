import type { Express } from "express";
import { isAuthenticated } from "../../auth";
import { storage } from "../../storage";

export function registerLocalNeedsRoutes(app: Express): void {
  // Local Needs (Live buyer demand feed)
  const localNeedsData: any[] = [
    { id: "need-1", productName: "Organic Tomatoes", quantity: 500, unit: "kg", priceRange: "£1.50-2.00/kg", location: "Oxford Market", latitude: 51.752, longitude: -1.2577, urgency: "high", buyerName: "The Organic Kitchen", buyerType: "restaurant", timePosted: "2 hours ago", description: "Need fresh organic tomatoes for weekly menu. Must be Grade A.", deadline: "2026-03-20", category: "vegetables" },
    { id: "need-2", productName: "Free Range Eggs", quantity: 2000, unit: "units", priceRange: "£0.25-0.35/unit", location: "Bristol Central", latitude: 51.4545, longitude: -2.5879, urgency: "high", buyerName: "Sunrise Café Chain", buyerType: "restaurant", timePosted: "5 hours ago", description: "Weekly supply needed for 8 café locations across Bristol.", deadline: "2026-03-18", category: "dairy" },
    { id: "need-3", productName: "Heritage Apples", quantity: 300, unit: "kg", priceRange: "£1.20-1.80/kg", location: "Exeter Food Hub", latitude: 50.7184, longitude: -3.5339, urgency: "medium", buyerName: "West Country Juicers", buyerType: "processor", timePosted: "1 day ago", description: "Seeking heritage apple varieties for artisan juice production.", deadline: "2026-04-01", category: "fruits" },
    { id: "need-4", productName: "Kale & Spinach Mix", quantity: 150, unit: "kg", priceRange: "£2.00-3.00/kg", location: "Cambridge", latitude: 52.2053, longitude: 0.1218, urgency: "medium", buyerName: "FreshBox Delivery", buyerType: "retailer", timePosted: "1 day ago", description: "Weekly subscription delivery box requirement.", deadline: "2026-03-22", category: "vegetables" },
    { id: "need-5", productName: "Raw Honey", quantity: 50, unit: "kg", priceRange: "£8-12/kg", location: "Norwich", latitude: 52.6309, longitude: 1.2974, urgency: "low", buyerName: "Norfolk Naturals", buyerType: "retailer", timePosted: "2 days ago", description: "Seeking local raw honey for premium gift hampers.", deadline: "2026-04-15", category: "specialty" },
    { id: "need-6", productName: "Potatoes (White)", quantity: 2000, unit: "kg", priceRange: "£0.30-0.50/kg", location: "Leeds", latitude: 53.8008, longitude: -1.5491, urgency: "high", buyerName: "Northern Schools Catering", buyerType: "school", timePosted: "3 hours ago", description: "School meals program. Annual contract possible.", deadline: "2026-03-25", category: "vegetables" },
    { id: "need-7", productName: "Fresh Herbs Bundle", quantity: 80, unit: "kg", priceRange: "£4-6/kg", location: "Manchester", latitude: 53.4808, longitude: -2.2426, urgency: "medium", buyerName: "Piccadilly Hotel", buyerType: "restaurant", timePosted: "6 hours ago", description: "Rosemary, thyme, basil, mint weekly supply needed.", deadline: "2026-03-21", category: "herbs" },
    { id: "need-8", productName: "Organic Milk", quantity: 1000, unit: "liter", priceRange: "£0.80-1.10/liter", location: "Sheffield", latitude: 53.3811, longitude: -1.4701, urgency: "high", buyerName: "City Hospital Trust", buyerType: "hospital", timePosted: "8 hours ago", description: "Hospital patient nutrition program. Certified organic required.", deadline: "2026-03-19", category: "dairy" },
    { id: "need-9", productName: "Sweet Peppers", quantity: 200, unit: "kg", priceRange: "£1.80-2.50/kg", location: "Chelmsford", latitude: 51.7356, longitude: 0.4685, urgency: "high", buyerName: "Chelmsford Food Market", buyerType: "retailer", timePosted: "1 hour ago", description: "Mixed colour peppers for weekend farmers market. Must be fresh picked.", deadline: "2026-03-20", category: "vegetables" },
    { id: "need-10", productName: "Strawberries", quantity: 100, unit: "kg", priceRange: "£3.00-4.50/kg", location: "Chelmsford", latitude: 51.7412, longitude: 0.4821, urgency: "high", buyerName: "The Baking House Chelmsford", buyerType: "restaurant", timePosted: "3 hours ago", description: "Fresh strawberries for desserts and cakes. Minimum 30g fruit size.", deadline: "2026-03-19", category: "fruits" },
    { id: "need-11", productName: "Free Range Chicken", quantity: 80, unit: "units", priceRange: "£8-12/unit", location: "Chelmsford", latitude: 51.729, longitude: 0.458, urgency: "medium", buyerName: "Springfield Hotel & Spa", buyerType: "restaurant", timePosted: "5 hours ago", description: "Whole free range chickens for hotel restaurant. Weekly recurring order.", deadline: "2026-03-22", category: "meat" },
    { id: "need-12", productName: "Salad Leaves Mix", quantity: 50, unit: "kg", priceRange: "£4-6/kg", location: "Chelmsford", latitude: 51.7443, longitude: 0.4733, urgency: "medium", buyerName: "Great Baddow Community Hub", buyerType: "school", timePosted: "2 hours ago", description: "Mixed salad for school lunch program. Rocket, spinach, watercress.", deadline: "2026-03-21", category: "vegetables" },
    { id: "need-13", productName: "Courgettes", quantity: 120, unit: "kg", priceRange: "£1.20-1.80/kg", location: "Chelmsford", latitude: 51.7320, longitude: 0.4920, urgency: "low", buyerName: "Moulsham Street Deli", buyerType: "retailer", timePosted: "4 hours ago", description: "Local courgettes for deli. Prefer mixed yellow and green varieties.", deadline: "2026-03-25", category: "vegetables" },
  ];

  app.get("/api/local-needs", (req, res) => {
    const urgency = req.query.urgency as string | undefined;
    const filtered = urgency ? localNeedsData.filter(n => n.urgency === urgency) : localNeedsData;
    res.json(filtered);
  });

  app.post("/api/local-needs", isAuthenticated, (req, res) => {
    const { productName, quantity, unit, priceRange, location, urgency, buyerType, buyerName, description, deadline } = req.body;
    if (!productName || !quantity || !location) {
      return res.status(400).json({ error: "productName, quantity and location are required" });
    }
    const UK_CITY_COORDS: Record<string, [number, number]> = {
      chelmsford: [51.7356, 0.4685], london: [51.5074, -0.1278], essex: [51.7356, 0.4685],
      oxford: [51.752, -1.2577], cambridge: [52.2053, 0.1218], bristol: [51.4545, -2.5879],
      manchester: [53.4808, -2.2426], leeds: [53.8008, -1.5491], sheffield: [53.3811, -1.4701],
      norwich: [52.6309, 1.2974], exeter: [50.7184, -3.5339], birmingham: [52.4862, -1.8904],
      liverpool: [53.4084, -2.9916], glasgow: [55.8642, -4.2518], edinburgh: [55.9533, -3.1883],
      cardiff: [51.4816, -3.1791], nottingham: [52.9548, -1.1581], leicester: [52.6369, -1.1398],
      brighton: [50.8225, -0.1372], york: [53.9600, -1.0873], bath: [51.3810, -2.3590],
      ipswich: [52.0567, 1.1482], colchester: [51.8959, 0.8919], southend: [51.5384, 0.7159],
    };
    const cityKey = location.toLowerCase().replace(/[^a-z]/g, "");
    const coords = Object.entries(UK_CITY_COORDS).find(([k]) => cityKey.includes(k));
    const [lat, lng] = coords ? coords[1] : [51.5074 + (Math.random() - 0.5) * 3, -0.5 + (Math.random() - 0.5) * 3];
    const newNeed = {
      id: `need-${Date.now()}`,
      productName, quantity: Number(quantity), unit: unit || "kg",
      priceRange: priceRange || "Negotiable",
      location,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      urgency: urgency || "medium",
      buyerName: buyerName || (req as any).user?.claims?.first_name || "Anonymous Buyer",
      buyerType: buyerType || "individual",
      timePosted: "Just now",
      description,
      deadline,
    };
    localNeedsData.unshift(newNeed);
    res.status(201).json(newNeed);
  });

  app.get("/api/demand-alerts", async (req, res) => {
    try {
      const location = req.query.location as string | undefined;
      const alerts = await storage.getDemandAlerts(location);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch demand alerts" });
    }
  });
}

export function registerShareCareRoutes(app: Express): void {
  // Share & Care live items
  app.get("/api/share-care", (_req, res) => {
    // urgency: "urgent" (<1h), "medium" (1-3h), "safe" (3h+)
    const items = [
      { id: "sc-1",  name: "Heritage Tomatoes",      unit: "kg",     qty: 4,  donor: "Rachel Green",  location: "Chelmsford, Essex",     latitude: 51.7356, longitude: 0.4685,  emoji: "🍅", postedAgo: "2m ago",  category: "vegetables", urgency: "urgent",  expiresIn: "45 mins" },
      { id: "sc-2",  name: "Fresh Kale Bundles",     unit: "bundle", qty: 6,  donor: "Tom Hart",      location: "Norwich, Norfolk",      latitude: 52.6309, longitude: 1.2974,  emoji: "🥬", postedAgo: "8m ago",  category: "vegetables", urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-3",  name: "Duck Eggs (free-range)", unit: "dozen",  qty: 2,  donor: "Anna Bell",     location: "Bath, Somerset",        latitude: 51.3811, longitude: -2.3590, emoji: "🥚", postedAgo: "15m ago", category: "dairy",      urgency: "safe",    expiresIn: "5 hours" },
      { id: "sc-4",  name: "Organic Apples",         unit: "kg",     qty: 5,  donor: "Liam Walker",   location: "Canterbury, Kent",      latitude: 51.2802, longitude: 1.0789,  emoji: "🍎", postedAgo: "22m ago", category: "fruits",     urgency: "safe",    expiresIn: "1 day" },
      { id: "sc-5",  name: "Wild Garlic Leaves",     unit: "bunch",  qty: 8,  donor: "Sue Moore",     location: "York, Yorkshire",       latitude: 53.9590, longitude: -1.0815, emoji: "🌿", postedAgo: "35m ago", category: "medicinal",  urgency: "medium",  expiresIn: "3 hours" },
      { id: "sc-6",  name: "Surplus Courgettes",     unit: "kg",     qty: 3,  donor: "Paul Evans",    location: "Oxford, Oxfordshire",   latitude: 51.7520, longitude: -1.2577, emoji: "🥒", postedAgo: "41m ago", category: "vegetables", urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-7",  name: "Homemade Plum Jam",      unit: "jar",    qty: 10, donor: "Claire James",  location: "Exeter, Devon",         latitude: 50.7184, longitude: -3.5339, emoji: "🫙", postedAgo: "55m ago", category: "pickles",    urgency: "safe",    expiresIn: "30 days" },
      { id: "sc-8",  name: "Sunflower Seedlings",    unit: "tray",   qty: 3,  donor: "Mark Singh",    location: "Cambridge, Cambs",      latitude: 52.2053, longitude: 0.1218,  emoji: "🌻", postedAgo: "1h ago",  category: "seeds",      urgency: "safe",    expiresIn: "7 days" },
      { id: "sc-9",  name: "Raw Honey (uncapped)",   unit: "jar",    qty: 4,  donor: "Fiona Black",   location: "Bury St Edmunds, Suffolk", latitude: 52.2452, longitude: 0.7104, emoji: "🍯", postedAgo: "1h ago",  category: "honey",      urgency: "safe",    expiresIn: "60 days" },
      { id: "sc-10", name: "Mixed Salad Greens",     unit: "bag",    qty: 7,  donor: "George Ali",    location: "Lincoln, Lincolnshire", latitude: 53.2307, longitude: -0.5406, emoji: "🥗", postedAgo: "2h ago",  category: "vegetables", urgency: "urgent",  expiresIn: "50 mins" },
      { id: "sc-11", name: "Runner Beans (fresh)",   unit: "kg",     qty: 2,  donor: "Priya Shah",    location: "Colchester, Essex",     latitude: 51.8959, longitude: 0.8919,  emoji: "🫘", postedAgo: "2h ago",  category: "pulses",     urgency: "medium",  expiresIn: "2 hours" },
      { id: "sc-12", name: "Butternut Squash",       unit: "each",   qty: 5,  donor: "David Owen",    location: "Kings Lynn, Norfolk",   latitude: 52.7510, longitude: 0.3924,  emoji: "🎃", postedAgo: "3h ago",  category: "vegetables", urgency: "safe",    expiresIn: "5 days" },
      { id: "sc-13", name: "Sourdough Loaves",       unit: "loaf",   qty: 6,  donor: "Holt Bakery",   location: "Brighton, East Sussex", latitude: 50.8225, longitude: -0.1372, emoji: "🍞", postedAgo: "20m ago", category: "bakery",     urgency: "urgent",  expiresIn: "40 mins" },
      { id: "sc-14", name: "Beef Mince (frozen)",    unit: "kg",     qty: 4,  donor: "Hartley Farm",  location: "Reading, Berkshire",    latitude: 51.4543, longitude: -0.9781, emoji: "🥩", postedAgo: "30m ago", category: "meat",       urgency: "safe",    expiresIn: "30 days" },
      { id: "sc-15", name: "Surplus Yoghurt Pots",   unit: "pack",   qty: 12, donor: "Dales Dairy",   location: "Manchester",            latitude: 53.4808, longitude: -2.2426, emoji: "🥣", postedAgo: "1h ago",  category: "dairy",      urgency: "medium",  expiresIn: "1.5 hours" },
    ];
    res.json(items);
  });
}
