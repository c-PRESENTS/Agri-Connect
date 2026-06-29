import { z } from "zod";

// Re-export auth-related tables and types so the rest of the app can keep
// importing from "@shared/schema". The canonical users + sessions tables live
// in shared/models/auth.ts (required by Replit Auth).
export * from "./models/auth";

// Categories
export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: Subcategory[];
  buyerVisible?: boolean;
  sellerOnly?: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  parentId: string;
  buyerVisible?: boolean;
}

// Government Scheme Application
export interface SchemeApplication {
  id: string;
  userId: string;
  userName: string;
  schemeId: string;
  schemeName: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submittedAt: string;
  farmerName: string;
  landArea: string;
  location: string;
  phone: string;
  documents: string[];
}

// Land listing extended types
export interface LandSaleListing {
  id: string;
  ownerName: string;
  title: string;
  description: string;
  area: number;
  areaUnit: "acres" | "hectares";
  location: string;
  latitude: number;
  longitude: number;
  soilType: string;
  pricePerAcre: number;
  totalPrice: number;
  waterAccess: boolean;
  powerConnection: boolean;
  roadAccess: boolean;
  images: string[];
  isVerified: boolean;
}

export interface LandInvestmentListing {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  area: number;
  areaUnit: "acres" | "hectares";
  minimumInvestment: number;
  projectedReturn: number;
  duration: string;
  currentInvestors: number;
  maxInvestors: number;
  cropType: string;
  images: string[];
}

export interface CommunityPlotListing {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  plotSize: number;
  plotSizeUnit: "sqm" | "acres";
  monthlyFee: number;
  availableSlots: number;
  totalSlots: number;
  cropsGrown: string[];
  amenities: string[];
  images: string[];
}

// Products
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  categoryId: string;
  subcategoryId: string;
  farmerId: string;
  farmerName: string;
  farmerAvatar: string;
  farmerRating: number;
  farmerLocation: string;
  farmerLatitude: number;
  farmerLongitude: number;
  distance?: number;
  images: string[];
  isOrganic: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  dietaryTags?: string[];
}

export interface InsertProduct {
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  categoryId: string;
  subcategoryId: string;
  farmerId: string;
  images: string[];
  isOrganic?: boolean;
}

// Cart
export type PurchaseMode = "one-time" | "subscribe";
export type SubFrequency = "weekly" | "biweekly" | "monthly";

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice?: number;
  purchaseMode?: PurchaseMode;
  subFrequency?: SubFrequency;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

// Orders
export type OrderStatus = "order_placed" | "payment_confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  items: OrderItem[];
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  total: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  /** Sum of per-farmer carrier shipping prices (Phase-2 cart→shipping). 0 when not used. */
  shippingTotal?: number;
  deliveryAddress: string;
  deliveryMethod: "standard" | "express" | "pickup";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  refundId?: string;
  stockRestored?: boolean;
  /** Per-farmer shipping selections, keyed by farmerId (set during checkout). */
  shippingChoices?: Record<string, { partnerId: string; service: ShipServiceType }>;
  /** Structured drop address captured at checkout — used to auto-create shipments after payment. */
  deliveryAddressStruct?: {
    name: string;
    phone: string;
    email?: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  farmerId: string;
  farmerName: string;
}

// Reviews
export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface InsertReview {
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
}

export const insertReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
});

export const insertProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.number().nonnegative(),
  unit: z.string().min(1).max(40),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1),
  images: z.array(z.string().url()).min(1).max(10),
  isOrganic: z.boolean().optional(),
});

export const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
  unitPrice: z.number().nonnegative().optional(),
  purchaseMode: z.enum(["one-time", "subscribe"]).optional(),
  subFrequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(999),
});

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
}

export const supportTicketSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  topic: z.string().min(1).max(40),
  message: z.string().min(10).max(5000),
});

export const schemeApplicationSchema = z.object({
  schemeId: z.string().min(1).max(100),
  schemeName: z.string().min(1).max(200),
  farmerName: z.string().min(1).max(120),
  landArea: z.string().max(60).optional().default(""),
  location: z.string().max(200).optional().default(""),
  phone: z.string().max(40).optional().default(""),
});

