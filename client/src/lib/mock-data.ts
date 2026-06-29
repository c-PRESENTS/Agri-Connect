import type { Product, DemandAlert } from "@shared/schema";

const farmerNames = [
  "Raj Kumar", "Priya Sharma", "Amit Patel", "Sunita Devi", "Ravi Singh",
  "Lakshmi Reddy", "Mohammed Ali", "Geeta Yadav", "Suresh Nair", "Anita Kumari"
];

const locations = [
  "Punjab", "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu",
  "Andhra Pradesh", "Kerala", "Rajasthan", "Madhya Pradesh", "Bihar"
];

const productData = [
  { name: "Organic Tomatoes", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: true },
  { name: "Fresh Potatoes", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 25, isOrganic: false },
  { name: "Premium Basmati Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Farm Fresh Eggs", category: "daily-needs", subcategory: "dairy", unit: "dozen", basePrice: 80, isOrganic: true },
  { name: "Pure Cow Ghee", category: "daily-needs", subcategory: "dairy", unit: "liter", basePrice: 600, isOrganic: true },
  { name: "Alphonso Mangoes", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Green Chillies", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 60, isOrganic: false },
  { name: "Fresh Coriander", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 15, isOrganic: true },
  { name: "Toor Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 140, isOrganic: false },
  { name: "Cold Pressed Coconut Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 280, isOrganic: true },
  { name: "Country Chicken", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 450, isOrganic: true },
  { name: "Fresh Prawns", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 550, isOrganic: false },
  { name: "Turmeric Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 180, isOrganic: true },
  { name: "Brown Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 90, isOrganic: true },
  { name: "Fresh Spinach", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: true },
  { name: "Carrots", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 45, isOrganic: false },
  { name: "Onions", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 30, isOrganic: false },
  { name: "Garlic", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 150, isOrganic: false },
  { name: "Ginger", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Cabbage", category: "daily-needs", subcategory: "vegetables", unit: "piece", basePrice: 40, isOrganic: false },
  { name: "Cauliflower", category: "daily-needs", subcategory: "vegetables", unit: "piece", basePrice: 50, isOrganic: false },
  { name: "Brinjal", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false },
  { name: "Lady Finger", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 55, isOrganic: false },
  { name: "Bitter Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 45, isOrganic: false },
  { name: "Hybrid Seeds Pack", category: "inputs-tools", subcategory: "seeds", unit: "pack", basePrice: 250, isOrganic: false },
  { name: "Organic Fertilizer", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 800, isOrganic: true },
  { name: "Drip Irrigation Kit", category: "inputs-tools", subcategory: "irrigation", unit: "set", basePrice: 2500, isOrganic: false },
  { name: "Hand Sprayer", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 450, isOrganic: false },
  { name: "Pure Honey", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 400, isOrganic: true },
  { name: "Shiitake Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 350, isOrganic: true },
];

function generateFarmerId(index: number): string {
  return `farmer-${index + 1}`;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRating(): number {
  return Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
}

function getRandomDistance(): number {
  return Math.round((0.5 + Math.random() * 15) * 10) / 10;
}

function getRandomStock(): number {
  return Math.floor(10 + Math.random() * 200);
}

function getRandomCoordinates(): { lat: number; lng: number } {
  const baseLat = 20.5937;
  const baseLng = 78.9629;
  return {
    lat: baseLat + (Math.random() - 0.5) * 10,
    lng: baseLng + (Math.random() - 0.5) * 10,
  };
}

export function generateProducts(): Product[] {
  const products: Product[] = [];
  
  productData.forEach((item, index) => {
    const farmerIndex = index % farmerNames.length;
    const farmerName = farmerNames[farmerIndex];
    const location = locations[farmerIndex];
    const coords = getRandomCoordinates();
    const priceVariation = item.basePrice * (0.9 + Math.random() * 0.2);
    
    products.push({
      id: `product-${index + 1}`,
      name: item.name,
      description: `Fresh ${item.name.toLowerCase()} directly from the farm. High quality and farm fresh produce.`,
      price: Math.round(priceVariation),
      unit: item.unit,
      stock: getRandomStock(),
      categoryId: item.category,
      subcategoryId: item.subcategory,
      farmerId: generateFarmerId(farmerIndex),
      farmerName: farmerName,
      farmerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmerName.replace(' ', '')}`,
      farmerRating: getRandomRating(),
      farmerLocation: location,
      farmerLatitude: coords.lat,
      farmerLongitude: coords.lng,
      distance: getRandomDistance(),
      images: [`https://source.unsplash.com/400x300/?${encodeURIComponent(item.name.split(' ')[0])},farm`],
      isOrganic: item.isOrganic,
      isFeatured: Math.random() > 0.7,
      rating: getRandomRating(),
      reviewCount: Math.floor(50 + Math.random() * 500),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });
  
  return products;
}

export function generateDemandAlerts(): DemandAlert[] {
  return [
    { id: "demand-1", productName: "Fresh Potatoes", quantity: "100 kg", priceRange: "₹20-28", unit: "kg", urgency: "high", location: "Mumbai, Maharashtra", timePosted: "2 hours ago", buyerType: "Hotel" },
    { id: "demand-2", productName: "Organic Wheat", quantity: "1000 kg", priceRange: "₹35-42", unit: "kg", urgency: "medium", location: "Delhi NCR", timePosted: "5 hours ago", buyerType: "Flour Mill" },
    { id: "demand-3", productName: "Red Onions", quantity: "500 kg", priceRange: "₹25-35", unit: "kg", urgency: "high", location: "Chennai, Tamil Nadu", timePosted: "1 hour ago", buyerType: "Wholesale Trader" },
    { id: "demand-4", productName: "Tomatoes", quantity: "50 kg", priceRange: "₹35-45", unit: "kg", urgency: "high", location: "Bangalore, Karnataka", timePosted: "30 minutes ago", buyerType: "Restaurant" },
    { id: "demand-5", productName: "Organic Vegetables Mix", quantity: "200 kg", priceRange: "₹60-80", unit: "kg", urgency: "medium", location: "Hyderabad, Telangana", timePosted: "4 hours ago", buyerType: "Supermarket" },
  ];
}

export const mockProducts = generateProducts();
export const mockDemandAlerts = generateDemandAlerts();
