// ─────────────────────────────────────────────────────────────────────────────
// Product image resolver — keyword → Unsplash photo ID
// IMPORTANT: more-specific / multi-word keywords MUST come before their
// component single words so they match first.
// ─────────────────────────────────────────────────────────────────────────────

import { categoryImages } from "./categories";

// Local stock-image keyword map. Resolved BEFORE the remote Unsplash map
// because (a) bundled assets always load and (b) many of the Unsplash photo
// IDs in the remote map have rotted, leaving every card showing the same
// default vegetable basket. Order matters — multi-word entries first.
const LOCAL_KEYWORD_MAP: Array<[string, string]> = [
  // Grains / cereals
  ["basmati rice", "grains"], ["brown rice", "grains"], ["white rice", "grains"],
  ["red rice", "grains"], ["jasmine rice", "grains"], ["wild rice", "grains"],
  ["black rice", "grains"], ["rice", "grains"],
  ["whole wheat", "wheat"], ["wheat flour", "wheat"], ["wheat", "wheat"],
  ["semolina", "wheat"], ["suji", "wheat"], ["maida", "wheat"], ["atta", "wheat"],
  ["barley", "wheat"], ["oats", "wheat"], ["corn", "wheat"], ["maize", "wheat"],
  ["ragi", "millets"], ["jowar", "millets"], ["bajra", "millets"],
  ["foxtail millet", "millets"], ["finger millet", "millets"], ["millet", "millets"],
  ["sorghum", "millets"], ["quinoa", "millets"], ["buckwheat", "millets"],

  // Pulses / lentils
  ["masoor dal", "pulses"], ["toor dal", "pulses"], ["moong dal", "pulses"],
  ["urad dal", "pulses"], ["chana dal", "pulses"], ["arhar", "pulses"],
  ["dal", "pulses"], ["lentil", "pulses"], ["chickpea", "pulses"],
  ["kidney bean", "pulses"], ["black bean", "pulses"], ["bean", "pulses"],
  ["pea", "pulses"], ["pulse", "pulses"],

  // Oils
  ["mustard oil", "oils"], ["sunflower oil", "oils"], ["coconut oil", "oils"],
  ["olive oil", "oils"], ["sesame oil", "oils"], ["groundnut oil", "oils"],
  ["palm oil", "oils"], ["oil", "oils"], ["ghee", "oils"],

  // Vegetables (specific names → specific stock images)
  ["cherry tomato", "tomato"], ["tomato", "tomato"],
  ["sweet potato", "potato"], ["potato", "potato"],
  ["onion", "onion"], ["shallot", "onion"], ["garlic", "onion"],
  ["spinach", "spinach"], ["kale", "spinach"], ["lettuce", "spinach"],
  ["fenugreek", "spinach"], ["coriander", "spinach"], ["cilantro", "spinach"],
  ["mint", "spinach"],
  ["carrot", "carrot"], ["beetroot", "carrot"], ["radish", "carrot"],
  ["turnip", "carrot"],
  ["leafy", "spinach"], ["greens", "spinach"], ["salad", "spinach"],
  ["cabbage", "vegetables"], ["cauliflower", "vegetables"],
  ["broccoli", "vegetables"], ["pumpkin", "vegetables"],
  ["squash", "vegetables"], ["courgette", "vegetables"],
  ["zucchini", "vegetables"], ["cucumber", "vegetables"],
  ["pepper", "vegetables"], ["chilli", "vegetables"], ["chili", "vegetables"],
  ["brinjal", "vegetables"], ["eggplant", "vegetables"], ["okra", "vegetables"],
  ["bhindi", "vegetables"], ["gourd", "vegetables"], ["bean sprout", "vegetables"],
  ["vegetable", "vegetables"],

  // Fruits (specific → specific)
  ["apple", "apple"], ["pear", "apple"],
  ["mango", "mango"], ["papaya", "mango"], ["pineapple", "mango"],
  ["banana", "banana"], ["plantain", "banana"],
  ["orange", "orange"], ["lemon", "orange"], ["lime", "orange"],
  ["mandarin", "orange"], ["tangerine", "orange"],
  ["grape", "grapes"], ["raisin", "grapes"],
  ["berry", "grapes"], ["strawberry", "grapes"], ["blueberry", "grapes"],
  ["raspberry", "grapes"],
  ["watermelon", "fruits"], ["melon", "fruits"], ["peach", "fruits"],
  ["plum", "fruits"], ["cherry", "fruits"], ["apricot", "fruits"],
  ["pomegranate", "fruits"], ["guava", "fruits"], ["fig", "fruits"],
  ["coconut", "fruits"], ["fruit", "fruits"],

  // Dairy & eggs
  ["milk", "dairy"], ["yoghurt", "dairy"], ["yogurt", "dairy"],
  ["curd", "dairy"], ["cheese", "dairy"], ["butter", "dairy"],
  ["cream", "dairy"], ["paneer", "dairy"], ["egg", "dairy"],

  // Meat & poultry
  ["chicken", "poultry"], ["duck", "poultry"], ["turkey", "poultry"],
  ["mutton", "meat"], ["lamb", "meat"], ["goat", "meat"],
  ["beef", "meat"], ["pork", "meat"], ["bacon", "meat"], ["sausage", "meat"],
  ["meat", "meat"],

  // Fish & seafood
  ["prawn", "seafood"], ["shrimp", "seafood"], ["crab", "seafood"],
  ["lobster", "seafood"], ["salmon", "fish"], ["tuna", "fish"],
  ["pomfret", "fish"], ["mackerel", "fish"], ["fish", "fish"],

  // Spices & condiments
  ["turmeric", "spices"], ["cumin", "spices"], ["coriander powder", "spices"],
  ["chilli powder", "spices"], ["garam masala", "spices"], ["cardamom", "spices"],
  ["clove", "spices"], ["cinnamon", "spices"], ["pepper powder", "spices"],
  ["spice", "spices"], ["masala", "spices"], ["salt", "spices"],

  // Other
  ["tea", "tea"], ["coffee", "coffee"],
  ["honey", "honey"], ["jaggery", "honey"], ["sugar", "honey"],
  ["mushroom", "mushrooms"],
  ["herb", "medicinal"], ["aloe", "medicinal"], ["tulsi", "medicinal"],
  ["ashwagandha", "medicinal"], ["neem", "medicinal"],
  ["flower", "flowers"], ["rose", "flowers"], ["marigold", "flowers"],
  ["jasmine", "flowers"],
  ["bread", "bakery"], ["bun", "bakery"], ["cake", "bakery"],
  ["biscuit", "bakery"], ["cookie", "bakery"], ["pastry", "bakery"],
  ["pickle", "pickles"], ["preserve", "pickles"], ["jam", "pickles"],
  ["chutney", "pickles"],
  ["snack", "snacks"], ["chips", "snacks"], ["namkeen", "snacks"],

  // Inputs / tools
  ["seed", "seeds"], ["sapling", "seeds"], ["seedling", "seeds"],
  ["fertilizer", "fertilizers"], ["fertiliser", "fertilizers"],
  ["compost", "fertilizers"], ["manure", "fertilizers"],
  ["pesticide", "pesticides"], ["insecticide", "pesticides"],
  ["herbicide", "pesticides"], ["fungicide", "pesticides"],
  ["spade", "tools"], ["shovel", "tools"], ["sickle", "tools"],
  ["plough", "tools"], ["plow", "tools"], ["hoe", "tools"], ["tool", "tools"],
  ["tractor", "machinery"], ["harvester", "machinery"], ["thresher", "machinery"],
  ["machinery", "machinery"], ["machine", "machinery"],
  ["drip", "irrigation"], ["sprinkler", "irrigation"], ["pump", "irrigation"],
  ["irrigation", "irrigation"],
  ["glove", "protective-gear"], ["mask", "protective-gear"],
  ["boot", "protective-gear"], ["protective", "protective-gear"],
  ["cotton", "fibre"], ["jute", "fibre"], ["silk", "fibre"],
  ["bamboo", "timber"], ["timber", "timber"], ["wood", "timber"],
  ["feed", "animal-feed"], ["fodder", "animal-feed"], ["hay", "animal-feed"],
];