export const shipServiceTypeSchema = z.enum(["same_day", "next_day", "standard", "express", "scheduled", "freight", "cold_chain", "milk_run"]);

export const deliveryAddressStructSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  email: z.string().email().optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  county: z.string().max(120).optional(),
  postcode: z.string().min(1).max(20),
  country: z.string().regex(/^[A-Za-z]{2}$/, "Country must be ISO-2 code").transform((s) => s.toUpperCase()),
});

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    productImage: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    farmerId: z.string().min(1),
    farmerName: z.string().min(1),
  })).min(1),
  deliveryAddress: z.string().min(1).max(500),
  paymentMethod: z.enum(["upi", "card", "cod", "stripe"]),
  deliveryMethod: z.enum(["standard", "express", "pickup"]),
  /** Optional per-farmer shipping selections from cart → shipping handoff. */
  shippingChoices: z.record(z.string(), z.object({
    partnerId: z.string().min(1),
    service: shipServiceTypeSchema,
  })).optional(),
  /** Optional structured drop address (required when shippingChoices is set). */
  deliveryAddressStruct: deliveryAddressStructSchema.optional(),
});

export const cartShippingQuotesRequestSchema = z.object({
  drop: deliveryAddressStructSchema,
});

// Farmer dashboard
export interface FarmerStats {
  totalEarnings: number;
  todayOrders: number;
  pendingOrders: number;
  totalProducts: number;
  averageRating: number;
}

export interface LocalNeed {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  priceRange: string;
  location: string;
  latitude: number;
  longitude: number;
  urgency: "high" | "medium" | "low";
  buyerName: string;
  buyerType: "restaurant" | "retailer" | "individual" | "processor" | "school" | "hospital";
  timePosted: string;
  description?: string;
  deadline?: string;
  category?: string;
}

export interface LocalNeedPost {
  productName: string;
  quantity: number;
  unit: string;
  priceRange: string;
  location: string;
  urgency: "high" | "medium" | "low";
  buyerType: "restaurant" | "retailer" | "individual" | "processor" | "school" | "hospital";
  description?: string;
  deadline?: string;
}

export interface DrawnShape {
  id: string;
  type: "polygon" | "rectangle" | "circle";
  coordinates: [number, number][];
  label?: string;
  area?: number;
  color?: string;
  createdAt: string;
}

export interface DemandAlert {
  id: string;
  productName: string;
  quantity: string;
  priceRange: string;
  unit: string;
  urgency: "high" | "medium" | "low";
  location: string;
  timePosted: string;
  buyerType?: string;
}

// Region/Currency
export interface Region {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  language?: string;
  languageCode?: string;
  timezone?: string;
  phonePrefix?: string;
  continent?: "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania";
  isPopular?: boolean;
}

// AI Detection result
export interface AIDetectionResult {
  productName: string;
  confidence: number;
  suggestedCategory: string;
  suggestedSubcategory: string;
  estimatedQuantity: string;
  qualityGrade: "A" | "B" | "C";
  suggestedPrice: number;
  unit: string;
}

// Search filters
export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  distance?: number;
  rating?: number;
  isOrganic?: boolean;
  inStock?: boolean;
  sortBy?: "price_asc" | "price_desc" | "rating" | "distance" | "newest";
  search?: string;
  dietaryTags?: string[];
}

// Logistics Partners
export interface LogisticsPartner {
  id: string;
  name: string;
  type: "international" | "national" | "hyperlocal" | "cold-chain" | "freight";
  coverage: string;
  rating: number;
  deliveryCount: number;
  features: string[];
  priceRange: string;
  deliveryTime: string;
  coldChain: boolean;
  tracking: boolean;
  insurance: boolean;
}

export interface ShipmentTracking {
  id: string;
  orderId: string;
  partnerId: string;
  status: "pickup_scheduled" | "picked_up" | "quality_check" | "in_transit" | "hub_sorting" | "out_for_delivery" | "delivered";
  currentLocation?: string;
  temperature?: number;
  eta?: string;
  timeline: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  timestamp: string;
  location?: string;
  details?: string;
}

