import type { Category, Region } from "@shared/schema";

import riceImg from "@assets/stock_images/rice_grains_basmati__70a9349c.jpg";
import wheatImg from "@assets/stock_images/wheat_grains_flour_h_cdf46adb.jpg";
import vegetablesImg from "@assets/stock_images/fresh_vegetables_col_a64326cf.jpg";
import fruitsImg from "@assets/stock_images/fresh_fruits_apples__b7d607b6.jpg";
import dairyImg from "@assets/stock_images/dairy_products_milk__3033afc2.jpg";
import meatImg from "@assets/stock_images/fresh_meat_chicken_r_349370c8.jpg";
import fishImg from "@assets/stock_images/fresh_fish_seafood_m_3fbaedf9.jpg";
import spicesImg from "@assets/stock_images/colorful_spices_turm_cbd23e5f.jpg";
import oilsImg from "@assets/stock_images/cooking_oil_bottles__c5a93db4.jpg";
import coldPressedCoconutOilImg from "@assets/stock_images/cold pressed coconut.jpeg";
import coconutOilImg from "@assets/stock_images/coconut oil.jpg";
import groundnutOilImg from "@assets/stock_images/groundnut oil.jpeg";
import mustardOilImg from "@assets/stock_images/mustard oil.jpeg";
import oliveOilImg from "@assets/stock_images/olive oil.jpeg";
import riceBranOilImg from "@assets/stock_images/rice bran oil.jpeg";
import sesameOilImg from "@assets/stock_images/sesame oil.jpeg";
import sunflowerOilImg from "@assets/stock_images/sunflower oil.jpeg";
import pulsesImg from "@assets/stock_images/pulses_lentils_beans_d1c24845.jpg";
import cowImg from "@assets/stock_images/dairy_cow_farm_cattl_790c48d9.jpg";
import goatImg from "@assets/stock_images/goat_farm_livestock__360f46d7.jpg";
import poultryImg from "@assets/stock_images/poultry_chickens_far_13118711.jpg";
import aquacultureImg from "@assets/stock_images/fish_aquaculture_pon_28a2ae66.jpg";
import seedsImg from "@assets/stock_images/seeds_planting_agric_80a062d9.jpg";
import fertilizerImg from "@assets/stock_images/fertilizer_bags_agri_8c2cc53b.jpg";
import machineryImg from "@assets/stock_images/farm_machinery_tract_06932e0c.jpg";
import irrigationImg from "@assets/stock_images/irrigation_drip_syst_0cae4b44.jpg";
import organicImg from "@assets/stock_images/organic_vegetables_f_4190107b.jpg";
import honeyImg from "@assets/stock_images/honey_bee_products_j_2e467f6b.jpg";
import mushroomImg from "@assets/stock_images/mushrooms_fresh_oyst_cb18a488.jpg";
import herbsImg from "@assets/stock_images/medicinal_herbs_ayur_783bbd90.jpg";
import flowersImg from "@assets/stock_images/flowers_marigold_jas_69c7f387.jpg";
import teaImg from "@assets/stock_images/tea_plantation_green_148551e7.jpg";
import coffeeImg from "@assets/stock_images/coffee_beans_roasted_02cfb903.jpg";
import bambooImg from "@assets/stock_images/bamboo_timber_wood_c_b3706a6e.jpg";
import cottonImg from "@assets/stock_images/cotton_field_fiber_c_a00a071a.jpg";
import hydroponicsImg from "@assets/stock_images/hydroponics_vertical_7934e557.jpg";
import greenhouseImg from "@assets/stock_images/greenhouse_polyhouse_33055f32.jpg";
import toolsImg from "@assets/stock_images/farming_tools_spade__486a2549.jpg";
import picklesImg from "@assets/stock_images/pickles_jars_preserv_94783ad7.jpg";
import snacksImg from "@assets/stock_images/snacks_traditional_n_92674883.jpg";
import bakeryImg from "@assets/stock_images/bakery_bread_fresh_l_2045e5da.jpg";
import milletsImg from "@assets/stock_images/millets_grains_ragi__42d103c9.jpg";
import prawnsImg from "@assets/stock_images/prawns_shrimp_fresh__4df692ae.jpg";
import governmentImg from "@assets/stock_images/government_scheme_su_985e87b1.jpg";
import farmServicesImg from "@assets/stock_images/farm_services_tracto_0f2decf1.jpg";
import animalFeedImg from "@assets/stock_images/animal_feed_cattle_f_9f343c02.jpg";
import protectiveGearImg from "@assets/stock_images/protective_gear_glov_7da06bfc.jpg";
import pesticideImg from "@assets/stock_images/pesticide_spray_agri_070e725c.jpg";
import tomatoImg from "@assets/stock_images/tomatoes_fresh_red_o_7104e8bb.jpg";
import potatoImg from "@assets/stock_images/potatoes_fresh_brown_dea54648.jpg";
import onionImg from "@assets/stock_images/onions_fresh_bulb_ve_414e253d.jpg";
import mangoImg from "@assets/stock_images/mangoes_fresh_tropic_4736b766.jpg";
import bananaImg from "@assets/stock_images/bananas_fresh_yellow_ca5cdcdf.jpg";
import spinachImg from "@assets/stock_images/spinach_fresh_green__866a261d.jpg";
import carrotImg from "@assets/stock_images/carrots_fresh_orange_30b50a89.jpg";
import appleImg from "@assets/stock_images/apples_fresh_red_gre_95720cf8.jpg";
import orangeImg from "@assets/stock_images/oranges_fresh_citrus_b099ab39.jpg";
import grapesImg from "@assets/stock_images/grapes_fresh_green_p_aa9895e4.jpg";

export const categoryImages: Record<string, string> = {
  // ── Top-level categories ──────────────────────────────────────────
  "daily-needs": vegetablesImg,
  "fresh-produce": fruitsImg,
  "livestock": cowImg,
  "inputs-tools": toolsImg,
  "processed": picklesImg,
  "specialty": organicImg,
  "other-agri": cottonImg,
  "supermarket": snacksImg,
  "services": farmServicesImg,
  "government": governmentImg,
  "modern-farming": hydroponicsImg,
  "dietary": organicImg,
  "land-leasing": farmServicesImg,
  "logistics": machineryImg,
  "share-care": bakeryImg,
  "commercial-crops": teaImg,
  "bio-products": herbsImg,

  // ── Daily Needs ──────────────────────────────────────────────────
  "grains": riceImg,
  "rice": riceImg,
  "wheat": wheatImg,
  "millets": milletsImg,
  "pulses": pulsesImg,
  "oils": oilsImg,
  "vegetables": vegetablesImg,
  "fruits": fruitsImg,
  "dairy": dairyImg,
  "meat": meatImg,
  "fish": fishImg,
  "seafood": prawnsImg,
  "spices": spicesImg,
  "flowers": flowersImg,
  "organic-produce": organicImg,
  "wholesale-veg": vegetablesImg,
  "wholesale-fruits": fruitsImg,

  // Livestock & Animals
  "dairy-animals": cowImg,
  "meat-animals": goatImg,
  "poultry": poultryImg,
  "aquaculture": aquacultureImg,
  "packaged": snacksImg,
  "bakery": bakeryImg,

  // ── Inputs & Tools ───────────────────────────────────────────────
  "seeds": seedsImg,
  "fertilizers": fertilizerImg,
  "pesticides": pesticideImg,
  "tools": toolsImg,
  "machinery": machineryImg,
  "irrigation": irrigationImg,
  "protective-gear": protectiveGearImg,
  "animal-equipment": cowImg,
  "sensors": hydroponicsImg,
  "gis": greenhouseImg,
  "remote-sensing": machineryImg,
  "precision": hydroponicsImg,
  "precision-farming": hydroponicsImg,

  // ── Processed & Value-Added ──────────────────────────────────────
  "spice-powders": spicesImg,
  "pickles": picklesImg,
  "health-foods": organicImg,
  "beverages": teaImg,
  "snacks": snacksImg,

  // ── Specialty ────────────────────────────────────────────────────
  "organic": organicImg,
  "medicinal": herbsImg,
  "aromatic": flowersImg,
  "mushrooms": mushroomImg,
  "honey": honeyImg,
  "premium-crops": teaImg,

  // ── Other Agri ───────────────────────────────────────────────────
  "plantation": teaImg,
  "fibre": cottonImg,
  "timber": bambooImg,
  "animal-feed": animalFeedImg,
  "agri-waste": animalFeedImg,

  // ── Supermarket (reuse closest visual matches) ───────────────────
  "food-beverages": snacksImg,
  "personal-care": organicImg,
  "home-kitchen": picklesImg,
  "household": picklesImg,
  "clothing": cottonImg,
  "health-wellness": herbsImg,
  "stationery": bakeryImg,
  "pet-care": animalFeedImg,
  "automotive": machineryImg,
  "baby-kids": dairyImg,
  "sports-outdoors": greenhouseImg,
  "books-media": bakeryImg,
  "gardening": seedsImg,
  "travel": farmServicesImg,
  "religious": flowersImg,
  "party": flowersImg,
  "tech-accessories": hydroponicsImg,
  "allied-products": toolsImg,

  // ── Services ─────────────────────────────────────────────────────
  "farming-services": farmServicesImg,
  "irrigation-services": irrigationImg,
  "transport": machineryImg,
  "processing": picklesImg,
  "advisory": governmentImg,

  // ── Government ───────────────────────────────────────────────────
  "subsidies": governmentImg,
  "insurance": governmentImg,
  "training": governmentImg,
  "finance": governmentImg,

  // ── Modern Farming ───────────────────────────────────────────────
  "hydroponics": hydroponicsImg,
  "aeroponics": hydroponicsImg,
  "vertical": hydroponicsImg,
  "greenhouse": greenhouseImg,

  // ── Dietary / Lifestyle (use produce visuals) ────────────────────
  "keto": meatImg,
  "high-protein": meatImg,
  "vegan": vegetablesImg,
  "gluten-free": organicImg,
  "dairy-free": organicImg,
  "diabetic": herbsImg,
  "heart-healthy": fruitsImg,
  "pregnancy": dairyImg,
  "baby-nutrition": dairyImg,
  "senior-nutrition": herbsImg,
  "paleo": meatImg,
  "mediterranean": oilsImg,
  "whole30": organicImg,
  "ayurvedic": herbsImg,

  // ── Land Leasing ─────────────────────────────────────────────────
  "agricultural-land": farmServicesImg,
  "irrigated-land": irrigationImg,
  "government-land": governmentImg,
  "specialty-land": organicImg,
  "short-term-lease": farmServicesImg,

  // ── Logistics ────────────────────────────────────────────────────
  "international-shipping": machineryImg,
  "national-logistics": machineryImg,
  "hyperlocal-delivery": machineryImg,
  "cold-chain": fishImg,
  "freight-forwarding": machineryImg,
  "milk-run": dairyImg,

  // ── Share & Care ─────────────────────────────────────────────────
  "restaurant-surplus": bakeryImg,
  "home-surplus": vegetablesImg,
  "retail-surplus": snacksImg,
  "production-surplus": fruitsImg,
  "event-surplus": flowersImg,
  "free-food": bakeryImg,

  // ── Commercial Crops ─────────────────────────────────────────────
  "sugar-crops": teaImg,
  "beverage-crops": teaImg,
  "tea": teaImg,
  "coffee": coffeeImg,
  "latex-crops": bambooImg,
  "other-commercial": cottonImg,

  // ── Bio Products ─────────────────────────────────────────────────
  "bioenergy": animalFeedImg,
  "biofertilizers": fertilizerImg,
  "herbal-pharma": herbsImg,

  // ── Individual produce items (used for product cards / chips) ────
  "tomato": tomatoImg,
  "potato": potatoImg,
  "onion": onionImg,
  "mango": mangoImg,
  "banana": bananaImg,
  "spinach": spinachImg,
  "carrot": carrotImg,
  "apple": appleImg,
  "orange": orangeImg,
  "grapes": grapesImg,
  "leafy-greens": spinachImg,
  "root-vegetables": carrotImg,
  "fruiting-vegetables": tomatoImg,
  "gourds": vegetablesImg,
  "pod-vegetables": pulsesImg,
  "flower-vegetables": vegetablesImg,
  "bulb-vegetables": onionImg,
  "citrus-fruits": orangeImg,
  "tropical-fruits": mangoImg,
  "berries": grapesImg,
  "stone-fruits": appleImg,
  "melons": fruitsImg,
  "apples-pears": appleImg,
  "exotic-fruits": fruitsImg,
};

