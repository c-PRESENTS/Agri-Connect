import brandedFallbackImage from "@assets/stock_images/agri-connect logo.png";
import bajraGrainImage from "@assets/stock_images/bajra.jpeg";
import barleyGrainImage from "@assets/stock_images/barley.webp";
import basmatiRiceImage from "@assets/stock_images/basmati rice.jpeg";
import besanImage from "@assets/stock_images/besan.jpg";
import brownRiceImage from "@assets/stock_images/brown rice.jpg";
import { categoryImages } from "./categories";
import foxTailMilletImage from "@assets/stock_images/fox-tail milet.jpeg";
import gramFlourImage from "@assets/stock_images/gram flour.jpeg";
import jowarGrainImage from "@assets/stock_images/jowar.jpeg";
import kambuGrainImage from "@assets/stock_images/kambu.jpg";
import littleMilletImage from "@assets/stock_images/little-milet.jpeg";
import maizeGrainImage from "@assets/stock_images/maize.jpg";
import milletFlourImage from "@assets/stock_images/millet flour.webp";
import oatsGrainImage from "@assets/stock_images/oats.avif";
import parboiledRiceImage from "@assets/stock_images/paraboiled rice.jpeg";
import ponniRiceImage from "@assets/stock_images/ponni rice.webp";
import quinoaGrainImage from "@assets/stock_images/quinoa.webp";
import ragiGrainImage from "@assets/stock_images/ragi.jpeg";
import redRiceImage from "@assets/stock_images/red rice.webp";
import riceFlourImage from "@assets/stock_images/rice flour.jpeg";
import semolinaImage from "@assets/stock_images/semolina.jpeg";
import sonaMasooriRiceImage from "@assets/stock_images/sona masoori rice.webp";
import sorghumGrainImage from "@assets/stock_images/sorghum.avif";
import wheatFlourImage from "@assets/stock_images/wheat flour atta.jpeg";
import wholeWheatImage from "@assets/stock_images/whole wheat.jpg";
import whiteRiceImage from "@assets/stock_images/white rice.jpeg";

export interface ProductImageAttribution {
  source: "bundled" | "generated" | "licensed";
  label?: string;
  url?: string;
}

export interface ProductImageRegistryEntry {
  slug: string;
  name: string;
  aliases: readonly string[];
  categoryId: string;
  subcategoryId: string;
  localAssetPath: string;
  attribution?: ProductImageAttribution;
}