// Land Leasing
export interface LandListing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  title: string;
  description: string;
  type: "agricultural" | "irrigated" | "government" | "specialty" | "short-term";
  area: number;
  areaUnit: "acres" | "hectares";
  location: string;
  latitude: number;
  longitude: number;
  soilType: string;
  topography: "flat" | "gentle-slope" | "hilly";
  condition: "barren" | "fallow" | "cultivated";
  waterSources: string[];
  infrastructure: string[];
  rentPerMonth: number;
  deposit: number;
  minLeaseDuration: number;
  permissions: string[];
  images: string[];
  isVerified: boolean;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface InsertLandListing {
  ownerId: string;
  title: string;
  description: string;
  type: LandListing["type"];
  area: number;
  areaUnit: "acres" | "hectares";
  location: string;
  latitude: number;
  longitude: number;
  soilType: string;
  topography: LandListing["topography"];
  condition: LandListing["condition"];
  waterSources: string[];
  infrastructure: string[];
  rentPerMonth: number;
  deposit: number;
  minLeaseDuration: number;
  permissions: string[];
  images: string[];
}

// Milk Run Logistics
export interface MilkRunPickup {
  time: string;
  farmer: string;
  items: string;
  location: string;
  status: "pending" | "completed" | "in-progress";
}

export interface MilkRunDelivery {
  time: string;
  buyer: string;
  items: string;
  location: string;
  status: "pending" | "completed" | "in-progress";
}

export interface MilkRunRoute {
  id: string;
  name: string;
  vehicle: string;
  vehicleNumber: string;
  driver: string;
  driverPhone: string;
  capacity: number;
  capacityUnit: string;
  usedCapacity: number;
  temperature: number | null;
  pickups: MilkRunPickup[];
  deliveries: MilkRunDelivery[];
  costPerFarmer: number;
  individualCost: number;
  savings: number;
  efficiency: number;
  carbonReduction: number;
  totalTime: string;
  status: "pending" | "in-progress" | "completed";
}

export interface UrgentOrder {
  id: string;
  buyer: string;
  product: string;
  quantity: number;
  unit: string;
  deliveryBy: string;
  location: string;
  revenue: number;
  status: "pending" | "accepted" | "completed";
}

export interface GovernmentLandProgram {
  id: string;
  name: string;
  description: string;
  acresAvailable: number;
  subsidizedRent: number;
  leaseTerm: string;
  benefits: string[];
  eligibility: string[];
}

export interface LeaseAgreement {
  id: string;
  landId: string;
  lesseeId: string;
  lesseeName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositPaid: number;
  status: "active" | "pending" | "expired" | "terminated";
  payments: LeasePayment[];
  activityLog: LeaseActivity[];
}

export interface LeasePayment {
  id: string;
  month: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  paidDate?: string;
}

export interface LeaseActivity {
  id: string;
  date: string;
  description: string;
  type: "payment" | "activity" | "inspection" | "document";
}

// =====================================================================
// Shipping / Logistics (Phase 1)
// =====================================================================
export type ShipmentStatus =
  | "quote_pending"
  | "booked"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "cancelled";

export type ShipServiceType = "standard" | "express" | "cold_chain" | "same_day" | "milk_run";