export const categories: Category[] = [
  {
    id: "daily-needs",
    name: "Daily Needs from Farmers",
    icon: "ShoppingBasket",
    buyerVisible: true,
    subcategories: [
      { id: "grains", name: "Food Grains & Cereals", parentId: "daily-needs" },
      { id: "pulses", name: "Pulses & Lentils", parentId: "daily-needs" },
      { id: "oils", name: "Cooking Oils", parentId: "daily-needs" },
      { id: "vegetables", name: "Vegetables (47+ Varieties)", parentId: "daily-needs" },
      { id: "fruits", name: "Fruits (50+ Varieties)", parentId: "daily-needs" },
      { id: "dairy", name: "Dairy & Eggs", parentId: "daily-needs" },
      { id: "meat", name: "Meat & Poultry", parentId: "daily-needs" },
      { id: "fish", name: "Fish & Seafood", parentId: "daily-needs" },
      { id: "spices", name: "Spices & Condiments", parentId: "daily-needs" },
      { id: "organic-produce", name: "Organic Produce", parentId: "daily-needs" },
      { id: "packaged", name: "Ready-to-Eat & Packaged Foods", parentId: "daily-needs" },
      { id: "bakery", name: "Bakery & Breads", parentId: "daily-needs" },
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
      { id: "tools", name: "Farming Tools & Equipment", parentId: "inputs-tools", buyerVisible: true },
      { id: "machinery", name: "Farm Machinery", parentId: "inputs-tools", buyerVisible: true },
      { id: "irrigation", name: "Irrigation Equipment", parentId: "inputs-tools", buyerVisible: true },
      { id: "protective-gear", name: "Protective Gear", parentId: "inputs-tools", buyerVisible: true },
      { id: "animal-equipment", name: "Animal Husbandry Equipment", parentId: "inputs-tools", buyerVisible: true },
      { id: "sensors", name: "Agricultural Sensors & IoT", parentId: "inputs-tools", buyerVisible: true },
      { id: "gis", name: "GIS & Mapping Tools", parentId: "inputs-tools", buyerVisible: true },
      { id: "remote-sensing", name: "Remote Sensing & Drones", parentId: "inputs-tools", buyerVisible: true },
      { id: "precision", name: "Precision Farming Equipment", parentId: "inputs-tools", buyerVisible: true },
    ],
  },
  {
    id: "processed",
    name: "Processed & Value-Added",
    icon: "Package",
    buyerVisible: true,
    subcategories: [
      { id: "spice-powders", name: "Spices & Powders", parentId: "processed" },
      { id: "pickles", name: "Pickles & Preserves", parentId: "processed" },
      { id: "health-foods", name: "Health & Organic Foods", parentId: "processed" },
      { id: "beverages", name: "Beverages", parentId: "processed" },
      { id: "snacks", name: "Snacks & Ready Foods", parentId: "processed" },
    ],
  },
  {
    id: "specialty",
    name: "Specialty & Premium",
    icon: "Award",
    buyerVisible: true,
    subcategories: [
      { id: "organic", name: "Organic Products", parentId: "specialty" },
      { id: "medicinal", name: "Medicinal Plants & Herbs", parentId: "specialty" },
      { id: "aromatic", name: "Aromatic Plants", parentId: "specialty" },
      { id: "mushrooms", name: "Mushrooms", parentId: "specialty" },
      { id: "honey", name: "Honey & Bee Products", parentId: "specialty" },
      { id: "premium-crops", name: "Premium Crops", parentId: "specialty" },
    ],
  },
  {
    id: "other-agri",
    name: "Other Agricultural",
    icon: "Wheat",
    buyerVisible: true,
    subcategories: [
      { id: "plantation", name: "Plantation Crops", parentId: "other-agri" },
      { id: "fibre", name: "Fibre Crops", parentId: "other-agri" },
      { id: "timber", name: "Timber & Bamboo", parentId: "other-agri" },
      { id: "animal-feed", name: "Animal Feed", parentId: "other-agri" },
      { id: "agri-waste", name: "Agri-Waste & By-Products", parentId: "other-agri", buyerVisible: false },
    ],
  },
  {
    id: "supermarket",
    name: "Complete Supermarket",
    icon: "Store",
    buyerVisible: true,
    subcategories: [
      { id: "food-beverages", name: "Food & Beverages", parentId: "supermarket" },
      { id: "personal-care", name: "Personal Care & Hygiene", parentId: "supermarket" },
      { id: "home-kitchen", name: "Home & Kitchen", parentId: "supermarket" },
      { id: "household", name: "Household Items", parentId: "supermarket" },
      { id: "clothing", name: "Clothing & Accessories", parentId: "supermarket" },
      { id: "health-wellness", name: "Health & Wellness", parentId: "supermarket" },
      { id: "stationery", name: "Stationery & Office", parentId: "supermarket" },
      { id: "pet-care", name: "Pet Care", parentId: "supermarket" },
      { id: "automotive", name: "Automotive", parentId: "supermarket" },
      { id: "baby-kids", name: "Baby & Kids", parentId: "supermarket" },
      { id: "sports-outdoors", name: "Sports & Outdoors", parentId: "supermarket" },
      { id: "books-media", name: "Books & Media", parentId: "supermarket" },
      { id: "gardening", name: "Gardening", parentId: "supermarket" },
      { id: "travel", name: "Travel", parentId: "supermarket" },
      { id: "religious", name: "Religious & Cultural", parentId: "supermarket" },
      { id: "party", name: "Party & Celebration", parentId: "supermarket" },
      { id: "tech-accessories", name: "Tech Accessories & Electronics", parentId: "supermarket", buyerVisible: true },
      { id: "allied-products", name: "Allied Products", parentId: "supermarket", buyerVisible: true },
    ],
  },
  {
    id: "services",
    name: "Services",
    icon: "Truck",
    buyerVisible: false,
    subcategories: [
      { id: "farming-services", name: "Farming Services", parentId: "services" },
      { id: "irrigation-services", name: "Irrigation Services", parentId: "services" },
      { id: "transport", name: "Transport Services", parentId: "services" },
      { id: "processing", name: "Processing Services", parentId: "services" },
      { id: "advisory", name: "Advisory Services", parentId: "services" },
    ],
  },
  {
    id: "government",
    name: "Government Schemes",
    icon: "Building2",
    buyerVisible: false,
    subcategories: [
      { id: "subsidies", name: "Input Subsidies", parentId: "government" },
      { id: "insurance", name: "Insurance Schemes", parentId: "government" },
      { id: "training", name: "Training Programs", parentId: "government" },
      { id: "finance", name: "Financial Schemes", parentId: "government" },
    ],
  },
  {
    id: "modern-farming",
    name: "Modern Farming",
    icon: "Sprout",
    buyerVisible: true,
    subcategories: [
      { id: "hydroponics", name: "Hydroponics", parentId: "modern-farming" },
      { id: "aeroponics", name: "Aeroponics", parentId: "modern-farming" },
      { id: "vertical", name: "Vertical Farming", parentId: "modern-farming" },
      { id: "greenhouse", name: "Greenhouse/Polyhouse", parentId: "modern-farming" },
      { id: "precision-farming", name: "Precision Farming Tools", parentId: "modern-farming" },
    ],
  },
  {
    id: "dietary",
    name: "Dietary & Lifestyle",
    icon: "Heart",
    buyerVisible: true,
    subcategories: [
      { id: "keto", name: "Keto & Low-Carb", parentId: "dietary" },
      { id: "high-protein", name: "Gym & Bodybuilding", parentId: "dietary" },
      { id: "vegan", name: "Vegan & Plant-Based", parentId: "dietary" },
      { id: "gluten-free", name: "Gluten-Free", parentId: "dietary" },
      { id: "dairy-free", name: "Dairy-Free & Lactose-Free", parentId: "dietary" },
      { id: "diabetic", name: "Diabetic-Friendly", parentId: "dietary" },
      { id: "heart-healthy", name: "Heart Healthy", parentId: "dietary" },
      { id: "pregnancy", name: "Pregnancy & Lactation", parentId: "dietary" },
      { id: "baby-nutrition", name: "Baby & Infant Nutrition", parentId: "dietary" },
      { id: "senior-nutrition", name: "Senior Nutrition", parentId: "dietary" },
      { id: "paleo", name: "Paleo Diet", parentId: "dietary" },
      { id: "mediterranean", name: "Mediterranean Diet", parentId: "dietary" },
      { id: "whole30", name: "Whole30 & Clean Eating", parentId: "dietary" },
      { id: "ayurvedic", name: "Ayurvedic & Traditional", parentId: "dietary" },
    ],
  },
  {
    id: "land-leasing",
    name: "Land Leasing",
    icon: "MapPin",
    buyerVisible: false,
    subcategories: [
      { id: "agricultural-land", name: "Agricultural Land", parentId: "land-leasing" },
      { id: "irrigated-land", name: "Irrigated Land", parentId: "land-leasing" },
      { id: "government-land", name: "Government Land Programs", parentId: "land-leasing" },
      { id: "specialty-land", name: "Specialty Land", parentId: "land-leasing" },
      { id: "short-term-lease", name: "Short-Term Lease", parentId: "land-leasing" },
    ],
  },
  {
    id: "logistics",
    name: "Logistics & Delivery",
    icon: "Truck",
    buyerVisible: false,
    subcategories: [
      { id: "international-shipping", name: "International Shipping", parentId: "logistics" },
      { id: "national-logistics", name: "National Logistics", parentId: "logistics" },
      { id: "hyperlocal-delivery", name: "Hyperlocal Delivery", parentId: "logistics" },
      { id: "cold-chain", name: "Cold Chain Specialists", parentId: "logistics" },
      { id: "freight-forwarding", name: "Freight Forwarding", parentId: "logistics" },
      { id: "milk-run", name: "Milk Run (Smart Batching)", parentId: "logistics" },
    ],
  },
  {
    id: "share-care",
    name: "Share & Care Community",
    icon: "HeartHandshake",
    buyerVisible: false,
    subcategories: [
      { id: "restaurant-surplus", name: "Restaurant Surplus", parentId: "share-care" },
      { id: "home-surplus", name: "Home Surplus", parentId: "share-care" },
      { id: "retail-surplus", name: "Retail Surplus", parentId: "share-care" },
      { id: "production-surplus", name: "Production Surplus", parentId: "share-care" },
      { id: "event-surplus", name: "Event Surplus", parentId: "share-care" },
      { id: "free-food", name: "Free Food Listings", parentId: "share-care" },
    ],
  },
  {
    id: "commercial-crops",
    name: "Commercial & Industrial Crops",
    icon: "Factory",
    buyerVisible: true,
    subcategories: [
      { id: "sugar-crops", name: "Sugar Crops", parentId: "commercial-crops", buyerVisible: true },
      { id: "beverage-crops", name: "Beverage Crops (Tea/Coffee/Cocoa)", parentId: "commercial-crops", buyerVisible: true },
      { id: "latex-crops", name: "Latex & Resin Crops", parentId: "commercial-crops", buyerVisible: true },
      { id: "other-commercial", name: "Other Commercial Crops", parentId: "commercial-crops", buyerVisible: true },
    ],
  },
  {
    id: "bio-products",
    name: "Bio-Based Products",
    icon: "Sprout",
    buyerVisible: true,
    subcategories: [
      { id: "bioenergy", name: "Bioenergy & Biomass", parentId: "bio-products", buyerVisible: true },
      { id: "biofertilizers", name: "Biofertilizers & Biopesticides", parentId: "bio-products", buyerVisible: true },
      { id: "herbal-pharma", name: "Herbal & Pharma Products", parentId: "bio-products", buyerVisible: true },
    ],
  },
];