export function normalizeProductImageKey(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const bundled = (label: string): ProductImageAttribution => ({
  source: "bundled",
  label,
});

const entries: readonly ProductImageRegistryEntry[] = [
  { slug: "white-rice", name: "White Rice", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: whiteRiceImage, attribution: bundled("AgriConnect white rice stock asset") },
  { slug: "brown-rice", name: "Brown Rice", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: brownRiceImage, attribution: bundled("AgriConnect brown rice stock asset") },
  { slug: "basmati-rice", name: "Basmati Rice", aliases: ["premium basmati rice"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: basmatiRiceImage, attribution: bundled("AgriConnect basmati rice stock asset") },
  { slug: "red-rice", name: "Red Rice", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: redRiceImage, attribution: bundled("AgriConnect red rice stock asset") },
  { slug: "parboiled-rice", name: "Parboiled Rice", aliases: ["paraboiled rice"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: parboiledRiceImage, attribution: bundled("AgriConnect parboiled rice stock asset") },
  { slug: "ponni-rice", name: "Ponni Rice", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: ponniRiceImage, attribution: bundled("AgriConnect ponni rice stock asset") },
  { slug: "sona-masoori-rice", name: "Sona Masoori Rice", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: sonaMasooriRiceImage, attribution: bundled("AgriConnect sona masoori rice stock asset") },
  { slug: "rice-flour", name: "Rice Flour", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: riceFlourImage, attribution: bundled("AgriConnect rice flour stock asset") },
  { slug: "wheat-flour", name: "Wheat Flour", aliases: ["wheat flour atta"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: wheatFlourImage, attribution: bundled("AgriConnect wheat flour stock asset") },
  { slug: "whole-wheat", name: "Whole Wheat", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: wholeWheatImage, attribution: bundled("AgriConnect whole wheat stock asset") },
  { slug: "semolina-suji", name: "Semolina (Suji)", aliases: ["semolina", "suji"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: semolinaImage, attribution: bundled("AgriConnect semolina stock asset") },
  { slug: "ragi", name: "Ragi", aliases: ["ragi finger millet"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: ragiGrainImage, attribution: bundled("AgriConnect ragi stock asset") },
  { slug: "bajra", name: "Bajra", aliases: ["bajra pearl millet"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: bajraGrainImage, attribution: bundled("AgriConnect bajra stock asset") },
  { slug: "jowar", name: "Jowar", aliases: ["jowar sorghum"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: jowarGrainImage, attribution: bundled("AgriConnect jowar stock asset") },
  { slug: "kambu", name: "Kambu", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: kambuGrainImage, attribution: bundled("AgriConnect kambu stock asset") },
  { slug: "foxtail-millet", name: "Foxtail Millet", aliases: ["fox tail millet"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: foxTailMilletImage, attribution: bundled("AgriConnect foxtail millet stock asset") },
  { slug: "little-millet", name: "Little Millet", aliases: ["little milet"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: littleMilletImage, attribution: bundled("AgriConnect little millet stock asset") },
  { slug: "maize", name: "Maize", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: maizeGrainImage, attribution: bundled("AgriConnect maize stock asset") },
  { slug: "barley", name: "Barley", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: barleyGrainImage, attribution: bundled("AgriConnect barley stock asset") },
  { slug: "oats", name: "Oats", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: oatsGrainImage, attribution: bundled("AgriConnect oats stock asset") },
  { slug: "sorghum", name: "Sorghum", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: sorghumGrainImage, attribution: bundled("AgriConnect sorghum stock asset") },
  { slug: "quinoa", name: "Quinoa", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: quinoaGrainImage, attribution: bundled("AgriConnect quinoa stock asset") },
  { slug: "gram-flour", name: "Gram Flour", aliases: ["besan"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: gramFlourImage, attribution: bundled("AgriConnect gram flour stock asset") },
  { slug: "besan", name: "Besan", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: besanImage, attribution: bundled("AgriConnect besan stock asset") },
  { slug: "millet-flour", name: "Millet Flour", aliases: [], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: milletFlourImage, attribution: bundled("AgriConnect millet flour stock asset") },
  { slug: "tomato", name: "Tomato", aliases: ["Tomatoes", "Organic Tomatoes", "Fresh Tomatoes", "Cherry Tomato"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.tomato, attribution: bundled("AgriConnect tomato stock asset") },
  { slug: "potato", name: "Potato", aliases: ["Potatoes", "Fresh Potatoes", "Sweet Potato"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.potato, attribution: bundled("AgriConnect potato stock asset") },
  { slug: "onion", name: "Onion", aliases: ["Onions", "Red Onions", "Spring Onion", "Shallots", "Garlic"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.onion, attribution: bundled("AgriConnect onion stock asset") },
  { slug: "carrot", name: "Carrot", aliases: ["Carrots", "Beetroot", "Radish", "Turnip"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.carrot, attribution: bundled("AgriConnect root vegetable stock asset") },
  { slug: "spinach", name: "Spinach", aliases: ["Coriander Leaves", "Mint Leaves", "Curry Leaves", "Lettuce", "Amaranth Leaves", "Fenugreek Leaves", "Moringa Leaves", "Leafy Greens"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.spinach, attribution: bundled("AgriConnect leafy greens stock asset") },
  { slug: "vegetables", name: "Mixed Vegetables", aliases: ["Organic Vegetables Mix", "Bulk Mixed Vegetables Crate", "Organic Seasonal Vegetable Box", "Wholesale Gourd Selection", "Wholesale Root Vegetables Sack"], categoryId: "daily-needs", subcategoryId: "vegetables", localAssetPath: categoryImages.vegetables, attribution: bundled("AgriConnect vegetable stock asset") },
  { slug: "apple", name: "Apple", aliases: ["Apples", "Shimla Apple", "Kashmiri Apple", "Green Apple", "Wholesale Apple Pear Crate"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.apple, attribution: bundled("AgriConnect apple stock asset") },
  { slug: "mango", name: "Mango", aliases: ["Mangoes", "Alphonso Mango", "Alphonso Mangoes", "Kesar Mango", "Premium Mangoes"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.mango, attribution: bundled("AgriConnect mango stock asset") },
  { slug: "banana", name: "Banana", aliases: ["Bananas", "Red Banana", "Raw Banana", "Plantain"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.banana, attribution: bundled("AgriConnect banana stock asset") },
  { slug: "orange", name: "Orange", aliases: ["Oranges", "Lemon", "Sweet Lime", "Grapefruit", "Pomelo", "Kinnow", "Mandarin", "Wholesale Citrus Fruit Box"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.orange, attribution: bundled("AgriConnect citrus stock asset") },
  { slug: "grapes", name: "Grapes", aliases: ["Green Grapes", "Black Grapes", "Red Grapes", "Seedless Grapes", "Raisins", "Bulk Berry Pack"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.grapes, attribution: bundled("AgriConnect grape stock asset") },
  { slug: "fruits", name: "Mixed Fruits", aliases: ["Bulk Tropical Fruits Crate", "Bulk Exotic Fruit Box", "Seasonal Mixed Fruit Crate"], categoryId: "daily-needs", subcategoryId: "fruits", localAssetPath: categoryImages.fruits, attribution: bundled("AgriConnect fruit stock asset") },
  { slug: "rice", name: "Rice", aliases: ["White Rice", "Brown Rice", "Red Rice", "Parboiled Rice", "Premium Basmati Rice", "Basmati Rice"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: categoryImages.rice, attribution: bundled("AgriConnect rice stock asset") },
  { slug: "wheat", name: "Wheat", aliases: ["Whole Wheat", "Wheat Flour", "Semolina", "Semolina Suji", "Barley", "Oats", "Maize"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: categoryImages.wheat, attribution: bundled("AgriConnect wheat stock asset") },
  { slug: "millets", name: "Millets", aliases: ["Ragi", "Ragi Finger Millet", "Bajra", "Bajra Pearl Millet", "Jowar", "Jowar Sorghum", "Foxtail Millet", "Little Millet", "Quinoa"], categoryId: "daily-needs", subcategoryId: "grains", localAssetPath: categoryImages.millets, attribution: bundled("AgriConnect millet stock asset") },
  { slug: "pulses", name: "Pulses", aliases: ["Toor Dal", "Moong Dal", "Chana Dal", "Urad Dal", "Masoor Dal", "Chickpeas", "Chickpeas Kabuli Chana", "Kidney Beans", "Kidney Beans Rajma", "Green Gram Whole", "Black Gram Whole", "Lentils"], categoryId: "daily-needs", subcategoryId: "pulses", localAssetPath: categoryImages.pulses, attribution: bundled("AgriConnect pulse stock asset") },
  { slug: "cooking-oil", name: "Cooking Oil", aliases: ["Cold Pressed Coconut Oil", "Sunflower Oil", "Groundnut Oil", "Mustard Oil", "Sesame Oil", "Rice Bran Oil", "Extra Virgin Olive Oil", "Olive Oil"], categoryId: "daily-needs", subcategoryId: "oils", localAssetPath: categoryImages.oils, attribution: bundled("AgriConnect cooking oil stock asset") },
  { slug: "dairy", name: "Dairy Products", aliases: ["Cow Milk Fresh", "Buffalo Milk Fresh", "Goat Milk", "Fresh Milk", "Fresh Curd", "Fresh Butter", "Pure Cow Ghee", "Buffalo Ghee", "Paneer Fresh", "Cottage Cheese", "Fresh Cream", "Cheese"], categoryId: "daily-needs", subcategoryId: "dairy", localAssetPath: categoryImages.dairy, attribution: bundled("AgriConnect dairy stock asset") },
  { slug: "poultry", name: "Poultry", aliases: ["Country Chicken", "Broiler Chicken", "Chicken Breast", "Chicken Legs", "Chicken Wings", "Farm Fresh Eggs", "Country Chicken Eggs", "Duck Eggs", "Quail Eggs"], categoryId: "daily-needs", subcategoryId: "meat", localAssetPath: categoryImages.poultry, attribution: bundled("AgriConnect poultry stock asset") },
  { slug: "meat", name: "Meat", aliases: ["Goat Mutton", "Lamb Mutton", "Pork", "Rabbit Meat", "Duck Meat", "Quail Meat"], categoryId: "daily-needs", subcategoryId: "meat", localAssetPath: categoryImages.meat, attribution: bundled("AgriConnect meat stock asset") },
  { slug: "fish", name: "Fish", aliases: ["Rohu Fish", "Catla Fish", "Tilapia", "Pomfret", "Mackerel", "Sardines", "King Fish", "King Fish Surmai", "Dried Fish"], categoryId: "daily-needs", subcategoryId: "fish", localAssetPath: categoryImages.fish, attribution: bundled("AgriConnect fish stock asset") },
  { slug: "seafood", name: "Seafood", aliases: ["Fresh Prawns", "Prawns", "Shrimp", "Crabs", "Lobster", "Squid"], categoryId: "daily-needs", subcategoryId: "fish", localAssetPath: categoryImages.seafood, attribution: bundled("AgriConnect seafood stock asset") },
  { slug: "spices", name: "Spices", aliases: ["Turmeric", "Cumin", "Garam Masala", "Cardamom", "Cloves", "Cinnamon", "Chilli Powder"], categoryId: "daily-needs", subcategoryId: "spices", localAssetPath: categoryImages.spices, attribution: bundled("AgriConnect spice stock asset") },
  { slug: "honey", name: "Honey", aliases: ["Raw Honey", "Organic Honey", "Jaggery"], categoryId: "specialty", subcategoryId: "honey", localAssetPath: categoryImages.honey, attribution: bundled("AgriConnect honey stock asset") },
  { slug: "mushrooms", name: "Mushrooms", aliases: ["Mushroom", "Oyster Mushrooms", "Button Mushrooms"], categoryId: "specialty", subcategoryId: "mushrooms", localAssetPath: categoryImages.mushrooms, attribution: bundled("AgriConnect mushroom stock asset") },
  { slug: "tea", name: "Tea", aliases: ["Tea Leaves", "Green Tea"], categoryId: "commercial-crops", subcategoryId: "beverage-crops", localAssetPath: categoryImages.tea, attribution: bundled("AgriConnect tea stock asset") },
  { slug: "coffee", name: "Coffee", aliases: ["Coffee Beans", "Roasted Coffee"], categoryId: "commercial-crops", subcategoryId: "beverage-crops", localAssetPath: categoryImages.coffee, attribution: bundled("AgriConnect coffee stock asset") },
  { slug: "seeds", name: "Seeds", aliases: ["Seed", "Seedlings", "Saplings"], categoryId: "inputs-tools", subcategoryId: "seeds", localAssetPath: categoryImages.seeds, attribution: bundled("AgriConnect seed stock asset") },
  { slug: "fertilizer", name: "Fertilizer", aliases: ["Fertiliser", "Compost", "Manure", "Organic Manure"], categoryId: "inputs-tools", subcategoryId: "fertilizers", localAssetPath: categoryImages.fertilizers, attribution: bundled("AgriConnect fertilizer stock asset") },
  { slug: "farm-tools", name: "Farm Tools", aliases: ["Farming Tools", "Spade", "Shovel", "Sickle", "Plough", "Hoe"], categoryId: "inputs-tools", subcategoryId: "tools", localAssetPath: categoryImages.tools, attribution: bundled("AgriConnect tool stock asset") },
  { slug: "farm-machinery", name: "Farm Machinery", aliases: ["Tractor", "Harvester", "Thresher", "Machinery"], categoryId: "inputs-tools", subcategoryId: "machinery", localAssetPath: categoryImages.machinery, attribution: bundled("AgriConnect machinery stock asset") },
  { slug: "irrigation", name: "Irrigation", aliases: ["Drip Irrigation", "Sprinkler", "Water Pump"], categoryId: "inputs-tools", subcategoryId: "irrigation", localAssetPath: categoryImages.irrigation, attribution: bundled("AgriConnect irrigation stock asset") },
];

export const productImageRegistry: Readonly<Record<string, ProductImageRegistryEntry>> =
  Object.freeze(Object.fromEntries(entries.map((entry) => [entry.slug, entry])));

export const productImageAliasIndex: Readonly<Record<string, readonly string[]>> = Object.freeze(
  entries.reduce<Record<string, string[]>>((index, entry) => {
    for (const alias of entry.aliases) {
      const key = normalizeProductImageKey(alias);
      index[key] = [...(index[key] ?? []), entry.slug];
    }
    return index;
  }, {}),
);

export const LOCAL_BRANDED_PRODUCT_FALLBACK = brandedFallbackImage;