// Resolve a product name + optional category to a locally-bundled stock image
// path. Returns undefined if no match (caller can then fall back to remote).
function resolveLocalImage(productName: string, categoryId?: string): string | undefined {
  const lower = productName.toLowerCase();
  for (const [keyword, imgKey] of LOCAL_KEYWORD_MAP) {
    if (lower.includes(keyword) && categoryImages[imgKey]) {
      return categoryImages[imgKey];
    }
  }
  if (categoryId && categoryImages[categoryId]) return categoryImages[categoryId];
  return undefined;
}

const PRODUCT_IMAGE_MAP: [string, string][] = [
  // ── Multi-word (most specific first) ──────────────────────────────────────

  // Dietary / health specific
  ["bone broth",          "photo-1547592180-85f173990554"],  // broth/soup
  ["mct oil",             "photo-1474979266404-7eaacbcd87c5"], // oil bottle
  ["coconut aminos",      "photo-1523671125079-0a43266a0d4f"], // coconut
  ["almond butter",       "photo-1509440159596-0249088772ff"], // almonds
  ["almond flour",        "photo-1509440159596-0249088772ff"], // almonds
  ["almond milk",         "photo-1563636619-e9143da7973b"],    // milk
  ["oat milk",            "photo-1563636619-e9143da7973b"],    // milk
  ["whey protein",        "photo-1584466977773-e625c37cdd50"], // protein powder
  ["hemp protein",        "photo-1574323347407-f5e1ad6d020b"], // grains
  ["protein powder",      "photo-1584466977773-e625c37cdd50"], // protein
  ["chia seeds",          "photo-1574323347407-f5e1ad6d020b"], // seeds
  ["flax seeds",          "photo-1574323347407-f5e1ad6d020b"], // seeds
  ["flaxseeds",           "photo-1574323347407-f5e1ad6d020b"], // seeds
  ["sunflower seeds",     "photo-1521566652839-697aa473761a"], // sunflower
  ["pumpkin seeds",       "photo-1574323347407-f5e1ad6d020b"], // seeds
  ["sesame seeds",        "photo-1574323347407-f5e1ad6d020b"], // seeds
  ["fenugreek seeds",     "photo-1596040033229-a9821ebd058d"], // spice seeds
  ["mustard seeds",       "photo-1596040033229-a9821ebd058d"], // seeds
  ["cumin seeds",         "photo-1596040033229-a9821ebd058d"], // spice
  ["fennel seeds",        "photo-1596040033229-a9821ebd058d"], // spice
  ["bitter melon",        "photo-1540420828642-fca2c5c18abe"], // vegetable
  ["sweet potato",        "photo-1596097635121-14b63b7a0c19"], // sweet potato
  ["sweet corn",          "photo-1601593346740-925612772716"], // corn
  ["spring onion",        "photo-1618512496248-a07fe83aa8cb"], // onion

  // Meat multi-word
  ["grass-fed beef",      "photo-1603048297172-c92544798d5a"], // beef
  ["grass fed beef",      "photo-1603048297172-c92544798d5a"],
  ["beef jerky",          "photo-1603048297172-c92544798d5a"],
  ["goat mutton",         "photo-1602470520998-f4a52199a3d6"], // mutton
  ["lamb mutton",         "photo-1602470520998-f4a52199a3d6"],
  ["rabbit meat",         "photo-1603360946369-dc9bb6258143"],
  ["duck meat",           "photo-1587593810167-a84920ea084e"], // poultry
  ["quail meat",          "photo-1587593810167-a84920ea084e"],
  ["wild salmon",         "photo-1519708227418-c8fd9a32b7a2"], // salmon
  ["fresh prawns",        "photo-1565680018093-ebb6d90c7f2a"], // prawns
  ["king fish",           "photo-1544943910-4c1dc44aab44"],   // fish
  ["dried fish",          "photo-1534604973900-c43ab4c2e0ab"], // fish
  ["broiler chicken",     "photo-1587593810167-a84920ea084e"],
  ["chicken breast",      "photo-1587593810167-a84920ea084e"],
  ["chicken legs",        "photo-1587593810167-a84920ea084e"],

  // Dairy multi-word
  ["cow milk",            "photo-1563636619-e9143da7973b"],
  ["buffalo milk",        "photo-1563636619-e9143da7973b"],
  ["goat milk",           "photo-1563636619-e9143da7973b"],
  ["skimmed milk",        "photo-1563636619-e9143da7973b"],
  ["fresh cream",         "photo-1563636619-e9143da7973b"],
  ["greek yogurt",        "photo-1571212515416-fca988083c56"],
  ["cheddar cheese",      "photo-1552767059-ce182ead6c1b"],
  ["paneer",              "photo-1571212515416-fca988083c56"], // white cheese-like

  // Grain multi-word
  ["basmati rice",        "photo-1536304993881-ff86e0c9e69e"],
  ["brown rice",          "photo-1536304993881-ff86e0c9e69e"],
  ["jasmine rice",        "photo-1536304993881-ff86e0c9e69e"],
  ["white rice",          "photo-1536304993881-ff86e0c9e69e"],
  ["red rice",            "photo-1536304993881-ff86e0c9e69e"],
  ["wild rice",           "photo-1536304993881-ff86e0c9e69e"],
  ["whole wheat",         "photo-1574323347407-f5e1ad6d020b"],
  ["buckwheat flour",     "photo-1574323347407-f5e1ad6d020b"],
  ["gluten-free oats",    "photo-1574323347407-f5e1ad6d020b"],
  ["gluten free oats",    "photo-1574323347407-f5e1ad6d020b"],
  ["quinoa",              "photo-1574323347407-f5e1ad6d020b"],
  ["black rice",          "photo-1536304993881-ff86e0c9e69e"],

  // Fruit multi-word
  ["organic dates",       "photo-1524593689816-62ab4d7be0b0"],
  ["kalamata olives",     "photo-1576673442511-7e39b6545c87"],
  ["extra virgin olive",  "photo-1474979266404-7eaacbcd87c5"],
  ["passion fruit",       "photo-1560806887-1e4cd0b6cbd6"],
  ["dragon fruit",        "photo-1565699694970-d0d55564b6c3"],
  ["jack fruit",          "photo-1560593281-4f87f91f6b2a"],

  // Spice multi-word
  ["black pepper",        "photo-1596040033229-a9821ebd058d"],
  ["red chilli",          "photo-1588252303782-cb80119abd6d"],
  ["red chili",           "photo-1588252303782-cb80119abd6d"],
  ["kashmiri red",        "photo-1588252303782-cb80119abd6d"],
  ["green cardamom",      "photo-1596040033229-a9821ebd058d"],
  ["cinnamon sticks",     "photo-1599940824399-b87987ceb72a"],
  ["garam masala",        "photo-1615485925600-97237c4fc1ec"],
  ["sambar powder",       "photo-1615485925600-97237c4fc1ec"],
  ["coriander powder",    "photo-1615485925600-97237c4fc1ec"],
  ["turmeric powder",     "photo-1615485291234-9d694218aeb4"],
  ["cumin powder",        "photo-1615485291234-9d694218aeb4"],
  ["rock salt",           "photo-1596040033229-a9821ebd058d"],

  // Ayurvedic / herbal
  ["triphala powder",     "photo-1512621776951-a57141f2eefd"],
  ["chyawanprash",        "photo-1512621776951-a57141f2eefd"],
  ["ashwagandha",         "photo-1512621776951-a57141f2eefd"],
  ["neem oil",            "photo-1576045057995-568f588f82fb"],

  // Honey multi-word
  ["raw honey",           "photo-1587049352846-4a222e784d38"],
  ["organic honey",       "photo-1587049352846-4a222e784d38"],

  // Legumes multi-word
  ["green moong",         "photo-1610725664285-7c57e6eeac3f"],
  ["black lentil",        "photo-1610725664285-7c57e6eeac3f"],
  ["red lentil",          "photo-1610725664285-7c57e6eeac3f"],
  ["yellow lentil",       "photo-1610725664285-7c57e6eeac3f"],
  ["kidney beans",        "photo-1567375698348-5d9d5ae99de0"],
  ["black beans",         "photo-1567375698348-5d9d5ae99de0"],
  ["green peas",          "photo-1615485925763-86786288908a"],
  ["split peas",          "photo-1615485925763-86786288908a"],
  ["chickpea flour",      "photo-1515543237350-b3eea1ec8082"],

  // Modern farming equipment
  ["hydroponic nft",      "photo-1585435557343-3b09799b17bc"],
  ["hydroponic nutrient", "photo-1585435557343-3b09799b17bc"],
  ["aeroponic tower",     "photo-1585435557343-3b09799b17bc"],
  ["vertical farm",       "photo-1585435557343-3b09799b17bc"],
  ["led grow light",      "photo-1585435557343-3b09799b17bc"],
  ["greenhouse net",      "photo-1585435421671-2b978a8aa0b8"],
  ["drip irrigation",     "photo-1562592306-af43e7cfce0a"],
  ["variable rate",       "photo-1558618666-fcd25c85cd64"],

  // Oil multi-word
  ["mustard oil",         "photo-1474979266404-7eaacbcd87c5"],
  ["coconut oil",         "photo-1523671125079-0a43266a0d4f"],
  ["groundnut oil",       "photo-1474979266404-7eaacbcd87c5"],
  ["sunflower oil",       "photo-1474979266404-7eaacbcd87c5"],
  ["sesame oil",          "photo-1474979266404-7eaacbcd87c5"],
  ["neem oil",            "photo-1576045057995-568f588f82fb"],

  // Seed products
  ["cotton seed",         "photo-1588252303782-cb80119abd6d"],
  ["groundnut seed",      "photo-1509479100390-f83a8349e79c"],

  // Jaggery / sugar
  ["jaggery",             "photo-1590779033100-9f60705a2f3b"],
  ["palm sugar",          "photo-1590779033100-9f60705a2f3b"],
  ["sugarcane juice",     "photo-1601595616430-7c07a688dc22"],

  // Silkworm / sericulture
  ["silk cocoon",         "photo-1543286386-713bdd548da4"],
  ["silkworm",            "photo-1543286386-713bdd548da4"],
  ["cocoon",              "photo-1543286386-713bdd548da4"],
  ["mulberry",            "photo-1570913149827-d2ac84ab3f9a"],

  // Forestry / timber
  ["bamboo shoot",        "photo-1578662996442-48f60103fc96"],
  ["sandalwood",          "photo-1539651044896-76c4d2a94a81"],
  ["rosewood",            "photo-1539651044896-76c4d2a94a81"],
  ["teak",                "photo-1539651044896-76c4d2a94a81"],

  // Fishery
  ["prawn seed",          "photo-1565680018093-ebb6d90c7f2a"],
  ["fish feed",           "photo-1544943910-4c1dc44aab44"],
  ["fresh fish",          "photo-1544943910-4c1dc44aab44"],

  // Bio products
  ["biofuel pellet",      "photo-1416879595882-3373a0480b5b"],
  ["bio compost",         "photo-1553448571-41b0d567c2a1"],

  // ── Single keywords ──────────────────────────────────────────────────────

  // Vegetables
  ["tomato",      "photo-1592924357228-91a4daadcfea"],
  ["potato",      "photo-1596910547705-b75df20c3e12"],
  ["spinach",     "photo-1576045057995-568f588f82fb"],
  ["onion",       "photo-1618512496248-a07fe83aa8cb"],
  ["garlic",      "photo-1540148426945-6cf22a6b2383"],
  ["carrot",      "photo-1598170845058-32b9d6a5da37"],
  ["broccoli",    "photo-1459411552884-841db9b3cc2a"],
  ["cabbage",     "photo-1551754655-cd27e38d2076"],
  ["cucumber",    "photo-1449300079323-02e209d9d3a6"],
  ["cauliflower", "photo-1568584711075-3d021a7c3ca3"],
  ["lettuce",     "photo-1622206151226-18ca2c9ab4a1"],
  ["peas",        "photo-1615485925763-86786288908a"],
  ["capsicum",    "photo-1563565375-f3fdfdbefa83"],
  ["beetroot",    "photo-1593105544559-ecb03bf76f82"],
  ["radish",      "photo-1606588260160-0c4707ab7db5"],
  ["ginger",      "photo-1615485925600-97237c4fc1ec"],
  ["pumpkin",     "photo-1570586437263-ab629fccc818"],
  ["zucchini",    "photo-1563252722-6434563a985d"],
  ["asparagus",   "photo-1515471209610-dae1c92d8777"],
  ["kale",        "photo-1576045057995-568f588f82fb"],
  ["brinjal",     "photo-1590393533632-7060377e6946"],
  ["eggplant",    "photo-1590393533632-7060377e6946"],
  ["okra",        "photo-1464454709131-ffd692591ee5"],
  ["leek",        "photo-1540420828642-fca2c5c18abe"],
  ["celery",      "photo-1615485291234-9d694218aeb4"],
  ["corn",        "photo-1601593346740-925612772716"],
  ["maize",       "photo-1601593346740-925612772716"],
  ["chilli",      "photo-1588252303782-cb80119abd6d"],
  ["chili",       "photo-1588252303782-cb80119abd6d"],
  ["pepper",      "photo-1563565375-f3fdfdbefa83"],
  ["artichoke",   "photo-1518977676601-b53f82aba655"],
  ["yam",         "photo-1596097635121-14b63b7a0c19"],
  ["taro",        "photo-1596097635121-14b63b7a0c19"],
  ["parsnip",     "photo-1598170845058-32b9d6a5da37"],
  ["turnip",      "photo-1593105544559-ecb03bf76f82"],
  ["kohlrabi",    "photo-1551754655-cd27e38d2076"],

  // Fruits
  ["apple",       "photo-1568702846914-96b305d2aaeb"],
  ["banana",      "photo-1603833665858-e61d17a86224"],
  ["mango",       "photo-1605027990121-cbae9e0642df"],
  ["grape",       "photo-1537640538966-79f369143f8f"],
  ["strawberry",  "photo-1543528176-61b239494933"],
  ["orange",      "photo-1580052614034-c55d20bfee3b"],
  ["lemon",       "photo-1590502593747-be9f0b3ede47"],
  ["lime",        "photo-1590502593747-be9f0b3ede47"],
  ["pineapple",   "photo-1490885578174-acda8905c2c6"],
  ["watermelon",  "photo-1589984662646-e7b2e4962f18"],
  ["melon",       "photo-1571575173692-9b06d43c4e71"],
  ["peach",       "photo-1595421943028-a6b2e1f81b9f"],
  ["pear",        "photo-1615478503562-ec2d8aa0e24e"],
  ["cherry",      "photo-1528821128474-27f963b062bf"],
  ["blueberry",   "photo-1498557850523-fd3d118b962e"],
  ["raspberry",   "photo-1596591606975-97ee5cef3a1e"],
  ["pomegranate", "photo-1615485291254-c4fef61e35df"],
  ["coconut",     "photo-1523671125079-0a43266a0d4f"],
  ["papaya",      "photo-1617112848923-cc2234396a8d"],
  ["guava",       "photo-1559181567-c3190ca9959b"],
  ["plum",        "photo-1498557850523-fd3d118b962e"],
  ["fig",         "photo-1526318472351-c75fcf070305"],
  ["dates",       "photo-1524593689816-62ab4d7be0b0"],
  ["olive",       "photo-1576673442511-7e39b6545c87"],
  ["kiwi",        "photo-1585059895524-72359e06133a"],
  ["avocado",     "photo-1523049673857-eb18f1d7b578"],
  ["lychee",      "photo-1617112848923-cc2234396a8d"],
  ["jackfruit",   "photo-1560593281-4f87f91f6b2a"],
  ["tamarind",    "photo-1524593689816-62ab4d7be0b0"],

  // Dairy & Eggs
  ["milk",        "photo-1563636619-e9143da7973b"],
  ["egg",         "photo-1587486913049-53fc88980cfc"],
  ["butter",      "photo-1589985270826-4b7bb135bc9d"],
  ["cheese",      "photo-1552767059-ce182ead6c1b"],
  ["yogurt",      "photo-1571212515416-fca988083c56"],
  ["curd",        "photo-1571212515416-fca988083c56"],
  ["cream",       "photo-1563636619-e9143da7973b"],
  ["ghee",        "photo-1589985270826-4b7bb135bc9d"],
  ["lassi",       "photo-1563636619-e9143da7973b"],

  // Grains & Cereals
  ["wheat",       "photo-1574323347407-f5e1ad6d020b"],
  ["rice",        "photo-1536304993881-ff86e0c9e69e"],
  ["oat",         "photo-1574323347407-f5e1ad6d020b"],
  ["barley",      "photo-1574323347407-f5e1ad6d020b"],
  ["millet",      "photo-1574323347407-f5e1ad6d020b"],
  ["sorghum",     "photo-1574323347407-f5e1ad6d020b"],
  ["ragi",        "photo-1574323347407-f5e1ad6d020b"],
  ["jowar",       "photo-1574323347407-f5e1ad6d020b"],
  ["bajra",       "photo-1574323347407-f5e1ad6d020b"],
  ["flour",       "photo-1574323347407-f5e1ad6d020b"],
  ["bread",       "photo-1509440159596-0249088772ff"],
  ["sourdough",   "photo-1509440159596-0249088772ff"],
  ["porridge",    "photo-1574323347407-f5e1ad6d020b"],

  // Legumes & Pulses
  ["lentil",      "photo-1610725664285-7c57e6eeac3f"],
  ["chickpea",    "photo-1515543237350-b3eea1ec8082"],
  ["soybean",     "photo-1615485291254-c4fef61e35df"],
  ["peanut",      "photo-1509479100390-f83a8349e79c"],
  ["bean",        "photo-1567375698348-5d9d5ae99de0"],
  ["dal",         "photo-1610725664285-7c57e6eeac3f"],
  ["moong",       "photo-1610725664285-7c57e6eeac3f"],
  ["urad",        "photo-1610725664285-7c57e6eeac3f"],
  ["masoor",      "photo-1610725664285-7c57e6eeac3f"],
  ["toor",        "photo-1610725664285-7c57e6eeac3f"],
  ["rajma",       "photo-1567375698348-5d9d5ae99de0"],

  // Herbs & Spices
  ["turmeric",    "photo-1615485291234-9d694218aeb4"],
  ["coriander",   "photo-1512621776951-a57141f2eefd"],
  ["mint",        "photo-1615485291234-9d694218aeb4"],
  ["basil",       "photo-1618375557849-ad70b7b68e55"],
  ["thyme",       "photo-1600857544200-b2f666a9a2ec"],
  ["rosemary",    "photo-1600857544200-b2f666a9a2ec"],
  ["herb",        "photo-1600857544200-b2f666a9a2ec"],
  ["spice",       "photo-1596040033229-a9821ebd058d"],
  ["cinnamon",    "photo-1599940824399-b87987ceb72a"],
  ["saffron",     "photo-1604909052868-5c765b4dada1"],
  ["cardamom",    "photo-1596040033229-a9821ebd058d"],
  ["clove",       "photo-1596040033229-a9821ebd058d"],
  ["nutmeg",      "photo-1596040033229-a9821ebd058d"],
  ["masala",      "photo-1615485925600-97237c4fc1ec"],
  ["salt",        "photo-1596040033229-a9821ebd058d"],

  // Nuts & Seeds
  ["almond",      "photo-1509440159596-0249088772ff"],
  ["walnut",      "photo-1563412580-93a9c5355e9f"],
  ["cashew",      "photo-1563412580-93a9c5355e9f"],
  ["pistachio",   "photo-1563412580-93a9c5355e9f"],
  ["chia",        "photo-1574323347407-f5e1ad6d020b"],
  ["flaxseed",    "photo-1574323347407-f5e1ad6d020b"],
  ["sunflower",   "photo-1521566652839-697aa473761a"],
  ["seed",        "photo-1574323347407-f5e1ad6d020b"],
  ["sesame",      "photo-1596040033229-a9821ebd058d"],
  ["hazelnut",    "photo-1563412580-93a9c5355e9f"],
  ["pecan",       "photo-1563412580-93a9c5355e9f"],

  // Mushrooms
  ["mushroom",    "photo-1504545102780-26774c1bb073"],
  ["shiitake",    "photo-1504545102780-26774c1bb073"],
  ["oyster",      "photo-1504545102780-26774c1bb073"],
  ["truffle",     "photo-1504545102780-26774c1bb073"],

  // Honey & Bee Products
  ["honey",       "photo-1587049352846-4a222e784d38"],
  ["beeswax",     "photo-1587049352846-4a222e784d38"],
  ["propolis",    "photo-1587049352846-4a222e784d38"],
  ["pollen",      "photo-1587049352846-4a222e784d38"],

  // Poultry & Meat
  ["chicken",     "photo-1587593810167-a84920ea084e"],
  ["duck",        "photo-1587593810167-a84920ea084e"],
  ["turkey",      "photo-1587593810167-a84920ea084e"],
  ["quail",       "photo-1587593810167-a84920ea084e"],
  ["beef",        "photo-1603048297172-c92544798d5a"],
  ["pork",        "photo-1603048297172-c92544798d5a"],
  ["lamb",        "photo-1602470520998-f4a52199a3d6"],
  ["mutton",      "photo-1602470520998-f4a52199a3d6"],
  ["goat",        "photo-1602470520998-f4a52199a3d6"],
  ["meat",        "photo-1603048297172-c92544798d5a"],
  ["rabbit",      "photo-1603360946369-dc9bb6258143"],
  ["venison",     "photo-1603048297172-c92544798d5a"],

  // Fish & Seafood
  ["salmon",      "photo-1519708227418-c8fd9a32b7a2"],
  ["tuna",        "photo-1544943910-4c1dc44aab44"],
  ["prawn",       "photo-1565680018093-ebb6d90c7f2a"],
  ["shrimp",      "photo-1565680018093-ebb6d90c7f2a"],
  ["lobster",     "photo-1559737558-2f5a35f4523b"],
  ["crab",        "photo-1565680018093-ebb6d90c7f2a"],
  ["squid",       "photo-1565680018093-ebb6d90c7f2a"],
  ["mackerel",    "photo-1534604973900-c43ab4c2e0ab"],
  ["sardine",     "photo-1534604973900-c43ab4c2e0ab"],
  ["pomfret",     "photo-1534604973900-c43ab4c2e0ab"],
  ["rohu",        "photo-1544943910-4c1dc44aab44"],
  ["catla",       "photo-1544943910-4c1dc44aab44"],
  ["tilapia",     "photo-1544943910-4c1dc44aab44"],
  ["hilsa",       "photo-1544943910-4c1dc44aab44"],
  ["catfish",     "photo-1544943910-4c1dc44aab44"],
  ["fish",        "photo-1544943910-4c1dc44aab44"],

  // Oils
  ["oil",         "photo-1474979266404-7eaacbcd87c5"],

  // Tea & Coffee
  ["tea",         "photo-1563241527-3004b7be0b78"],
  ["coffee",      "photo-1447933601403-0c6688de566a"],
  ["matcha",      "photo-1563241527-3004b7be0b78"],

  // Flowers & Plants
  ["flower",      "photo-1490750967868-88df5691cc0b"],
  ["rose",        "photo-1490750967868-88df5691cc0b"],
  ["marigold",    "photo-1490750967868-88df5691cc0b"],
  ["jasmine",     "photo-1490750967868-88df5691cc0b"],
  ["tulip",       "photo-1490750967868-88df5691cc0b"],
  ["orchid",      "photo-1490750967868-88df5691cc0b"],
  ["lavender",    "photo-1490750967868-88df5691cc0b"],

  // Agricultural Inputs
  ["fertilizer",  "photo-1416879595882-3373a0480b5b"],
  ["compost",     "photo-1553448571-41b0d567c2a1"],
  ["manure",      "photo-1553448571-41b0d567c2a1"],
  ["pesticide",   "photo-1416879595882-3373a0480b5b"],
  ["herbicide",   "photo-1416879595882-3373a0480b5b"],
  ["fungicide",   "photo-1416879595882-3373a0480b5b"],
  ["insecticide", "photo-1416879595882-3373a0480b5b"],

  // Tools & Equipment
  ["tractor",     "photo-1605339837222-30a0dc6f6c2d"],
  ["tool",        "photo-1580674285054-bed31e145f59"],
  ["sickle",      "photo-1592921870789-04563d55041c"],
  ["pump",        "photo-1416879595882-3373a0480b5b"],
  ["sprayer",     "photo-1416879595882-3373a0480b5b"],
  ["drip",        "photo-1562592306-af43e7cfce0a"],
  ["harvester",   "photo-1605339837222-30a0dc6f6c2d"],
  ["plough",      "photo-1605339837222-30a0dc6f6c2d"],
  ["plow",        "photo-1605339837222-30a0dc6f6c2d"],

  // Bio-based
  ["biofertilizer","photo-1416879595882-3373a0480b5b"],
  ["vermicompost","photo-1553448571-41b0d567c2a1"],
  ["neem",        "photo-1576045057995-568f588f82fb"],
  ["herbal",      "photo-1512621776951-a57141f2eefd"],
  ["ayurvedic",   "photo-1512621776951-a57141f2eefd"],

  // Dietary/Health
  ["keto",        "photo-1490645935967-10de6ba17061"],
  ["protein",     "photo-1584466977773-e625c37cdd50"],
  ["vegan",       "photo-1512621776951-a57141f2eefd"],
  ["organic",     "photo-1540420828642-fca2c5c18abe"],
  ["spirulina",   "photo-1576045057995-568f588f82fb"],
  ["hemp",        "photo-1574323347407-f5e1ad6d020b"],
  ["tempeh",      "photo-1555949963-ff9fe0c870eb"],
  ["tofu",        "photo-1555949963-ff9fe0c870eb"],
  ["collagen",    "photo-1547592180-85f173990554"],
  ["probiotic",   "photo-1571212515416-fca988083c56"],
  ["supplement",  "photo-1584466977773-e625c37cdd50"],
  ["paleo",       "photo-1490645935967-10de6ba17061"],
  ["mediterranean","photo-1474979266404-7eaacbcd87c5"],
  ["whole30",     "photo-1490645935967-10de6ba17061"],
  ["gluten",      "photo-1574323347407-f5e1ad6d020b"],
  ["diabetic",    "photo-1540420828642-fca2c5c18abe"],
  ["calcium",     "photo-1596040033229-a9821ebd058d"],
  ["folic",       "photo-1576045057995-568f588f82fb"],
  ["pregnancy",   "photo-1576045057995-568f588f82fb"],

  // Modern Farming Tech
  ["hydroponic",  "photo-1585435557343-3b09799b17bc"],
  ["aeroponic",   "photo-1585435557343-3b09799b17bc"],
  ["vertical",    "photo-1585435557343-3b09799b17bc"],
  ["greenhouse",  "photo-1585435421671-2b978a8aa0b8"],
  ["drone",       "photo-1558618666-fcd25c85cd64"],
  ["solar",       "photo-1509391366360-2e959784a276"],
  ["sensor",      "photo-1558618666-fcd25c85cd64"],
  ["precision",   "photo-1558618666-fcd25c85cd64"],
  ["led",         "photo-1585435557343-3b09799b17bc"],
  ["aquaponic",   "photo-1585435557343-3b09799b17bc"],

  // Bamboo & Forestry
  ["bamboo",      "photo-1578662996442-48f60103fc96"],
  ["timber",      "photo-1539651044896-76c4d2a94a81"],
  ["wood",        "photo-1539651044896-76c4d2a94a81"],
  ["teak",        "photo-1539651044896-76c4d2a94a81"],

  // Commodity crops
  ["sugarcane",   "photo-1601595616430-7c07a688dc22"],
  ["sugar",       "photo-1601595616430-7c07a688dc22"],
  ["cotton",      "photo-1588252303782-cb80119abd6d"],
  ["jute",        "photo-1576045057995-568f588f82fb"],
  ["rubber",      "photo-1604909052868-5c765b4dada1"],
  ["tobacco",     "photo-1576045057995-568f588f82fb"],
  ["cocoa",       "photo-1447933601403-0c6688de566a"],
  ["vanilla",     "photo-1515543237350-b3eea1ec8082"],
];