export const categoryExamples: Record<string, string[]> = {
  "grains": [
    "White Rice", "Brown Rice", "Basmati Rice", "Red Rice", "Parboiled Rice",
    "Wheat Flour", "Whole Wheat", "Semolina (Suji)",
    "Ragi", "Bajra", "Jowar", "Kambu", "Foxtail Millet", "Little Millet",
    "Maize", "Barley", "Oats", "Sorghum", "Quinoa",
    "Rice Flour", "Gram Flour", "Millet Flour"
  ],
  "pulses": [
    "Chickpea", "Pigeon Pea", "Kidney Beans", "Soya Bean",
    "Toor Dal", "Moong Dal", "Chana Dal", "Urad Dal", "Masoor Dal",
    "Green Gram", "Black Gram", "Peas", "Lentils", "Beans"
  ],
  "oils": [
    "Sunflower Oil", "Groundnut Oil", "Mustard Oil", "Coconut Oil",
    "Olive Oil", "Sesame Oil", "Flaxseed Oil", "Rice Bran Oil",
    "Cold Pressed Coconut Oil", "Mustard Oil (Kachi Ghani)"
  ],
  "vegetables": [
    "Spinach", "Coriander", "Mint", "Lettuce", "Amaranth", "Curry Leaves",
    "Fenugreek", "Moringa Leaves",
    "Potato", "Carrot", "Radish", "Beetroot", "Sweet Potato", "Turnip", "Yam", "Tapioca",
    "Tomato", "Brinjal", "Capsicum", "Okra", "Green Chilli", "Raw Banana", "Zucchini", "Cucumber",
    "Bottle Gourd", "Bitter Gourd", "Snake Gourd", "Ridge Gourd", "Pumpkin", "Ash Gourd", "Pointed Gourd", "Ivy Gourd",
    "Green Beans", "Green Peas", "Broad Beans", "French Beans", "Cluster Beans", "Drumstick",
    "Cauliflower", "Broccoli", "Artichoke",
    "Onion", "Garlic", "Ginger", "Spring Onion", "Shallots", "Leek",
    "Cabbage", "Asparagus", "Celery", "Kohlrabi"
  ],
  "fruits": [
    "Alphonso Mango", "Kesar Mango", "Banana", "Red Banana", "Papaya", "Pineapple", "Guava", "Jackfruit", "Sapota", "Tender Coconut",
    "Orange", "Lemon", "Sweet Lime", "Grapefruit", "Pomelo", "Kinnow", "Mandarin",
    "Strawberry", "Blueberry", "Raspberry", "Blackberry", "Cranberry", "Mulberry",
    "Watermelon", "Muskmelon", "Honeydew Melon",
    "Plum", "Peach", "Cherry", "Apricot", "Nectarine",
    "Shimla Apple", "Kashmiri Apple", "Green Apple", "Pear", "Persimmon",
    "Green Grapes", "Black Grapes", "Red Grapes", "Seedless Grapes",
    "Pomegranate", "Custard Apple", "Jamun", "Amla", "Dates", "Litchi",
    "Kiwi", "Dragon Fruit", "Avocado", "Passion Fruit", "Rambutan", "Longan", "Star Fruit", "Fig"
  ],
  "dairy": [
    "Cow Milk", "Buffalo Milk", "Goat Milk", "Camel Milk",
    "Curd (Yogurt)", "Butter", "Ghee", "Paneer", "Cheese",
    "Fresh Cream", "Milk Cream",
    "Farm Eggs", "Country Chicken Eggs", "Duck Eggs", "Quail Eggs"
  ],
  "meat": [
    "Broiler Chicken", "Country Chicken", "Chicken Legs", "Chicken Breast", "Chicken Wings",
    "Goat Meat", "Lamb Meat", "Mutton Pieces",
    "Pork Meat", "Pork Pieces",
    "Rabbit Meat", "Quail Meat"
  ],
  "fish": [
    "Rohu", "Catla", "Mrigal", "Tilapia", "Pangasius", "Common Carp",
    "Pomfret", "Mackerel", "Sardines", "Tuna", "Seer Fish", "King Fish",
    "Prawns", "Shrimp", "Crabs", "Lobsters", "Squid", "Cuttlefish",
    "Sundried Fish"
  ],
  "spices": [
    "Turmeric Powder", "Red Chilli Powder", "Coriander Powder", "Cumin Powder",
    "Black Pepper", "Cardamom", "Clove", "Cinnamon", "Nutmeg", "Mace",
    "Cumin Seeds", "Fenugreek Seeds", "Mustard Seeds", "Fennel Seeds",
    "Dry Red Chillies", "Green Chillies", "Byadgi Chilli", "Kashmiri Chilli",
    "Garam Masala", "Sambar Powder", "Rasam Powder", "Curry Powder",
    "Ginger-Garlic Paste", "Tomato Puree", "Tamarind Paste",
    "Iodized Salt", "Rock Salt", "Sugar", "Jaggery", "Honey"
  ],
  "packaged": [
    "Chips", "Biscuits", "Cookies", "Noodles", "Pasta",
    "Cornflakes", "Oats", "Poha", "Upma Mix",
    "Sweets", "Chocolates", "Toffees", "Ice Cream",
    "Juice", "Soft Drinks", "Energy Drinks", "Health Drinks",
    "Ready-to-Eat Curries", "Instant Mixes"
  ],
  "bakery": [
    "White Bread", "Brown Bread", "Multigrain Bread", "Buns", "Rolls",
    "Cakes", "Pastries", "Cookies", "Donuts",
    "Yeast", "Baking Powder", "Baking Soda"
  ],
  "wholesale-veg": [
    "All 47+ Vegetable Varieties in Bulk", "Organic Vegetables",
    "Leafy Greens", "Root Vegetables", "Gourds", "Pod Vegetables", "Premium Seasonal Vegetables"
  ],
  "wholesale-fruits": [
    "All 50+ Fruit Varieties in Bulk", "Organic Fruits",
    "Tropical Fruits", "Citrus Fruits", "Berries", "Stone Fruits", "Exotic Fruits"
  ],
  "flowers": [
    "Jasmine", "Marigold", "Rose", "Chrysanthemum", "Tuberose",
    "Orchids", "Gerbera", "Carnation", "Lilies", "Tulips",
    "Bouquets", "Garlands", "Flower Arrangements",
    "Dry Flowers", "Potpourri"
  ],
  "dairy-animals": [
    "Jersey Cow", "Holstein Friesian", "Indigenous Breeds", "Crossbreeds",
    "Murrah Buffalo", "Surti Buffalo", "Jaffarabadi", "Nili Ravi",
    "Saanen Goat", "Alpine Goat", "Jamunapari"
  ],
  "meat-animals": [
    "Boer Goat", "Black Bengal Goat",
    "Sheep for Mutton",
    "Pigs for Pork",
    "Broiler Chicks", "Layer Chicks"
  ],
  "poultry": [
    "Broiler Chicks", "Layer Chicks", "Country Chicken",
    "Ducks", "Geese", "Turkey", "Quail",
    "Guinea Fowl", "Emu"
  ],
  "aquaculture": [
    "Rohu Fingerlings", "Catla Fingerlings", "Mrigal Fingerlings", "Tilapia", "Pangasius",
    "Vannamei Shrimp", "Tiger Prawn Post-Larvae",
    "Goldfish", "Koi", "Guppies", "Mollies", "Angel Fish",
    "Fishing Nets", "Fish Feed", "Aerators", "Tanks"
  ],
  "seeds": [
    "Paddy Seeds", "Wheat Seeds", "Maize Seeds", "Pulses Seeds",
    "Tomato Seeds", "Brinjal Seeds", "Chilli Seeds", "All Vegetable Seeds",
    "Mango Plants", "Banana Plants", "Citrus Plants", "All Fruit Plants",
    "Seasonal Flower Seeds", "Perennial Flower Seeds",
    "Tissue Culture Banana", "Tissue Culture Sugarcane"
  ],
  "fertilizers": [
    "Urea", "DAP", "MOP", "NPK", "SSP",
    "Vermicompost", "Farmyard Manure", "Compost", "Green Manure",
    "Rhizobium", "Azospirillum", "Azotobacter", "PSB", "VAM",
    "Zinc", "Boron", "Iron", "Manganese", "Copper"
  ],
  "pesticides": [
    "Insecticides", "Fungicides", "Herbicides",
    "Neem-based Pesticides", "Microbial Pesticides",
    "Plant Growth Regulators"
  ],
  "tools": [
    "Spade", "Shovel", "Hoe", "Rake", "Sickle", "Pruning Knife", "Secateurs",
    "Axe", "Billhook", "Machete",
    "Measuring Tape", "Moisture Meter", "pH Meter",
    "Basket", "Bucket", "Wheelbarrow"
  ],
  "machinery": [
    "Tractors", "Plough", "Harrow", "Cultivator",
    "Combine Harvester", "Reaper", "Thresher",
    "Winnower", "Grinder", "Mill",
    "Seed Drill", "Transplanter"
  ],
  "irrigation": [
    "Drip Lines", "Emitters", "Filters", "Valves",
    "Sprinklers", "Pipes", "Pumps",
    "Submersible Pumps", "Centrifugal Pumps", "Solar Pumps",
    "PVC Pipes", "HDPE Pipes", "Fittings"
  ],
  "protective-gear": [
    "Gloves", "Boots", "Hats", "Raincoats", "Aprons",
    "Masks", "Goggles", "Ear Protection", "First Aid Kits",
    "Silos", "Grain Bags", "Storage Bins", "Containers"
  ],
  "animal-equipment": [
    "Hand Milking Equipment", "Machine Milking Equipment",
    "Feed Grinder", "Mixer", "Troughs",
    "Shed Materials", "Fencing", "Waterers",
    "Veterinary Kit", "Weighing Scale"
  ],
  "spice-powders": [
    "Whole Spices", "Powdered Spices", "Spice Blends",
    "Saffron", "Vanilla", "Star Anise"
  ],
  "pickles": [
    "Mango Pickle", "Lemon Pickle", "Amla Pickle",
    "Mixed Pickle", "Chilli Pickle", "Garlic Pickle",
    "Jams", "Marmalades", "Squashes", "Syrups",
    "Coconut Chutney", "Tomato Chutney", "Mint Chutney"
  ],
  "health-foods": [
    "Organic Cereals", "Organic Pulses", "Organic Spices",
    "Millet Flours", "Millet Snacks",
    "Spirulina", "Chia Seeds", "Flax Seeds", "Quinoa",
    "Protein Powders", "Herbal Supplements"
  ],
  "beverages": [
    "Green Tea", "Black Tea", "Herbal Tea",
    "Coffee Beans", "Ground Coffee", "Instant Coffee",
    "Fresh Juices", "Packaged Juices", "Concentrates",
    "Herbal Infusions", "Ayurvedic Drinks"
  ],
  "snacks": [
    "Murukku", "Mixture", "Chakli", "Seedai",
    "Roasted Nuts", "Diet Snacks",
    "Traditional Sweets", "Chocolates",
    "Instant Mix for Idli", "Instant Mix for Dosa"
  ],
  "organic": [
    "Organic Fruits", "Organic Vegetables",
    "Organic Grains", "Organic Pulses",
    "Organic Spices", "Organic Herbs",
    "Certified Organic Products"
  ],
  "medicinal": [
    "Tulsi", "Aloe Vera", "Mint", "Curry Leaves",
    "Ashwagandha", "Brahmi", "Shatavari", "Giloy",
    "Herbal Powders", "Capsules", "Tablets",
    "Medicinal Roots", "Bark", "Leaves", "Flowers"
  ],
  "aromatic": [
    "Lemongrass", "Vetiver", "Palmarosa",
    "Jasmine", "Tuberose", "Rose",
    "Mint", "Basil", "Rosemary", "Lavender"
  ],
  "mushrooms": [
    "Button Mushroom", "Oyster Mushroom",
    "Shiitake", "Portobello", "Enoki",
    "Mushroom Spawn",
    "Sun-dried Mushrooms"
  ],
  "honey": [
    "Multiflora Honey", "Single Flower Honey",
    "Forest Honey", "Organic Honey", "Manuka Honey",
    "Beeswax", "Propolis", "Royal Jelly", "Bee Pollen"
  ],
  "premium-crops": [
    "Kashmiri Saffron", "Iranian Saffron",
    "Vanilla Beans", "Vanilla Extract",
    "Premium Cardamom", "Premium Cinnamon", "Premium Clove"
  ],
  "plantation": [
    "Green Leaf Tea", "Processed Tea",
    "Coffee Cherries", "Processed Coffee",
    "Rubber Sheets", "Latex",
    "Tender Coconut", "Copra", "Coconut Oil"
  ],
  "fibre": [
    "Raw Cotton", "Cotton Bales",
    "Raw Jute", "Jute Products",
    "Coir Fibre", "Coir Products",
    "Hemp", "Flax"
  ],
  "timber": [
    "Teak Wood", "Eucalyptus", "Mahogany", "Rosewood",
    "Bamboo Poles", "Bamboo Products",
    "Plywood", "Furniture", "Crafts"
  ],
  "animal-feed": [
    "Cattle Feed Concentrates", "Supplements", "Mineral Mixture",
    "Poultry Starter Feed", "Grower Feed", "Layer Feed",
    "Fish Floating Pellets", "Sinking Pellets",
    "Napier Grass", "Sorghum Fodder", "Maize Fodder"
  ],
  "agri-waste": [
    "Rice Husk", "Wheat Straw", "Sugarcane Bagasse",
    "Groundnut Cake", "Mustard Cake", "Coconut Cake",
    "Molasses", "Bran", "Husk"
  ],
  "farming-services": [
    "Ploughing", "Levelling", "Tilling",
    "Sowing", "Transplanting",
    "Manual Harvesting", "Machine Harvesting",
    "Threshing", "Winnowing", "Milling"
  ],
  "irrigation-services": [
    "Drip Irrigation Setup", "Sprinkler Setup",
    "Repair Services", "Cleaning Services",
    "Borewell Drilling", "Pond Digging"
  ],
  "transport": [
    "Truck Transport", "Tractor Transport", "Mini Truck",
    "Livestock Transport",
    "Refrigerated Transport"
  ],
  "processing": [
    "Rice Mill", "Flour Mill", "Oil Mill",
    "Oil Extraction", "Juice Extraction",
    "Weighing", "Packing", "Labeling",
    "Cold Storage", "Warehousing"
  ],
  "advisory": [
    "Soil Sample Analysis",
    "Expert Crop Advice", "Planning",
    "Price Trends", "Demand Forecasting",
    "Government Scheme Assistance"
  ],
  "subsidies": [
    "Certified Seeds Subsidy", "Hybrid Seeds Subsidy",
    "Urea Subsidy", "DAP Subsidy", "Other Fertilizers",
    "Tractors Subsidy", "Implements", "Tools",
    "Drip Irrigation", "Sprinkler", "Pumps"
  ],
  "insurance": [
    "PMFBY Crop Insurance", "Other Crop Insurance",
    "Cattle Insurance", "Poultry Insurance", "Fish Insurance",
    "Machinery Insurance", "Tools Insurance",
    "Farmer Health Schemes"
  ],
  "training": [
    "Organic Farming Training", "Precision Farming",
    "Processing Skills", "Packaging", "Marketing",
    "Women Farmer Programs", "Youth Programs",
    "Mobile App Training", "Online Marketing"
  ],
  "finance": [
    "Kisan Credit Card", "Farm Loans",
    "Subsidy Grants", "Project Grants",
    "MSP Information", "Procurement",
    "E-NAM", "Direct Marketing"
  ],
  "hydroponics": [
    "NFT Systems", "DWC Systems", "Ebb & Flow",
    "Lettuce", "Herbs", "Strawberries", "Leafy Greens",
    "Hydroponic Nutrients", "pH Controllers",
    "Grow Lights", "Pumps", "Tanks"
  ],
  "aeroponics": [
    "Aeroponic Towers", "Fogponics Systems",
    "High-value Crops", "Root Vegetables",
    "Aeroponic Nutrients", "Misting Systems"
  ],
  "vertical": [
    "Vertical Towers", "Stacked Systems",
    "LED Grow Lights", "Climate Control",
    "Space-efficient Farming"
  ],
  "greenhouse": [
    "Polyhouse Structures", "Climate Control Systems",
    "Shade Nets", "Mulching Sheets",
    "Protected Cultivation Equipment"
  ],
  "precision": [
    "GPS Guidance Systems", "Variable Rate Technology",
    "Soil Sensors", "Crop Sensors",
    "Drone Monitoring", "IoT Devices"
  ],
  "food-beverages": [
    "Groceries", "Snacks", "Beverages", "Dairy", "Frozen Foods"
  ],
  "personal-care": [
    "Bath & Shower", "Oral Care", "Skin Care", "Hair Care",
    "Shaving & Grooming", "Feminine Hygiene", "Baby Care"
  ],
  "home-kitchen": [
    "Kitchen Appliances", "Cookware", "Utensils",
    "Cleaning Supplies", "Home Organization"
  ],
  "household": [
    "Bedding & Linen", "Furnishings",
    "Electrical & Electronics", "Tools & Hardware"
  ],
  "clothing": [
    "Men's Clothing", "Women's Clothing", "Kids Clothing",
    "Footwear", "Accessories"
  ],
  "health-wellness": [
    "Medicines", "Vitamins & Supplements",
    "Personal Care Devices", "Fitness Equipment"
  ],
  "stationery": [
    "Writing Instruments", "Paper Products",
    "Art & Craft", "Office Supplies"
  ],
  "pet-care": [
    "Pet Food", "Pet Accessories", "Pet Grooming & Health"
  ],
  "automotive": [
    "Car Care", "Two-Wheeler", "Safety Equipment"
  ],
  "baby-kids": [
    "Baby Gear", "Feeding", "Play & Learning", "Safety"
  ],
  "sports-outdoors": [
    "Sports Equipment", "Fitness", "Outdoor Gear"
  ],
  "books-media": [
    "Books", "Music & Movies", "Magazines & Newspapers"
  ],
  "gardening": [
    "Plants & Seeds", "Soil & Fertilizers", "Garden Decor"
  ],
  "travel": [
    "Luggage", "Travel Accessories", "Outdoor Gear"
  ],
  "religious": [
    "Worship Items", "Festival Items"
  ],
  "party": [
    "Decorations", "Gifts", "Entertainment"
  ],
  "keto": [
    "Avocados", "MCT Oil", "Coconut Oil", "Ghee", "Cheese", "Eggs",
    "Spinach", "Broccoli", "Cauliflower", "Almonds", "Walnuts",
    "Stevia", "Erythritol", "Monk Fruit Sweetener"
  ],
  "high-protein": [
    "Chicken Breast", "Turkey", "Eggs", "Whey Protein", "Plant Protein",
    "Greek Yogurt", "Cottage Cheese", "Tuna", "Salmon",
    "Quinoa", "Edamame", "Lentils", "BCAAs", "Mass Gainers"
  ],
  "vegan": [
    "Tofu", "Tempeh", "Seitan", "Plant Milk", "Vegan Cheese",
    "Nutritional Yeast", "Chia Seeds", "Hemp Seeds", "Spirulina",
    "Beyond Meat", "Jackfruit", "Almond Milk", "Oat Milk"
  ],
  "gluten-free": [
    "Rice", "Quinoa", "Millet", "Amaranth", "Almond Flour",
    "Coconut Flour", "Chickpea Flour", "Rice Cakes", "Corn Chips",
    "Gluten-Free Bread", "Gluten-Free Pasta"
  ],
  "dairy-free": [
    "Almond Milk", "Oat Milk", "Coconut Milk", "Soy Milk",
    "Coconut Yogurt", "Almond Yogurt", "Dairy-Free Ice Cream",
    "A2 Milk", "Lactose-Free Products"
  ],
  "diabetic": [
    "Steel-Cut Oats", "Legumes", "Leafy Greens", "Nuts", "Seeds",
    "Sugar-Free Sweeteners", "High-Fiber Foods", "Dark Chocolate",
    "Portion-Controlled Meals"
  ],
  "heart-healthy": [
    "Salmon", "Mackerel", "Walnuts", "Flaxseed", "Olive Oil",
    "Avocado Oil", "Whole Grains", "Barley", "Brown Rice",
    "Low-Sodium Products", "Berries", "Dark Leafy Greens"
  ],
  "pregnancy": [
    "Spinach", "Lentils", "Fortified Cereals", "Red Meat",
    "Beans", "Leafy Greens", "Fatty Fish", "Prenatal Vitamins",
    "Fenugreek", "Oats", "Fennel"
  ],
  "baby-nutrition": [
    "Baby Purees", "Baby Formula Stage 1", "Baby Formula Stage 2",
    "Teething Rusks", "Organic Baby Food", "Baby Cereals"
  ],
  "senior-nutrition": [
    "Easy-to-Digest Soups", "Porridge", "High-Calcium Foods",
    "Fiber-Rich Foods", "Vitamin D Supplements", "B12 Supplements",
    "Soft Foods", "Pureed Options"
  ],
  "paleo": [
    "Grass-Fed Beef", "Wild-Caught Fish", "Organic Eggs",
    "Raw Nuts", "Seeds", "Sweet Potatoes", "Berries"
  ],
  "mediterranean": [
    "Extra Virgin Olive Oil", "Fresh Fish", "Seafood",
    "Bulgur", "Farro", "Chickpeas", "Fresh Vegetables",
    "Fruits", "Nuts", "Herbs"
  ],
  "whole30": [
    "Unprocessed Meats", "Organic Vegetables", "Organic Fruits",
    "Avocado", "Healthy Nuts", "Compliant Condiments"
  ],
  "ayurvedic": [
    "Sattvic Foods", "Ashwagandha", "Triphala", "Amaranth",
    "Foxtail Millet", "Ginger", "Turmeric", "Cumin"
  ],
};

