// Complete sub-subcategory data for 3rd level navigation
// Format: subcategoryId -> { title: string, items: string[] }[]

export interface SubSubItem {
  title: string;
  items: string[];
}

export const subSubcategoryData: Record<string, SubSubItem[]> = {
  // FOOD GRAINS & CEREALS (id: "grains" in categories.ts)
  "grains": [
    { title: "Rice", items: ["White Rice", "Brown Rice", "Basmati Rice", "Red Rice", "Parboiled Rice", "Sona Masoori", "Ponni Rice"] },
    { title: "Wheat", items: ["Wheat Flour (Atta)", "Whole Wheat", "Semolina (Suji)", "Maida", "Besan"] },
    { title: "Millets", items: ["Ragi", "Bajra", "Jowar", "Kambu", "Foxtail Millet", "Little Millet"] },
    { title: "Other Grains", items: ["Maize", "Barley", "Oats", "Sorghum", "Quinoa"] },
    { title: "Flours", items: ["Rice Flour", "Wheat Flour", "Gram Flour", "Millet Flour"] }
  ],

  // PULSES & LENTILS
  "pulses": [
    { title: "Whole Pulses", items: ["Chickpea", "Pigeon Pea", "Kidney Beans", "Soya Bean", "Rajma", "Chole"] },
    { title: "Split Pulses", items: ["Toor Dal", "Moong Dal", "Chana Dal", "Urad Dal", "Masoor Dal"] },
    { title: "Other", items: ["Green Gram", "Black Gram", "Peas", "Lentils", "Beans"] }
  ],

  // COOKING OILS
  "oils": [
    { title: "Regular Oils", items: ["Sunflower Oil", "Groundnut Oil", "Mustard Oil", "Coconut Oil", "Soybean Oil"] },
    { title: "Healthy Oils", items: ["Olive Oil", "Sesame Oil", "Flaxseed Oil", "Rice Bran Oil"] },
    { title: "Traditional", items: ["Cold Pressed Coconut", "Kachi Ghani Mustard", "Til Oil"] }
  ],

  // VEGETABLES
  "vegetables": [
    { title: "Leafy Greens", items: ["Spinach", "Coriander", "Mint", "Lettuce", "Amaranth", "Curry Leaves", "Fenugreek", "Moringa Leaves"] },
    { title: "Root Vegetables", items: ["Potato", "Carrot", "Radish", "Beetroot", "Sweet Potato", "Turnip", "Yam", "Tapioca"] },
    { title: "Fruiting Vegetables", items: ["Tomato", "Brinjal", "Capsicum", "Okra", "Green Chilli", "Raw Banana", "Zucchini", "Cucumber"] },
    { title: "Gourds", items: ["Bottle Gourd", "Bitter Gourd", "Snake Gourd", "Ridge Gourd", "Pumpkin", "Ash Gourd", "Pointed Gourd", "Ivy Gourd"] },
    { title: "Pod Vegetables", items: ["Green Beans", "Green Peas", "Broad Beans", "French Beans", "Cluster Beans", "Drumstick"] },
    { title: "Flower Vegetables", items: ["Cauliflower", "Broccoli", "Artichoke"] },
    { title: "Bulb Vegetables", items: ["Onion", "Garlic", "Ginger", "Spring Onion", "Shallots", "Leek"] },
    { title: "Premium & Seasonal", items: ["Cabbage", "Asparagus", "Celery", "Kohlrabi"] }
  ],

  // FRUITS
  "fruits": [
    { title: "Tropical Fruits", items: ["Alphonso Mango", "Kesar Mango", "Banana", "Red Banana", "Papaya", "Pineapple", "Guava", "Jackfruit", "Sapota", "Tender Coconut"] },
    { title: "Citrus Fruits", items: ["Orange", "Lemon", "Sweet Lime", "Grapefruit", "Pomelo", "Kinnow", "Mandarin"] },
    { title: "Berries", items: ["Strawberry", "Blueberry", "Raspberry", "Blackberry", "Cranberry", "Mulberry"] },
    { title: "Melons", items: ["Watermelon", "Muskmelon", "Honeydew Melon"] },
    { title: "Stone Fruits", items: ["Plum", "Peach", "Cherry", "Apricot", "Nectarine"] },
    { title: "Apples & Pears", items: ["Shimla Apple", "Kashmiri Apple", "Green Apple", "Pear", "Persimmon"] },
    { title: "Grapes", items: ["Green Grapes", "Black Grapes", "Red Grapes", "Seedless Grapes"] },
    { title: "Indian Seasonal Fruits", items: ["Pomegranate", "Custard Apple", "Jamun", "Amla", "Dates", "Litchi"] },
    { title: "Exotic Fruits", items: ["Kiwi", "Dragon Fruit", "Avocado", "Passion Fruit", "Rambutan", "Longan", "Star Fruit", "Fig"] }
  ],

  // WHOLESALE VEGETABLES
  "wholesale-veg": [
    { title: "Bulk Vegetable Crates", items: ["Bulk Mixed Vegetables Crate", "Bulk Tomato Capsicum Crate", "Organic Seasonal Vegetable Box"] },
    { title: "Wholesale Vegetable Groups", items: ["Bulk Leafy Greens Box", "Wholesale Root Vegetables Sack", "Wholesale Gourd Selection", "Organic Vegetables"] },
    { title: "47+ Variety Coverage", items: ["Leafy Greens", "Root Vegetables", "Fruiting Vegetables", "Gourds", "Pod Vegetables", "Premium Seasonal Vegetables"] }
  ],

  // WHOLESALE FRUITS
  "wholesale-fruits": [
    { title: "Bulk Fruit Crates", items: ["Bulk Tropical Fruits Crate", "Seasonal Mixed Fruit Crate", "Bulk Exotic Fruit Box"] },
    { title: "Wholesale Fruit Groups", items: ["Wholesale Citrus Fruit Box", "Bulk Berry Pack", "Wholesale Apple Pear Crate", "Organic Fruits"] },
    { title: "50+ Variety Coverage", items: ["Tropical Fruits", "Citrus Fruits", "Berries", "Stone Fruits", "Indian Seasonal Fruits", "Exotic Fruits"] }
  ],

  // DAIRY & EGGS
  "dairy": [
    { title: "Milk", items: ["Cow Milk", "Buffalo Milk", "Goat Milk", "Camel Milk", "Toned Milk", "Full Cream"] },
    { title: "Milk Products", items: ["Curd (Yogurt)", "Butter", "Ghee", "Paneer", "Cheese"] },
    { title: "Cream & Malai", items: ["Fresh Cream", "Whipping Cream", "Milk Cream"] },
    { title: "Eggs", items: ["Farm Eggs", "Country Eggs", "Duck Eggs", "Quail Eggs", "Omega-3 Eggs"] }
  ],

  // MEAT & POULTRY
  "meat": [
    { title: "Chicken", items: ["Broiler Chicken", "Country Chicken", "Chicken Legs", "Chicken Breast", "Chicken Wings", "Chicken Mince"] },
    { title: "Mutton", items: ["Goat Meat", "Lamb Meat", "Mutton Pieces", "Mutton Mince"] },
    { title: "Pork", items: ["Pork Shoulder", "Pork Belly", "Pork Chops", "Pork Mince"] },
    { title: "Other Meat", items: ["Rabbit Meat", "Quail Meat"] }
  ],

  // FISH & SEAFOOD
  "fish": [
    { title: "Freshwater Fish", items: ["Rohu", "Catla", "Mrigal", "Tilapia", "Pangasius", "Common Carp"] },
    { title: "Marine Fish", items: ["Pomfret", "Mackerel", "Sardines", "Tuna", "Seer Fish", "King Fish", "Salmon"] },
    { title: "Prawns & Shrimp", items: ["Tiger Prawns", "White Prawns", "Freshwater Prawns", "Shrimp"] },
    { title: "Other Seafood", items: ["Crabs", "Lobsters", "Squid", "Cuttlefish", "Clams", "Mussels"] },
    { title: "Dry Fish", items: ["Sundried Fish", "Fish Pickle", "Prawn Pickle"] }
  ],

  // SPICES & CONDIMENTS
  "spices": [
    { title: "Powdered Spices", items: ["Turmeric Powder", "Red Chilli Powder", "Coriander Powder", "Cumin Powder"] },
    { title: "Whole Spices", items: ["Black Pepper", "Cardamom", "Clove", "Cinnamon", "Nutmeg", "Mace"] },
    { title: "Seed Spices", items: ["Cumin Seeds", "Fenugreek Seeds", "Mustard Seeds", "Fennel Seeds", "Ajwain"] },
    { title: "Chillies", items: ["Dry Red Chillies", "Green Chillies", "Byadgi Chilli", "Kashmiri Chilli"] },
    { title: "Ready Mixes", items: ["Garam Masala", "Sambar Powder", "Rasam Powder", "Curry Powder", "Biryani Masala"] },
    { title: "Pastes", items: ["Ginger-Garlic Paste", "Tomato Puree", "Tamarind Paste", "Coconut Paste"] },
    { title: "Salt & Sugar", items: ["Iodized Salt", "Rock Salt", "Sea Salt", "Sugar", "Brown Sugar", "Jaggery", "Honey"] }
  ],

  // FLOWERS
  "flowers": [
    { title: "Traditional Flowers", items: ["Jasmine", "Marigold", "Rose", "Chrysanthemum", "Tuberose"] },
    { title: "Exotic Flowers", items: ["Orchids", "Gerbera", "Carnation", "Lilies", "Tulips"] },
    { title: "Florist Supplies", items: ["Bouquets", "Garlands", "Flower Arrangements"] },
    { title: "Decorative", items: ["Dry Flowers", "Potpourri", "Artificial Flowers"] }
  ],

  // ORGANIC PRODUCE
  "organic-produce": [
    { title: "Organic Vegetables", items: ["Organic Tomatoes", "Organic Spinach", "Organic Carrots", "Organic Potatoes"] },
    { title: "Organic Fruits", items: ["Organic Bananas", "Organic Apples", "Organic Mangoes", "Organic Oranges"] },
    { title: "Organic Grains", items: ["Organic Rice", "Organic Wheat", "Organic Millets"] },
    { title: "Certified Products", items: ["USDA Organic", "India Organic", "EU Organic Certified"] }
  ],

  // DAIRY ANIMALS
  "dairy-animals": [
    { title: "Cows", items: ["Jersey", "Holstein Friesian", "Indigenous Breeds", "Crossbreeds", "Gir", "Sahiwal"] },
    { title: "Buffaloes", items: ["Murrah", "Surti", "Jaffarabadi", "Nili Ravi"] },
    { title: "Goats", items: ["Saanen", "Alpine", "Jamunapari", "Beetal"] },
    { title: "Sheep", items: ["Milk Producing Breeds"] }
  ],

  // MEAT ANIMALS
  "meat-animals": [
    { title: "Goats", items: ["Boer", "Black Bengal", "Sirohi", "Osmanabadi"] },
    { title: "Sheep", items: ["Mutton Breeds", "Deccani", "Nellore"] },
    { title: "Pigs", items: ["Yorkshire", "Landrace", "Hampshire", "Large White"] },
    { title: "Poultry", items: ["Broiler Chicks", "Layer Chicks"] }
  ],

  // POULTRY
  "poultry": [
    { title: "Chickens", items: ["Broiler Chicks", "Layer Chicks", "Country Chicken", "Kadaknath"] },
    { title: "Ducks & Geese", items: ["Khaki Campbell", "Indian Runner", "White Pekin"] },
    { title: "Turkey", items: ["Broad Breasted White", "Bronze Turkey"] },
    { title: "Quail", items: ["Japanese Quail", "Bobwhite Quail"] },
    { title: "Other", items: ["Guinea Fowl", "Emu", "Ostrich"] }
  ],

  // AQUACULTURE
  "aquaculture": [
    { title: "Fish Fingerlings", items: ["Rohu", "Catla", "Mrigal", "Tilapia", "Pangasius"] },
    { title: "Shrimp Post-Larvae", items: ["Vannamei", "Tiger Prawn", "Black Tiger"] },
    { title: "Ornamental Fish", items: ["Goldfish", "Koi", "Guppies", "Mollies", "Angel Fish"] },
    { title: "Equipment", items: ["Nets", "Feed", "Aerators", "Tanks", "Filters"] }
  ],

  // PACKAGED / READY-TO-EAT
  "packaged": [
    { title: "Snacks", items: ["Chips", "Biscuits", "Cookies", "Noodles", "Pasta"] },
    { title: "Breakfast Items", items: ["Cornflakes", "Oats", "Poha", "Upma Mix", "Muesli", "Daliya"] },
    { title: "Sweets", items: ["Chocolates", "Toffees", "Ice Cream", "Indian Sweets"] },
    { title: "Beverages", items: ["Juice", "Soft Drinks", "Energy Drinks", "Health Drinks"] },
    { title: "Ready Meals", items: ["Ready-to-Eat Curries", "Instant Mixes", "Frozen Foods"] }
  ],

  // BAKERY
  "bakery": [
    { title: "Bread", items: ["White Bread", "Brown Bread", "Multigrain Bread", "Buns", "Rolls", "Pav"] },
    { title: "Cakes & Pastries", items: ["Cakes", "Pastries", "Cookies", "Donuts", "Muffins"] },
    { title: "Bakery Ingredients", items: ["Yeast", "Baking Powder", "Baking Soda", "Vanilla Essence"] }
  ],

  // SEEDS
  "seeds": [
    { title: "Field Crop Seeds", items: ["Paddy Seeds", "Wheat Seeds", "Maize Seeds", "Pulses Seeds"] },
    { title: "Vegetable Seeds", items: ["Tomato Seeds", "Brinjal Seeds", "Chilli Seeds", "Okra Seeds"] },
    { title: "Fruit Saplings", items: ["Mango Plants", "Banana Plants", "Citrus Plants", "Guava Plants"] },
    { title: "Flower Seeds", items: ["Seasonal Flowers", "Perennial Flowers", "Rose Plants"] },
    { title: "Tissue Culture", items: ["Banana TC", "Sugarcane TC", "Flower TC"] }
  ],

  // FERTILIZERS
  "fertilizers": [
    { title: "Chemical Fertilizers", items: ["Urea", "DAP", "MOP", "NPK", "SSP"] },
    { title: "Organic Fertilizers", items: ["Vermicompost", "Farmyard Manure", "Compost", "Green Manure"] },
    { title: "Biofertilizers", items: ["Rhizobium", "Azospirillum", "Azotobacter", "PSB", "VAM"] },
    { title: "Micronutrients", items: ["Zinc", "Boron", "Iron", "Manganese", "Copper"] }
  ],

  // PESTICIDES
  "pesticides": [
    { title: "Insecticides", items: ["Contact Insecticides", "Systemic Insecticides", "Stomach Poisons"] },
    { title: "Fungicides", items: ["Contact Fungicides", "Systemic Fungicides", "Seed Treatment"] },
    { title: "Herbicides", items: ["Pre-emergence", "Post-emergence", "Selective", "Non-selective"] },
    { title: "Biopesticides", items: ["Neem-based", "Microbial", "Botanical"] },
    { title: "Growth Regulators", items: ["Plant Hormones", "Growth Promoters"] }
  ],

  // TOOLS
  "tools": [
    { title: "Hand Tools", items: ["Spade", "Shovel", "Hoe", "Rake", "Sickle", "Pruning Knife", "Secateurs"] },
    { title: "Cutting Tools", items: ["Axe", "Billhook", "Machete", "Pruning Saw"] },
    { title: "Measuring Tools", items: ["Measuring Tape", "Moisture Meter", "pH Meter", "Soil Tester"] },
    { title: "Carrying Tools", items: ["Basket", "Bucket", "Wheelbarrow", "Crates"] }
  ],

  // MACHINERY
  "machinery": [
    { title: "Tractors & Implements", items: ["Tractors", "Plough", "Harrow", "Cultivator", "Rotavator"] },
    { title: "Harvesting Machines", items: ["Combine Harvester", "Reaper", "Thresher", "Winnower"] },
    { title: "Processing Machines", items: ["Grinder", "Mill", "Huller", "Polisher"] },
    { title: "Planting Machines", items: ["Seed Drill", "Transplanter", "Dibbler"] }
  ],

  // IRRIGATION
  "irrigation": [
    { title: "Drip Irrigation", items: ["Drip Lines", "Emitters", "Filters", "Valves", "Controllers"] },
    { title: "Sprinkler Systems", items: ["Sprinklers", "Pipes", "Pumps", "Risers"] },
    { title: "Pumps", items: ["Submersible Pumps", "Centrifugal Pumps", "Solar Pumps", "Diesel Pumps"] },
    { title: "Pipes & Fittings", items: ["PVC Pipes", "HDPE Pipes", "Fittings", "Couplers"] }
  ],

  // PROTECTIVE GEAR
  "protective-gear": [
    { title: "Clothing", items: ["Gloves", "Boots", "Hats", "Raincoats", "Aprons"] },
    { title: "Safety Equipment", items: ["Masks", "Goggles", "Ear Protection", "First Aid Kits"] },
    { title: "Storage", items: ["Silos", "Grain Bags", "Storage Bins", "Containers"] }
  ],

  // ANIMAL HUSBANDRY EQUIPMENT
  "animal-equipment": [
    { title: "Milking Machines", items: ["Hand Milking", "Machine Milking", "Portable Milkers"] },
    { title: "Feed Equipment", items: ["Feed Grinder", "Mixer", "Troughs", "Feeders"] },
    { title: "Shelter Equipment", items: ["Shed Materials", "Fencing", "Waterers", "Flooring"] },
    { title: "Health Equipment", items: ["Veterinary Kit", "Weighing Scale", "Dehorners"] }
  ],

  // SPICE POWDERS (processed)
  "spice-powders": [
    { title: "Whole Spices", items: ["All Whole Varieties", "Premium Selection"] },
    { title: "Powdered Spices", items: ["All Ground Spices", "Fresh Ground"] },
    { title: "Spice Blends", items: ["Curry Powders", "Masala Blends", "BBQ Rubs"] },
    { title: "Specialty", items: ["Saffron", "Vanilla", "Star Anise", "Truffles"] }
  ],

  // PICKLES & PRESERVES
  "pickles": [
    { title: "Fruit Pickles", items: ["Mango Pickle", "Lemon Pickle", "Amla Pickle", "Mixed Fruit"] },
    { title: "Vegetable Pickles", items: ["Mixed Pickle", "Chilli Pickle", "Garlic Pickle", "Ginger Pickle"] },
    { title: "Preserves", items: ["Jams", "Marmalades", "Squashes", "Syrups"] },
    { title: "Chutneys", items: ["Coconut Chutney", "Tomato Chutney", "Mint Chutney", "Tamarind Chutney"] }
  ],

  // HEALTH FOODS
  "health-foods": [
    { title: "Organic Products", items: ["Organic Cereals", "Organic Pulses", "Organic Spices"] },
    { title: "Millet Products", items: ["Millet Flours", "Millet Snacks", "Millet Cookies"] },
    { title: "Superfoods", items: ["Spirulina", "Chia Seeds", "Flax Seeds", "Quinoa", "Hemp Seeds"] },
    { title: "Supplements", items: ["Protein Powders", "Herbal Supplements", "Vitamins"] }
  ],

  // BEVERAGES
  "beverages": [
    { title: "Tea", items: ["Green Tea", "Black Tea", "Herbal Tea", "Masala Tea", "Oolong"] },
    { title: "Coffee", items: ["Coffee Beans", "Ground Coffee", "Instant Coffee", "Filter Coffee"] },
    { title: "Juices", items: ["Fresh Juices", "Packaged Juices", "Concentrates", "Nectars"] },
    { title: "Health Drinks", items: ["Herbal Infusions", "Ayurvedic Drinks", "Malt Drinks"] }
  ],

  // SNACKS
  "snacks": [
    { title: "Traditional Snacks", items: ["Murukku", "Mixture", "Chakli", "Seedai", "Namkeen"] },
    { title: "Healthy Snacks", items: ["Roasted Nuts", "Diet Snacks", "Protein Bars"] },
    { title: "Sweets", items: ["Traditional Sweets", "Chocolates", "Ladoo", "Barfi"] },
    { title: "Instant Mixes", items: ["Idli Mix", "Dosa Mix", "Vada Mix", "Upma Mix"] }
  ],

  // ORGANIC PRODUCTS
  "organic": [
    { title: "Organic Produce", items: ["Organic Fruits", "Organic Vegetables"] },
    { title: "Organic Grains", items: ["Organic Rice", "Organic Wheat", "Organic Millets"] },
    { title: "Organic Spices", items: ["Organic Turmeric", "Organic Pepper", "Organic Cardamom"] },
    { title: "Certified", items: ["USDA Organic", "India Organic", "EU Organic"] }
  ],

  // MEDICINAL PLANTS
  "medicinal": [
    { title: "Fresh Herbs", items: ["Tulsi", "Aloe Vera", "Mint", "Curry Leaves", "Neem"] },
    { title: "Dried Herbs", items: ["Ashwagandha", "Brahmi", "Shatavari", "Giloy", "Triphala"] },
    { title: "Powders & Capsules", items: ["Herbal Powders", "Capsules", "Tablets"] },
    { title: "Raw Materials", items: ["Roots", "Bark", "Leaves", "Flowers", "Seeds"] }
  ],

  // AROMATIC PLANTS
  "aromatic": [
    { title: "Essential Oil Plants", items: ["Lemongrass", "Vetiver", "Palmarosa", "Citronella"] },
    { title: "Fragrance Plants", items: ["Jasmine", "Tuberose", "Rose", "Mogra"] },
    { title: "Aromatic Herbs", items: ["Mint", "Basil", "Rosemary", "Lavender", "Thyme"] }
  ],

  // MUSHROOMS
  "mushrooms": [
    { title: "Fresh Mushrooms", items: ["Button Mushroom", "Oyster Mushroom", "Milky Mushroom"] },
    { title: "Exotic Mushrooms", items: ["Shiitake", "Portobello", "Enoki", "King Oyster"] },
    { title: "Mushroom Spawn", items: ["Button Spawn", "Oyster Spawn", "Specialty Spawn"] },
    { title: "Dry Mushrooms", items: ["Sun-dried Varieties", "Dehydrated Mushrooms"] }
  ],

  // HONEY
  "honey": [
    { title: "Natural Honey", items: ["Multiflora Honey", "Single Flower Honey", "Wild Honey"] },
    { title: "Specialty Honey", items: ["Forest Honey", "Organic Honey", "Manuka Honey", "Acacia"] },
    { title: "Bee Products", items: ["Beeswax", "Propolis", "Royal Jelly", "Bee Pollen"] }
  ],

  // PREMIUM CROPS
  "premium-crops": [
    { title: "Saffron", items: ["Kashmiri Saffron", "Iranian Saffron", "Spanish Saffron"] },
    { title: "Vanilla", items: ["Vanilla Beans", "Vanilla Extract", "Vanilla Powder"] },
    { title: "Specialty Spices", items: ["Green Cardamom", "True Cinnamon", "Clove", "Nutmeg"] }
  ],

  // PLANTATION CROPS
  "plantation": [
    { title: "Tea", items: ["Green Leaf", "Processed Tea", "CTC Tea", "Orthodox Tea"] },
    { title: "Coffee", items: ["Coffee Cherries", "Processed Coffee", "Arabica", "Robusta"] },
    { title: "Rubber", items: ["Rubber Sheets", "Latex", "Crepe Rubber"] },
    { title: "Coconut", items: ["Tender Coconut", "Copra", "Coconut Oil", "Coir"] }
  ],

  // FIBRE CROPS
  "fibre": [
    { title: "Cotton", items: ["Raw Cotton", "Cotton Bales", "Cotton Lint", "Cotton Seeds"] },
    { title: "Jute", items: ["Raw Jute", "Jute Products", "Jute Bags"] },
    { title: "Coir", items: ["Coir Fibre", "Coir Products", "Coir Pith"] },
    { title: "Other", items: ["Hemp", "Flax", "Sisal"] }
  ],

  // TIMBER
  "timber": [
    { title: "Timber", items: ["Teak Wood", "Eucalyptus", "Mahogany", "Rosewood", "Neem Wood"] },
    { title: "Bamboo", items: ["Bamboo Poles", "Bamboo Products", "Bamboo Shoots"] },
    { title: "Wood Products", items: ["Plywood", "Furniture", "Crafts", "Wood Chips"] }
  ],

  // ANIMAL FEED
  "animal-feed": [
    { title: "Cattle Feed", items: ["Concentrates", "Supplements", "Mineral Mixture", "Bypass Fat"] },
    { title: "Poultry Feed", items: ["Starter Feed", "Grower Feed", "Layer Feed", "Broiler Feed"] },
    { title: "Fish Feed", items: ["Floating Pellets", "Sinking Pellets", "Shrimp Feed"] },
    { title: "Fodder", items: ["Napier Grass", "Sorghum Fodder", "Maize Fodder", "Lucerne"] }
  ],

  // AGRI-WASTE
  "agri-waste": [
    { title: "Biomass", items: ["Rice Husk", "Wheat Straw", "Sugarcane Bagasse", "Corn Stover"] },
    { title: "Oil Cakes", items: ["Groundnut Cake", "Mustard Cake", "Coconut Cake", "Sesame Cake"] },
    { title: "By-Products", items: ["Molasses", "Bran", "Husk", "Spent Grain"] }
  ],

  // SUPERMARKET - FOOD & BEVERAGES
  "food-beverages": [
    { title: "Staple Foods", items: ["Rice", "Wheat", "Flour", "Pulses", "Pasta", "Noodles"] },
    { title: "Snacks", items: ["Chips", "Biscuits", "Namkeen", "Chocolates", "Candy"] },
    { title: "Beverages", items: ["Tea", "Coffee", "Juice", "Soft Drinks", "Water"] },
    { title: "Dairy", items: ["Milk", "Curd", "Cheese", "Butter", "Ice Cream"] }
  ],

  // PERSONAL CARE
  "personal-care": [
    { title: "Bath & Shower", items: ["Soap", "Shampoo", "Conditioner", "Body Wash", "Loofah"] },
    { title: "Oral Care", items: ["Toothpaste", "Toothbrush", "Mouthwash", "Dental Floss"] },
    { title: "Skin Care", items: ["Face Wash", "Moisturizer", "Sunscreen", "Face Cream"] },
    { title: "Hair Care", items: ["Hair Oil", "Hair Color", "Hair Gel", "Serum"] }
  ],

  // HOME & KITCHEN
  "home-kitchen": [
    { title: "Cookware", items: ["Pans", "Pots", "Kadai", "Pressure Cooker", "Tawa"] },
    { title: "Storage", items: ["Containers", "Jars", "Bottles", "Lunch Box"] },
    { title: "Cleaning", items: ["Mops", "Brooms", "Dustpan", "Scrubbers"] },
    { title: "Appliances", items: ["Mixer", "Grinder", "Toaster", "Kettle"] }
  ],

  // HOUSEHOLD
  "household": [
    { title: "Cleaning Supplies", items: ["Detergent", "Dishwash", "Floor Cleaner", "Glass Cleaner"] },
    { title: "Paper Products", items: ["Tissue Paper", "Toilet Paper", "Kitchen Towels"] },
    { title: "Pest Control", items: ["Mosquito Repellent", "Cockroach Killer", "Rat Poison"] },
    { title: "Air Fresheners", items: ["Room Spray", "Incense", "Candles", "Diffusers"] }
  ],

  // CLOTHING
  "clothing": [
    { title: "Men's Wear", items: ["Shirts", "Pants", "T-Shirts", "Kurtas", "Jackets"] },
    { title: "Women's Wear", items: ["Sarees", "Kurtis", "Dresses", "Tops", "Leggings"] },
    { title: "Kids Wear", items: ["Boys Clothing", "Girls Clothing", "Baby Clothes"] },
    { title: "Accessories", items: ["Belts", "Wallets", "Bags", "Scarves"] }
  ],

  // HEALTH & WELLNESS
  "health-wellness": [
    { title: "Medicines", items: ["OTC Medicines", "First Aid", "Pain Relief", "Cold & Flu"] },
    { title: "Vitamins", items: ["Multivitamins", "Vitamin C", "Vitamin D", "Calcium"] },
    { title: "Fitness", items: ["Protein Powder", "Energy Bars", "Sports Drinks"] },
    { title: "Personal Health", items: ["BP Monitor", "Thermometer", "Glucometer"] }
  ],

  // STATIONERY
  "stationery": [
    { title: "Writing", items: ["Pens", "Pencils", "Markers", "Highlighters"] },
    { title: "Paper", items: ["Notebooks", "A4 Sheets", "Sticky Notes", "Envelopes"] },
    { title: "Office", items: ["Stapler", "Scissors", "Tape", "Files", "Folders"] },
    { title: "Art Supplies", items: ["Colors", "Brushes", "Canvas", "Sketchbooks"] }
  ],

  // PET CARE
  "pet-care": [
    { title: "Dog Supplies", items: ["Dog Food", "Dog Treats", "Dog Toys", "Dog Bed"] },
    { title: "Cat Supplies", items: ["Cat Food", "Cat Litter", "Cat Toys", "Cat Tree"] },
    { title: "Bird Supplies", items: ["Bird Food", "Bird Cage", "Bird Toys"] },
    { title: "Fish Supplies", items: ["Fish Food", "Aquarium", "Filter", "Decorations"] }
  ],

  // AUTOMOTIVE
  "automotive": [
    { title: "Car Care", items: ["Car Wash", "Polish", "Wax", "Air Freshener"] },
    { title: "Accessories", items: ["Seat Covers", "Floor Mats", "Phone Holder"] },
    { title: "Maintenance", items: ["Engine Oil", "Coolant", "Brake Fluid"] },
    { title: "Tools", items: ["Jack", "Tire Pump", "Jumper Cables"] }
  ],

  // BABY & KIDS
  "baby-kids": [
    { title: "Diapers", items: ["Newborn", "Medium", "Large", "XL", "Pants Style"] },
    { title: "Baby Food", items: ["Formula", "Cereal", "Puree", "Snacks"] },
    { title: "Baby Care", items: ["Baby Oil", "Baby Powder", "Baby Lotion", "Wipes"] },
    { title: "Toys", items: ["Soft Toys", "Building Blocks", "Educational Toys"] }
  ],

  // SPORTS & OUTDOORS
  "sports-outdoors": [
    { title: "Fitness", items: ["Dumbbells", "Yoga Mat", "Resistance Bands", "Skipping Rope"] },
    { title: "Sports", items: ["Cricket", "Football", "Badminton", "Tennis"] },
    { title: "Outdoor", items: ["Tent", "Sleeping Bag", "Camping Chair", "Torch"] },
    { title: "Cycling", items: ["Bicycle", "Helmet", "Pump", "Lock"] }
  ],

  // BOOKS & MEDIA
  "books-media": [
    { title: "Books", items: ["Fiction", "Non-Fiction", "Children's Books", "Educational"] },
    { title: "Magazines", items: ["News", "Fashion", "Sports", "Technology"] },
    { title: "Music", items: ["CDs", "Vinyl", "Instruments"] },
    { title: "Movies", items: ["DVDs", "Blu-ray"] }
  ],

  // GARDENING
  "gardening": [
    { title: "Plants", items: ["Indoor Plants", "Outdoor Plants", "Flowering", "Succulents"] },
    { title: "Seeds", items: ["Vegetable Seeds", "Flower Seeds", "Herb Seeds"] },
    { title: "Tools", items: ["Trowel", "Pruner", "Watering Can", "Gloves"] },
    { title: "Pots & Planters", items: ["Ceramic Pots", "Plastic Pots", "Hanging Planters"] }
  ],

  // TRAVEL
  "travel": [
    { title: "Luggage", items: ["Suitcase", "Backpack", "Duffle Bag", "Trolley"] },
    { title: "Accessories", items: ["Passport Cover", "Luggage Tag", "Travel Pillow"] },
    { title: "Electronics", items: ["Power Bank", "Travel Adapter", "Headphones"] },
    { title: "Comfort", items: ["Eye Mask", "Ear Plugs", "Neck Pillow"] }
  ],

  // RELIGIOUS
  "religious": [
    { title: "Puja Items", items: ["Incense", "Camphor", "Agarbatti", "Diyas"] },
    { title: "Idols", items: ["Ganesha", "Lakshmi", "Shiva", "Krishna"] },
    { title: "Accessories", items: ["Puja Thali", "Bell", "Kalash", "Mala"] },
    { title: "Festivals", items: ["Diwali Items", "Holi Colors", "Rakhi", "Christmas Decor"] }
  ],

  // PARTY
  "party": [
    { title: "Decorations", items: ["Balloons", "Streamers", "Banners", "Confetti"] },
    { title: "Tableware", items: ["Paper Plates", "Cups", "Napkins", "Cutlery"] },
    { title: "Gifts", items: ["Gift Bags", "Wrapping Paper", "Ribbons", "Bows"] },
    { title: "Costumes", items: ["Masks", "Hats", "Wigs", "Props"] }
  ],

  // SERVICES - FARMING
  "farming-services": [
    { title: "Land Preparation", items: ["Ploughing", "Levelling", "Tilling", "Bunding"] },
    { title: "Planting Services", items: ["Sowing", "Transplanting", "Dibbling"] },
    { title: "Harvesting", items: ["Manual Harvesting", "Machine Harvesting", "Picking"] },
    { title: "Processing", items: ["Threshing", "Winnowing", "Milling", "Drying"] }
  ],

  // IRRIGATION SERVICES
  "irrigation-services": [
    { title: "Installation", items: ["Drip Setup", "Sprinkler Setup", "Micro Irrigation"] },
    { title: "Maintenance", items: ["Repair Services", "Cleaning Services", "AMC"] },
    { title: "Water Management", items: ["Borewell Drilling", "Pond Digging", "Rainwater Harvesting"] }
  ],

  // TRANSPORT
  "transport": [
    { title: "Goods Transport", items: ["Truck", "Tractor", "Mini Truck", "Pickup Van"] },
    { title: "Animal Transport", items: ["Livestock Transport", "Cattle Carrier"] },
    { title: "Cold Chain", items: ["Refrigerated Transport", "Reefer Trucks", "Cold Vans"] }
  ],

  // PROCESSING SERVICES
  "processing": [
    { title: "Milling", items: ["Rice Mill", "Flour Mill", "Oil Mill", "Dal Mill"] },
    { title: "Extraction", items: ["Oil Extraction", "Juice Extraction", "Essential Oil"] },
    { title: "Packaging", items: ["Weighing", "Packing", "Labeling", "Sealing"] },
    { title: "Storage", items: ["Cold Storage", "Warehousing", "Godown"] }
  ],

  // ADVISORY
  "advisory": [
    { title: "Soil Testing", items: ["Soil Sample Analysis", "Nutrient Analysis", "pH Testing"] },
    { title: "Crop Consulting", items: ["Expert Advice", "Planning", "Crop Selection"] },
    { title: "Market Intelligence", items: ["Price Trends", "Demand Forecasting", "Market Access"] },
    { title: "Scheme Assistance", items: ["Application Help", "Documentation", "Follow-up"] }
  ],

  // SUBSIDIES
  "subsidies": [
    { title: "Seed Subsidy", items: ["Certified Seeds", "Hybrid Seeds", "Foundation Seeds"] },
    { title: "Fertilizer Subsidy", items: ["Urea Subsidy", "DAP Subsidy", "NPK Subsidy"] },
    { title: "Machinery Subsidy", items: ["Tractors", "Implements", "Tools", "Pumps"] },
    { title: "Irrigation Subsidy", items: ["Drip", "Sprinkler", "Solar Pumps"] }
  ],

  // INSURANCE
  "insurance": [
    { title: "Crop Insurance", items: ["PMFBY", "WBCIS", "Other Schemes"] },
    { title: "Livestock Insurance", items: ["Cattle Insurance", "Poultry Insurance", "Fish Insurance"] },
    { title: "Equipment Insurance", items: ["Machinery", "Tools", "Infrastructure"] },
    { title: "Health Insurance", items: ["Farmer Health Schemes", "Ayushman Bharat"] }
  ],

  // TRAINING
  "training": [
    { title: "New Techniques", items: ["Organic Farming", "Precision Farming", "Protected Cultivation"] },
    { title: "Skill Development", items: ["Processing", "Packaging", "Marketing", "Value Addition"] },
    { title: "Special Programs", items: ["Women Farmers", "Youth Programs", "SHG Training"] },
    { title: "Digital Literacy", items: ["Mobile Apps", "Online Marketing", "Digital Payments"] }
  ],

  // FINANCIAL
  "finance": [
    { title: "Loans", items: ["Kisan Credit Card", "Farm Loans", "Crop Loans", "Term Loans"] },
    { title: "Grants", items: ["Subsidy Grants", "Project Grants", "NABARD Schemes"] },
    { title: "Support Prices", items: ["MSP Information", "Procurement", "Price Support"] },
    { title: "Market Linkage", items: ["E-NAM", "Direct Marketing", "FPO Support"] }
  ],

  // HYDROPONICS
  "hydroponics": [
    { title: "Systems", items: ["NFT System", "DWC System", "Ebb & Flow", "Drip System"] },
    { title: "Plants", items: ["Lettuce", "Herbs", "Strawberries", "Leafy Greens", "Tomatoes"] },
    { title: "Nutrients", items: ["Hydroponic Nutrients", "pH Controllers", "EC Meters"] },
    { title: "Equipment", items: ["Grow Lights", "Pumps", "Tanks", "Net Pots"] }
  ],

  // AEROPONICS
  "aeroponics": [
    { title: "Systems", items: ["Aeroponic Towers", "Fogponics", "High Pressure Aero"] },
    { title: "Plants", items: ["Seed Potato", "Exotic Herbs", "Leafy Greens", "Microgreens"] },
    { title: "Equipment", items: ["Misters", "Timers", "Sensors", "Nozzles"] }
  ],

  // VERTICAL FARMING
  "vertical": [
    { title: "Systems", items: ["Vertical Racks", "Tower Gardens", "Stacking Systems"] },
    { title: "Plants", items: ["Microgreens", "Basil", "Mint", "Salad Greens", "Herbs"] },
    { title: "Equipment", items: ["LED Lights", "Climate Control", "Automation", "Sensors"] }
  ],

  // GREENHOUSE
  "greenhouse": [
    { title: "Structures", items: ["Polyhouse", "Shade Net", "Greenhouse", "Net House"] },
    { title: "Plants", items: ["Tomato", "Capsicum", "Cucumber", "Exotic Vegetables", "Flowers"] },
    { title: "Equipment", items: ["Cooling Pads", "Fans", "Irrigation", "Automation"] }
  ],

  // PRECISION FARMING
  "precision": [
    { title: "Sensors", items: ["Soil Sensors", "Weather Stations", "Crop Sensors", "NDVI"] },
    { title: "Drones", items: ["Spraying Drones", "Monitoring Drones", "Mapping Drones"] },
    { title: "Robotics", items: ["Harvesting Robots", "Weeding Robots", "Sorting Robots"] },
    { title: "Smart Irrigation", items: ["Automated Systems", "Soil Moisture Sensors", "Controllers"] }
  ],

  // DIETARY CATEGORIES
  "keto": [
    { title: "Proteins", items: ["Eggs", "Chicken", "Fish", "Cheese", "Paneer"] },
    { title: "Fats", items: ["Butter", "Ghee", "Coconut Oil", "Olive Oil", "Avocado"] },
    { title: "Low-Carb Veggies", items: ["Spinach", "Broccoli", "Cauliflower", "Zucchini"] },
    { title: "Snacks", items: ["Nuts", "Seeds", "Keto Bars", "Cheese Chips"] }
  ],

  "high-protein": [
    { title: "Meat", items: ["Chicken Breast", "Lean Beef", "Turkey", "Fish"] },
    { title: "Dairy", items: ["Greek Yogurt", "Cottage Cheese", "Eggs", "Milk"] },
    { title: "Plant Protein", items: ["Tofu", "Tempeh", "Lentils", "Chickpeas"] },
    { title: "Supplements", items: ["Whey Protein", "Casein", "Plant Protein", "BCAA"] }
  ],

  "vegan": [
    { title: "Proteins", items: ["Tofu", "Tempeh", "Seitan", "Legumes", "Quinoa"] },
    { title: "Dairy Alternatives", items: ["Almond Milk", "Oat Milk", "Coconut Yogurt", "Vegan Cheese"] },
    { title: "Vegetables", items: ["All Fresh Vegetables", "Leafy Greens", "Root Vegetables"] },
    { title: "Snacks", items: ["Vegan Bars", "Dried Fruits", "Nuts", "Seeds"] }
  ],

  "gluten-free": [
    { title: "Grains", items: ["Rice", "Quinoa", "Buckwheat", "Millet", "Amaranth"] },
    { title: "Flours", items: ["Rice Flour", "Almond Flour", "Coconut Flour", "Tapioca Flour"] },
    { title: "Snacks", items: ["GF Crackers", "Rice Cakes", "GF Cookies"] },
    { title: "Pasta", items: ["Rice Pasta", "Corn Pasta", "Quinoa Pasta"] }
  ],

  "dairy-free": [
    { title: "Milk Alternatives", items: ["Almond Milk", "Soy Milk", "Oat Milk", "Coconut Milk"] },
    { title: "Cheese Alternatives", items: ["Cashew Cheese", "Coconut Cheese", "Soy Cheese"] },
    { title: "Yogurt Alternatives", items: ["Coconut Yogurt", "Almond Yogurt", "Soy Yogurt"] },
    { title: "Butter Alternatives", items: ["Coconut Oil", "Olive Oil Spread", "Vegan Butter"] }
  ],

  "diabetic": [
    { title: "Low GI Foods", items: ["Whole Grains", "Legumes", "Non-Starchy Vegetables"] },
    { title: "Proteins", items: ["Lean Meats", "Fish", "Eggs", "Tofu"] },
    { title: "Healthy Fats", items: ["Nuts", "Seeds", "Avocado", "Olive Oil"] },
    { title: "Sugar-Free", items: ["Stevia", "Erythritol", "Sugar-Free Snacks"] }
  ],

  "heart-healthy": [
    { title: "Omega-3 Foods", items: ["Salmon", "Mackerel", "Walnuts", "Flax Seeds"] },
    { title: "Fiber-Rich", items: ["Oats", "Barley", "Beans", "Vegetables"] },
    { title: "Low Sodium", items: ["Fresh Herbs", "Unsalted Nuts", "Fresh Vegetables"] },
    { title: "Healthy Oils", items: ["Olive Oil", "Avocado Oil", "Canola Oil"] }
  ],

  "pregnancy": [
    { title: "Folate-Rich", items: ["Spinach", "Lentils", "Asparagus", "Fortified Cereals"] },
    { title: "Iron-Rich", items: ["Lean Meat", "Spinach", "Beans", "Fortified Foods"] },
    { title: "Calcium", items: ["Milk", "Yogurt", "Cheese", "Fortified Alternatives"] },
    { title: "Protein", items: ["Eggs", "Fish", "Chicken", "Legumes"] }
  ],

  "baby-nutrition": [
    { title: "Stage 1 (4-6 months)", items: ["Rice Cereal", "Single Vegetable Purees", "Single Fruit Purees"] },
    { title: "Stage 2 (6-8 months)", items: ["Mixed Purees", "Soft Finger Foods", "Yogurt"] },
    { title: "Stage 3 (8-12 months)", items: ["Chunky Foods", "Soft Meats", "Pasta"] },
    { title: "Formula", items: ["Infant Formula", "Follow-on Formula", "Toddler Milk"] }
  ],

  "senior-nutrition": [
    { title: "Easy to Digest", items: ["Soups", "Soft Foods", "Smoothies", "Porridge"] },
    { title: "High Calcium", items: ["Milk", "Cheese", "Fortified Foods", "Leafy Greens"] },
    { title: "High Fiber", items: ["Whole Grains", "Fruits", "Vegetables", "Legumes"] },
    { title: "Protein-Rich", items: ["Fish", "Eggs", "Dairy", "Legumes"] }
  ],

  "paleo": [
    { title: "Meats", items: ["Grass-Fed Beef", "Free-Range Chicken", "Wild Fish"] },
    { title: "Vegetables", items: ["All Non-Starchy Vegetables", "Root Vegetables"] },
    { title: "Fruits", items: ["Berries", "Apples", "Citrus", "Tropical Fruits"] },
    { title: "Nuts & Seeds", items: ["Almonds", "Walnuts", "Sunflower Seeds", "Pumpkin Seeds"] }
  ],

  "mediterranean": [
    { title: "Olive Oil", items: ["Extra Virgin", "Virgin", "Regular Olive Oil"] },
    { title: "Seafood", items: ["Fish", "Shrimp", "Mussels", "Octopus"] },
    { title: "Grains", items: ["Whole Wheat", "Barley", "Bulgur", "Couscous"] },
    { title: "Legumes", items: ["Chickpeas", "Lentils", "Beans", "Fava Beans"] }
  ],

  "whole30": [
    { title: "Proteins", items: ["Meat", "Poultry", "Seafood", "Eggs"] },
    { title: "Vegetables", items: ["All Fresh Vegetables", "Leafy Greens"] },
    { title: "Fruits", items: ["All Fresh Fruits (in moderation)"] },
    { title: "Fats", items: ["Ghee", "Coconut Oil", "Olive Oil", "Avocado"] }
  ],

  "ayurvedic": [
    { title: "Sattvic Foods", items: ["Fresh Fruits", "Vegetables", "Whole Grains", "Legumes"] },
    { title: "Spices", items: ["Turmeric", "Ginger", "Cumin", "Coriander", "Fennel"] },
    { title: "Herbs", items: ["Tulsi", "Ashwagandha", "Brahmi", "Triphala"] },
    { title: "Dairy", items: ["Ghee", "Fresh Milk", "Buttermilk", "Yogurt"] }
  ],

  // LAND LEASING
  "agricultural-land": [
    { title: "By Size", items: ["Small (1-5 acres)", "Medium (5-20 acres)", "Large (20+ acres)"] },
    { title: "By Type", items: ["Irrigated", "Rain-fed", "Mixed"] },
    { title: "By Crop", items: ["Rice Suitable", "Wheat Suitable", "Multi-crop"] },
    { title: "Terms", items: ["Short Term", "Long Term", "Seasonal"] }
  ],

  "irrigated-land": [
    { title: "Irrigation Type", items: ["Canal Irrigated", "Well Irrigated", "Drip Installed", "Sprinkler Ready"] },
    { title: "Water Source", items: ["Bore Well", "Open Well", "River", "Tank"] },
    { title: "Availability", items: ["Year-round Water", "Seasonal", "On-demand"] }
  ],

  "government-land": [
    { title: "Programs", items: ["FPO Land", "Cooperative Farms", "Government Schemes"] },
    { title: "Terms", items: ["Long-term Lease", "Subsidized Rates", "With Training"] }
  ],

  "specialty-land": [
    { title: "Organic Certified", items: ["Certified Organic", "In-Conversion", "Chemical-Free"] },
    { title: "Special Features", items: ["Greenhouse Ready", "Cold Storage", "Processing Unit"] }
  ],

  "short-term-lease": [
    { title: "Duration", items: ["Seasonal (3 months)", "Half-Year", "One Crop Cycle"] },
    { title: "Purpose", items: ["Trial Farming", "Seasonal Crops", "Contract Farming"] }
  ],

  // LOGISTICS
  "international-shipping": [
    { title: "Services", items: ["Air Freight", "Sea Freight", "Express Courier", "Economy"] },
    { title: "Regions", items: ["Europe", "USA", "Middle East", "Asia Pacific"] },
    { title: "Partners", items: ["DHL", "FedEx", "UPS", "Maersk"] }
  ],

  "national-logistics": [
    { title: "Services", items: ["Express Delivery", "Standard Delivery", "Economy"] },
    { title: "Vehicle Types", items: ["Trucks", "Mini Trucks", "Vans", "Two-wheelers"] },
    { title: "Partners", items: ["Blue Dart", "DTDC", "Delhivery", "XpressBees"] }
  ],

  "hyperlocal-delivery": [
    { title: "Speed", items: ["10-minute Delivery", "Same Day", "Next Day"] },
    { title: "Partners", items: ["Dunzo", "Swiggy Genie", "Porter", "Rapido"] }
  ],

  "cold-chain": [
    { title: "Temperature", items: ["Frozen (-18C)", "Chilled (2-8C)", "Cool (8-15C)"] },
    { title: "Products", items: ["Dairy", "Meat", "Fruits", "Vegetables", "Medicines"] },
    { title: "Partners", items: ["Cold Chain UK", "FreshLinc", "Snowman"] }
  ],

  "freight-forwarding": [
    { title: "Services", items: ["Full Container", "Part Load", "Bulk Cargo"] },
    { title: "Mode", items: ["Road", "Rail", "Sea", "Air"] },
    { title: "Partners", items: ["Maersk", "DB Schenker", "DHL Freight"] }
  ],

  "milk-run": [
    { title: "Features", items: ["Smart Batching", "Route Optimization", "Cost Savings 60-70%"] },
    { title: "Ideal For", items: ["Multiple Pickups", "Cluster Delivery", "Regular Routes"] }
  ],

  // SHARE & CARE
  "restaurant-surplus": [
    { title: "Food Types", items: ["Cooked Meals", "Prepared Items", "Ingredients"] },
    { title: "Timing", items: ["End of Day", "After Events", "Overstocked"] }
  ],

  "home-surplus": [
    { title: "Categories", items: ["Home Cooked", "Fresh Produce", "Pantry Items"] },
    { title: "Occasions", items: ["Festival Leftovers", "Party Surplus", "Moving Out"] }
  ],

  "retail-surplus": [
    { title: "Types", items: ["Near Expiry", "Cosmetic Damage", "Overstocked"] },
    { title: "Products", items: ["Groceries", "Bakery", "Fresh Produce"] }
  ],

  "production-surplus": [
    { title: "Industries", items: ["Food Manufacturing", "Farms", "Bakeries"] },
    { title: "Types", items: ["Overproduction", "Off-spec", "Trial Batches"] }
  ],

  "event-surplus": [
    { title: "Events", items: ["Weddings", "Corporate Events", "Parties", "Conferences"] },
    { title: "Items", items: ["Catering Food", "Packaged Items", "Beverages"] }
  ],

  "free-food": [
    { title: "Listings", items: ["Available Now", "Scheduled Pickup", "Delivery Available"] },
    { title: "Types", items: ["Cooked Food", "Raw Ingredients", "Packaged Food"] }
  ]
};

// Get sub-subcategory data for a given subcategory ID
export function getSubSubcategories(subId: string): SubSubItem[] {
  return subSubcategoryData[subId] || [];
}