const CATEGORY_FALLBACKS: Record<string, string> = {
  "daily-needs":        "photo-1540420828642-fca2c5c18abe",
  vegetables:           "photo-1540420828642-fca2c5c18abe",
  fruits:               "photo-1519996529931-28324d5a630e",
  dairy:                "photo-1563636619-e9143da7973b",
  grains:               "photo-1574323347407-f5e1ad6d020b",
  legumes:              "photo-1610725664285-7c57e6eeac3f",
  "herbs-spices":       "photo-1600857544200-b2f666a9a2ec",
  spices:               "photo-1596040033229-a9821ebd058d",
  "nuts-seeds":         "photo-1509440159596-0249088772ff",
  mushrooms:            "photo-1504545102780-26774c1bb073",
  flowers:              "photo-1490750967868-88df5691cc0b",
  "seeds-seedlings":    "photo-1574323347407-f5e1ad6d020b",
  "organic-manure":     "photo-1416879595882-3373a0480b5b",
  "agri-inputs":        "photo-1416879595882-3373a0480b5b",
  "farm-tools":         "photo-1580674285054-bed31e145f59",
  "agri-chemicals":     "photo-1416879595882-3373a0480b5b",
  poultry:              "photo-1587593810167-a84920ea084e",
  livestock:            "photo-1548550023-2bdb3c5beed7",
  fishery:              "photo-1544943910-4c1dc44aab44",
  meat:                 "photo-1603048297172-c92544798d5a",
  fish:                 "photo-1544943910-4c1dc44aab44",
  "bio-products":       "photo-1512621776951-a57141f2eefd",
  dietary:              "photo-1490645935967-10de6ba17061",
  "modern-farming":     "photo-1585435557343-3b09799b17bc",
  "commercial-crops":   "photo-1601595616430-7c07a688dc22",
  "daily-needs-grains": "photo-1574323347407-f5e1ad6d020b",
  "organic-produce":    "photo-1540420828642-fca2c5c18aeae",
  "dairy-animals":      "photo-1548550023-2bdb3c5beed7",
  "honey-products":     "photo-1587049352846-4a222e784d38",
  default:              "photo-1540420828642-fca2c5c18abe",
};

export function getProductImage(
  productName: string,
  categoryId?: string,
  size: "sm" | "md" | "lg" = "md"
): string {
  // 1. Local stock images first (always reliable, name-aware).
  const local = resolveLocalImage(productName, categoryId);
  if (local) return local;

  // 2. Remote Unsplash keyword map (legacy fallback — many photo IDs have
  //    rotted, but kept for product names we don't have stock images for).
  const w = size === "sm" ? "300" : size === "lg" ? "800" : "400";
  const h = size === "sm" ? "300" : size === "lg" ? "600" : "300";
  const base   = "https://images.unsplash.com/";
  const suffix = `?w=${w}&h=${h}&fit=crop&auto=format`;

  const lower = productName.toLowerCase();
  for (const [keyword, photoId] of PRODUCT_IMAGE_MAP) {
    if (lower.includes(keyword)) {
      return `${base}${photoId}${suffix}`;
    }
  }

  if (categoryId && CATEGORY_FALLBACKS[categoryId]) {
    return `${base}${CATEGORY_FALLBACKS[categoryId]}${suffix}`;
  }

  return `${base}${CATEGORY_FALLBACKS.default}${suffix}`;
}

// Named alias kept for backwards compat
export const resolveProductImage = getProductImage;
