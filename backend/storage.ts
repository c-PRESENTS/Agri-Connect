import { randomUUID } from "crypto";
import { authStorage } from "./auth/storage";
import { commerceRepository } from "./repositories/commerce-repository";
import type {
  Product, 
  InsertProduct, 
  Category, 
  CartItem, 
  Order,
  OrderItem,
  OrderStatus,
  DemandAlert,
  FarmerStats,
  ProductFilters,
  SchemeApplication,
  LandSaleListing,
  LandInvestmentListing,
  CommunityPlotListing,
  Review,
  InsertReview,
  SupportTicket,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
} from "@shared/schema";

function generateOrderNumber(): string {
  const prefix = "AGC";
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${year}-${rand}`;
}

function getEstimatedDelivery(method: string): string {
  const now = new Date();
  const days = method === "express" ? 2 : method === "pickup" ? 1 : 5;
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

// Categories data
const categoriesData: Category[] = [
  {
    id: "daily-needs",
    name: "Daily Needs Market",
    icon: "ShoppingBasket",
    buyerVisible: true,
    subcategories: [
      { id: "grains", name: "Food Grains & Cereals", parentId: "daily-needs", buyerVisible: true },
      { id: "pulses", name: "Pulses & Lentils", parentId: "daily-needs", buyerVisible: true },
      { id: "oils", name: "Cooking Oils", parentId: "daily-needs", buyerVisible: true },
      { id: "vegetables", name: "Vegetables (47+ Varieties)", parentId: "daily-needs", buyerVisible: true },
      { id: "fruits", name: "Fruits (50+ Varieties)", parentId: "daily-needs", buyerVisible: true },
      { id: "dairy", name: "Dairy & Eggs", parentId: "daily-needs", buyerVisible: true },
      { id: "meat", name: "Meat & Poultry", parentId: "daily-needs", buyerVisible: true },
      { id: "fish", name: "Fish & Seafood", parentId: "daily-needs", buyerVisible: true },
      { id: "spices", name: "Spices & Condiments", parentId: "daily-needs", buyerVisible: true },
      { id: "packaged", name: "Ready-to-Eat Foods", parentId: "daily-needs", buyerVisible: true },
      { id: "bakery", name: "Bakery & Breads", parentId: "daily-needs", buyerVisible: true },
    ],
  },
  {
    id: "fresh-produce",
    name: "Fresh Farm Produce",
    icon: "Leaf",
    buyerVisible: true,
    subcategories: [
      { id: "wholesale-veg", name: "Vegetables (Wholesale)", parentId: "fresh-produce", buyerVisible: true },
      { id: "wholesale-fruits", name: "Fruits (Wholesale)", parentId: "fresh-produce", buyerVisible: true },
      { id: "flowers", name: "Flowers & Decoratives", parentId: "fresh-produce", buyerVisible: true },
    ],
  },
  {
    id: "livestock",
    name: "Livestock & Animals",
    icon: "Beef",
    buyerVisible: true,
    subcategories: [
      { id: "dairy-animals", name: "Dairy Animals", parentId: "livestock", buyerVisible: true },
      { id: "meat-animals", name: "Meat Animals", parentId: "livestock", buyerVisible: true },
      { id: "poultry", name: "Poultry Birds", parentId: "livestock", buyerVisible: true },
      { id: "aquaculture", name: "Fish & Aquaculture", parentId: "livestock", buyerVisible: true },
    ],
  },
  {
    id: "inputs-tools",
    name: "Inputs & Tools",
    icon: "Wrench",
    buyerVisible: true,
    subcategories: [
      { id: "seeds", name: "Seeds & Planting Material", parentId: "inputs-tools", buyerVisible: true },
      { id: "fertilizers", name: "Fertilizers", parentId: "inputs-tools", buyerVisible: true },
      { id: "pesticides", name: "Pesticides & Protection", parentId: "inputs-tools", buyerVisible: true },
      { id: "tools", name: "Farming Tools", parentId: "inputs-tools", buyerVisible: true },
      { id: "machinery", name: "Farm Machinery", parentId: "inputs-tools", buyerVisible: true },
      { id: "irrigation", name: "Irrigation Equipment", parentId: "inputs-tools", buyerVisible: true },
      { id: "protective-gear", name: "Protective Gear", parentId: "inputs-tools", buyerVisible: true },
      { id: "animal-equipment", name: "Animal Husbandry Equipment", parentId: "inputs-tools", buyerVisible: true },
      { id: "sensors", name: "Agricultural Sensors & IoT", parentId: "inputs-tools", buyerVisible: true },
      { id: "gis", name: "GIS & Mapping Tools", parentId: "inputs-tools", buyerVisible: true },
      { id: "remote-sensing", name: "Remote Sensing Technology", parentId: "inputs-tools", buyerVisible: true },
      { id: "precision", name: "Precision Farming Equipment", parentId: "inputs-tools", buyerVisible: true },
    ],
  },
  {
    id: "processed",
    name: "Processed & Value-Added",
    icon: "Package",
    buyerVisible: true,
    subcategories: [
      { id: "spice-powders", name: "Spices & Powders", parentId: "processed", buyerVisible: true },
      { id: "pickles", name: "Pickles & Preserves", parentId: "processed", buyerVisible: true },
      { id: "health-foods", name: "Health & Organic Foods", parentId: "processed", buyerVisible: true },
      { id: "beverages", name: "Beverages", parentId: "processed", buyerVisible: true },
      { id: "snacks", name: "Snacks & Ready Foods", parentId: "processed", buyerVisible: true },
    ],
  },
  {
    id: "specialty",
    name: "Specialty & Premium",
    icon: "Award",
    buyerVisible: true,
    subcategories: [
      { id: "organic", name: "Organic Products", parentId: "specialty", buyerVisible: true },
      { id: "medicinal", name: "Medicinal Plants & Herbs", parentId: "specialty", buyerVisible: true },
      { id: "aromatic", name: "Aromatic Plants", parentId: "specialty", buyerVisible: true },
      { id: "mushrooms", name: "Mushrooms", parentId: "specialty", buyerVisible: true },
      { id: "honey", name: "Honey & Bee Products", parentId: "specialty", buyerVisible: true },
      { id: "premium-crops", name: "Premium Crops", parentId: "specialty", buyerVisible: true },
    ],
  },
  {
    id: "other-agri",
    name: "Other Agricultural",
    icon: "Wheat",
    buyerVisible: true,
    subcategories: [
      { id: "plantation", name: "Plantation Crops", parentId: "other-agri", buyerVisible: true },
      { id: "fibre", name: "Fibre Crops", parentId: "other-agri", buyerVisible: true },
      { id: "timber", name: "Timber & Bamboo", parentId: "other-agri", buyerVisible: true },
      { id: "animal-feed", name: "Animal Feed", parentId: "other-agri", buyerVisible: true },
      { id: "agri-waste", name: "Agri-Waste & By-Products", parentId: "other-agri", buyerVisible: false },
    ],
  },
  {
    id: "supermarket",
    name: "Complete Supermarket",
    icon: "Store",
    buyerVisible: true,
    subcategories: [
      { id: "food-beverages", name: "Food & Beverages", parentId: "supermarket", buyerVisible: true },
      { id: "personal-care", name: "Personal Care & Hygiene", parentId: "supermarket", buyerVisible: true },
      { id: "home-kitchen", name: "Home & Kitchen", parentId: "supermarket", buyerVisible: true },
      { id: "household", name: "Household Items", parentId: "supermarket", buyerVisible: true },
      { id: "clothing", name: "Clothing & Accessories", parentId: "supermarket", buyerVisible: true },
      { id: "health-wellness", name: "Health & Wellness", parentId: "supermarket", buyerVisible: true },
      { id: "stationery", name: "Stationery & Office", parentId: "supermarket", buyerVisible: true },
      { id: "pet-care", name: "Pet Care", parentId: "supermarket", buyerVisible: true },
      { id: "automotive", name: "Automotive", parentId: "supermarket", buyerVisible: true },
      { id: "baby-kids", name: "Baby & Kids", parentId: "supermarket", buyerVisible: true },
      { id: "sports-outdoors", name: "Sports & Outdoors", parentId: "supermarket", buyerVisible: true },
      { id: "books-media", name: "Books & Media", parentId: "supermarket", buyerVisible: true },
      { id: "gardening", name: "Gardening", parentId: "supermarket", buyerVisible: true },
      { id: "travel", name: "Travel", parentId: "supermarket", buyerVisible: true },
      { id: "religious", name: "Religious & Cultural", parentId: "supermarket", buyerVisible: true },
      { id: "party", name: "Party & Celebration", parentId: "supermarket", buyerVisible: true },
      { id: "tech-accessories", name: "Tech Accessories & Electronics", parentId: "supermarket", buyerVisible: true },
      { id: "allied-products", name: "Allied Products", parentId: "supermarket", buyerVisible: true },
    ],
  },
  {
    id: "services",
    name: "Services",
    icon: "Truck",
    buyerVisible: false,
    sellerOnly: true,
    subcategories: [
      { id: "farming-services", name: "Farming Services", parentId: "services", buyerVisible: false },
      { id: "irrigation-services", name: "Irrigation Services", parentId: "services", buyerVisible: false },
      { id: "transport", name: "Transport Services", parentId: "services", buyerVisible: false },
      { id: "processing", name: "Processing Services", parentId: "services", buyerVisible: false },
      { id: "advisory", name: "Advisory Services", parentId: "services", buyerVisible: false },
    ],
  },
  {
    id: "government",
    name: "Government Schemes",
    icon: "Building2",
    buyerVisible: false,
    sellerOnly: true,
    subcategories: [
      { id: "subsidies", name: "Input Subsidies", parentId: "government", buyerVisible: false },
      { id: "insurance", name: "Insurance Schemes", parentId: "government", buyerVisible: false },
      { id: "training", name: "Training Programs", parentId: "government", buyerVisible: false },
      { id: "finance", name: "Financial Schemes", parentId: "government", buyerVisible: false },
    ],
  },
  {
    id: "modern-farming",
    name: "Modern Farming",
    icon: "Sprout",
    buyerVisible: true,
    subcategories: [
      { id: "hydroponics", name: "Hydroponics", parentId: "modern-farming", buyerVisible: true },
      { id: "aeroponics", name: "Aeroponics", parentId: "modern-farming", buyerVisible: true },
      { id: "vertical", name: "Vertical Farming", parentId: "modern-farming", buyerVisible: true },
      { id: "greenhouse", name: "Greenhouse/Polyhouse", parentId: "modern-farming", buyerVisible: true },
      { id: "precision-farming", name: "Precision Farming Tools", parentId: "modern-farming", buyerVisible: true },
    ],
  },
  {
    id: "dietary",
    name: "Dietary & Lifestyle",
    icon: "Heart",
    buyerVisible: true,
    subcategories: [
      { id: "keto", name: "Keto & Low-Carb", parentId: "dietary", buyerVisible: true },
      { id: "high-protein", name: "Gym & Bodybuilding", parentId: "dietary", buyerVisible: true },
      { id: "vegan", name: "Vegan & Plant-Based", parentId: "dietary", buyerVisible: true },
      { id: "gluten-free", name: "Gluten-Free", parentId: "dietary", buyerVisible: true },
      { id: "dairy-free", name: "Dairy-Free & Lactose-Free", parentId: "dietary", buyerVisible: true },
      { id: "diabetic", name: "Diabetic-Friendly", parentId: "dietary", buyerVisible: true },
      { id: "heart-healthy", name: "Heart Healthy", parentId: "dietary", buyerVisible: true },
      { id: "pregnancy", name: "Pregnancy & Lactation", parentId: "dietary", buyerVisible: true },
      { id: "baby-nutrition", name: "Baby & Infant Nutrition", parentId: "dietary", buyerVisible: true },
      { id: "senior-nutrition", name: "Senior Nutrition", parentId: "dietary", buyerVisible: true },
      { id: "paleo", name: "Paleo Diet", parentId: "dietary", buyerVisible: true },
      { id: "mediterranean", name: "Mediterranean Diet", parentId: "dietary", buyerVisible: true },
      { id: "whole30", name: "Whole30 & Clean Eating", parentId: "dietary", buyerVisible: true },
      { id: "ayurvedic", name: "Ayurvedic & Traditional", parentId: "dietary", buyerVisible: true },
    ],
  },
  {
    id: "land-leasing",
    name: "Land Leasing",
    icon: "MapPin",
    buyerVisible: false,
    sellerOnly: true,
    subcategories: [
      { id: "agricultural-land", name: "Agricultural Land", parentId: "land-leasing", buyerVisible: false },
      { id: "irrigated-land", name: "Irrigated Land", parentId: "land-leasing", buyerVisible: false },
      { id: "government-land", name: "Government Land Programs", parentId: "land-leasing", buyerVisible: false },
      { id: "specialty-land", name: "Specialty Land", parentId: "land-leasing", buyerVisible: false },
      { id: "short-term-lease", name: "Short-Term Lease", parentId: "land-leasing", buyerVisible: false },
    ],
  },
  {
    id: "logistics",
    name: "Logistics & Delivery",
    icon: "Truck",
    buyerVisible: false,
    sellerOnly: true,
    subcategories: [
      { id: "international-shipping", name: "International Shipping", parentId: "logistics", buyerVisible: false },
      { id: "national-logistics", name: "National Logistics", parentId: "logistics", buyerVisible: false },
      { id: "hyperlocal-delivery", name: "Hyperlocal Delivery", parentId: "logistics", buyerVisible: false },
      { id: "cold-chain", name: "Cold Chain Specialists", parentId: "logistics", buyerVisible: false },
      { id: "freight-forwarding", name: "Freight Forwarding", parentId: "logistics", buyerVisible: false },
      { id: "milk-run", name: "Milk Run (Smart Batching)", parentId: "logistics", buyerVisible: false },
    ],
  },
  {
    id: "share-care",
    name: "Share & Care Community",
    icon: "HeartHandshake",
    buyerVisible: false,
    sellerOnly: true,
    subcategories: [
      { id: "restaurant-surplus", name: "Restaurant Surplus", parentId: "share-care", buyerVisible: false },
      { id: "home-surplus", name: "Home Surplus", parentId: "share-care", buyerVisible: false },
      { id: "retail-surplus", name: "Retail Surplus", parentId: "share-care", buyerVisible: false },
      { id: "production-surplus", name: "Production Surplus", parentId: "share-care", buyerVisible: false },
      { id: "event-surplus", name: "Event Surplus", parentId: "share-care", buyerVisible: false },
      { id: "free-food", name: "Free Food Listings", parentId: "share-care", buyerVisible: false },
    ],
  },
  {
    id: "commercial-crops",
    name: "Commercial & Industrial Crops",
    icon: "Factory",
    buyerVisible: true,
    subcategories: [
      { id: "sugar-crops", name: "Sugar Crops", parentId: "commercial-crops", buyerVisible: true },
      { id: "beverage-crops", name: "Beverage Crops", parentId: "commercial-crops", buyerVisible: true },
      { id: "latex-crops", name: "Latex & Resin Crops", parentId: "commercial-crops", buyerVisible: true },
      { id: "other-commercial", name: "Other Commercial Crops", parentId: "commercial-crops", buyerVisible: true },
    ],
  },
  {
    id: "bio-products",
    name: "Bio-Based Products",
    icon: "Leaf",
    buyerVisible: true,
    subcategories: [
      { id: "bioenergy", name: "Bioenergy & Biomass", parentId: "bio-products", buyerVisible: true },
      { id: "biofertilizers", name: "Biofertilizers & Biopesticides", parentId: "bio-products", buyerVisible: true },
      { id: "herbal-pharma", name: "Herbal & Pharma Products", parentId: "bio-products", buyerVisible: true },
    ],
  },
];

// Seed data for products - comprehensive list covering all categories
const productSeedData = [
  // Grains & Cereals
  { name: "Organic Tomatoes", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: true, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Fresh Potatoes", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 25, isOrganic: false, images: ["https://images.unsplash.com/photo-1596910547705-b75df20c3e12?w=400&h=300&fit=crop"] },
  { name: "Premium Basmati Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop"] },
  { name: "White Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop"] },
  { name: "Brown Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 65, isOrganic: true, images: ["https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop"] },
  { name: "Red Rice", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 80, isOrganic: true, images: ["https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop"] },
  { name: "Wheat Flour", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Whole Wheat", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Semolina (Suji)", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Ragi (Finger Millet)", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 55, isOrganic: true, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Bajra (Pearl Millet)", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 45, isOrganic: true, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Jowar (Sorghum)", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 50, isOrganic: true, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Foxtail Millet", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 70, isOrganic: true, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Maize", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 30, isOrganic: false, images: ["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop"] },
  { name: "Oats", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 85, isOrganic: false, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  { name: "Quinoa", category: "daily-needs", subcategory: "grains", unit: "kg", basePrice: 350, isOrganic: true, images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop"] },
  
  // Pulses & Lentils
  { name: "Toor Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 110, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Moong Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Chana Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 85, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Urad Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 130, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Masoor Dal", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 95, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Chickpeas (Kabuli Chana)", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Kidney Beans (Rajma)", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Green Gram Whole", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 100, isOrganic: true, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  { name: "Black Gram Whole", category: "daily-needs", subcategory: "pulses", unit: "kg", basePrice: 110, isOrganic: false, images: ["https://images.unsplash.com/photo-1585996853874-92787849e787?w=400&h=300&fit=crop"] },
  
  // Cooking Oils
  { name: "Cold Pressed Coconut Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 280, isOrganic: true, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Sunflower Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 130, isOrganic: false, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Groundnut Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 180, isOrganic: false, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Mustard Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 160, isOrganic: false, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Sesame Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 350, isOrganic: true, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Rice Bran Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 150, isOrganic: false, images: ["https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop"] },
  { name: "Extra Virgin Olive Oil", category: "daily-needs", subcategory: "oils", unit: "liter", basePrice: 600, isOrganic: true, images: ["https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop"] },
  
  // Vegetables
  { name: "Spinach", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 30, isOrganic: true, images: ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop"] },
  { name: "Coriander Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 20, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Mint Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 25, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Curry Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 15, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Lettuce", category: "daily-needs", subcategory: "vegetables", unit: "piece", basePrice: 45, isOrganic: true, images: ["https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop"] },
  { name: "Amaranth Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 25, isOrganic: true, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Fenugreek Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 25, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Onions", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop"] },
  { name: "Garlic", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 150, isOrganic: false, images: ["https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=400&h=300&fit=crop"] },
  { name: "Ginger", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=300&fit=crop"] },
  { name: "Carrots", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop"] },
  { name: "Radish", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 30, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Beetroot", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1444459094717-a39f1e3e0903?w=400&h=300&fit=crop"] },
  { name: "Sweet Potato", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop"] },
  { name: "Tomatoes", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Brinjal (Eggplant)", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1590393533632-7060377e6946?w=400&h=300&fit=crop"] },
  { name: "Capsicum (Bell Pepper)", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1566275529824-cca6d00a0740?w=400&h=300&fit=crop"] },
  { name: "Okra (Bhindi)", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1464454709131-ffd692591ee5?w=400&h=300&fit=crop"] },
  { name: "Green Chillies", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1588276552401-30058a0fe57b?w=400&h=300&fit=crop"] },
  { name: "Bottle Gourd", category: "daily-needs", subcategory: "vegetables", unit: "piece", basePrice: 25, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Bitter Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 50, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Ridge Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Snake Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Pumpkin", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 30, isOrganic: false, images: ["https://images.unsplash.com/photo-1506806732259-39c2d4ad68b9?w=400&h=300&fit=crop"] },
  { name: "Cauliflower", category: "daily-needs", subcategory: "vegetables", unit: "piece", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=300&fit=crop"] },
  { name: "Broccoli", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 80, isOrganic: true, images: ["https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400&h=300&fit=crop"] },
  { name: "Cabbage", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 25, isOrganic: false, images: ["https://images.unsplash.com/photo-1591196311088-0f745d44ed11?w=400&h=300&fit=crop"] },
  { name: "Cucumber", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&h=300&fit=crop"] },
  { name: "Green Beans", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 55, isOrganic: false, images: ["https://images.unsplash.com/photo-1627916607164-7b20241db935?w=400&h=300&fit=crop"] },
  { name: "Green Peas", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Drumstick", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Raw Banana", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 30, isOrganic: false, images: ["https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=300&fit=crop"] },
  { name: "Yam", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Tapioca", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Zucchini", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 70, isOrganic: true, images: ["https://images.unsplash.com/photo-1534123235357-bb196bb060e7?w=400&h=300&fit=crop"] },
  { name: "Asparagus", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 180, isOrganic: true, images: ["https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=400&h=300&fit=crop"] },
  { name: "Celery", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1597814072367-b585863d93ee?w=400&h=300&fit=crop"] },
  { name: "Leek", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Turnip", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Spring Onion", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop"] },
  { name: "Shallots", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop"] },
  { name: "Ash Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Pointed Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Ivy Gourd", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 55, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Moringa Leaves", category: "daily-needs", subcategory: "vegetables", unit: "bunch", basePrice: 35, isOrganic: true, images: ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop"] },
  { name: "Artichoke", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 220, isOrganic: true, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Kohlrabi", category: "daily-needs", subcategory: "vegetables", unit: "kg", basePrice: 50, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  
  // Fruits
  { name: "Alphonso Mangoes", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 350, isOrganic: true, images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop"] },
  { name: "Kesar Mangoes", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 250, isOrganic: false, images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop"] },
  { name: "Bananas", category: "daily-needs", subcategory: "fruits", unit: "dozen", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=300&fit=crop"] },
  { name: "Red Bananas", category: "daily-needs", subcategory: "fruits", unit: "dozen", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1571771894821-ad996211fdf4?w=400&h=300&fit=crop"] },
  { name: "Papaya", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=300&fit=crop"] },
  { name: "Pineapple", category: "daily-needs", subcategory: "fruits", unit: "piece", basePrice: 50, isOrganic: false, images: ["https://images.unsplash.com/photo-1550258114-b09a81393efd?w=400&h=300&fit=crop"] },
  { name: "Guava", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1536511110564-41d2413e8d3a?w=400&h=300&fit=crop"] },
  { name: "Jackfruit", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 40, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Oranges", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop"] },
  { name: "Sweet Lime (Mosambi)", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 50, isOrganic: false, images: ["https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop"] },
  { name: "Lemons", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=300&fit=crop"] },
  { name: "Grapefruit", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 70, isOrganic: false, images: ["https://images.unsplash.com/photo-1520013817300-1f4c1ad245fe?w=400&h=300&fit=crop"] },
  { name: "Strawberries", category: "daily-needs", subcategory: "fruits", unit: "pack", basePrice: 200, isOrganic: true, images: ["https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop"] },
  { name: "Blueberries", category: "daily-needs", subcategory: "fruits", unit: "pack", basePrice: 350, isOrganic: true, images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"] },
  { name: "Raspberries", category: "daily-needs", subcategory: "fruits", unit: "pack", basePrice: 300, isOrganic: true, images: ["https://images.unsplash.com/photo-1544070078-a212eda27b49?w=400&h=300&fit=crop"] },
  { name: "Watermelon", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 20, isOrganic: false, images: ["https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop"] },
  { name: "Muskmelon", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=400&h=300&fit=crop"] },
  { name: "Honeydew Melon", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=400&h=300&fit=crop"] },
  { name: "Apples (Shimla)", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 150, isOrganic: false, images: ["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop"] },
  { name: "Apples (Kashmir)", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 180, isOrganic: true, images: ["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop"] },
  { name: "Pears", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1541408139310-9118bc75ccdc?w=400&h=300&fit=crop"] },
  { name: "Green Grapes", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop"] },
  { name: "Black Grapes", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 90, isOrganic: false, images: ["https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop"] },
  { name: "Pomegranate", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop"] },
  { name: "Sapota (Chikoo)", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Custard Apple", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 80, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Figs (Fresh)", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 200, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Kiwi", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 250, isOrganic: true, images: ["https://images.unsplash.com/photo-1585052245554-bc67b80292c4?w=400&h=300&fit=crop"] },
  { name: "Dragon Fruit", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 180, isOrganic: true, images: ["https://images.unsplash.com/photo-1527325241048-218156277ca7?w=400&h=300&fit=crop"] },
  { name: "Avocado", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 300, isOrganic: true, images: ["https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop"] },
  { name: "Passion Fruit", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 220, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Litchi", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 100, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Tender Coconut", category: "daily-needs", subcategory: "fruits", unit: "piece", basePrice: 35, isOrganic: false, images: ["https://images.unsplash.com/photo-1523672556977-3a0e3fad3044?w=400&h=300&fit=crop"] },
  { name: "Blackberries", category: "daily-needs", subcategory: "fruits", unit: "pack", basePrice: 280, isOrganic: true, images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"] },
  { name: "Cranberries", category: "daily-needs", subcategory: "fruits", unit: "pack", basePrice: 260, isOrganic: true, images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"] },
  { name: "Plums", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 120, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Peaches", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 160, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Cherries", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 400, isOrganic: false, images: ["https://images.unsplash.com/photo-1544070078-a212eda27b49?w=400&h=300&fit=crop"] },
  { name: "Apricots", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 220, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Nectarines", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 190, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Pomelo", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 90, isOrganic: false, images: ["https://images.unsplash.com/photo-1520013817300-1f4c1ad245fe?w=400&h=300&fit=crop"] },
  { name: "Kinnow", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 75, isOrganic: false, images: ["https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop"] },
  { name: "Mandarin", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 85, isOrganic: false, images: ["https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop"] },
  { name: "Jamun", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 180, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Rambutan", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 300, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Longan", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 280, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Persimmon", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 240, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Star Fruit", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 160, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Mulberries", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 220, isOrganic: true, images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"] },
  { name: "Amla", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 70, isOrganic: true, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  { name: "Dates", category: "daily-needs", subcategory: "fruits", unit: "kg", basePrice: 260, isOrganic: false, images: ["https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop"] },
  
  // Dairy & Eggs
  { name: "Farm Fresh Eggs", category: "daily-needs", subcategory: "dairy", unit: "dozen", basePrice: 80, isOrganic: true, images: ["https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop"] },
  { name: "Country Chicken Eggs", category: "daily-needs", subcategory: "dairy", unit: "dozen", basePrice: 120, isOrganic: true, images: ["https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop"] },
  { name: "Duck Eggs", category: "daily-needs", subcategory: "dairy", unit: "dozen", basePrice: 150, isOrganic: true, images: ["https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop"] },
  { name: "Quail Eggs", category: "daily-needs", subcategory: "dairy", unit: "dozen", basePrice: 60, isOrganic: false, images: ["https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop"] },
  { name: "Cow Milk (Fresh)", category: "daily-needs", subcategory: "dairy", unit: "liter", basePrice: 55, isOrganic: true, images: ["https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop"] },
  { name: "Buffalo Milk (Fresh)", category: "daily-needs", subcategory: "dairy", unit: "liter", basePrice: 65, isOrganic: false, images: ["https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop"] },
  { name: "Goat Milk", category: "daily-needs", subcategory: "dairy", unit: "liter", basePrice: 80, isOrganic: true, images: ["https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop"] },
  { name: "Fresh Curd", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 45, isOrganic: false, images: ["https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop"] },
  { name: "Fresh Butter", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 500, isOrganic: true, images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop"] },
  { name: "Pure Cow Ghee", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 550, isOrganic: true, images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop"] },
  { name: "Buffalo Ghee", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 600, isOrganic: false, images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop"] },
  { name: "Paneer (Fresh)", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 320, isOrganic: false, images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop"] },
  { name: "Cottage Cheese", category: "daily-needs", subcategory: "dairy", unit: "kg", basePrice: 400, isOrganic: false, images: ["https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop"] },
  { name: "Fresh Cream", category: "daily-needs", subcategory: "dairy", unit: "liter", basePrice: 280, isOrganic: false, images: ["https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop"] },
  
  // Meat & Poultry
  { name: "Country Chicken", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 450, isOrganic: true, images: ["https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop"] },
  { name: "Broiler Chicken", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 180, isOrganic: false, images: ["https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop"] },
  { name: "Chicken Breast", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 280, isOrganic: false, images: ["https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop"] },
  { name: "Chicken Legs", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 220, isOrganic: false, images: ["https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop"] },
  { name: "Goat Mutton", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 700, isOrganic: false, images: ["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop"] },
  { name: "Lamb Mutton", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 650, isOrganic: false, images: ["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop"] },
  { name: "Pork", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 350, isOrganic: false, images: ["https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=300&fit=crop"] },
  { name: "Rabbit Meat", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 450, isOrganic: true, images: ["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop"] },
  { name: "Duck Meat", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 400, isOrganic: false, images: ["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop"] },
  { name: "Quail Meat", category: "daily-needs", subcategory: "meat", unit: "kg", basePrice: 500, isOrganic: true, images: ["https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop"] },
  
  // Fish & Seafood
  { name: "Fresh Prawns", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 550, isOrganic: false, images: ["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop"] },
  { name: "Rohu Fish", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 200, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Catla Fish", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 220, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Tilapia", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 180, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Pomfret", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 500, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Mackerel", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 250, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Sardines", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 150, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "King Fish (Surmai)", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 450, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  { name: "Crabs", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 350, isOrganic: false, images: ["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop"] },
  { name: "Lobster", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 1200, isOrganic: false, images: ["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop"] },
  { name: "Squid", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 300, isOrganic: false, images: ["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop"] },
  { name: "Dried Fish", category: "daily-needs", subcategory: "fish", unit: "kg", basePrice: 400, isOrganic: false, images: ["https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=300&fit=crop"] },
  
  // Spices & Condiments
  { name: "Turmeric Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 150, isOrganic: true },
  { name: "Red Chilli Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 200, isOrganic: false },
  { name: "Coriander Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Cumin Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 350, isOrganic: false },
  { name: "Black Pepper", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 600, isOrganic: false },
  { name: "Cardamom (Green)", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 2000, isOrganic: true },
  { name: "Cloves", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 800, isOrganic: false },
  { name: "Cinnamon Sticks", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 400, isOrganic: false },
  { name: "Nutmeg", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 900, isOrganic: false },
  { name: "Cumin Seeds", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 300, isOrganic: false },
  { name: "Mustard Seeds", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 100, isOrganic: false },
  { name: "Fennel Seeds", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 180, isOrganic: false },
  { name: "Fenugreek Seeds", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Garam Masala", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 250, isOrganic: false },
  { name: "Sambar Powder", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 200, isOrganic: false },
  { name: "Kashmiri Red Chilli", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Rock Salt", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 50, isOrganic: false },
  { name: "Jaggery (Organic)", category: "daily-needs", subcategory: "spices", unit: "kg", basePrice: 80, isOrganic: true },
  
  // Inputs & Tools - Seeds
  { name: "Hybrid Seeds Pack", category: "inputs-tools", subcategory: "seeds", unit: "pack", basePrice: 250, isOrganic: false },
  { name: "Paddy Seeds (HYV)", category: "inputs-tools", subcategory: "seeds", unit: "kg", basePrice: 80, isOrganic: false },
  { name: "Wheat Seeds", category: "inputs-tools", subcategory: "seeds", unit: "kg", basePrice: 60, isOrganic: false },
  { name: "Maize Seeds", category: "inputs-tools", subcategory: "seeds", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Tomato Seeds", category: "inputs-tools", subcategory: "seeds", unit: "pack", basePrice: 250, isOrganic: false },
  { name: "Brinjal Seeds", category: "inputs-tools", subcategory: "seeds", unit: "pack", basePrice: 180, isOrganic: false },
  { name: "Chilli Seeds", category: "inputs-tools", subcategory: "seeds", unit: "pack", basePrice: 200, isOrganic: false },
  { name: "Mango Saplings", category: "inputs-tools", subcategory: "seeds", unit: "piece", basePrice: 250, isOrganic: false },
  { name: "Banana Suckers", category: "inputs-tools", subcategory: "seeds", unit: "piece", basePrice: 35, isOrganic: false },
  { name: "Tissue Culture Banana", category: "inputs-tools", subcategory: "seeds", unit: "piece", basePrice: 45, isOrganic: false },
  
  // Fertilizers
  { name: "Organic Fertilizer", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 800, isOrganic: true },
  { name: "Urea (46% N)", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 350, isOrganic: false },
  { name: "DAP Fertilizer", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 1350, isOrganic: false },
  { name: "MOP (Potash)", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 950, isOrganic: false },
  { name: "NPK 10:26:26", category: "inputs-tools", subcategory: "fertilizers", unit: "bag", basePrice: 1400, isOrganic: false },
  { name: "Vermicompost", category: "inputs-tools", subcategory: "fertilizers", unit: "kg", basePrice: 15, isOrganic: true },
  { name: "Neem Cake", category: "inputs-tools", subcategory: "fertilizers", unit: "kg", basePrice: 25, isOrganic: true },
  
  // Pesticides & Protection
  { name: "Neem Oil Pesticide", category: "inputs-tools", subcategory: "pesticides", unit: "liter", basePrice: 350, isOrganic: true },
  { name: "Biopesticide", category: "inputs-tools", subcategory: "pesticides", unit: "liter", basePrice: 400, isOrganic: true },
  { name: "Fungicide Spray", category: "inputs-tools", subcategory: "pesticides", unit: "liter", basePrice: 450, isOrganic: false },
  
  // Farm Tools
  { name: "Hand Sprayer", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 450, isOrganic: false },
  { name: "Spade", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 250, isOrganic: false },
  { name: "Hoe", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 200, isOrganic: false },
  { name: "Sickle", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 150, isOrganic: false },
  { name: "Pruning Shears", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 350, isOrganic: false },
  { name: "Wheelbarrow", category: "inputs-tools", subcategory: "tools", unit: "piece", basePrice: 1500, isOrganic: false },
  
  // Irrigation
  { name: "Drip Irrigation Kit", category: "inputs-tools", subcategory: "irrigation", unit: "set", basePrice: 2500, isOrganic: false },
  { name: "Sprinkler System", category: "inputs-tools", subcategory: "irrigation", unit: "set", basePrice: 3500, isOrganic: false },
  { name: "Submersible Pump", category: "inputs-tools", subcategory: "irrigation", unit: "piece", basePrice: 8500, isOrganic: false },
  { name: "Solar Water Pump", category: "inputs-tools", subcategory: "irrigation", unit: "piece", basePrice: 25000, isOrganic: false },
  { name: "PVC Pipes (4 inch)", category: "inputs-tools", subcategory: "irrigation", unit: "meter", basePrice: 80, isOrganic: false },
  
  // Specialty - Honey & Bee Products
  { name: "Pure Honey", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 400, isOrganic: true },
  { name: "Forest Honey", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 500, isOrganic: true },
  { name: "Organic Raw Honey", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 600, isOrganic: true },
  { name: "Beeswax", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 400, isOrganic: true },
  { name: "Royal Jelly", category: "specialty", subcategory: "honey", unit: "100g", basePrice: 2500, isOrganic: true },
  { name: "Bee Pollen", category: "specialty", subcategory: "honey", unit: "kg", basePrice: 1500, isOrganic: true },
  
  // Mushrooms
  { name: "Button Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 200, isOrganic: false },
  { name: "Oyster Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 180, isOrganic: true },
  { name: "Shiitake Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 400, isOrganic: true },
  { name: "Portobello Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 350, isOrganic: false },
  { name: "Enoki Mushrooms", category: "specialty", subcategory: "mushrooms", unit: "pack", basePrice: 150, isOrganic: true },
  { name: "Mushroom Spawn", category: "specialty", subcategory: "mushrooms", unit: "kg", basePrice: 150, isOrganic: false },
  
  // Medicinal Plants & Herbs
  { name: "Tulsi Plants", category: "specialty", subcategory: "medicinal", unit: "piece", basePrice: 50, isOrganic: true },
  { name: "Aloe Vera Plant", category: "specialty", subcategory: "medicinal", unit: "piece", basePrice: 80, isOrganic: true },
  { name: "Ashwagandha Root", category: "specialty", subcategory: "medicinal", unit: "kg", basePrice: 800, isOrganic: true },
  { name: "Brahmi Leaves", category: "specialty", subcategory: "medicinal", unit: "kg", basePrice: 300, isOrganic: true },
  { name: "Moringa Leaves", category: "specialty", subcategory: "medicinal", unit: "kg", basePrice: 250, isOrganic: true },
  { name: "Neem Leaves", category: "specialty", subcategory: "medicinal", unit: "kg", basePrice: 100, isOrganic: true },
  
  // Fresh Farm Produce - Wholesale Vegetables & Fruits
  { name: "Bulk Mixed Vegetables Crate", category: "fresh-produce", subcategory: "wholesale-veg", unit: "crate", basePrice: 1200, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Bulk Leafy Greens Box", category: "fresh-produce", subcategory: "wholesale-veg", unit: "box", basePrice: 650, isOrganic: true, images: ["https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop"] },
  { name: "Wholesale Root Vegetables Sack", category: "fresh-produce", subcategory: "wholesale-veg", unit: "sack", basePrice: 900, isOrganic: false, images: ["https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop"] },
  { name: "Wholesale Gourd Selection", category: "fresh-produce", subcategory: "wholesale-veg", unit: "crate", basePrice: 850, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Bulk Tomato Capsicum Crate", category: "fresh-produce", subcategory: "wholesale-veg", unit: "crate", basePrice: 1100, isOrganic: false, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Organic Seasonal Vegetable Box", category: "fresh-produce", subcategory: "wholesale-veg", unit: "box", basePrice: 1500, isOrganic: true, images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop"] },
  { name: "Bulk Tropical Fruits Crate", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "crate", basePrice: 1800, isOrganic: false, images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop"] },
  { name: "Wholesale Citrus Fruit Box", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "box", basePrice: 1400, isOrganic: false, images: ["https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop"] },
  { name: "Bulk Berry Pack", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "pack", basePrice: 2400, isOrganic: true, images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"] },
  { name: "Wholesale Apple Pear Crate", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "crate", basePrice: 1700, isOrganic: false, images: ["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop"] },
  { name: "Bulk Exotic Fruit Box", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "box", basePrice: 2600, isOrganic: true, images: ["https://images.unsplash.com/photo-1527325241048-218156277ca7?w=400&h=300&fit=crop"] },
  { name: "Seasonal Mixed Fruit Crate", category: "fresh-produce", subcategory: "wholesale-fruits", unit: "crate", basePrice: 2100, isOrganic: false, images: ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop"] },
  
  // Flowers
  { name: "Jasmine Flowers", category: "fresh-produce", subcategory: "flowers", unit: "kg", basePrice: 400, isOrganic: false },
  { name: "Marigold Flowers", category: "fresh-produce", subcategory: "flowers", unit: "kg", basePrice: 100, isOrganic: false },
  { name: "Rose Flowers", category: "fresh-produce", subcategory: "flowers", unit: "bunch", basePrice: 150, isOrganic: false },
  { name: "Chrysanthemum", category: "fresh-produce", subcategory: "flowers", unit: "bunch", basePrice: 80, isOrganic: false },
  { name: "Tuberose", category: "fresh-produce", subcategory: "flowers", unit: "kg", basePrice: 300, isOrganic: false },
  { name: "Orchids", category: "fresh-produce", subcategory: "flowers", unit: "bunch", basePrice: 500, isOrganic: false },
  
  // Processed Foods
  { name: "Mango Pickle", category: "processed", subcategory: "pickles", unit: "kg", basePrice: 200, isOrganic: false },
  { name: "Lemon Pickle", category: "processed", subcategory: "pickles", unit: "kg", basePrice: 180, isOrganic: false },
  { name: "Mixed Vegetable Pickle", category: "processed", subcategory: "pickles", unit: "kg", basePrice: 220, isOrganic: false },
  { name: "Tomato Ketchup", category: "processed", subcategory: "pickles", unit: "kg", basePrice: 120, isOrganic: false },
  { name: "Coconut Chutney Powder", category: "processed", subcategory: "snacks", unit: "kg", basePrice: 250, isOrganic: false },
  
  // Animal Feed
  { name: "Cattle Feed", category: "other-agri", subcategory: "animal-feed", unit: "bag", basePrice: 600, isOrganic: false },
  { name: "Poultry Feed (Starter)", category: "other-agri", subcategory: "animal-feed", unit: "bag", basePrice: 1200, isOrganic: false },
  { name: "Fish Feed Pellets", category: "other-agri", subcategory: "animal-feed", unit: "kg", basePrice: 80, isOrganic: false },
  { name: "Green Fodder (Napier)", category: "other-agri", subcategory: "animal-feed", unit: "bundle", basePrice: 50, isOrganic: true },
  
  // Plantation Crops
  { name: "Green Tea Leaves", category: "other-agri", subcategory: "plantation", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Coffee Beans (Arabica)", category: "other-agri", subcategory: "plantation", unit: "kg", basePrice: 450, isOrganic: true },
  { name: "Rubber Latex", category: "other-agri", subcategory: "plantation", unit: "kg", basePrice: 150, isOrganic: false },
  
  // Fibre Crops
  { name: "Raw Cotton", category: "other-agri", subcategory: "fibre", unit: "kg", basePrice: 65, isOrganic: false },
  { name: "Jute Fibre", category: "other-agri", subcategory: "fibre", unit: "kg", basePrice: 45, isOrganic: false },
  { name: "Coir Fibre", category: "other-agri", subcategory: "fibre", unit: "kg", basePrice: 35, isOrganic: false },
  
  // Timber & Bamboo
  { name: "Bamboo Poles", category: "other-agri", subcategory: "timber", unit: "piece", basePrice: 100, isOrganic: false },
  { name: "Teak Wood Logs", category: "other-agri", subcategory: "timber", unit: "cft", basePrice: 2500, isOrganic: false },
  { name: "Eucalyptus Logs", category: "other-agri", subcategory: "timber", unit: "cft", basePrice: 800, isOrganic: false },

  // Protective Gear (inputs-tools)
  { name: "Chemical Resistant Gloves", category: "inputs-tools", subcategory: "protective-gear", unit: "pair", basePrice: 350, isOrganic: false },
  { name: "Agricultural Safety Helmet", category: "inputs-tools", subcategory: "protective-gear", unit: "piece", basePrice: 650, isOrganic: false },
  { name: "Protective Overall Suit", category: "inputs-tools", subcategory: "protective-gear", unit: "piece", basePrice: 1200, isOrganic: false },
  { name: "Face Shield & Goggles Set", category: "inputs-tools", subcategory: "protective-gear", unit: "set", basePrice: 480, isOrganic: false },
  { name: "Rubber Wellington Boots", category: "inputs-tools", subcategory: "protective-gear", unit: "pair", basePrice: 850, isOrganic: false },
  { name: "Pesticide Spray Mask N95", category: "inputs-tools", subcategory: "protective-gear", unit: "piece", basePrice: 280, isOrganic: false },

  // Animal Husbandry Equipment (inputs-tools)
  { name: "Milking Machine (Single Cluster)", category: "inputs-tools", subcategory: "animal-equipment", unit: "piece", basePrice: 45000, isOrganic: false },
  { name: "Drenching Gun", category: "inputs-tools", subcategory: "animal-equipment", unit: "piece", basePrice: 950, isOrganic: false },
  { name: "Livestock Weighing Scale", category: "inputs-tools", subcategory: "animal-equipment", unit: "piece", basePrice: 12000, isOrganic: false },
  { name: "Ear Tag Applicator Set", category: "inputs-tools", subcategory: "animal-equipment", unit: "set", basePrice: 1500, isOrganic: false },
  { name: "Poultry Drinker (10L)", category: "inputs-tools", subcategory: "animal-equipment", unit: "piece", basePrice: 400, isOrganic: false },
  { name: "Cattle Halter Rope", category: "inputs-tools", subcategory: "animal-equipment", unit: "piece", basePrice: 250, isOrganic: false },

  // Agricultural Sensors & IoT
  { name: "Soil Moisture Sensor", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 2500, isOrganic: false },
  { name: "Weather Station (Compact)", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 18000, isOrganic: false },
  { name: "Crop Canopy Temperature Sensor", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 8500, isOrganic: false },
  { name: "NPK Soil Nutrient Sensor", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 12000, isOrganic: false },
  { name: "LoRaWAN Farm Gateway", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 25000, isOrganic: false },
  { name: "Leaf Wetness Sensor", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 3500, isOrganic: false },
  { name: "CO2 Greenhouse Monitor", category: "inputs-tools", subcategory: "sensors", unit: "piece", basePrice: 9500, isOrganic: false },

  // GIS & Mapping Tools
  { name: "Handheld GPS Receiver", category: "inputs-tools", subcategory: "gis", unit: "piece", basePrice: 22000, isOrganic: false },
  { name: "Field Boundary Mapping Kit", category: "inputs-tools", subcategory: "gis", unit: "set", basePrice: 35000, isOrganic: false },
  { name: "Soil Sampling Grid Tool", category: "inputs-tools", subcategory: "gis", unit: "set", basePrice: 4500, isOrganic: false },
  { name: "Farm GIS Software Subscription", category: "inputs-tools", subcategory: "gis", unit: "year", basePrice: 15000, isOrganic: false },

  // Remote Sensing Technology
  { name: "Agricultural Drone (6-rotor)", category: "inputs-tools", subcategory: "remote-sensing", unit: "piece", basePrice: 180000, isOrganic: false },
  { name: "Multispectral Camera for Drone", category: "inputs-tools", subcategory: "remote-sensing", unit: "piece", basePrice: 75000, isOrganic: false },
  { name: "NDVI Analysis Report Service", category: "inputs-tools", subcategory: "remote-sensing", unit: "per-acre", basePrice: 500, isOrganic: false },
  { name: "Satellite Imagery Subscription", category: "inputs-tools", subcategory: "remote-sensing", unit: "year", basePrice: 25000, isOrganic: false },

  // Precision Farming Equipment
  { name: "Variable Rate Seeder", category: "inputs-tools", subcategory: "precision", unit: "piece", basePrice: 95000, isOrganic: false },
  { name: "Auto-Steer System for Tractor", category: "inputs-tools", subcategory: "precision", unit: "set", basePrice: 120000, isOrganic: false },
  { name: "Precision Sprayer Controller", category: "inputs-tools", subcategory: "precision", unit: "piece", basePrice: 55000, isOrganic: false },
  { name: "Yield Monitor & Mapping System", category: "inputs-tools", subcategory: "precision", unit: "set", basePrice: 85000, isOrganic: false },

  // Premium Crops (specialty)
  { name: "Saffron (Premium Grade)", category: "specialty", subcategory: "premium-crops", unit: "gram", basePrice: 500, isOrganic: true },
  { name: "White Truffle", category: "specialty", subcategory: "premium-crops", unit: "gram", basePrice: 800, isOrganic: true },
  { name: "Vanilla Beans (Grade A)", category: "specialty", subcategory: "premium-crops", unit: "piece", basePrice: 200, isOrganic: true },
  { name: "Darjeeling First Flush Tea", category: "specialty", subcategory: "premium-crops", unit: "kg", basePrice: 2500, isOrganic: true },
  { name: "Black Garlic", category: "specialty", subcategory: "premium-crops", unit: "kg", basePrice: 800, isOrganic: true },

  // Commercial Crops - E.14
  { name: "Sugarcane (Jaggery Grade)", category: "commercial-crops", subcategory: "sugar-crops", unit: "tonne", basePrice: 3200, isOrganic: false },
  { name: "Sugar Beet", category: "commercial-crops", subcategory: "sugar-crops", unit: "tonne", basePrice: 2800, isOrganic: false },
  { name: "Stevia Leaves (Dried)", category: "commercial-crops", subcategory: "sugar-crops", unit: "kg", basePrice: 450, isOrganic: true },
  { name: "Coffee Arabica (Green Beans)", category: "commercial-crops", subcategory: "beverage-crops", unit: "kg", basePrice: 480, isOrganic: true },
  { name: "Tea Leaves (Orthodox)", category: "commercial-crops", subcategory: "beverage-crops", unit: "kg", basePrice: 380, isOrganic: true },
  { name: "Cocoa Beans (Fermented)", category: "commercial-crops", subcategory: "beverage-crops", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Natural Rubber Latex", category: "commercial-crops", subcategory: "latex-crops", unit: "liter", basePrice: 170, isOrganic: false },
  { name: "Gutta-Percha Raw Material", category: "commercial-crops", subcategory: "latex-crops", unit: "kg", basePrice: 950, isOrganic: false },
  { name: "Sunflower Seeds (Oil Grade)", category: "commercial-crops", subcategory: "other-commercial", unit: "kg", basePrice: 65, isOrganic: false },
  { name: "Rapeseed (Canola)", category: "commercial-crops", subcategory: "other-commercial", unit: "kg", basePrice: 55, isOrganic: false },
  { name: "Soybean (Industrial Grade)", category: "commercial-crops", subcategory: "other-commercial", unit: "kg", basePrice: 50, isOrganic: false },

  // Bio-Based Products - E.15
  { name: "Wood Pellets (Biomass)", category: "bio-products", subcategory: "bioenergy", unit: "tonne", basePrice: 8500, isOrganic: false },
  { name: "Biogas Plant Starter Kit", category: "bio-products", subcategory: "bioenergy", unit: "set", basePrice: 45000, isOrganic: false },
  { name: "Agricultural Straw Pellets", category: "bio-products", subcategory: "bioenergy", unit: "tonne", basePrice: 5500, isOrganic: false },
  { name: "Biofertilizer (Rhizobium)", category: "bio-products", subcategory: "biofertilizers", unit: "kg", basePrice: 120, isOrganic: true },
  { name: "Trichoderma Biofungicide", category: "bio-products", subcategory: "biofertilizers", unit: "kg", basePrice: 180, isOrganic: true },
  { name: "Neem-Based Biopesticide", category: "bio-products", subcategory: "biofertilizers", unit: "liter", basePrice: 250, isOrganic: true },
  { name: "Mycorrhizae Inoculant", category: "bio-products", subcategory: "biofertilizers", unit: "kg", basePrice: 450, isOrganic: true },
  { name: "Ashwagandha Extract (5% Withanolides)", category: "bio-products", subcategory: "herbal-pharma", unit: "kg", basePrice: 2800, isOrganic: true },
  { name: "Moringa Leaf Powder", category: "bio-products", subcategory: "herbal-pharma", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Turmeric Curcumin Extract", category: "bio-products", subcategory: "herbal-pharma", unit: "kg", basePrice: 1200, isOrganic: true },
  { name: "Neem Oil (Cold Pressed)", category: "bio-products", subcategory: "herbal-pharma", unit: "liter", basePrice: 480, isOrganic: true },

  // Dietary Category Products
  { name: "Keto Almond Flour", category: "dietary", subcategory: "keto", unit: "kg", basePrice: 650, isOrganic: true },
  { name: "MCT Oil (Coconut)", category: "dietary", subcategory: "keto", unit: "liter", basePrice: 850, isOrganic: true },
  { name: "Keto Chia Seeds", category: "dietary", subcategory: "keto", unit: "kg", basePrice: 550, isOrganic: true },
  { name: "Whey Protein Isolate (Farm Fresh)", category: "dietary", subcategory: "high-protein", unit: "kg", basePrice: 1200, isOrganic: false },
  { name: "Hemp Protein Powder", category: "dietary", subcategory: "high-protein", unit: "kg", basePrice: 950, isOrganic: true },
  { name: "Spirulina Protein Powder", category: "dietary", subcategory: "high-protein", unit: "kg", basePrice: 1500, isOrganic: true },
  { name: "Jackfruit Pulled (Vegan Meat)", category: "dietary", subcategory: "vegan", unit: "kg", basePrice: 280, isOrganic: true },
  { name: "Organic Tempeh", category: "dietary", subcategory: "vegan", unit: "kg", basePrice: 380, isOrganic: true },
  { name: "Gluten-Free Buckwheat Flour", category: "dietary", subcategory: "gluten-free", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Gluten-Free Oats", category: "dietary", subcategory: "gluten-free", unit: "kg", basePrice: 280, isOrganic: false },
  { name: "Oat Milk (Fresh)", category: "dietary", subcategory: "dairy-free", unit: "liter", basePrice: 120, isOrganic: true },
  { name: "Almond Milk", category: "dietary", subcategory: "dairy-free", unit: "liter", basePrice: 180, isOrganic: true },
  { name: "Bitter Melon (Diabetic)", category: "dietary", subcategory: "diabetic", unit: "kg", basePrice: 60, isOrganic: true },
  { name: "Methi Seeds (Blood Sugar)", category: "dietary", subcategory: "diabetic", unit: "kg", basePrice: 150, isOrganic: true },
  { name: "Flaxseeds (Heart Healthy)", category: "dietary", subcategory: "heart-healthy", unit: "kg", basePrice: 180, isOrganic: true },
  { name: "Walnuts (Heart Healthy)", category: "dietary", subcategory: "heart-healthy", unit: "kg", basePrice: 850, isOrganic: false },
  { name: "Folic Acid Spinach (Pregnancy)", category: "dietary", subcategory: "pregnancy", unit: "bunch", basePrice: 45, isOrganic: true },
  { name: "Organic Dates (Pregnancy)", category: "dietary", subcategory: "pregnancy", unit: "kg", basePrice: 350, isOrganic: true },
  { name: "Soft Porridge Millet (Baby)", category: "dietary", subcategory: "baby-nutrition", unit: "kg", basePrice: 180, isOrganic: true },
  { name: "Ragi Porridge Mix (Baby)", category: "dietary", subcategory: "baby-nutrition", unit: "kg", basePrice: 220, isOrganic: true },
  { name: "Calcium-Rich Sesame (Senior)", category: "dietary", subcategory: "senior-nutrition", unit: "kg", basePrice: 280, isOrganic: true },
  { name: "Bone Broth Powder (Senior)", category: "dietary", subcategory: "senior-nutrition", unit: "kg", basePrice: 650, isOrganic: false },
  { name: "Grass-Fed Beef Jerky (Paleo)", category: "dietary", subcategory: "paleo", unit: "kg", basePrice: 1800, isOrganic: true },
  { name: "Wild Salmon (Paleo)", category: "dietary", subcategory: "paleo", unit: "kg", basePrice: 950, isOrganic: false },
  { name: "Extra Virgin Olive Oil (Mediterranean)", category: "dietary", subcategory: "mediterranean", unit: "liter", basePrice: 650, isOrganic: true },
  { name: "Kalamata Olives", category: "dietary", subcategory: "mediterranean", unit: "kg", basePrice: 480, isOrganic: false },
  { name: "Whole30 Coconut Aminos", category: "dietary", subcategory: "whole30", unit: "liter", basePrice: 550, isOrganic: true },
  { name: "Compliant Almond Butter (Whole30)", category: "dietary", subcategory: "whole30", unit: "kg", basePrice: 750, isOrganic: true },
  { name: "Triphala Powder (Ayurvedic)", category: "dietary", subcategory: "ayurvedic", unit: "kg", basePrice: 320, isOrganic: true },
  { name: "Chyawanprash (Ayurvedic)", category: "dietary", subcategory: "ayurvedic", unit: "kg", basePrice: 450, isOrganic: true },

  // Modern Farming Products
  { name: "Hydroponic NFT Channel System", category: "modern-farming", subcategory: "hydroponics", unit: "set", basePrice: 35000, isOrganic: false },
  { name: "Hydroponic Nutrient Solution A+B", category: "modern-farming", subcategory: "hydroponics", unit: "liter", basePrice: 450, isOrganic: false },
  { name: "Aeroponic Tower Garden", category: "modern-farming", subcategory: "aeroponics", unit: "piece", basePrice: 28000, isOrganic: false },
  { name: "Vertical Farm LED Grow Light", category: "modern-farming", subcategory: "vertical", unit: "piece", basePrice: 12000, isOrganic: false },
  { name: "Greenhouse HDPE Net 50%", category: "modern-farming", subcategory: "greenhouse", unit: "sq.meter", basePrice: 35, isOrganic: false },
  { name: "Variable Rate Fertilizer Controller", category: "modern-farming", subcategory: "precision-farming", unit: "piece", basePrice: 75000, isOrganic: false },
];

const farmerNames = [
  "James Wilson", "Sarah Thompson", "Michael Brown", "Emma Davies", "Thomas Green",
  "Lucy Mitchell", "William Taylor", "Sophie Adams", "Oliver White", "Charlotte Evans"
];

const locations = [
  "Essex", "Kent", "Norfolk", "Suffolk", "Cambridgeshire",
  "Oxfordshire", "Somerset", "Devon", "Yorkshire", "Lincolnshire"
];

// Realistic product images mapping using Unsplash
const productImages: Record<string, string> = {
  // Vegetables
  "Organic Tomatoes": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop",
  "Fresh Potatoes": "https://images.unsplash.com/photo-1596910547705-b75df20c3e12?w=400&h=300&fit=crop",
  "Spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Onions": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=300&fit=crop",
  "Garlic": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=400&h=300&fit=crop",
  "Carrots": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=300&fit=crop",
  "Tomatoes": "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=400&h=300&fit=crop",
  "Broccoli": "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop",
  "Cabbage": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop",
  "Cucumber": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400&h=300&fit=crop",
  "Cauliflower": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=300&fit=crop",
  "Lettuce": "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop",
  "Green Beans": "https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=400&h=300&fit=crop",
  "Green Peas": "https://images.unsplash.com/photo-1615485925763-86786288908a?w=400&h=300&fit=crop",
  "Capsicum (Bell Pepper)": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=300&fit=crop",
  "Beetroot": "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=400&h=300&fit=crop",
  "Radish": "https://images.unsplash.com/photo-1606588260160-0c4707ab7db5?w=400&h=300&fit=crop",
  "Ginger": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Pumpkin": "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&h=300&fit=crop",
  "Zucchini": "https://images.unsplash.com/photo-1563252722-6434563a985d?w=400&h=300&fit=crop",
  "Asparagus": "https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=400&h=300&fit=crop",
  "Sweet Potato": "https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=400&h=300&fit=crop",
  "Coriander Leaves": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=300&fit=crop",
  "Mint Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Curry Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Amaranth Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Fenugreek Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Brinjal (Eggplant)": "https://images.unsplash.com/photo-1590393533632-7060377e6946?w=400&h=300&fit=crop",
  "Okra (Bhindi)": "https://images.unsplash.com/photo-1464454709131-ffd692591ee5?w=400&h=300&fit=crop",
  "Green Chillies": "https://images.unsplash.com/photo-1588276552401-30058a0fe57b?w=400&h=300&fit=crop",
  "Bottle Gourd": "https://images.unsplash.com/photo-1534123235357-bb196bb060e7?w=400&h=300&fit=crop",
  "Bitter Gourd": "https://images.unsplash.com/photo-1534123235357-bb196bb060e7?w=400&h=300&fit=crop",
  "Ridge Gourd": "https://images.unsplash.com/photo-1534123235357-bb196bb060e7?w=400&h=300&fit=crop",
  "Snake Gourd": "https://images.unsplash.com/photo-1534123235357-bb196bb060e7?w=400&h=300&fit=crop",
  "Raw Banana": "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=400&h=300&fit=crop",
  "Yam": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Tapioca": "https://images.unsplash.com/photo-1596910547705-b75df20c3e12?w=400&h=300&fit=crop",
  "Celery": "https://images.unsplash.com/photo-1597814072367-b585863d93ee?w=400&h=300&fit=crop",
  "Leek": "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=300&fit=crop",
  "Drumstick": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",

  // Fruits
  "Alphonso Mangoes": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop",
  "Kesar Mangoes": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=300&fit=crop",
  "Bananas": "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=300&fit=crop",
  "Red Bananas": "https://images.unsplash.com/photo-1571771894821-ad996211fdf4?w=400&h=300&fit=crop",
  "Apples (Shimla)": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop",
  "Apples (Kashmir)": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop",
  "Oranges": "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop",
  "Sweet Lime (Mosambi)": "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop",
  "Grapefruit": "https://images.unsplash.com/photo-1520013817300-1f4c1ad245fe?w=400&h=300&fit=crop",
  "Green Grapes": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop",
  "Black Grapes": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop",
  "Strawberries": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop",
  "Blueberries": "https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop",
  "Raspberries": "https://images.unsplash.com/photo-1544070078-a212eda27b49?w=400&h=300&fit=crop",
  "Watermelon": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
  "Muskmelon": "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=400&h=300&fit=crop",
  "Honeydew Melon": "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=400&h=300&fit=crop",
  "Pineapple": "https://images.unsplash.com/photo-1550258114-b09a81393efd?w=400&h=300&fit=crop",
  "Pomegranate": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop",
  "Papaya": "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=300&fit=crop",
  "Guava": "https://images.unsplash.com/photo-1536511110564-41d2413e8d3a?w=400&h=300&fit=crop",
  "Kiwi": "https://images.unsplash.com/photo-1585052245554-bc67b80292c4?w=400&h=300&fit=crop",
  "Dragon Fruit": "https://images.unsplash.com/photo-1527325241048-218156277ca7?w=400&h=300&fit=crop",
  "Avocado": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop",
  "Lemons": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=300&fit=crop",
  "Pears": "https://images.unsplash.com/photo-1541408139310-9118bc75ccdc?w=400&h=300&fit=crop",
  "Litchi": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Jackfruit": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Sapota (Chikoo)": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Custard Apple": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Figs (Fresh)": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Passion Fruit": "https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?w=400&h=300&fit=crop",
  "Tender Coconut": "https://images.unsplash.com/photo-1523672556977-3a0e3fad3044?w=400&h=300&fit=crop",

  // Grains & Cereals
  "Premium Basmati Rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
  "White Rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=300&fit=crop",
  "Brown Rice": "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=300&fit=crop",
  "Red Rice": "https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop",
  "Wheat Flour": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Whole Wheat": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Semolina (Suji)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Oats": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&h=300&fit=crop",
  "Quinoa": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
  "Maize": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop",
  "Ragi (Finger Millet)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Bajra (Pearl Millet)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Jowar (Sorghum)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Foxtail Millet": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",

  // Pulses & Lentils
  "Toor Dal": "https://images.unsplash.com/photo-1585650909574-e384a287d51a?w=400&h=300&fit=crop",
  "Moong Dal": "https://images.unsplash.com/photo-1599708193358-81a02ba36cc8?w=400&h=300&fit=crop",
  "Chana Dal": "https://images.unsplash.com/photo-1515543904923-aa00e9a81c88?w=400&h=300&fit=crop",
  "Urad Dal": "https://images.unsplash.com/photo-1585650909574-e384a287d51a?w=400&h=300&fit=crop",
  "Masoor Dal": "https://images.unsplash.com/photo-1585650909574-e384a287d51a?w=400&h=300&fit=crop",
  "Chickpeas (Kabuli Chana)": "https://images.unsplash.com/photo-1515543904923-aa00e9a81c88?w=400&h=300&fit=crop",
  "Kidney Beans (Rajma)": "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?w=400&h=300&fit=crop",
  "Green Gram Whole": "https://images.unsplash.com/photo-1599708193358-81a02ba36cc8?w=400&h=300&fit=crop",
  "Black Gram Whole": "https://images.unsplash.com/photo-1585650909574-e384a287d51a?w=400&h=300&fit=crop",

  // Cooking Oils
  "Cold Pressed Coconut Oil": "https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop",
  "Sunflower Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",
  "Groundnut Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",
  "Mustard Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",
  "Sesame Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",
  "Rice Bran Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",
  "Extra Virgin Olive Oil": "https://images.unsplash.com/photo-1474979266404-7eaacabc88c5?w=400&h=300&fit=crop",

  // Dairy & Eggs
  "Farm Fresh Eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop",
  "Quail Eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop",
  "Cow Milk (Fresh)": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop",
  "Buffalo Milk (Fresh)": "https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop",
  "Goat Milk": "https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop",
  "Fresh Curd": "https://images.unsplash.com/photo-1612203985729-70726954388c?w=400&h=300&fit=crop",
  "Fresh Butter": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=300&fit=crop",
  "Pure Cow Ghee": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop",
  "Buffalo Ghee": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop",
  "Paneer (Fresh)": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop",
  "Cottage Cheese": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop",
  "Fresh Cream": "https://images.unsplash.com/photo-1550583724-125581fe2f8a?w=400&h=300&fit=crop",

  // Meat & Poultry
  "Country Chicken": "https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop",
  "Broiler Chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop",
  "Chicken Breast": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop",
  "Chicken Legs": "https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop",
  "Goat Mutton": "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=300&fit=crop",
  "Lamb Mutton": "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=300&fit=crop",
  "Pork": "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=300&fit=crop",
  "Rabbit Meat": "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop",
  "Duck Meat": "https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop",
  "Quail Meat": "https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop",

  // Fish & Seafood
  "Fresh Prawns": "https://images.unsplash.com/photo-1565680018093-ebb6d90c7f2a?w=400&h=300&fit=crop",
  "Rohu Fish": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
  "Catla Fish": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
  "Tilapia": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
  "Pomfret": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=300&fit=crop",
  "Mackerel": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=300&fit=crop",
  "Sardines": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=300&fit=crop",
  "King Fish (Surmai)": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
  "Crabs": "https://images.unsplash.com/photo-1565680018093-ebb6d90c7f2a?w=400&h=300&fit=crop",
  "Lobster": "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop",
  "Squid": "https://images.unsplash.com/photo-1565680018093-ebb6d90c7f2a?w=400&h=300&fit=crop",
  "Dried Fish": "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400&h=300&fit=crop",

  // Spices & Condiments
  "Turmeric Powder": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Red Chilli Powder": "https://images.unsplash.com/photo-1588276552401-30058a0fe57b?w=400&h=300&fit=crop",
  "Coriander Powder": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Cumin Powder": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Black Pepper": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Cardamom (Green)": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Cloves": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Cinnamon Sticks": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=300&fit=crop",
  "Nutmeg": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Cumin Seeds": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Mustard Seeds": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Fennel Seeds": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Fenugreek Seeds": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Garam Masala": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Sambar Powder": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Kashmiri Red Chilli": "https://images.unsplash.com/photo-1588276552401-30058a0fe57b?w=400&h=300&fit=crop",
  "Rock Salt": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Jaggery (Organic)": "https://images.unsplash.com/photo-1590779033100-9f60705a2f3b?w=400&h=300&fit=crop",

  // Seeds & Planting Material
  "Hybrid Seeds Pack": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Paddy Seeds (HYV)": "https://images.unsplash.com/photo-1586201358815-0dca50cd4f85?w=400&h=300&fit=crop",
  "Wheat Seeds": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
  "Maize Seeds": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop",
  "Tomato Seeds": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Brinjal Seeds": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Chilli Seeds": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Mango Saplings": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Banana Suckers": "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=300&fit=crop",
  "Tissue Culture Banana": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Fertilizers
  "Organic Fertilizer": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Urea (46% N)": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "DAP Fertilizer": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "MOP (Potash)": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "NPK 10:26:26": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Vermicompost": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Neem Cake": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Pesticides & Protection
  "Neem Oil Pesticide": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Biopesticide": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Fungicide Spray": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Farming Tools
  "Hand Sprayer": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Spade": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Hoe": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Sickle": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Pruning Shears": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Wheelbarrow": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Irrigation Equipment
  "Drip Irrigation Kit": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
  "Sprinkler System": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
  "Submersible Pump": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
  "Solar Water Pump": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop",
  "PVC Pipes (4 inch)": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Honey & Bee Products
  "Pure Honey": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",
  "Forest Honey": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",
  "Organic Raw Honey": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",
  "Beeswax": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",
  "Royal Jelly": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",
  "Bee Pollen": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop",

  // Mushrooms
  "Button Mushrooms": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",
  "Oyster Mushrooms": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",
  "Shiitake Mushrooms": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",
  "Portobello Mushrooms": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",
  "Enoki Mushrooms": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",
  "Mushroom Spawn": "https://images.unsplash.com/photo-1552825897-bb7edbd22c6e?w=400&h=300&fit=crop",

  // Medicinal Plants & Herbs
  "Tulsi Plants": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Aloe Vera Plant": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Ashwagandha Root": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",
  "Brahmi Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Moringa Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Neem Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",

  // Flowers & Decoratives
  "Jasmine Flowers": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop",
  "Marigold Flowers": "https://images.unsplash.com/photo-1506806732259-39c2d4ad68b9?w=400&h=300&fit=crop",
  "Rose Flowers": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop",
  "Chrysanthemum": "https://images.unsplash.com/photo-1550258114-b09a81393efd?w=400&h=300&fit=crop",
  "Tuberose": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=300&fit=crop",
  "Orchids": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop",

  // Processed Foods & Pickles
  "Mango Pickle": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=300&fit=crop",
  "Lemon Pickle": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=300&fit=crop",
  "Mixed Vegetable Pickle": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=300&fit=crop",
  "Tomato Ketchup": "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=400&h=300&fit=crop",
  "Coconut Chutney Powder": "https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop",

  // Animal Feed
  "Cattle Feed": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Poultry Feed (Starter)": "https://images.unsplash.com/photo-1587593810167-a84920ea084e?w=400&h=300&fit=crop",
  "Fish Feed Pellets": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop",
  "Green Fodder (Napier)": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",

  // Plantation Crops
  "Green Tea Leaves": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Coffee Beans (Arabica)": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
  "Rubber Latex": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Fibre Crops
  "Raw Cotton": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop",
  "Jute Fibre": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Coir Fibre": "https://images.unsplash.com/photo-1523672556977-3a0e3fad3044?w=400&h=300&fit=crop",

  // Timber & Bamboo
  "Bamboo Poles": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Teak Wood Logs": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
  "Eucalyptus Logs": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",

  // Bakery
  "Sourdough Bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
  "Whole Grain Bread": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",

  // Default fallback
  "default": "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=300&fit=crop"
};

function getProductImage(productName: string): string {
  return productImages[productName] || productImages["default"];
}

export interface IStorage {
  // Products
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct, farmerId: string): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getProductsByFarmer(farmerId: string): Promise<Product[]>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  
  // Cart
  getCart(userId: string): Promise<CartItem[]>;
  addToCart(userId: string, productId: string, quantity: number, options?: { unitPrice?: number; purchaseMode?: "one-time" | "subscribe"; subFrequency?: "weekly" | "biweekly" | "monthly" }): Promise<CartItem>;
  updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(userId: string, itemId: string): Promise<boolean>;
  clearCart(userId: string): Promise<void>;
  mergeGuestCart(guestKey: string, userId: string): Promise<void>;
  cancelStaleStripePendingOrders(userId: string, olderThanMs?: number): Promise<number>;
  
  // Orders
  getOrders(userId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(userId: string, items: OrderItem[], deliveryAddress: string, paymentMethod: string, deliveryMethod?: string, extra?: { shippingChoices?: Order["shippingChoices"]; deliveryAddressStruct?: Order["deliveryAddressStruct"]; shippingTotal?: number }): Promise<Order>;
  setOrderPaymentReference(id: string, provider: "stripe" | "paypal" | "razorpay", reference: string): Promise<Order | undefined>;
  setOrderPaymentTransactionId(id: string, transactionId: string): Promise<Order | undefined>;
  getOrderByPaymentReference(provider: "stripe" | "paypal" | "razorpay", reference: string): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: OrderStatus, note?: string, tracking?: { trackingNumber?: string; carrier?: string; trackingUrl?: string }): Promise<Order | undefined>;
  cancelOrder(id: string, userId: string): Promise<Order | undefined>;
  markOrderRefunded(id: string, refundId?: string, note?: string): Promise<Order | undefined>;
  restoreStockForOrder(order: Order): Promise<void>;
  validateCart(items: { productId: string; quantity: number }[]): Promise<{ ok: boolean; issues: { productId: string; productName: string; reason: "missing" | "insufficient_stock" | "out_of_stock"; available?: number; requested: number }[] }>;
  getSellerOrders(sellerId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;

  // Reviews
  createReview(userId: string, userName: string, userAvatar: string, data: InsertReview): Promise<Review>;
  getProductReviews(productId: string): Promise<Review[]>;
  hasUserReviewedProduct(userId: string, productId: string): Promise<boolean>;
  getUserOrderForProduct(userId: string, productId: string): Promise<Order | undefined>;

  // Farmer stats
  getFarmerStats(farmerId: string): Promise<FarmerStats>;
  getDemandAlerts(location?: string): Promise<DemandAlert[]>;

  // Government Applications
  getSchemeApplications(userId?: string): Promise<SchemeApplication[]>;
  createSchemeApplication(app: Omit<SchemeApplication, "id" | "submittedAt" | "status">): Promise<SchemeApplication>;

  // Land Listings (extended)
  getLandSaleListings(): Promise<LandSaleListing[]>;
  getLandInvestmentListings(): Promise<LandInvestmentListing[]>;
  getCommunityPlotListings(): Promise<CommunityPlotListing[]>;

  // Support
  createSupportTicket(t: Omit<SupportTicket, "id" | "createdAt" | "status">): Promise<SupportTicket>;
  getSupportTickets(userId?: string): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicket[]>;

  // Shipping
  createShipment(s: Omit<Shipment, "id" | "trackingId" | "createdAt" | "updatedAt" | "status"> & { status?: ShipmentStatus }): Promise<Shipment>;
  getShipment(id: string): Promise<Shipment | undefined>;
  getShipmentByTrackingId(trackingId: string): Promise<Shipment | undefined>;
  listUserShipments(userId: string): Promise<Shipment[]>;
  updateShipmentStatus(id: string, status: ShipmentStatus, note?: string, location?: string): Promise<Shipment | undefined>;
  setShipmentCarrierRef(id: string, ref: { externalId?: string; externalTrackingNumber?: string; externalTrackingUrl?: string; labelUrl?: string; adapterName?: string }): Promise<Shipment | undefined>;
  listShipmentsByOrder(orderId: string): Promise<Shipment[]>;
  addShipmentEvent(e: Omit<ShipmentEvent, "id" | "ts">): Promise<ShipmentEvent>;
  listShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private categories: Category[];
  private carts: Map<string, CartItem[]>;
  private orders: Map<string, Order>;
  private orderCreationQueue: Promise<void> = Promise.resolve();
  private reviews: Map<string, Review>;
  private demandAlerts: DemandAlert[];
  private schemeApplications: Map<string, SchemeApplication>;
  private supportTickets: Map<string, SupportTicket>;
  private landSaleListings: LandSaleListing[];
  private landInvestmentListings: LandInvestmentListing[];
  private communityPlotListings: CommunityPlotListing[];
  private shipments: Map<string, Shipment> = new Map();
  private shipmentEvents: Map<string, ShipmentEvent[]> = new Map();

  constructor() {
    this.products = new Map();
    this.categories = categoriesData;
    this.carts = new Map();
    this.orders = new Map();
    this.reviews = new Map();
    this.demandAlerts = this.initializeDemandAlerts();
    this.schemeApplications = new Map();
    this.supportTickets = new Map();
    this.landSaleListings = this.initializeLandSaleListings();
    this.landInvestmentListings = this.initializeLandInvestmentListings();
    this.communityPlotListings = this.initializeCommunityPlotListings();
    
    // Seed products
    this.seedProducts();
  }

  private seedProducts() {
    // UK-based locations for farmers (lat/lng centered around UK)
    const ukLocations = [
      { name: "Essex", lat: 51.7356, lng: 0.4685 },
      { name: "Kent", lat: 51.2787, lng: 0.5217 },
      { name: "Norfolk", lat: 52.6309, lng: 1.2974 },
      { name: "Suffolk", lat: 52.1872, lng: 0.9708 },
      { name: "Cambridgeshire", lat: 52.2053, lng: 0.1218 },
      { name: "Oxfordshire", lat: 51.7520, lng: -1.2577 },
      { name: "Somerset", lat: 51.1050, lng: -2.9262 },
      { name: "Devon", lat: 50.7156, lng: -3.5309 },
      { name: "Yorkshire", lat: 53.9590, lng: -1.0815 },
      { name: "Lincolnshire", lat: 53.2344, lng: -0.5383 },
    ];
    
    productSeedData.forEach((item, index) => {
      const farmerIndex = index % farmerNames.length;
      const farmerName = farmerNames[farmerIndex];
      const ukLoc = ukLocations[farmerIndex % ukLocations.length];
      // Add some randomness to locations within the county
      const lat = ukLoc.lat + (Math.random() - 0.5) * 0.5;
      const lng = ukLoc.lng + (Math.random() - 0.5) * 0.5;
      const priceVariation = item.basePrice * (0.9 + Math.random() * 0.2);
      
      const product: Product = {
        id: `product-${index + 1}`,
        name: item.name,
        description: `Fresh ${item.name.toLowerCase()} directly from the farm. High quality and farm fresh produce from ${ukLoc.name}.`,
        price: parseFloat((priceVariation / 25).toFixed(2)), // Convert ₹ base price to realistic GBP (÷25 ≈ UK farm price)
        unit: item.unit,
        stock: Math.floor(10 + Math.random() * 200),
        categoryId: item.category,
        subcategoryId: item.subcategory,
        farmerId: `farmer-${farmerIndex + 1}`,
        farmerName: farmerName,
        farmerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmerName.replace(' ', '')}`,
        farmerRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        farmerLocation: ukLoc.name,
        farmerLatitude: lat,
        farmerLongitude: lng,
        distance: Math.round((0.5 + Math.random() * 15) * 10) / 10,
        images: [getProductImage(item.name)],
        isOrganic: item.isOrganic,
        isFeatured: Math.random() > 0.7,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: Math.floor(50 + Math.random() * 500),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      this.products.set(product.id, product);
    });
  }

  private initializeDemandAlerts(): DemandAlert[] {
    return [
      { id: "demand-1", productName: "Fresh Potatoes", quantity: "100 kg", priceRange: "₹20-28", unit: "kg", urgency: "high", location: "Mumbai, Maharashtra", timePosted: "2 hours ago", buyerType: "Hotel" },
      { id: "demand-2", productName: "Organic Wheat", quantity: "1000 kg", priceRange: "₹35-42", unit: "kg", urgency: "medium", location: "Delhi NCR", timePosted: "5 hours ago", buyerType: "Flour Mill" },
      { id: "demand-3", productName: "Red Onions", quantity: "500 kg", priceRange: "₹25-35", unit: "kg", urgency: "high", location: "Chennai, Tamil Nadu", timePosted: "1 hour ago", buyerType: "Wholesale Trader" },
      { id: "demand-4", productName: "Tomatoes", quantity: "50 kg", priceRange: "₹35-45", unit: "kg", urgency: "high", location: "Bangalore, Karnataka", timePosted: "30 minutes ago", buyerType: "Restaurant" },
      { id: "demand-5", productName: "Organic Vegetables Mix", quantity: "200 kg", priceRange: "₹60-80", unit: "kg", urgency: "medium", location: "Hyderabad, Telangana", timePosted: "4 hours ago", buyerType: "Supermarket" },
      { id: "demand-6", productName: "Premium Basmati Rice", quantity: "500 kg", priceRange: "₹100-130", unit: "kg", urgency: "low", location: "Kolkata, West Bengal", timePosted: "1 day ago", buyerType: "Exporter" },
      { id: "demand-7", productName: "Fresh Milk", quantity: "1000 L", priceRange: "₹45-55", unit: "liter", urgency: "high", location: "Pune, Maharashtra", timePosted: "45 minutes ago", buyerType: "Dairy Processor" },
      { id: "demand-8", productName: "Green Chillies", quantity: "100 kg", priceRange: "₹70-90", unit: "kg", urgency: "medium", location: "Ahmedabad, Gujarat", timePosted: "3 hours ago", buyerType: "Pickle Manufacturer" },
      { id: "demand-9", productName: "Alphonso Mangoes", quantity: "200 kg", priceRange: "₹300-400", unit: "kg", urgency: "high", location: "Jaipur, Rajasthan", timePosted: "2 hours ago", buyerType: "Premium Retail" },
      { id: "demand-10", productName: "Free Range Eggs", quantity: "500 dozen", priceRange: "₹90-110", unit: "dozen", urgency: "medium", location: "Lucknow, UP", timePosted: "6 hours ago", buyerType: "Bakery Chain" },
      { id: "demand-11", productName: "Turmeric Powder", quantity: "50 kg", priceRange: "₹140-160", unit: "kg", urgency: "low", location: "Indore, MP", timePosted: "1 day ago", buyerType: "Spice Exporter" },
      { id: "demand-12", productName: "Fresh Coconuts", quantity: "1000 pcs", priceRange: "₹25-35", unit: "piece", urgency: "medium", location: "Kochi, Kerala", timePosted: "8 hours ago", buyerType: "Oil Mill" },
    ];
  }

  // Products
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters) {
      if (filters.categoryId) {
        products = products.filter((p) => p.categoryId === filters.categoryId);
      }
      if (filters.subcategoryId) {
        products = products.filter((p) => p.subcategoryId === filters.subcategoryId);
      }
      if (filters.isOrganic) {
        products = products.filter((p) => p.isOrganic);
      }
      if (filters.inStock) {
        products = products.filter((p) => p.stock > 0);
      }
      if (filters.distance) {
        products = products.filter((p) => (p.distance || 0) <= filters.distance!);
      }
      if (filters.rating) {
        products = products.filter((p) => p.rating >= filters.rating!);
      }
      if (filters.minPrice !== undefined) {
        products = products.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        products = products.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        products = products.filter(
          (p) => {
            const category = this.categories.find((item) => item.id === p.categoryId);
            const subcategory = category?.subcategories.find((item) => item.id === p.subcategoryId);
            return [p.name, p.farmerName, p.description, p.farmerLocation, category?.name, subcategory?.name]
              .some((value) => value?.toLowerCase().includes(query));
          }
        );
      }

      if (filters.sortBy) {
        switch (filters.sortBy) {
          case "price_asc":
            products.sort((a, b) => a.price - b.price);
            break;
          case "price_desc":
            products.sort((a, b) => b.price - a.price);
            break;
          case "rating":
            products.sort((a, b) => b.rating - a.rating);
            break;
          case "distance":
            products.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            break;
          case "newest":
            products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            break;
        }
      }
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct, farmerId: string): Promise<Product> {
    const id = randomUUID();
    const farmer = await authStorage.getUser(farmerId);
    const farmerDisplayName =
      farmer?.name ||
      [farmer?.firstName, farmer?.lastName].filter(Boolean).join(" ").trim() ||
      farmer?.email ||
      "Unknown Farmer";

    const product: Product = {
      id,
      ...insertProduct,
      farmerId,
      farmerName: farmerDisplayName,
      farmerAvatar: farmer?.avatar || farmer?.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmerId}`,
      farmerRating: farmer?.rating ?? 4.5,
      farmerLocation: farmer?.location || "Location not specified",
      farmerLatitude: farmer?.latitude ?? 52.3555,
      farmerLongitude: farmer?.longitude ?? -1.1743,
      distance: Math.round(Math.random() * 15 * 10) / 10,
      isOrganic: insertProduct.isOrganic || false,
      isFeatured: false,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updated = { ...product, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async getProductsByFarmer(farmerId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.farmerId === farmerId);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.categories;
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.find((c) => c.id === id);
  }

  // Cart
  async getCart(userId: string): Promise<CartItem[]> {
    const cart = this.carts.get(userId) || [];
    const hydrated = cart
      .map((item) => {
        const product = item.product ?? this.products.get(item.productId);
        return product ? { ...item, product } : undefined;
      })
      .filter((item): item is CartItem => Boolean(item));

    if (hydrated.length !== cart.length || hydrated.some((item, index) => item !== cart[index])) {
      this.carts.set(userId, hydrated);
    }

    return hydrated;
  }

  async addToCart(userId: string, productId: string, quantity: number, options?: { unitPrice?: number; purchaseMode?: "one-time" | "subscribe"; subFrequency?: "weekly" | "biweekly" | "monthly" }): Promise<CartItem> {
    const cart = this.carts.get(userId) || [];
    const product = await this.getProduct(productId);
    
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.stock <= 0) {
      throw new Error(`${product.name} is out of stock`);
    }

    const existingItem = cart.find((item) => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity + quantity > product.stock) {
        throw new Error(`Only ${product.stock} ${product.unit} available for ${product.name}`);
      }
      existingItem.quantity += quantity;
      existingItem.product = product;
      if (options?.purchaseMode) existingItem.purchaseMode = options.purchaseMode;
      if (options?.subFrequency) existingItem.subFrequency = options.subFrequency;
      this.carts.set(userId, cart);
      return existingItem;
    }

    if (quantity > product.stock) {
      throw new Error(`Only ${product.stock} ${product.unit} available for ${product.name}`);
    }

    const newItem: CartItem = {
      id: randomUUID(),
      productId,
      product,
      quantity,
      ...(options?.purchaseMode ? { purchaseMode: options.purchaseMode } : {}),
      ...(options?.subFrequency ? { subFrequency: options.subFrequency } : {}),
    };

    cart.push(newItem);
    this.carts.set(userId, cart);
    return newItem;
  }

  async updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartItem | undefined> {
    const cart = this.carts.get(userId) || [];
    const item = cart.find((i) => i.id === itemId);
    
    if (!item) return undefined;

    if (quantity <= 0) {
      await this.removeFromCart(userId, itemId);
      return undefined;
    }

    const product = await this.getProduct(item.productId);
    if (!product) throw new Error("Product is no longer available");
    if (product.stock <= 0) throw new Error(`${product.name} is out of stock`);
    if (quantity > product.stock) {
      throw new Error(`Only ${product.stock} ${product.unit} available for ${product.name}`);
    }

    item.quantity = quantity;
    item.product = product;
    this.carts.set(userId, cart);
    return item;
  }

  async removeFromCart(userId: string, itemId: string): Promise<boolean> {
    const cart = this.carts.get(userId) || [];
    const index = cart.findIndex((i) => i.id === itemId);
    
    if (index === -1) return false;

    cart.splice(index, 1);
    this.carts.set(userId, cart);
    return true;
  }

  async clearCart(userId: string): Promise<void> {
    this.carts.set(userId, []);
  }

  async mergeGuestCart(guestKey: string, userId: string): Promise<void> {
    if (guestKey === userId) return;
    const guest = this.carts.get(guestKey);
    if (!guest || guest.length === 0) return;
    const user = this.carts.get(userId) || [];
    for (const g of guest) {
      const existing = user.find((i) => i.productId === g.productId);
      if (existing) {
        existing.quantity += g.quantity;
      } else {
        user.push({ ...g, id: randomUUID() });
      }
    }
    this.carts.set(userId, user);
    this.carts.delete(guestKey);
  }

  async cancelStaleStripePendingOrders(userId: string, olderThanMs: number = 30 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;
    for (const order of Array.from(this.orders.values())) {
      if (
        order.buyerId === userId &&
        order.paymentMethod === "stripe" &&
        order.paymentStatus === "pending" &&
        order.status !== "cancelled" &&
        new Date(order.createdAt).getTime() < cutoff
      ) {
        await this.restoreStockForOrder(order);
        order.status = "cancelled";
        order.paymentStatus = "failed";
        order.statusHistory.push({
          status: "cancelled",
          timestamp: new Date().toISOString(),
          note: "Auto-cancelled — checkout abandoned",
        });
        this.orders.set(order.id, order);
        count++;
      }
    }
    return count;
  }

  // Orders
  async getOrders(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.buyerId === userId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(
    userId: string,
    items: OrderItem[],
    deliveryAddress: string,
    paymentMethod: string,
    deliveryMethod: string = "standard",
    extra?: { shippingChoices?: Order["shippingChoices"]; deliveryAddressStruct?: Order["deliveryAddressStruct"]; shippingTotal?: number },
  ): Promise<Order> {
    // Keep stock validation and deduction in one in-process critical section.
    // This prevents two concurrent checkouts from both reserving the last units.
    let releaseQueue!: () => void;
    const previousCreation = this.orderCreationQueue;
    this.orderCreationQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
    await previousCreation;
    try {
      const requestedByProduct = new Map<string, number>();
      for (const item of items) {
        requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
      }

      const canonicalItems: OrderItem[] = [];
      for (const [productId, requested] of Array.from(requestedByProduct.entries())) {
        const product = await this.getProduct(productId);
        if (!product) throw new Error(`Product not found: ${productId}`);
        if (product.stock < requested) {
          throw new Error(`Insufficient stock for ${product.name} (only ${product.stock} available)`);
        }
      }
      for (const item of items) {
        const product = await this.getProduct(item.productId);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        canonicalItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.images?.[0],
          quantity: item.quantity,
          price: product.price,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
        });
      }
    const id = randomUUID();
    const user = await authStorage.getUser(userId);
    const buyerName =
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.email ||
      "Buyer";
    const subtotal = canonicalItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const shippingTotal = parseFloat((extra?.shippingTotal ?? 0).toFixed(2));
    // Day 17 uses a simple, server-owned delivery rule. Carrier quotes, when
    // explicitly supplied by the existing logistics flow, still take precedence.
    const deliveryFee = shippingTotal > 0
      ? 0
      : deliveryMethod === "express"
        ? 5.99
        : subtotal > 0 && subtotal < 30
          ? 4.99
          : 0;
    const tax = parseFloat((subtotal * 0.2).toFixed(2));
    const total = parseFloat((subtotal + deliveryFee + shippingTotal + tax).toFixed(2));
    const now = new Date().toISOString();
    
    const isManualOrder = paymentMethod === "manual";
    const paymentProvider = ["stripe", "paypal", "razorpay"].includes(paymentMethod)
      ? paymentMethod as "stripe" | "paypal" | "razorpay"
      : undefined;
    const order: Order = {
      id,
      orderNumber: generateOrderNumber(),
      buyerId: userId,
      buyerName,
      buyerEmail: user?.email ?? undefined,
      items: canonicalItems,
      status: isManualOrder ? "pending" : "order_placed",
      statusHistory: [
        { status: isManualOrder ? "pending" : "order_placed", timestamp: now, note: "Order received" },
        ...(isManualOrder || paymentProvider
          ? []
          : [{ status: "payment_confirmed" as OrderStatus, timestamp: new Date(Date.now() + 30000).toISOString(), note: "Payment confirmed" }]),
      ],
      subtotal,
      tax,
      deliveryFee,
      shippingTotal: shippingTotal > 0 ? shippingTotal : undefined,
      total,
      deliveryAddress,
      deliveryMethod: (deliveryMethod as Order["deliveryMethod"]) || "standard",
      paymentMethod: paymentMethod as Order["paymentMethod"],
      paymentStatus: isManualOrder ? "manual" : paymentProvider ? "pending" : "paid",
      paymentProvider,
      estimatedDelivery: getEstimatedDelivery(deliveryMethod),
      shippingChoices: extra?.shippingChoices,
      deliveryAddressStruct: extra?.deliveryAddressStruct,
      createdAt: now,
    };

    this.orders.set(id, order);
    
    for (const item of canonicalItems) {
      const product = await this.getProduct(item.productId);
      if (product) {
        await this.updateProduct(item.productId, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }

    return order;
    } finally {
      releaseQueue();
    }
  }

  async setOrderStripeSession(id: string, sessionId: string): Promise<void> {
    const order = this.orders.get(id);
    if (!order) return;
    order.stripeSessionId = sessionId;
    this.orders.set(id, order);
  }

  async getOrderByStripeSession(sessionId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find((o) => o.stripeSessionId === sessionId);
  }

  async markOrderPaid(id: string, paymentIntentId?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    if (order.paymentStatus === "paid") return order;
    order.paymentStatus = "paid";
    if (paymentIntentId) order.stripePaymentIntentId = paymentIntentId;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: "payment_confirmed", timestamp: new Date().toISOString(), note: "Payment confirmed via Stripe" },
    ];
    order.status = "payment_confirmed";
    this.orders.set(id, order);
    return order;
  }

  async setOrderPaymentReference(
    id: string,
    provider: "stripe" | "paypal" | "razorpay",
    reference: string,
  ): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    order.paymentProvider = provider;
    order.paymentReference = reference;
    this.orders.set(id, order);
    return order;
  }

  async setOrderPaymentTransactionId(id: string, transactionId: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    order.paymentTransactionId = transactionId;
    this.orders.set(id, order);
    return order;
  }

  async getOrderByPaymentReference(
    provider: "stripe" | "paypal" | "razorpay",
    reference: string,
  ): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.paymentProvider === provider && order.paymentReference === reference,
    );
  }

  async markOrderPaymentFailed(id: string, note?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    if (order.paymentStatus === "paid") return order;
    await this.restoreStockForOrder(order);
    order.paymentStatus = "failed";
    order.status = "cancelled";
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: "cancelled", timestamp: new Date().toISOString(), note: note || "Payment failed" },
    ];
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    tracking?: { trackingNumber?: string; carrier?: string; trackingUrl?: string },
  ): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    order.status = status;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status, timestamp: new Date().toISOString(), note },
    ];
    if (tracking) {
      if (tracking.trackingNumber !== undefined) order.trackingNumber = tracking.trackingNumber || undefined;
      if (tracking.carrier !== undefined) order.carrier = tracking.carrier || undefined;
      if (tracking.trackingUrl !== undefined) order.trackingUrl = tracking.trackingUrl || undefined;
    }
    this.orders.set(id, order);
    return order;
  }

  async restoreStockForOrder(order: Order): Promise<void> {
    // Idempotent: only restore once per order, regardless of how many cancel/fail
    // events fire (e.g. webhook + stale cleanup + buyer cancel racing each other).
    if (order.stockRestored) return;
    const fresh = this.orders.get(order.id);
    if (fresh?.stockRestored) return;

    for (const item of order.items) {
      const product = await this.getProduct(item.productId);
      if (product) {
        await this.updateProduct(item.productId, {
          stock: product.stock + item.quantity,
        });
      }
    }
    if (fresh) {
      fresh.stockRestored = true;
      this.orders.set(fresh.id, fresh);
    }
    order.stockRestored = true;
  }

  async cancelOrder(id: string, userId: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order || order.buyerId !== userId) return undefined;
    // Allow cancel before the order has been packed/shipped
    const cancellable: OrderStatus[] = ["order_placed", "payment_confirmed", "processing"];
    if (!cancellable.includes(order.status)) return undefined;
    await this.restoreStockForOrder(order);
    return this.updateOrderStatus(id, "cancelled", "Cancelled by buyer");
  }

  async markOrderRefunded(id: string, refundId?: string, note?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    order.paymentStatus = "refunded";
    if (refundId) order.refundId = refundId;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: order.status, timestamp: new Date().toISOString(), note: note || "Refund issued" },
    ];
    this.orders.set(id, order);
    return order;
  }

  async validateCart(items: { productId: string; quantity: number }[]): Promise<{
    ok: boolean;
    issues: { productId: string; productName: string; reason: "missing" | "insufficient_stock" | "out_of_stock"; available?: number; requested: number }[];
  }> {
    const issues: { productId: string; productName: string; reason: "missing" | "insufficient_stock" | "out_of_stock"; available?: number; requested: number }[] = [];
    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
    }
    for (const [productId, requested] of Array.from(requestedByProduct.entries())) {
      const product = await this.getProduct(productId);
      if (!product) {
        issues.push({ productId, productName: productId, reason: "missing", requested });
        continue;
      }
      if (product.stock <= 0) {
        issues.push({ productId, productName: product.name, reason: "out_of_stock", available: 0, requested });
        continue;
      }
      if (product.stock < requested) {
        issues.push({ productId, productName: product.name, reason: "insufficient_stock", available: product.stock, requested });
      }
    }
    return { ok: issues.length === 0, issues };
  }

  async getSellerOrders(sellerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.items.some((item) => item.farmerId === sellerId)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Reviews
  async createReview(userId: string, userName: string, userAvatar: string, data: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = {
      id,
      productId: data.productId,
      buyerId: userId,
      buyerName: userName,
      buyerAvatar: userAvatar || undefined,
      orderId: data.orderId,
      rating: data.rating,
      comment: data.comment,
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(id, review);

    const product = this.products.get(data.productId);
    if (product) {
      const allReviews = await this.getProductReviews(data.productId);
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      product.rating = parseFloat(avg.toFixed(1));
      product.reviewCount = allReviews.length;
      this.products.set(data.productId, product);
    }

    return review;
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter((r) => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async hasUserReviewedProduct(userId: string, productId: string): Promise<boolean> {
    return Array.from(this.reviews.values()).some(
      (r) => r.buyerId === userId && r.productId === productId
    );
  }

  async getUserOrderForProduct(userId: string, productId: string): Promise<Order | undefined> {
    const orders = Array.from(this.orders.values()).filter(
      (o) => o.buyerId === userId && o.status === "delivered" && o.items.some((i) => i.productId === productId)
    );
    return orders[0];
  }

  // Farmer stats
  async getFarmerStats(farmerId: string): Promise<FarmerStats> {
    const products = await this.getProductsByFarmer(farmerId);
    const orders = Array.from(this.orders.values()).filter(
      (o) => o.items.some((item) => item.farmerId === farmerId)
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    const pendingOrders = orders.filter((o) =>
      o.status === "order_placed" ||
      o.status === "payment_confirmed" ||
      o.status === "processing"
    );
    const totalEarnings = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((acc, o) => {
        const farmerItems = o.items.filter((item) => item.farmerId === farmerId);
        return acc + farmerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }, 0);

    return {
      totalEarnings: totalEarnings || 67500,
      todayOrders: todayOrders.length || 8,
      pendingOrders: pendingOrders.length || 3,
      totalProducts: products.length || 12,
      averageRating: products.length > 0 
        ? products.reduce((acc, p) => acc + p.rating, 0) / products.length 
        : 4.7,
    };
  }

  async getDemandAlerts(location?: string): Promise<DemandAlert[]> {
    if (location) {
      return this.demandAlerts.filter((a) => a.location.toLowerCase().includes(location.toLowerCase()));
    }
    return this.demandAlerts;
  }

  private initializeLandSaleListings(): LandSaleListing[] {
    return [
      {
        id: "sale-1",
        ownerName: "George Hartley",
        title: "Prime Arable Land in Cambridgeshire",
        description: "High-yielding grade 2 arable land with excellent drainage. Currently under winter wheat. Perfect for cereal or vegetable production.",
        area: 85,
        areaUnit: "acres",
        location: "Ely, Cambridgeshire",
        latitude: 52.3996,
        longitude: 0.2628,
        soilType: "Black Fen Peat",
        pricePerAcre: 12500,
        totalPrice: 1062500,
        waterAccess: true,
        powerConnection: true,
        roadAccess: true,
        images: ["https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?w=400&h=300&fit=crop"],
        isVerified: true,
      },
      {
        id: "sale-2",
        ownerName: "Rebecca and Tom Ashworth",
        title: "Mixed Farm with Farmhouse — Kent",
        description: "Complete farm package including 4-bed farmhouse, grain store, livestock buildings, and 120 acres of mixed farmland.",
        area: 120,
        areaUnit: "acres",
        location: "Faversham, Kent",
        latitude: 51.3153,
        longitude: 0.8919,
        soilType: "Brickearth loam",
        pricePerAcre: 14000,
        totalPrice: 1680000,
        waterAccess: true,
        powerConnection: true,
        roadAccess: true,
        images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop"],
        isVerified: true,
      },
      {
        id: "sale-3",
        ownerName: "Pemberton Estates",
        title: "Upland Grazing Farm — Welsh Borders",
        description: "Classic upland farm with permanent grassland, improved pastures, and hill land. Excellent livestock unit.",
        area: 310,
        areaUnit: "acres",
        location: "Knighton, Powys",
        latitude: 52.3372,
        longitude: -3.0572,
        soilType: "Silty clay loam",
        pricePerAcre: 5800,
        totalPrice: 1798000,
        waterAccess: true,
        powerConnection: false,
        roadAccess: true,
        images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop"],
        isVerified: false,
      },
    ];
  }

  private initializeLandInvestmentListings(): LandInvestmentListing[] {
    return [
      {
        id: "invest-1",
        title: "Blueberry Farm Investment — Suffolk",
        description: "Co-investment opportunity in established blueberry farm. Year 4 of operation. Contract growing arrangement with major supermarket.",
        location: "Woodbridge, Suffolk",
        latitude: 52.0949,
        longitude: 1.3171,
        area: 15,
        areaUnit: "acres",
        minimumInvestment: 10000,
        projectedReturn: 12.5,
        duration: "5 years",
        currentInvestors: 8,
        maxInvestors: 20,
        cropType: "Blueberries",
        images: ["https://images.unsplash.com/photo-1497534446932-c946e7316ba1?w=400&h=300&fit=crop"],
      },
      {
        id: "invest-2",
        title: "Saffron Micro-Farm Co-op — Lincolnshire",
        description: "Invest in UK's growing saffron industry. High-value crop with stable demand from premium restaurants and health food market.",
        location: "Boston, Lincolnshire",
        latitude: 52.9756,
        longitude: -0.0210,
        area: 5,
        areaUnit: "acres",
        minimumInvestment: 5000,
        projectedReturn: 18.0,
        duration: "3 years",
        currentInvestors: 12,
        maxInvestors: 30,
        cropType: "Saffron",
        images: ["https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=400&h=300&fit=crop"],
      },
      {
        id: "invest-3",
        title: "Vertical Farm Technology Park — Devon",
        description: "Ground-floor investment in state-of-the-art vertical farm producing year-round leafy greens for Bristol and Exeter supply chains.",
        location: "Exeter, Devon",
        latitude: 50.7184,
        longitude: -3.5339,
        area: 2,
        areaUnit: "acres",
        minimumInvestment: 25000,
        projectedReturn: 9.8,
        duration: "7 years",
        currentInvestors: 5,
        maxInvestors: 15,
        cropType: "Leafy Greens (Vertical)",
        images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop"],
      },
    ];
  }

  private initializeCommunityPlotListings(): CommunityPlotListing[] {
    return [
      {
        id: "community-1",
        title: "Riverside Community Allotments — Oxford",
        description: "Award-winning community allotment site beside the River Thames. Full facilities including tool storage, compost bays, and communal growing area.",
        location: "Oxford, Oxfordshire",
        latitude: 51.7520,
        longitude: -1.2577,
        plotSize: 250,
        plotSizeUnit: "sqm",
        monthlyFee: 15,
        availableSlots: 4,
        totalSlots: 40,
        cropsGrown: ["Vegetables", "Herbs", "Soft Fruits", "Flowers"],
        amenities: ["Tool Store", "Water Points", "Toilets", "Car Park", "Wheelchair Access"],
        images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop"],
      },
      {
        id: "community-2",
        title: "Urban Grow Hub — Bristol",
        description: "Innovative urban farm in the heart of Bristol. Raised beds, polytunnel access, and monthly workshops included in membership.",
        location: "Bristol, Somerset",
        latitude: 51.4545,
        longitude: -2.5879,
        plotSize: 120,
        plotSizeUnit: "sqm",
        monthlyFee: 25,
        availableSlots: 8,
        totalSlots: 60,
        cropsGrown: ["Salads", "Tomatoes", "Courgettes", "Herbs", "Brassicas"],
        amenities: ["Raised Beds", "Polytunnel", "Workshop Space", "Café", "Children Area"],
        images: ["https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop"],
      },
      {
        id: "community-3",
        title: "Heritage Orchard Share — Somerset",
        description: "Adopt a heritage apple or pear tree in our working orchard. Receive your tree's harvest plus participation in traditional cider making.",
        location: "Glastonbury, Somerset",
        latitude: 51.1432,
        longitude: -2.7175,
        plotSize: 25,
        plotSizeUnit: "sqm",
        monthlyFee: 10,
        availableSlots: 15,
        totalSlots: 80,
        cropsGrown: ["Heritage Apples", "Pears", "Plums", "Cider Apples"],
        amenities: ["Tree Adoption", "Cider Making Workshops", "Harvest Events", "Picnic Area"],
        images: ["https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop"],
      },
    ];
  }

  // Government Applications
  async getSchemeApplications(userId?: string): Promise<SchemeApplication[]> {
    const all = Array.from(this.schemeApplications.values());
    if (userId) return all.filter((a) => a.userId === userId);
    return all;
  }

  async createSchemeApplication(app: Omit<SchemeApplication, "id" | "submittedAt" | "status">): Promise<SchemeApplication> {
    const id = randomUUID();
    const application: SchemeApplication = {
      ...app,
      id,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    this.schemeApplications.set(id, application);
    return application;
  }

  // Land Listings (extended types)
  async getLandSaleListings(): Promise<LandSaleListing[]> {
    return this.landSaleListings;
  }

  async getLandInvestmentListings(): Promise<LandInvestmentListing[]> {
    return this.landInvestmentListings;
  }

  async getCommunityPlotListings(): Promise<CommunityPlotListing[]> {
    return this.communityPlotListings;
  }

  async createSupportTicket(
    data: Omit<SupportTicket, "id" | "createdAt" | "status">,
  ): Promise<SupportTicket> {
    const ticket: SupportTicket = {
      id: randomUUID(),
      ...data,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.supportTickets.set(ticket.id, ticket);
    return ticket;
  }

  async getSupportTickets(userId?: string): Promise<SupportTicket[]> {
    // Defense-in-depth: if no userId is supplied, return nothing rather than
    // leaking every ticket. Admin tooling should call a dedicated method.
    if (!userId) return [];
    return Array.from(this.supportTickets.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------- Shipping ----------
  private generateTrackingId(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let core = "";
    for (let i = 0; i < 6; i++) core += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `AGS-${core}`;
  }

  async createShipment(
    s: Omit<Shipment, "id" | "trackingId" | "createdAt" | "updatedAt" | "status"> & { status?: ShipmentStatus },
  ): Promise<Shipment> {
    let trackingId = this.generateTrackingId();
    while (Array.from(this.shipments.values()).some((x) => x.trackingId === trackingId)) {
      trackingId = this.generateTrackingId();
    }
    const now = new Date().toISOString();
    const ship: Shipment = {
      ...s,
      id: randomUUID(),
      trackingId,
      status: s.status ?? "booked",
      createdAt: now,
      updatedAt: now,
    };
    this.shipments.set(ship.id, ship);
    const genesis: ShipmentEvent = {
      id: randomUUID(),
      shipmentId: ship.id,
      ts: now,
      status: ship.status,
      location: `${ship.pickup.city}, ${ship.pickup.country}`,
      note: `Shipment booked with ${ship.partnerName}`,
      source: "system",
    };
    this.shipmentEvents.set(ship.id, [genesis]);
    return ship;
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    return this.shipments.get(id);
  }

  async getShipmentByTrackingId(trackingId: string): Promise<Shipment | undefined> {
    const t = trackingId.trim().toUpperCase();
    return Array.from(this.shipments.values()).find((s) => s.trackingId.toUpperCase() === t);
  }

  async listUserShipments(userId: string): Promise<Shipment[]> {
    return Array.from(this.shipments.values())
      .filter((s) => s.senderId === userId || s.receiverId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateShipmentStatus(id: string, status: ShipmentStatus, note?: string, location?: string): Promise<Shipment | undefined> {
    const ship = this.shipments.get(id);
    if (!ship) return undefined;
    ship.status = status;
    ship.updatedAt = new Date().toISOString();
    this.shipments.set(id, ship);
    await this.addShipmentEvent({ shipmentId: id, status, note, location, source: "manual" });
    return ship;
  }

  async listShipmentsByOrder(orderId: string): Promise<Shipment[]> {
    return Array.from(this.shipments.values())
      .filter((s) => s.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async setShipmentCarrierRef(id: string, ref: { externalId?: string; externalTrackingNumber?: string; externalTrackingUrl?: string; labelUrl?: string; adapterName?: string }): Promise<Shipment | undefined> {
    const ship = this.shipments.get(id);
    if (!ship) return undefined;
    if (ref.externalId !== undefined) ship.externalId = ref.externalId;
    if (ref.externalTrackingNumber !== undefined) ship.externalTrackingNumber = ref.externalTrackingNumber;
    if (ref.externalTrackingUrl !== undefined) ship.externalTrackingUrl = ref.externalTrackingUrl;
    if (ref.labelUrl !== undefined) ship.labelUrl = ref.labelUrl;
    if (ref.adapterName !== undefined) ship.adapterName = ref.adapterName;
    ship.updatedAt = new Date().toISOString();
    this.shipments.set(id, ship);
    return ship;
  }

  async addShipmentEvent(e: Omit<ShipmentEvent, "id" | "ts">): Promise<ShipmentEvent> {
    const ev: ShipmentEvent = { ...e, id: randomUUID(), ts: new Date().toISOString() };
    const list = this.shipmentEvents.get(e.shipmentId) ?? [];
    list.push(ev);
    this.shipmentEvents.set(e.shipmentId, list);
    return ev;
  }

  async listShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    return (this.shipmentEvents.get(shipmentId) ?? []).slice().sort((a, b) => a.ts.localeCompare(b.ts));
  }
}

class PersistentCommerceStorage extends MemStorage {
  private seedPromise?: Promise<void>;

  private async ensureCatalog(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = super.getProducts().then((products) => commerceRepository.seedProducts(products));
    }
    await this.seedPromise;
  }

  override async getProducts(filters?: ProductFilters): Promise<Product[]> {
    await this.ensureCatalog();
    let products = await commerceRepository.listProducts();
    if (!filters) return products;
    if (filters.categoryId) products = products.filter((p) => p.categoryId === filters.categoryId);
    if (filters.subcategoryId) products = products.filter((p) => p.subcategoryId === filters.subcategoryId);
    if (filters.isOrganic) products = products.filter((p) => p.isOrganic);
    if (filters.inStock) products = products.filter((p) => p.stock > 0);
    if (filters.distance) products = products.filter((p) => (p.distance ?? 0) <= filters.distance!);
    if (filters.rating) products = products.filter((p) => p.rating >= filters.rating!);
    if (filters.minPrice !== undefined) products = products.filter((p) => p.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) products = products.filter((p) => p.price <= filters.maxPrice!);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const categories = await super.getCategories();
      products = products.filter((product) => {
        const category = categories.find((item) => item.id === product.categoryId);
        const subcategory = category?.subcategories.find((item) => item.id === product.subcategoryId);
        return [
          product.name,
          product.farmerName,
          product.description,
          product.farmerLocation,
          category?.name,
          subcategory?.name,
        ].some((value) => value?.toLowerCase().includes(query));
      });
    }
    if (filters.sortBy === "price_asc") products.sort((a, b) => a.price - b.price);
    if (filters.sortBy === "price_desc") products.sort((a, b) => b.price - a.price);
    if (filters.sortBy === "rating") products.sort((a, b) => b.rating - a.rating);
    if (filters.sortBy === "distance") products.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    if (filters.sortBy === "newest") {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return products;
  }

  override async getProduct(id: string): Promise<Product | undefined> {
    await this.ensureCatalog();
    return commerceRepository.getProduct(id);
  }

  override async createProduct(insertProduct: InsertProduct, farmerId: string): Promise<Product> {
    await this.ensureCatalog();
    const farmer = await authStorage.getUser(farmerId);
    const product: Product = {
      id: randomUUID(),
      ...insertProduct,
      farmerId,
      farmerName:
        farmer?.name ||
        [farmer?.firstName, farmer?.lastName].filter(Boolean).join(" ").trim() ||
        farmer?.email ||
        "Unknown Farmer",
      farmerAvatar:
        farmer?.avatar ||
        farmer?.profileImageUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${farmerId}`,
      farmerRating: farmer?.rating ?? 4.5,
      farmerLocation: farmer?.location || "Location not specified",
      farmerLatitude: farmer?.latitude ?? 52.3555,
      farmerLongitude: farmer?.longitude ?? -1.1743,
      distance: Math.round(Math.random() * 150) / 10,
      isOrganic: insertProduct.isOrganic ?? false,
      isFeatured: false,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    return commerceRepository.saveProduct(product);
  }

  override async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    return commerceRepository.saveProduct({ ...existing, ...updates, id });
  }

  override async deleteProduct(id: string): Promise<boolean> {
    await this.ensureCatalog();
    return commerceRepository.deleteProduct(id);
  }

  override async getProductsByFarmer(farmerId: string): Promise<Product[]> {
    return (await this.getProducts()).filter((product) => product.farmerId === farmerId);
  }

  override async getCart(userId: string): Promise<CartItem[]> {
    await this.ensureCatalog();
    return commerceRepository.getCart(userId);
  }

  override async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    options?: { unitPrice?: number; purchaseMode?: "one-time" | "subscribe"; subFrequency?: "weekly" | "biweekly" | "monthly" },
  ): Promise<CartItem> {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive integer");
    const product = await this.getProduct(productId);
    if (!product) throw new Error("Product not found");
    const existing = (await this.getCart(userId)).find((item) => item.productId === productId);
    if ((existing?.quantity ?? 0) + quantity > product.stock) {
      throw new Error(`Only ${product.stock} ${product.unit} available for ${product.name}`);
    }
    return commerceRepository.putCartItem(userId, product, quantity, options);
  }

  override async updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartItem | undefined> {
    const existing = (await this.getCart(userId)).find((item) => item.id === itemId);
    if (!existing) return undefined;
    if (quantity <= 0) {
      await this.removeFromCart(userId, itemId);
      return undefined;
    }
    if (quantity > existing.product.stock) {
      throw new Error(`Only ${existing.product.stock} ${existing.product.unit} available for ${existing.product.name}`);
    }
    await commerceRepository.updateCartItem(userId, itemId, quantity);
    return { ...existing, quantity };
  }

  override async removeFromCart(userId: string, itemId: string): Promise<boolean> {
    return commerceRepository.removeCartItem(userId, itemId);
  }

  override async clearCart(userId: string): Promise<void> {
    await commerceRepository.clearCart(userId);
  }

  override async mergeGuestCart(guestKey: string, userId: string): Promise<void> {
    const guestItems = await this.getCart(guestKey);
    for (const item of guestItems) {
      const current = (await this.getCart(userId)).find((candidate) => candidate.productId === item.productId);
      const available = Math.max(0, item.product.stock - (current?.quantity ?? 0));
      if (available > 0) {
        await this.addToCart(userId, item.productId, Math.min(item.quantity, available), {
          unitPrice: item.unitPrice,
          purchaseMode: item.purchaseMode,
          subFrequency: item.subFrequency,
        });
      }
    }
    await this.clearCart(guestKey);
  }

  override async createOrder(
    userId: string,
    items: OrderItem[],
    deliveryAddress: string,
    paymentMethod: string,
    deliveryMethod = "standard",
    extra?: { shippingChoices?: Order["shippingChoices"]; deliveryAddressStruct?: Order["deliveryAddressStruct"]; shippingTotal?: number },
  ): Promise<Order> {
    const canonicalItems: OrderItem[] = [];
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      canonicalItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0],
        quantity: item.quantity,
        price: product.price,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
      });
    }
    const user = await authStorage.getUser(userId);
    const subtotal = canonicalItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingTotal = Number((extra?.shippingTotal ?? 0).toFixed(2));
    const deliveryFee = shippingTotal > 0 ? 0 : deliveryMethod === "express" ? 5.99 : subtotal > 0 && subtotal < 30 ? 4.99 : 0;
    const tax = Number((subtotal * 0.2).toFixed(2));
    const total = Number((subtotal + deliveryFee + shippingTotal + tax).toFixed(2));
    const now = new Date().toISOString();
    const isManual = paymentMethod === "manual";
    const provider = ["stripe", "paypal", "razorpay"].includes(paymentMethod)
      ? paymentMethod as Order["paymentProvider"]
      : undefined;
    const order: Order = {
      id: randomUUID(),
      orderNumber: generateOrderNumber(),
      buyerId: userId,
      buyerName: user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Buyer",
      buyerEmail: user?.email ?? undefined,
      items: canonicalItems,
      status: isManual ? "pending" : "order_placed",
      statusHistory: [{ status: isManual ? "pending" : "order_placed", timestamp: now, note: "Order received" }],
      total, subtotal, tax, deliveryFee,
      shippingTotal: shippingTotal || undefined,
      deliveryAddress,
      deliveryMethod: deliveryMethod as Order["deliveryMethod"],
      paymentMethod: paymentMethod as Order["paymentMethod"],
      paymentStatus: isManual ? "manual" : provider ? "pending" : "paid",
      paymentProvider: provider,
      estimatedDelivery: getEstimatedDelivery(deliveryMethod),
      shippingChoices: extra?.shippingChoices,
      deliveryAddressStruct: extra?.deliveryAddressStruct,
      createdAt: now,
    };
    return commerceRepository.createOrder(order);
  }

  override async getOrders(userId: string): Promise<Order[]> {
    return commerceRepository.listOrders("WHERE buyer_id=$1", [userId]);
  }

  override async getOrder(id: string): Promise<Order | undefined> {
    return commerceRepository.getOrder(id);
  }

  override async getAllOrders(): Promise<Order[]> {
    return commerceRepository.listOrders();
  }

  override async getSellerOrders(sellerId: string): Promise<Order[]> {
    return commerceRepository.listOrders(
      "WHERE EXISTS (SELECT 1 FROM commerce_order_items oi WHERE oi.order_id=commerce_orders.id AND oi.seller_id=$1)",
      [sellerId],
    );
  }

  override async setOrderPaymentReference(id: string, provider: "stripe" | "paypal" | "razorpay", reference: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    order.paymentProvider = provider;
    order.paymentReference = reference;
    return commerceRepository.saveOrder(order);
  }

  override async setOrderPaymentTransactionId(id: string, transactionId: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    order.paymentTransactionId = transactionId;
    return commerceRepository.saveOrder(order);
  }

  override async getOrderByPaymentReference(provider: "stripe" | "paypal" | "razorpay", reference: string): Promise<Order | undefined> {
    return (await commerceRepository.listOrders()).find(
      (order) => order.paymentProvider === provider && order.paymentReference === reference,
    );
  }

  override async setOrderStripeSession(id: string, sessionId: string): Promise<void> {
    const order = await this.getOrder(id);
    if (!order) return;
    order.stripeSessionId = sessionId;
    await commerceRepository.saveOrder(order);
  }

  override async getOrderByStripeSession(sessionId: string): Promise<Order | undefined> {
    return (await commerceRepository.listOrders()).find((order) => order.stripeSessionId === sessionId);
  }

  override async markOrderPaid(id: string, paymentIntentId?: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order || order.paymentStatus === "paid") return order;
    order.paymentStatus = "paid";
    order.status = "payment_confirmed";
    order.stripePaymentIntentId = paymentIntentId ?? order.stripePaymentIntentId;
    order.statusHistory.push({ status: "payment_confirmed", timestamp: new Date().toISOString(), note: "Payment confirmed" });
    return commerceRepository.saveOrder(order, true);
  }

  override async markOrderPaymentFailed(id: string, note?: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order || order.paymentStatus === "paid") return order;
    await this.restoreStockForOrder(order);
    order.paymentStatus = "failed";
    order.status = "cancelled";
    order.statusHistory.push({ status: "cancelled", timestamp: new Date().toISOString(), note: note || "Payment failed" });
    return commerceRepository.saveOrder(order, true);
  }

  override async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    tracking?: { trackingNumber?: string; carrier?: string; trackingUrl?: string },
  ): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date().toISOString(), note });
    if (tracking?.trackingNumber !== undefined) order.trackingNumber = tracking.trackingNumber || undefined;
    if (tracking?.carrier !== undefined) order.carrier = tracking.carrier || undefined;
    if (tracking?.trackingUrl !== undefined) order.trackingUrl = tracking.trackingUrl || undefined;
    return commerceRepository.saveOrder(order, true);
  }

  override async restoreStockForOrder(order: Order): Promise<void> {
    await commerceRepository.restoreStock(order);
  }

  override async cancelOrder(id: string, userId: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order || order.buyerId !== userId) return undefined;
    if (!["order_placed", "payment_confirmed", "processing"].includes(order.status)) return undefined;
    await this.restoreStockForOrder(order);
    return this.updateOrderStatus(id, "cancelled", "Cancelled by buyer");
  }

  override async markOrderRefunded(id: string, refundId?: string, note?: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    order.paymentStatus = "refunded";
    order.refundId = refundId ?? order.refundId;
    order.statusHistory.push({ status: order.status, timestamp: new Date().toISOString(), note: note || "Refund issued" });
    return commerceRepository.saveOrder(order, true);
  }

  override async validateCart(items: { productId: string; quantity: number }[]): Promise<{
    ok: boolean;
    issues: { productId: string; productName: string; reason: "missing" | "insufficient_stock" | "out_of_stock"; available?: number; requested: number }[];
  }> {
    const issues: { productId: string; productName: string; reason: "missing" | "insufficient_stock" | "out_of_stock"; available?: number; requested: number }[] = [];
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (!product) issues.push({ productId: item.productId, productName: "Unknown product", reason: "missing", requested: item.quantity });
      else if (product.stock <= 0) issues.push({ productId: item.productId, productName: product.name, reason: "out_of_stock", available: 0, requested: item.quantity });
      else if (product.stock < item.quantity) issues.push({ productId: item.productId, productName: product.name, reason: "insufficient_stock", available: product.stock, requested: item.quantity });
    }
    return { ok: issues.length === 0, issues };
  }

  override async createReview(
    userId: string,
    userName: string,
    userAvatar: string,
    data: InsertReview,
  ): Promise<Review> {
    const review = await super.createReview(userId, userName, userAvatar, data);
    const product = await this.getProduct(data.productId);
    if (product) {
      const reviews = await super.getProductReviews(data.productId);
      const average = reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
      await commerceRepository.saveProduct({
        ...product,
        rating: Number(average.toFixed(1)),
        reviewCount: reviews.length,
      });
    }
    return review;
  }

  override async getUserOrderForProduct(userId: string, productId: string): Promise<Order | undefined> {
    return (await this.getOrders(userId)).find(
      (order) => order.status === "delivered" && order.items.some((item) => item.productId === productId),
    );
  }

  override async getFarmerStats(farmerId: string): Promise<FarmerStats> {
    const [products, orders] = await Promise.all([
      this.getProductsByFarmer(farmerId),
      this.getSellerOrders(farmerId),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalEarnings = orders
      .filter((order) => order.status !== "cancelled")
      .reduce(
        (sum, order) =>
          sum +
          order.items
            .filter((item) => item.farmerId === farmerId)
            .reduce((itemSum, item) => itemSum + item.price * item.quantity, 0),
        0,
      );
    return {
      totalEarnings: totalEarnings || 67500,
      todayOrders: orders.filter((order) => new Date(order.createdAt) >= today).length || 8,
      pendingOrders:
        orders.filter((order) =>
          ["order_placed", "payment_confirmed", "processing"].includes(order.status),
        ).length || 3,
      totalProducts: products.length || 12,
      averageRating:
        products.length > 0
          ? products.reduce((sum, product) => sum + product.rating, 0) / products.length
          : 4.7,
    };
  }

  override async cancelStaleStripePendingOrders(userId: string, olderThanMs = 30 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const stale = (await this.getOrders(userId)).filter(
      (order) => order.paymentProvider === "stripe" && order.paymentStatus === "pending" && new Date(order.createdAt).getTime() < cutoff,
    );
    for (const order of stale) await this.markOrderPaymentFailed(order.id, "Stripe checkout expired");
    return stale.length;
  }
}

export const storage = new PersistentCommerceStorage();