export interface ShipAddress {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface ShipmentItem {
  name: string;
  category?: string;
  quantity: number;
  weightKg: number;
  coldChain?: boolean;
  fragile?: boolean;
  declaredValue?: number;
}

export interface ShipQuote {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  service: ShipServiceType;
  price: number;
  currency: string;
  etaHours: number;
  etaWindow: string;
  coldChain: boolean;
  co2Kg: number;
  rating: number;
  notes?: string;
  expiresAt: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  ts: string;
  status: ShipmentStatus;
  location?: string;
  lat?: number;
  lng?: number;
  note?: string;
  source: "system" | "partner_api" | "driver_app" | "manual" | "blockchain";
  blockchainTxHash?: string;
}

export interface Shipment {
  id: string;
  trackingId: string;
  orderId?: string;
  senderId: string;
  receiverId?: string;
  partnerId: string;
  partnerName: string;
  service: ShipServiceType;
  pickup: ShipAddress;
  drop: ShipAddress;
  items: ShipmentItem[];
  distanceKm: number;
  weightKg: number;
  price: number;
  currency: string;
  status: ShipmentStatus;
  eta?: string;
  carrierTrackingNumber?: string;
  pickupWindow?: string;
  notes?: string;
  blockchainTxHash?: string;
  notifyEmail?: string;
  notifyWhatsapp?: string;
  // Adapter / 3rd-party carrier handoff
  externalId?: string;            // Carrier's own consignment id
  externalTrackingNumber?: string; // Tracking number to print on label
  externalTrackingUrl?: string;    // Carrier-hosted tracking link
  labelUrl?: string;               // PDF label download URL
  adapterName?: string;            // e.g. "royal-mail", "dpd", "mock"
  createdAt: string;
  updatedAt: string;
}

const shipAddressSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  email: z.string().email().optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postcode: z.string().min(2).max(20),
  country: z.string().regex(/^[A-Z]{2}$/, "Country must be an ISO-2 code (e.g. GB, US, IN)"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const shipmentItemSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  quantity: z.number().int().positive(),
  weightKg: z.number().positive().max(5000),
  coldChain: z.boolean().optional(),
  fragile: z.boolean().optional(),
  declaredValue: z.number().nonnegative().optional(),
});

export const quoteShipmentSchema = z.object({
  pickup: shipAddressSchema,
  drop: shipAddressSchema,
  items: z.array(shipmentItemSchema).min(1).max(50),
  service: z.enum(["standard", "express", "cold_chain", "same_day", "milk_run"]).optional(),
  pickupWindow: z.string().max(120).optional(),
});

export const bookShipmentSchema = quoteShipmentSchema.extend({
  quoteId: z.string().min(1),
  orderId: z.string().optional(),
  notes: z.string().max(500).optional(),
  notifyEmail: z.string().email().optional(),
  notifyWhatsapp: z.string().max(40).optional(),
});

export type QuoteShipmentInput = z.infer<typeof quoteShipmentSchema>;
export type BookShipmentInput = z.infer<typeof bookShipmentSchema>;

// Dietary Tags
export interface DietaryTag {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "diet" | "allergy" | "health" | "lifestyle";
}

export const DIETARY_TAGS: DietaryTag[] = [
  { id: "keto", name: "Keto", icon: "Flame", description: "Low-carb, high-fat diet friendly", category: "diet" },
  { id: "vegan", name: "Vegan", icon: "Leaf", description: "No animal products", category: "diet" },
  { id: "vegetarian", name: "Vegetarian", icon: "Carrot", description: "No meat products", category: "diet" },
  { id: "paleo", name: "Paleo", icon: "Bone", description: "Paleolithic diet friendly", category: "diet" },
  { id: "mediterranean", name: "Mediterranean", icon: "Fish", description: "Mediterranean diet staples", category: "diet" },
  { id: "whole30", name: "Whole30", icon: "Apple", description: "Clean eating compliant", category: "diet" },
  { id: "high-protein", name: "High Protein", icon: "Dumbbell", description: "Gym & bodybuilding friendly", category: "lifestyle" },
  { id: "gluten-free", name: "Gluten-Free", icon: "WheatOff", description: "No gluten containing ingredients", category: "allergy" },
  { id: "dairy-free", name: "Dairy-Free", icon: "MilkOff", description: "No dairy products", category: "allergy" },
  { id: "nut-free", name: "Nut-Free", icon: "Ban", description: "No tree nuts or peanuts", category: "allergy" },
  { id: "diabetic", name: "Diabetic-Friendly", icon: "Heart", description: "Low glycemic, blood sugar friendly", category: "health" },
  { id: "heart-healthy", name: "Heart Healthy", icon: "HeartPulse", description: "Low sodium, heart-healthy", category: "health" },
  { id: "organic", name: "Organic", icon: "Sprout", description: "Certified organic product", category: "lifestyle" },
  { id: "ayurvedic", name: "Ayurvedic", icon: "Sparkles", description: "Traditional Ayurvedic foods", category: "lifestyle" },
];