export const productData: Record<string, { name: string; price: number; unit: string; image?: string }[]> = {
  "grains": [
    { name: "White Rice", price: 45, unit: "kg", image: riceImg },
    { name: "Brown Rice", price: 65, unit: "kg", image: riceImg },
    { name: "Basmati Rice", price: 120, unit: "kg", image: riceImg },
    { name: "Red Rice", price: 80, unit: "kg", image: riceImg },
    { name: "Parboiled Rice", price: 50, unit: "kg", image: riceImg },
    { name: "Wheat Flour", price: 35, unit: "kg", image: wheatImg },
    { name: "Whole Wheat", price: 40, unit: "kg", image: wheatImg },
    { name: "Semolina (Suji)", price: 45, unit: "kg", image: wheatImg },
    { name: "Ragi", price: 55, unit: "kg", image: milletsImg },
    { name: "Bajra", price: 45, unit: "kg", image: milletsImg },
    { name: "Jowar", price: 50, unit: "kg", image: milletsImg },
    { name: "Foxtail Millet", price: 70, unit: "kg", image: milletsImg },
    { name: "Little Millet", price: 75, unit: "kg", image: milletsImg },
    { name: "Maize", price: 30, unit: "kg", image: riceImg },
    { name: "Barley", price: 40, unit: "kg", image: wheatImg },
    { name: "Oats", price: 85, unit: "kg", image: wheatImg },
    { name: "Quinoa", price: 350, unit: "kg", image: milletsImg },
  ],
  "pulses": [
    { name: "Chickpea", price: 80, unit: "kg", image: pulsesImg },
    { name: "Pigeon Pea", price: 90, unit: "kg", image: pulsesImg },
    { name: "Kidney Beans", price: 120, unit: "kg", image: pulsesImg },
    { name: "Soya Bean", price: 70, unit: "kg", image: pulsesImg },
    { name: "Toor Dal", price: 110, unit: "kg", image: pulsesImg },
    { name: "Moong Dal", price: 120, unit: "kg", image: pulsesImg },
    { name: "Chana Dal", price: 85, unit: "kg", image: pulsesImg },
    { name: "Urad Dal", price: 130, unit: "kg", image: pulsesImg },
    { name: "Masoor Dal", price: 95, unit: "kg", image: pulsesImg },
    { name: "Green Gram", price: 100, unit: "kg", image: pulsesImg },
    { name: "Black Gram", price: 110, unit: "kg", image: pulsesImg },
    { name: "Peas", price: 75, unit: "kg", image: pulsesImg },
    { name: "Lentils", price: 90, unit: "kg", image: pulsesImg },
  ],
  "vegetables": [
    { name: "Tomato", price: 40, unit: "kg", image: tomatoImg },
    { name: "Potato", price: 25, unit: "kg", image: potatoImg },
    { name: "Onion", price: 35, unit: "kg", image: onionImg },
    { name: "Carrot", price: 45, unit: "kg", image: carrotImg },
    { name: "Spinach", price: 30, unit: "bunch", image: spinachImg },
    { name: "Garlic", price: 150, unit: "kg", image: vegetablesImg },
    { name: "Ginger", price: 120, unit: "kg", image: vegetablesImg },
    { name: "Cabbage", price: 25, unit: "kg", image: vegetablesImg },
    { name: "Cauliflower", price: 40, unit: "piece", image: vegetablesImg },
    { name: "Broccoli", price: 80, unit: "kg", image: vegetablesImg },
    { name: "Capsicum", price: 60, unit: "kg", image: vegetablesImg },
    { name: "Brinjal", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Okra (Bhindi)", price: 45, unit: "kg", image: vegetablesImg },
    { name: "Green Chilli", price: 80, unit: "kg", image: vegetablesImg },
    { name: "Coriander", price: 20, unit: "bunch", image: spinachImg },
    { name: "Mint", price: 25, unit: "bunch", image: spinachImg },
    { name: "Curry Leaves", price: 15, unit: "bunch", image: spinachImg },
    { name: "Radish", price: 30, unit: "kg", image: vegetablesImg },
    { name: "Beetroot", price: 40, unit: "kg", image: vegetablesImg },
    { name: "Sweet Potato", price: 35, unit: "kg", image: potatoImg },
    { name: "Bottle Gourd", price: 25, unit: "piece", image: vegetablesImg },
    { name: "Bitter Gourd", price: 50, unit: "kg", image: vegetablesImg },
    { name: "Snake Gourd", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Ridge Gourd", price: 40, unit: "kg", image: vegetablesImg },
    { name: "Pumpkin", price: 30, unit: "kg", image: vegetablesImg },
    { name: "Cucumber", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Green Beans", price: 55, unit: "kg", image: vegetablesImg },
    { name: "Green Peas", price: 80, unit: "kg", image: vegetablesImg },
    { name: "Broad Beans", price: 70, unit: "kg", image: vegetablesImg },
    { name: "French Beans", price: 75, unit: "kg", image: vegetablesImg },
    { name: "Cluster Beans", price: 65, unit: "kg", image: vegetablesImg },
    { name: "Drumstick", price: 45, unit: "kg", image: vegetablesImg },
    { name: "Raw Banana", price: 30, unit: "kg", image: bananaImg },
    { name: "Yam", price: 40, unit: "kg", image: vegetablesImg },
    { name: "Tapioca", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Zucchini", price: 70, unit: "kg", image: vegetablesImg },
    { name: "Asparagus", price: 180, unit: "bunch", image: vegetablesImg },
    { name: "Celery", price: 60, unit: "bunch", image: vegetablesImg },
    { name: "Leek", price: 120, unit: "kg", image: vegetablesImg },
    { name: "Turnip", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Spring Onion", price: 40, unit: "bunch", image: onionImg },
    { name: "Shallots", price: 80, unit: "kg", image: onionImg },
    { name: "Ash Gourd", price: 35, unit: "kg", image: vegetablesImg },
    { name: "Pointed Gourd", price: 60, unit: "kg", image: vegetablesImg },
    { name: "Ivy Gourd", price: 55, unit: "kg", image: vegetablesImg },
    { name: "Moringa Leaves", price: 35, unit: "bunch", image: spinachImg },
    { name: "Artichoke", price: 220, unit: "kg", image: vegetablesImg },
    { name: "Kohlrabi", price: 50, unit: "kg", image: vegetablesImg },
  ],
  "fruits": [
    { name: "Alphonso Mango", price: 350, unit: "kg", image: mangoImg },
    { name: "Kesar Mango", price: 250, unit: "kg", image: mangoImg },
    { name: "Banana", price: 40, unit: "dozen", image: bananaImg },
    { name: "Red Banana", price: 60, unit: "dozen", image: bananaImg },
    { name: "Shimla Apple", price: 150, unit: "kg", image: appleImg },
    { name: "Kashmiri Apple", price: 180, unit: "kg", image: appleImg },
    { name: "Green Apple", price: 170, unit: "kg", image: appleImg },
    { name: "Orange", price: 60, unit: "kg", image: orangeImg },
    { name: "Green Grapes", price: 80, unit: "kg", image: grapesImg },
    { name: "Black Grapes", price: 90, unit: "kg", image: grapesImg },
    { name: "Red Grapes", price: 100, unit: "kg", image: grapesImg },
    { name: "Seedless Grapes", price: 120, unit: "kg", image: grapesImg },
    { name: "Papaya", price: 35, unit: "kg", image: fruitsImg },
    { name: "Pineapple", price: 50, unit: "piece", image: fruitsImg },
    { name: "Guava", price: 40, unit: "kg", image: fruitsImg },
    { name: "Jackfruit", price: 40, unit: "kg", image: fruitsImg },
    { name: "Sapota", price: 60, unit: "kg", image: fruitsImg },
    { name: "Tender Coconut", price: 35, unit: "piece", image: fruitsImg },
    { name: "Watermelon", price: 20, unit: "kg", image: fruitsImg },
    { name: "Muskmelon", price: 35, unit: "kg", image: fruitsImg },
    { name: "Honeydew Melon", price: 45, unit: "kg", image: fruitsImg },
    { name: "Pomegranate", price: 120, unit: "kg", image: fruitsImg },
    { name: "Lemon", price: 80, unit: "kg", image: orangeImg },
    { name: "Sweet Lime", price: 50, unit: "kg", image: orangeImg },
    { name: "Grapefruit", price: 70, unit: "kg", image: orangeImg },
    { name: "Pomelo", price: 90, unit: "kg", image: orangeImg },
    { name: "Kinnow", price: 75, unit: "kg", image: orangeImg },
    { name: "Mandarin", price: 85, unit: "kg", image: orangeImg },
    { name: "Strawberry", price: 200, unit: "kg", image: fruitsImg },
    { name: "Blueberry", price: 350, unit: "pack", image: fruitsImg },
    { name: "Raspberry", price: 300, unit: "pack", image: fruitsImg },
    { name: "Blackberry", price: 280, unit: "pack", image: fruitsImg },
    { name: "Cranberry", price: 260, unit: "pack", image: fruitsImg },
    { name: "Mulberry", price: 220, unit: "kg", image: fruitsImg },
    { name: "Plum", price: 120, unit: "kg", image: fruitsImg },
    { name: "Peach", price: 160, unit: "kg", image: fruitsImg },
    { name: "Cherry", price: 400, unit: "kg", image: fruitsImg },
    { name: "Apricot", price: 220, unit: "kg", image: fruitsImg },
    { name: "Nectarine", price: 190, unit: "kg", image: fruitsImg },
    { name: "Pear", price: 120, unit: "kg", image: fruitsImg },
    { name: "Persimmon", price: 240, unit: "kg", image: fruitsImg },
    { name: "Custard Apple", price: 80, unit: "kg", image: fruitsImg },
    { name: "Jamun", price: 180, unit: "kg", image: fruitsImg },
    { name: "Amla", price: 70, unit: "kg", image: fruitsImg },
    { name: "Dates", price: 260, unit: "kg", image: fruitsImg },
    { name: "Litchi", price: 100, unit: "kg", image: fruitsImg },
    { name: "Kiwi", price: 250, unit: "kg", image: fruitsImg },
    { name: "Dragon Fruit", price: 180, unit: "kg", image: fruitsImg },
    { name: "Avocado", price: 300, unit: "kg", image: fruitsImg },
    { name: "Passion Fruit", price: 220, unit: "kg", image: fruitsImg },
    { name: "Rambutan", price: 300, unit: "kg", image: fruitsImg },
    { name: "Longan", price: 280, unit: "kg", image: fruitsImg },
    { name: "Star Fruit", price: 160, unit: "kg", image: fruitsImg },
    { name: "Fig", price: 200, unit: "kg", image: fruitsImg },
  ],
  "dairy": [
    { name: "Cow Milk", price: 55, unit: "liter", image: dairyImg },
    { name: "Buffalo Milk", price: 65, unit: "liter", image: dairyImg },
    { name: "Goat Milk", price: 80, unit: "liter", image: dairyImg },
    { name: "Curd (Yogurt)", price: 45, unit: "kg", image: dairyImg },
    { name: "Butter", price: 500, unit: "kg", image: dairyImg },
    { name: "Ghee", price: 550, unit: "kg", image: dairyImg },
    { name: "Paneer", price: 320, unit: "kg", image: dairyImg },
    { name: "Cheese", price: 400, unit: "kg", image: dairyImg },
    { name: "Fresh Cream", price: 280, unit: "kg", image: dairyImg },
    { name: "Farm Eggs", price: 6, unit: "piece", image: dairyImg },
    { name: "Country Eggs", price: 10, unit: "piece", image: dairyImg },
    { name: "Duck Eggs", price: 15, unit: "piece", image: dairyImg },
    { name: "Quail Eggs", price: 5, unit: "piece", image: dairyImg },
  ],
  "meat": [
    { name: "Broiler Chicken", price: 180, unit: "kg", image: meatImg },
    { name: "Country Chicken", price: 350, unit: "kg", image: meatImg },
    { name: "Chicken Breast", price: 280, unit: "kg", image: meatImg },
    { name: "Chicken Legs", price: 220, unit: "kg", image: meatImg },
    { name: "Chicken Wings", price: 200, unit: "kg", image: meatImg },
    { name: "Goat Mutton", price: 700, unit: "kg", image: meatImg },
    { name: "Lamb Mutton", price: 650, unit: "kg", image: meatImg },
    { name: "Pork", price: 350, unit: "kg", image: meatImg },
    { name: "Rabbit Meat", price: 450, unit: "kg", image: meatImg },
    { name: "Quail Meat", price: 500, unit: "kg", image: meatImg },
  ],
  "fish": [
    { name: "Rohu", price: 200, unit: "kg", image: fishImg },
    { name: "Catla", price: 220, unit: "kg", image: fishImg },
    { name: "Tilapia", price: 180, unit: "kg", image: fishImg },
    { name: "Pomfret", price: 500, unit: "kg", image: fishImg },
    { name: "Mackerel", price: 250, unit: "kg", image: fishImg },
    { name: "Sardines", price: 150, unit: "kg", image: fishImg },
    { name: "Tuna", price: 400, unit: "kg", image: fishImg },
    { name: "King Fish", price: 450, unit: "kg", image: fishImg },
    { name: "Prawns", price: 500, unit: "kg", image: prawnsImg },
    { name: "Shrimp", price: 400, unit: "kg", image: prawnsImg },
    { name: "Crabs", price: 350, unit: "kg", image: fishImg },
    { name: "Lobster", price: 1200, unit: "kg", image: fishImg },
    { name: "Squid", price: 300, unit: "kg", image: fishImg },
    { name: "Sundried Fish", price: 400, unit: "kg", image: fishImg },
  ],
  "spices": [
    { name: "Turmeric Powder", price: 150, unit: "kg", image: spicesImg },
    { name: "Red Chilli Powder", price: 200, unit: "kg", image: spicesImg },
    { name: "Coriander Powder", price: 120, unit: "kg", image: spicesImg },
    { name: "Cumin Powder", price: 350, unit: "kg", image: spicesImg },
    { name: "Black Pepper", price: 600, unit: "kg", image: spicesImg },
    { name: "Cardamom", price: 2000, unit: "kg", image: spicesImg },
    { name: "Clove", price: 800, unit: "kg", image: spicesImg },
    { name: "Cinnamon", price: 400, unit: "kg", image: spicesImg },
    { name: "Nutmeg", price: 900, unit: "kg", image: spicesImg },
    { name: "Cumin Seeds", price: 300, unit: "kg", image: spicesImg },
    { name: "Mustard Seeds", price: 100, unit: "kg", image: spicesImg },
    { name: "Fennel Seeds", price: 180, unit: "kg", image: spicesImg },
    { name: "Garam Masala", price: 250, unit: "kg", image: spicesImg },
    { name: "Kashmiri Chilli", price: 350, unit: "kg", image: spicesImg },
    { name: "Rock Salt", price: 50, unit: "kg", image: spicesImg },
    { name: "Jaggery", price: 80, unit: "kg", image: spicesImg },
  ],
  "oils": [
    { name: "Sunflower Oil", price: 130, unit: "liter", image: sunflowerOilImg },
    { name: "Groundnut Oil", price: 180, unit: "liter", image: groundnutOilImg },
    { name: "Mustard Oil", price: 160, unit: "liter", image: mustardOilImg },
    { name: "Coconut Oil", price: 200, unit: "liter", image: coconutOilImg },
    { name: "Olive Oil", price: 600, unit: "liter", image: oliveOilImg },
    { name: "Sesame Oil", price: 350, unit: "liter", image: sesameOilImg },
    { name: "Rice Bran Oil", price: 150, unit: "liter", image: riceBranOilImg },
    { name: "Cold Pressed Coconut Oil", price: 280, unit: "liter", image: coldPressedCoconutOilImg },
  ],
  "honey": [
    { name: "Multiflora Honey", price: 350, unit: "kg", image: honeyImg },
    { name: "Forest Honey", price: 500, unit: "kg", image: honeyImg },
    { name: "Organic Honey", price: 600, unit: "kg", image: honeyImg },
    { name: "Beeswax", price: 400, unit: "kg", image: honeyImg },
    { name: "Royal Jelly", price: 2500, unit: "100g", image: honeyImg },
    { name: "Bee Pollen", price: 1500, unit: "kg", image: honeyImg },
  ],
  "mushrooms": [
    { name: "Button Mushroom", price: 200, unit: "kg", image: mushroomImg },
    { name: "Oyster Mushroom", price: 180, unit: "kg", image: mushroomImg },
    { name: "Shiitake", price: 400, unit: "kg", image: mushroomImg },
    { name: "Portobello", price: 350, unit: "kg", image: mushroomImg },
    { name: "Enoki", price: 300, unit: "kg", image: mushroomImg },
    { name: "Mushroom Spawn", price: 150, unit: "kg", image: mushroomImg },
  ],
  "seeds": [
    { name: "Paddy Seeds", price: 80, unit: "kg", image: seedsImg },
    { name: "Wheat Seeds", price: 60, unit: "kg", image: seedsImg },
    { name: "Maize Seeds", price: 120, unit: "kg", image: seedsImg },
    { name: "Tomato Seeds", price: 2500, unit: "100g", image: seedsImg },
    { name: "Brinjal Seeds", price: 1800, unit: "100g", image: seedsImg },
    { name: "Chilli Seeds", price: 2000, unit: "100g", image: seedsImg },
    { name: "Mango Plant", price: 250, unit: "piece", image: seedsImg },
    { name: "Banana Sucker", price: 35, unit: "piece", image: seedsImg },
    { name: "Lemon Plant", price: 150, unit: "piece", image: seedsImg },
  ],
  "fertilizers": [
    { name: "Urea", price: 350, unit: "50kg", image: fertilizerImg },
    { name: "DAP", price: 1350, unit: "50kg", image: fertilizerImg },
    { name: "MOP", price: 950, unit: "50kg", image: fertilizerImg },
    { name: "NPK 10:26:26", price: 1400, unit: "50kg", image: fertilizerImg },
    { name: "Vermicompost", price: 15, unit: "kg", image: fertilizerImg },
    { name: "Organic Manure", price: 8, unit: "kg", image: fertilizerImg },
  ],
};

export const regions: Region[] = [
  // Popular Regions (isPopular: true)
  { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "£", flag: "GB", language: "English", languageCode: "en-GB", timezone: "Europe/London", phonePrefix: "+44", continent: "europe", isPopular: true },
  { code: "IN", name: "India", currency: "INR", currencySymbol: "₹", flag: "IN", language: "Hindi", languageCode: "hi-IN", timezone: "Asia/Kolkata", phonePrefix: "+91", continent: "asia", isPopular: true },
  { code: "US", name: "United States", currency: "USD", currencySymbol: "$", flag: "US", language: "English", languageCode: "en-US", timezone: "America/New_York", phonePrefix: "+1", continent: "north-america", isPopular: true },
  { code: "AE", name: "UAE", currency: "AED", currencySymbol: "د.إ", flag: "AE", language: "Arabic", languageCode: "ar-AE", timezone: "Asia/Dubai", phonePrefix: "+971", continent: "asia", isPopular: true },
  { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "₦", flag: "NG", language: "English", languageCode: "en-NG", timezone: "Africa/Lagos", phonePrefix: "+234", continent: "africa", isPopular: true },
  { code: "BR", name: "Brazil", currency: "BRL", currencySymbol: "R$", flag: "BR", language: "Portuguese", languageCode: "pt-BR", timezone: "America/Sao_Paulo", phonePrefix: "+55", continent: "south-america", isPopular: true },
  
  // Europe
  { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "€", flag: "DE", language: "German", languageCode: "de-DE", timezone: "Europe/Berlin", phonePrefix: "+49", continent: "europe" },
  { code: "FR", name: "France", currency: "EUR", currencySymbol: "€", flag: "FR", language: "French", languageCode: "fr-FR", timezone: "Europe/Paris", phonePrefix: "+33", continent: "europe" },
  { code: "ES", name: "Spain", currency: "EUR", currencySymbol: "€", flag: "ES", language: "Spanish", languageCode: "es-ES", timezone: "Europe/Madrid", phonePrefix: "+34", continent: "europe" },
  { code: "IT", name: "Italy", currency: "EUR", currencySymbol: "€", flag: "IT", language: "Italian", languageCode: "it-IT", timezone: "Europe/Rome", phonePrefix: "+39", continent: "europe" },
  { code: "NL", name: "Netherlands", currency: "EUR", currencySymbol: "€", flag: "NL", language: "Dutch", languageCode: "nl-NL", timezone: "Europe/Amsterdam", phonePrefix: "+31", continent: "europe" },
  { code: "BE", name: "Belgium", currency: "EUR", currencySymbol: "€", flag: "BE", language: "Dutch", languageCode: "nl-BE", timezone: "Europe/Brussels", phonePrefix: "+32", continent: "europe" },
  { code: "PT", name: "Portugal", currency: "EUR", currencySymbol: "€", flag: "PT", language: "Portuguese", languageCode: "pt-PT", timezone: "Europe/Lisbon", phonePrefix: "+351", continent: "europe" },
  { code: "IE", name: "Ireland", currency: "EUR", currencySymbol: "€", flag: "IE", language: "English", languageCode: "en-IE", timezone: "Europe/Dublin", phonePrefix: "+353", continent: "europe" },
  { code: "AT", name: "Austria", currency: "EUR", currencySymbol: "€", flag: "AT", language: "German", languageCode: "de-AT", timezone: "Europe/Vienna", phonePrefix: "+43", continent: "europe" },
  { code: "CH", name: "Switzerland", currency: "CHF", currencySymbol: "CHF", flag: "CH", language: "German", languageCode: "de-CH", timezone: "Europe/Zurich", phonePrefix: "+41", continent: "europe" },
  { code: "SE", name: "Sweden", currency: "SEK", currencySymbol: "kr", flag: "SE", language: "Swedish", languageCode: "sv-SE", timezone: "Europe/Stockholm", phonePrefix: "+46", continent: "europe" },
  { code: "NO", name: "Norway", currency: "NOK", currencySymbol: "kr", flag: "NO", language: "Norwegian", languageCode: "no-NO", timezone: "Europe/Oslo", phonePrefix: "+47", continent: "europe" },
  { code: "DK", name: "Denmark", currency: "DKK", currencySymbol: "kr", flag: "DK", language: "Danish", languageCode: "da-DK", timezone: "Europe/Copenhagen", phonePrefix: "+45", continent: "europe" },
  { code: "FI", name: "Finland", currency: "EUR", currencySymbol: "€", flag: "FI", language: "Finnish", languageCode: "fi-FI", timezone: "Europe/Helsinki", phonePrefix: "+358", continent: "europe" },
  { code: "PL", name: "Poland", currency: "PLN", currencySymbol: "zł", flag: "PL", language: "Polish", languageCode: "pl-PL", timezone: "Europe/Warsaw", phonePrefix: "+48", continent: "europe" },
  { code: "GR", name: "Greece", currency: "EUR", currencySymbol: "€", flag: "GR", language: "Greek", languageCode: "el-GR", timezone: "Europe/Athens", phonePrefix: "+30", continent: "europe" },
  { code: "RU", name: "Russia", currency: "RUB", currencySymbol: "₽", flag: "RU", language: "Russian", languageCode: "ru-RU", timezone: "Europe/Moscow", phonePrefix: "+7", continent: "europe" },
  { code: "UA", name: "Ukraine", currency: "UAH", currencySymbol: "₴", flag: "UA", language: "Ukrainian", languageCode: "uk-UA", timezone: "Europe/Kiev", phonePrefix: "+380", continent: "europe" },
  { code: "CZ", name: "Czech Republic", currency: "CZK", currencySymbol: "Kč", flag: "CZ", language: "Czech", languageCode: "cs-CZ", timezone: "Europe/Prague", phonePrefix: "+420", continent: "europe" },
  { code: "RO", name: "Romania", currency: "RON", currencySymbol: "lei", flag: "RO", language: "Romanian", languageCode: "ro-RO", timezone: "Europe/Bucharest", phonePrefix: "+40", continent: "europe" },
  { code: "HU", name: "Hungary", currency: "HUF", currencySymbol: "Ft", flag: "HU", language: "Hungarian", languageCode: "hu-HU", timezone: "Europe/Budapest", phonePrefix: "+36", continent: "europe" },
  
  // Asia
  { code: "JP", name: "Japan", currency: "JPY", currencySymbol: "¥", flag: "JP", language: "Japanese", languageCode: "ja-JP", timezone: "Asia/Tokyo", phonePrefix: "+81", continent: "asia" },
  { code: "CN", name: "China", currency: "CNY", currencySymbol: "¥", flag: "CN", language: "Chinese", languageCode: "zh-CN", timezone: "Asia/Shanghai", phonePrefix: "+86", continent: "asia" },
  { code: "SG", name: "Singapore", currency: "SGD", currencySymbol: "S$", flag: "SG", language: "English", languageCode: "en-SG", timezone: "Asia/Singapore", phonePrefix: "+65", continent: "asia" },
  { code: "MY", name: "Malaysia", currency: "MYR", currencySymbol: "RM", flag: "MY", language: "Malay", languageCode: "ms-MY", timezone: "Asia/Kuala_Lumpur", phonePrefix: "+60", continent: "asia" },
  { code: "TH", name: "Thailand", currency: "THB", currencySymbol: "฿", flag: "TH", language: "Thai", languageCode: "th-TH", timezone: "Asia/Bangkok", phonePrefix: "+66", continent: "asia" },
  { code: "VN", name: "Vietnam", currency: "VND", currencySymbol: "₫", flag: "VN", language: "Vietnamese", languageCode: "vi-VN", timezone: "Asia/Ho_Chi_Minh", phonePrefix: "+84", continent: "asia" },
  { code: "ID", name: "Indonesia", currency: "IDR", currencySymbol: "Rp", flag: "ID", language: "Indonesian", languageCode: "id-ID", timezone: "Asia/Jakarta", phonePrefix: "+62", continent: "asia" },
  { code: "PH", name: "Philippines", currency: "PHP", currencySymbol: "₱", flag: "PH", language: "Filipino", languageCode: "fil-PH", timezone: "Asia/Manila", phonePrefix: "+63", continent: "asia" },
  { code: "KR", name: "South Korea", currency: "KRW", currencySymbol: "₩", flag: "KR", language: "Korean", languageCode: "ko-KR", timezone: "Asia/Seoul", phonePrefix: "+82", continent: "asia" },
  { code: "PK", name: "Pakistan", currency: "PKR", currencySymbol: "₨", flag: "PK", language: "Urdu", languageCode: "ur-PK", timezone: "Asia/Karachi", phonePrefix: "+92", continent: "asia" },
  { code: "BD", name: "Bangladesh", currency: "BDT", currencySymbol: "৳", flag: "BD", language: "Bengali", languageCode: "bn-BD", timezone: "Asia/Dhaka", phonePrefix: "+880", continent: "asia" },
  { code: "LK", name: "Sri Lanka", currency: "LKR", currencySymbol: "Rs", flag: "LK", language: "Sinhala", languageCode: "si-LK", timezone: "Asia/Colombo", phonePrefix: "+94", continent: "asia" },
  { code: "NP", name: "Nepal", currency: "NPR", currencySymbol: "रू", flag: "NP", language: "Nepali", languageCode: "ne-NP", timezone: "Asia/Kathmandu", phonePrefix: "+977", continent: "asia" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", currencySymbol: "﷼", flag: "SA", language: "Arabic", languageCode: "ar-SA", timezone: "Asia/Riyadh", phonePrefix: "+966", continent: "asia" },
  { code: "QA", name: "Qatar", currency: "QAR", currencySymbol: "ر.ق", flag: "QA", language: "Arabic", languageCode: "ar-QA", timezone: "Asia/Qatar", phonePrefix: "+974", continent: "asia" },
  { code: "KW", name: "Kuwait", currency: "KWD", currencySymbol: "د.ك", flag: "KW", language: "Arabic", languageCode: "ar-KW", timezone: "Asia/Kuwait", phonePrefix: "+965", continent: "asia" },
  { code: "BH", name: "Bahrain", currency: "BHD", currencySymbol: ".د.ب", flag: "BH", language: "Arabic", languageCode: "ar-BH", timezone: "Asia/Bahrain", phonePrefix: "+973", continent: "asia" },
  { code: "OM", name: "Oman", currency: "OMR", currencySymbol: "ر.ع.", flag: "OM", language: "Arabic", languageCode: "ar-OM", timezone: "Asia/Muscat", phonePrefix: "+968", continent: "asia" },
  { code: "IL", name: "Israel", currency: "ILS", currencySymbol: "₪", flag: "IL", language: "Hebrew", languageCode: "he-IL", timezone: "Asia/Jerusalem", phonePrefix: "+972", continent: "asia" },
  { code: "TR", name: "Turkey", currency: "TRY", currencySymbol: "₺", flag: "TR", language: "Turkish", languageCode: "tr-TR", timezone: "Europe/Istanbul", phonePrefix: "+90", continent: "asia" },
  
  // Africa
  { code: "ZA", name: "South Africa", currency: "ZAR", currencySymbol: "R", flag: "ZA", language: "English", languageCode: "en-ZA", timezone: "Africa/Johannesburg", phonePrefix: "+27", continent: "africa" },
  { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh", flag: "KE", language: "Swahili", languageCode: "sw-KE", timezone: "Africa/Nairobi", phonePrefix: "+254", continent: "africa" },
  { code: "EG", name: "Egypt", currency: "EGP", currencySymbol: "E£", flag: "EG", language: "Arabic", languageCode: "ar-EG", timezone: "Africa/Cairo", phonePrefix: "+20", continent: "africa" },
  { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "₵", flag: "GH", language: "English", languageCode: "en-GH", timezone: "Africa/Accra", phonePrefix: "+233", continent: "africa" },
  { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "TSh", flag: "TZ", language: "Swahili", languageCode: "sw-TZ", timezone: "Africa/Dar_es_Salaam", phonePrefix: "+255", continent: "africa" },
  { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh", flag: "UG", language: "English", languageCode: "en-UG", timezone: "Africa/Kampala", phonePrefix: "+256", continent: "africa" },
  { code: "ET", name: "Ethiopia", currency: "ETB", currencySymbol: "Br", flag: "ET", language: "Amharic", languageCode: "am-ET", timezone: "Africa/Addis_Ababa", phonePrefix: "+251", continent: "africa" },
  { code: "MA", name: "Morocco", currency: "MAD", currencySymbol: "د.م.", flag: "MA", language: "Arabic", languageCode: "ar-MA", timezone: "Africa/Casablanca", phonePrefix: "+212", continent: "africa" },
  { code: "DZ", name: "Algeria", currency: "DZD", currencySymbol: "د.ج", flag: "DZ", language: "Arabic", languageCode: "ar-DZ", timezone: "Africa/Algiers", phonePrefix: "+213", continent: "africa" },
  { code: "TN", name: "Tunisia", currency: "TND", currencySymbol: "د.ت", flag: "TN", language: "Arabic", languageCode: "ar-TN", timezone: "Africa/Tunis", phonePrefix: "+216", continent: "africa" },
  { code: "RW", name: "Rwanda", currency: "RWF", currencySymbol: "FRw", flag: "RW", language: "Kinyarwanda", languageCode: "rw-RW", timezone: "Africa/Kigali", phonePrefix: "+250", continent: "africa" },
  { code: "SN", name: "Senegal", currency: "XOF", currencySymbol: "CFA", flag: "SN", language: "French", languageCode: "fr-SN", timezone: "Africa/Dakar", phonePrefix: "+221", continent: "africa" },
  { code: "CI", name: "Ivory Coast", currency: "XOF", currencySymbol: "CFA", flag: "CI", language: "French", languageCode: "fr-CI", timezone: "Africa/Abidjan", phonePrefix: "+225", continent: "africa" },
  
  // North America
  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "C$", flag: "CA", language: "English", languageCode: "en-CA", timezone: "America/Toronto", phonePrefix: "+1", continent: "north-america" },
  { code: "MX", name: "Mexico", currency: "MXN", currencySymbol: "MX$", flag: "MX", language: "Spanish", languageCode: "es-MX", timezone: "America/Mexico_City", phonePrefix: "+52", continent: "north-america" },
  { code: "JM", name: "Jamaica", currency: "JMD", currencySymbol: "J$", flag: "JM", language: "English", languageCode: "en-JM", timezone: "America/Jamaica", phonePrefix: "+1876", continent: "north-america" },
  { code: "CU", name: "Cuba", currency: "CUP", currencySymbol: "$", flag: "CU", language: "Spanish", languageCode: "es-CU", timezone: "America/Havana", phonePrefix: "+53", continent: "north-america" },
  { code: "DO", name: "Dominican Republic", currency: "DOP", currencySymbol: "RD$", flag: "DO", language: "Spanish", languageCode: "es-DO", timezone: "America/Santo_Domingo", phonePrefix: "+1809", continent: "north-america" },
  { code: "HT", name: "Haiti", currency: "HTG", currencySymbol: "G", flag: "HT", language: "French", languageCode: "fr-HT", timezone: "America/Port-au-Prince", phonePrefix: "+509", continent: "north-america" },
  { code: "GT", name: "Guatemala", currency: "GTQ", currencySymbol: "Q", flag: "GT", language: "Spanish", languageCode: "es-GT", timezone: "America/Guatemala", phonePrefix: "+502", continent: "north-america" },
  { code: "CR", name: "Costa Rica", currency: "CRC", currencySymbol: "₡", flag: "CR", language: "Spanish", languageCode: "es-CR", timezone: "America/Costa_Rica", phonePrefix: "+506", continent: "north-america" },
  { code: "PA", name: "Panama", currency: "PAB", currencySymbol: "B/.", flag: "PA", language: "Spanish", languageCode: "es-PA", timezone: "America/Panama", phonePrefix: "+507", continent: "north-america" },
  
  // South America
  { code: "AR", name: "Argentina", currency: "ARS", currencySymbol: "$", flag: "AR", language: "Spanish", languageCode: "es-AR", timezone: "America/Buenos_Aires", phonePrefix: "+54", continent: "south-america" },
  { code: "CL", name: "Chile", currency: "CLP", currencySymbol: "$", flag: "CL", language: "Spanish", languageCode: "es-CL", timezone: "America/Santiago", phonePrefix: "+56", continent: "south-america" },
  { code: "CO", name: "Colombia", currency: "COP", currencySymbol: "$", flag: "CO", language: "Spanish", languageCode: "es-CO", timezone: "America/Bogota", phonePrefix: "+57", continent: "south-america" },
  { code: "PE", name: "Peru", currency: "PEN", currencySymbol: "S/", flag: "PE", language: "Spanish", languageCode: "es-PE", timezone: "America/Lima", phonePrefix: "+51", continent: "south-america" },
  { code: "VE", name: "Venezuela", currency: "VES", currencySymbol: "Bs.", flag: "VE", language: "Spanish", languageCode: "es-VE", timezone: "America/Caracas", phonePrefix: "+58", continent: "south-america" },
  { code: "EC", name: "Ecuador", currency: "USD", currencySymbol: "$", flag: "EC", language: "Spanish", languageCode: "es-EC", timezone: "America/Guayaquil", phonePrefix: "+593", continent: "south-america" },
  { code: "UY", name: "Uruguay", currency: "UYU", currencySymbol: "$U", flag: "UY", language: "Spanish", languageCode: "es-UY", timezone: "America/Montevideo", phonePrefix: "+598", continent: "south-america" },
  { code: "PY", name: "Paraguay", currency: "PYG", currencySymbol: "₲", flag: "PY", language: "Spanish", languageCode: "es-PY", timezone: "America/Asuncion", phonePrefix: "+595", continent: "south-america" },
  { code: "BO", name: "Bolivia", currency: "BOB", currencySymbol: "Bs.", flag: "BO", language: "Spanish", languageCode: "es-BO", timezone: "America/La_Paz", phonePrefix: "+591", continent: "south-america" },
  
  // Oceania
  { code: "AU", name: "Australia", currency: "AUD", currencySymbol: "A$", flag: "AU", language: "English", languageCode: "en-AU", timezone: "Australia/Sydney", phonePrefix: "+61", continent: "oceania" },
  { code: "NZ", name: "New Zealand", currency: "NZD", currencySymbol: "NZ$", flag: "NZ", language: "English", languageCode: "en-NZ", timezone: "Pacific/Auckland", phonePrefix: "+64", continent: "oceania" },
  { code: "FJ", name: "Fiji", currency: "FJD", currencySymbol: "FJ$", flag: "FJ", language: "English", languageCode: "en-FJ", timezone: "Pacific/Fiji", phonePrefix: "+679", continent: "oceania" },
  { code: "PG", name: "Papua New Guinea", currency: "PGK", currencySymbol: "K", flag: "PG", language: "English", languageCode: "en-PG", timezone: "Pacific/Port_Moresby", phonePrefix: "+675", continent: "oceania" },
];

export function getCategoryIcon(iconName: string) {
  return iconName;
}

/** Full taxonomy for seller listing and catalogue-management flows. */
export function getSellerTaxonomy(): Category[] {
  return categories;
}

/**
 * Buyer-safe category tree. This preserves every stable ID and slug while
 * excluding seller-only categories and subcategories from shopping surfaces.
 */
export function getBuyerCategories(): Category[] {
  return categories
    .filter((category) => category.buyerVisible !== false)
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.filter((subcategory) => subcategory.buyerVisible !== false),
    }));
}

export const getShoppableCategories = getBuyerCategories;

/** Missing or unrecognised roles safely receive the buyer browsing taxonomy. */
export function getTaxonomyForRole(role?: string | null): Category[] {
  return role === "farmer" ? getSellerTaxonomy() : getBuyerCategories();
}

/** Seller listing and management tools are reserved for completed farmer roles. */
export function hasSellerTaxonomyAccess(role?: string | null): boolean {
  return role === "farmer";
}

export function isShoppableCategory(categoryId: string): boolean {
  return getBuyerCategories().some((category) => category.id === categoryId);
}

export function getCategoryExamples(subcategoryId: string): string[] {
  return categoryExamples[subcategoryId] || [];
}

export function getCategoryImage(categoryId: string): string | undefined {
  return categoryImages[categoryId];
}

export function getProductsByCategory(categoryId: string) {
  return productData[categoryId] || [];
}
