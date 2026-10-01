// Demo data for CU Marketplace. Everything generated from this file is marked is_demo = true
// (except categories and locations, which are reference data). Remove with supabase/remove_demo.sql.

export const DEMO_DOMAIN = "demo.cu-marketplace.local";

export const categories = [
  ["fashion", "Fashion", "product"],
  ["food", "Food", "product"],
  ["electronics", "Electronics", "product"],
  ["beauty", "Beauty", "product"],
  ["services", "Services", "service"],
  ["books", "Books", "product"],
  ["accessories", "Accessories", "product"],
  ["school-essentials", "School Essentials", "product"],
  ["thrift", "Thrift", "product"],
  ["shoes", "Shoes", "product"],
  ["hair-beauty", "Hair & Beauty", "service"],
  ["photography", "Photography", "service"],
  ["tech", "Tech", "product"],
  ["laundry", "Laundry", "service"],
  ["tutoring", "Tutoring", "service"],
  ["other", "Other", "product"],
];

// [slug, name, zone, map_x, map_y] — schematic layout, not survey-accurate.
export const locations = [
  ["hostel-area-male", "Hostel area (male halls)", "hostels", 18, 12],
  ["hostel-area-female", "Hostel area (female halls)", "hostels", 80, 12],
  ["daniel-hall", "Daniel Hall", "hostels", 8, 17],
  ["joseph-hall", "Joseph Hall", "hostels", 8, 23],
  ["paul-hall", "Paul Hall", "hostels", 8, 29],
  ["peter-hall", "Peter Hall", "hostels", 8, 35],
  ["john-hall", "John Hall", "hostels", 8, 41],
  ["esther-hall", "Esther Hall", "hostels", 70, 17],
  ["mary-hall", "Mary Hall", "hostels", 70, 23],
  ["deborah-hall", "Deborah Hall", "hostels", 70, 29],
  ["lydia-hall", "Lydia Hall", "hostels", 70, 35],
  ["dorcas-hall", "Dorcas Hall", "hostels", 70, 41],
  ["student-centre", "Student Centre", "central", 38, 60],
  ["cafeteria-1", "Cafeteria 1", "central", 38, 48],
  ["cafeteria-2", "Cafeteria 2", "central", 38, 54],
  ["chapel-area", "University Chapel area", "central", 38, 66],
  ["library", "Centre for Learning Resources", "academic", 26, 80],
  ["cst", "College of Science & Technology", "academic", 26, 86],
  ["cmss", "College of Management & Social Sciences", "academic", 56, 80],
  ["main-gate", "Main gate", "other", 50, 95],
];

export const HOURS = {
  food: { mon: [["08:00", "20:00"]], tue: [["08:00", "20:00"]], wed: [["08:00", "20:00"]], thu: [["08:00", "20:00"]], fri: [["08:00", "20:00"]], sat: [["08:00", "20:00"]], sun: [["14:00", "19:00"]] },
  service: { mon: [["10:00", "18:00"]], tue: [["10:00", "18:00"]], wed: [["10:00", "18:00"]], thu: [["10:00", "18:00"]], fri: [["10:00", "18:00"]], sat: [["11:00", "16:00"]] },
  student: { mon: [["16:00", "21:00"]], tue: [["16:00", "21:00"]], wed: [["16:00", "21:00"]], thu: [["16:00", "21:00"]], fri: [["16:00", "21:00"]], sat: [["10:00", "18:00"]] },
};

export const buyers = [
  "tobi.adeyemi", "amara.okafor", "david.ojo", "blessing.uche", "victor.nwachukwu", "esther.olatunji",
  "michael.adewale", "precious.okeke", "joshua.ayodele", "favour.eze", "john.ibe", "deborah.akpan",
];

// Unsplash photo ids, keyed by a readable name. Verified by scripts/check-images.mjs.
export const IMG = {
  sneakerRed: "1542291026-7eec264c27ff", sneakerPair: "1549298916-b41d501d3772", sneakerWhite: "1600269452121-4f2416e55c28",
  sneakerSide: "1595950653106-6c9ebd614d3a", sneakerVans: "1525966222134-fcfa99b8ae77", sneakerRun: "1460353581641-37baddab0fa2",
  sneakerGrey: "1491553895911-0055eca6402d", sneakerHigh: "1514989940723-e8e51635b782",
  teeWhite: "1521572163474-6864f9cf17ab", teeStack: "1583743814966-8936f5b7be1a", teePrint: "1576566588028-4147f3842f27",
  hoodie: "1556821840-3a63f95609a7", hoodie2: "1620799140408-edc6dcb6d633", pants: "1624378439575-d8705ad7ae80",
  pants2: "1473966968600-fa801b869a1a", cap: "1588850561407-ed78c282e89b", cap2: "1521369909029-2afed882baee",
  denimJacket: "1576995853123-5a10305d93c0", denimJacket2: "1551537482-f2075a1d41f2", jeans: "1541099649105-f69ad21f3246",
  jeans2: "1542272604-787c3835535d", skirt: "1583496661160-fb5886a0aaaa", knit: "1434389677669-e08b4cac3105",
  dress: "1595777457583-95e059d581b8", dress2: "1515372039744-b8f02a3ae446", rack: "1489987707025-afc232f7ea0f",
  rack2: "1441984904996-e0b6ba687e04",
  friedRice: "1512058564366-18510be2db19", plate: "1504674900247-0877df9cc836", wrap: "1626700051175-6818013e1d4f",
  pasta: "1621996346565-e3dbc646d9a9", pasta2: "1563379926898-05f4575a45d8", drink: "1513558161293-cdaf765ed2fd",
  cake: "1578985545062-69928b1d9587", cake2: "1565958011703-44f9829ba187", cupcakes: "1576618148400-f54bed99fcfd",
  cookies: "1499636136210-6f4ee915583e", cookies2: "1558961363-fa8fdf82db35", bread: "1509440159596-0249088772ff",
  samosa: "1601050690597-df0568f70950",
  earbuds: "1590658268037-6bf12165a8df", earbuds2: "1606220588913-b3aacb4d2f46", powerbank: "1609091839311-d5365f9ff1c5",
  laptop: "1496181133206-80ce9b88a853", laptop2: "1517336714731-489689fd1ca8", phone: "1511707171634-5f897ff02aa9",
  headphones: "1505740420928-5e560c06d30e", headphones2: "1583394838336-acd977736f90",
  barber: "1503951914875-452162b0f3f1", barber2: "1585747860715-2ba37e788b70", barber3: "1621605815971-fbc98d665033",
  barber4: "1599351431202-1e0f0137899a",
  skincare: "1556228578-8c89e6adf883", skincare2: "1608248597279-f99d160bfcbc", serum: "1620916566398-39f1143ab7be",
  cream: "1571781926291-c477ebfd024b", lipgloss: "1586495777744-4413f21062fa", makeup: "1522335789203-aabd1fc54bc9",
  makeup2: "1596462502278-27bfdc403348",
  camera: "1502920917128-1aa500764cbd", camera2: "1516035069371-29a1b244cc32", camera3: "1452587925148-ce544e77e70d",
  books: "1495446815901-a7297e633e8d", book: "1544947950-fa07a98d237f", books2: "1512820790803-83ca734da794",
  books3: "1497633762265-9d179a990aa6", books4: "1532012197267-da84d127e765",
  perfume: "1541643600914-78b084683601", perfume2: "1592945403244-b3fbafd7f539", perfume3: "1523293182086-7651a899d37f",
  perfume4: "1588405748880-12d1d2a59f75", perfume5: "1585386959984-a4155224a1ad",
  salon: "1522337360788-8b13dee7a37e", salon2: "1560066984-138dadb4c035",
  laundry: "1517677208171-0bc6725a3e60", washer: "1545173168-9f1947eebb7f", laundry2: "1582735689369-4fe89db7114c",
  notebooks: "1531346878377-a5be20888e57", stationery: "1586075010923-2dd4570fb338",
  repair: "1588508065123-287b28e013da", repair2: "1581092160562-40aa08e78837",
  tote: "1590874103328-eac38a683ce7", bag: "1584917865442-de89df76afd3", hat: "1575428652377-a2d80e2277fc",
  study: "1434030216411-0b793f4b4173", classroom: "1427504494785-3a9ca7044f45", math: "1509062522246-3755977927d7",
  notes: "1456513080510-7bf3a84b82f8",
  jewelry: "1515562141207-7a88fb7ce338", bracelet: "1611591437281-460bfbe1220a", necklace: "1599643478518-a784e5dc4c8f",
  earrings: "1535632066927-ab7c9ab60908", handbag: "1548036328-c9fa89d128fa", handbag2: "1566150905458-1bf1fc113f0d",
  smoothie: "1505252585461-04db1eb84625", smoothie2: "1553530666-ba11a7da3888", parfait: "1488477181946-6428a0291777",
  fruitSalad: "1564093497595-593b96d80180", fruits: "1490474418585-ba9bad8fd0ea",
};

const SHOE_SIZES = ["40", "41", "42", "43", "44", "45"];
const CLOTH_SIZES = ["S", "M", "L", "XL"];

// p(slug, title, priceNaira, opts)
const p = (slug, title, price, o = {}) => ({ slug, title, price, kind: "product", condition: "new", stock: 5, images: [], description: "", ...o });
const s = (slug, title, price, o = {}) => p(slug, title, price, { kind: "service", stock: null, ...o });

export const businesses = [
  {
    slug: "daniels-closet", name: "Daniel's Closet", owner: "daniel.eze", category: "fashion", sellerType: "student",
    location: "daniel-hall", delivery: false, verified: true, hours: "student", tagline: "Clean streetwear and sneakers, sourced and checked.",
    description: "I sell authentic sneakers and everyday streetwear. Every pair is checked before listing. Pickup at Daniel Hall after 4pm on weekdays.",
    products: [
      p("nike-dunk-low-panda", "Nike Dunk Low \"Panda\"", 85000, { category: "shoes", images: ["sneakerGrey"], stock: 4,
        description: "Black and white Dunk Low, brand new in box. Sizes 41–44 available.\nTried on only for photos.",
        variants: { name: "Size", values: [["41", 1], ["42", 2], ["43", 1], ["44", 0]] } }),
      p("oversized-boxy-tee", "Oversized boxy tee", 9500, { images: ["teeStack"], stock: 14,
        description: "Heavyweight 240gsm cotton tee with a boxy fit. Black, white and stone.", variants: { name: "Size", values: CLOTH_SIZES.map((v) => [v, 4]) } }),
      p("utility-cargo-pants", "Utility cargo pants", 18000, { images: ["pants2"], stock: 6,
        description: "Relaxed fit cargos with six pockets and adjustable hem toggles.", variants: { name: "Size", values: [["30", 2], ["32", 2], ["34", 2]] } }),
      p("essential-pullover-hoodie", "Essential pullover hoodie", 22000, { images: ["hoodie", "hoodie2"], stock: 5,
        description: "Brushed fleece hoodie. Warm enough for 7am lectures, light enough for the hostel.", variants: { name: "Size", values: CLOTH_SIZES.map((v) => [v, 1]) } }),
      p("washed-baseball-cap", "Washed baseball cap", 6500, { category: "accessories", images: ["cap"], stock: 12,
        description: "Six-panel washed cotton cap with an adjustable strap. One size." }),
    ],
  },
  {
    slug: "campus-bites", name: "Campus Bites", owner: "chioma.nwosu", category: "food", sellerType: "business",
    location: "cafeteria-2", delivery: true, deliveryNote: "Delivery to any hall for ₦300, 30–45 min.", verified: true, hours: "food",
    tagline: "Hot meals near Cafeteria 2, delivered to your hall.",
    description: "Freshly cooked rice dishes, shawarma and drinks. Orders placed before 7pm are delivered the same evening.",
    products: [
      p("jollof-rice-and-chicken", "Jollof rice & chicken", 3500, { stock: null, images: [], description: "Smoky party jollof with a quarter chicken and fried plantain." }),
      p("fried-rice-combo", "Fried rice combo", 3800, { stock: null, images: ["friedRice"], description: "Fried rice, coleslaw, plantain and turkey wing." }),
      p("chicken-shawarma", "Chicken shawarma", 3000, { stock: null, images: ["wrap"], description: "Double sausage, grilled chicken and creamy sauce. Add extra chicken at pickup." }),
      p("spaghetti-stir-fry", "Spaghetti stir-fry", 2800, { stock: null, images: ["pasta2"], description: "Stir-fried spaghetti with peppers, sausage and egg." }),
      p("chapman-500ml", "Chapman (500ml)", 1200, { stock: null, images: ["drink"], description: "Chilled homemade Chapman with cucumber and lemon." }),
    ],
  },
  {
    slug: "cu-tech-hub", name: "CU Tech Hub", owner: "ibrahim.musa", category: "electronics", sellerType: "business",
    location: "student-centre", delivery: true, deliveryNote: "Free delivery to halls on orders over ₦15,000.", verified: true, hours: "service",
    tagline: "Chargers, earbuds and laptop accessories that actually last.",
    description: "Original accessories with a 7-day replacement warranty. Find us at the Student Centre, ground floor.",
    products: [
      p("20w-usb-c-fast-charger", "20W USB-C fast charger", 6500, { category: "tech", images: [], stock: 25, description: "PD fast charger for iPhone and Android. 7-day replacement warranty." }),
      p("oraimo-freepods-earbuds", "Oraimo FreePods earbuds", 18000, { images: ["earbuds"], stock: 8, description: "Wireless earbuds with 30-hour battery life including the case. Sealed." }),
      p("10000mah-power-bank", "10,000mAh power bank", 14500, { images: [], stock: 10, description: "Slim power bank with two USB outputs and USB-C input. Handy during NEPA outages." }),
      p("aluminium-laptop-stand", "Aluminium laptop stand", 12000, { category: "tech", images: ["laptop2"], stock: 6, description: "Adjustable, foldable stand for 11–16\" laptops. Better posture during project season." }),
      p("braided-type-c-cable", "Braided Type-C cable (1m)", 2500, { category: "tech", images: [], stock: 40, description: "60W braided USB-C to USB-C cable." }),
    ],
  },
  {
    slug: "fresh-cuts", name: "Fresh Cuts", owner: "seun.balogun", category: "hair-beauty", sellerType: "student",
    location: "peter-hall", delivery: false, verified: true, hours: "student", tagline: "Clean cuts in Peter Hall. Book ahead on weekends.",
    description: "Barbing in Peter Hall with clippers sanitised between every client. Message to book a slot.",
    products: [
      s("haircut", "Haircut", 2500, { images: ["barber"], description: "Low cut, fade or taper. Takes about 30 minutes." }),
      s("haircut-and-beard-trim", "Haircut + beard trim", 3500, { images: ["barber2"], description: "Full cut with beard shaping and line-up." }),
      s("line-up", "Line-up", 1500, { images: ["barber3"], description: "Quick edge-up between cuts. 10 minutes." }),
      s("hair-dye", "Hair dye (black or blonde)", 6000, { images: ["barber4"], description: "Includes dye and cut. Allow about an hour." }),
      s("hot-towel-shave", "Hot towel shave", 2000, { description: "Clean shave with a hot towel and aftershave balm." }),
    ],
  },
  {
    slug: "the-thrift-room", name: "The Thrift Room", owner: "ada.obi", category: "thrift", sellerType: "student",
    location: "esther-hall", delivery: false, verified: true, hours: "student", tagline: "Hand-picked thrift, washed and ready to wear.",
    description: "Curated thrift pieces from Yaba and Katangua. Everything is washed and steamed before listing.",
    products: [
      p("vintage-denim-jacket", "Vintage denim jacket", 12000, { condition: "used", stock: 1, images: ["denimJacket", "denimJacket2"], description: "Mid-wash 90s denim jacket. Size M, fits slightly oversized. No stains or tears." }),
      p("straight-leg-thrift-jeans", "Straight-leg thrift jeans", 7500, { condition: "used", stock: 3, images: ["jeans"], description: "Light-wash straight-leg jeans. Waist 28–30." }),
      p("graphic-band-tee", "Graphic band tee", 4000, { condition: "like_new", stock: 2, images: ["teePrint"], description: "Soft vintage print tee. Size L." }),
      p("corduroy-midi-skirt", "Corduroy midi skirt", 6500, { condition: "used", stock: 1, images: [], description: "Brown corduroy midi skirt with a front slit. Size 10." }),
      p("chunky-knit-cardigan", "Chunky knit cardigan", 8000, { condition: "like_new", stock: 1, images: ["knit"], description: "Cream chunky knit cardigan. Perfect for harmattan mornings." }),
    ],
  },
  {
    slug: "sweet-crumbs", name: "Sweet Crumbs by Ife", owner: "ife.akinola", category: "food", sellerType: "student",
    location: "mary-hall", delivery: true, deliveryNote: "Delivery within campus for ₦500. Cakes need 48 hours' notice.", verified: true, hours: "student",
    tagline: "Birthday cakes, cupcakes and cookies baked in Mary Hall.",
    description: "Home-baked treats for birthdays, roomie surprises and late-night cravings. Custom cakes need 48 hours' notice.",
    products: [
      p("6-inch-celebration-cake", "6\" celebration cake", 18000, { stock: null, images: ["cake", "cake2"], description: "Two-layer vanilla or chocolate cake with buttercream and a custom message. Order 48 hours ahead.",
        variants: { name: "Flavour", values: [["Vanilla", null], ["Chocolate", null], ["Red velvet", null, 2000]] } }),
      p("cupcakes-box-of-6", "Cupcakes (box of 6)", 7500, { stock: null, images: ["cupcakes"], description: "Six frosted cupcakes. Mix flavours on request." }),
      p("banana-bread-loaf", "Banana bread loaf", 4500, { stock: 6, images: ["bread"], description: "Moist banana bread with walnuts. Keeps for 4 days." }),
      p("red-velvet-slice", "Red velvet slice", 2500, { stock: 10, images: ["cake2"], description: "Generous slice with cream cheese frosting." }),
      p("choc-chip-cookies-12", "Choc chip cookies (12)", 5000, { stock: 8, images: ["cookies", "cookies2"], description: "Chewy, golden-edged chocolate chip cookies." }),
    ],
  },
  {
    slug: "glow-by-tolu", name: "Glow by Tolu", owner: "tolu.adebayo", category: "beauty", sellerType: "student",
    location: "deborah-hall", delivery: false, verified: false, hours: "student", tagline: "Simple skincare for campus life.",
    description: "Skincare I actually use, in small sizes that fit a student budget. Pickup at Deborah Hall.",
    products: [
      p("whipped-shea-body-butter", "Whipped shea body butter", 5500, { images: [], stock: 12, description: "Unrefined shea whipped with coconut oil. 250ml tub, unscented." }),
      p("vitamin-c-serum", "Vitamin C serum (30ml)", 9000, { images: ["serum"], stock: 6, description: "Brightening serum for dark spots. Patch test before use." }),
      p("african-black-soap", "African black soap", 3000, { images: [], stock: 20, description: "Raw black soap bar from Abeokuta. Gentle for face and body." }),
      p("lip-gloss-set", "Lip gloss set (3)", 4500, { images: ["lipgloss"], stock: 7, description: "Three non-sticky glosses: clear, nude and berry." }),
      p("spf-50-sunscreen", "SPF 50 sunscreen", 7500, { images: ["skincare2"], stock: 5, description: "Lightweight sunscreen with no white cast on darker skin." }),
    ],
  },
  {
    slug: "lens-and-light", name: "Lens & Light Studios", owner: "femi.ogunleye", category: "photography", sellerType: "business",
    location: "student-centre", delivery: false, verified: true, hours: "service", tagline: "Portraits, convocation shoots and event coverage.",
    description: "Photographers based at the Student Centre. Edited photos are delivered within 5 days by Google Drive.",
    products: [
      s("portrait-session", "Portrait session (30 min)", 25000, { images: ["camera"], description: "Outdoor portrait session around campus. Includes 10 edited photos." }),
      s("convocation-shoot", "Convocation shoot", 45000, { images: ["camera2"], description: "One-hour convocation coverage with family shots. Includes 25 edited photos." }),
      s("event-coverage-2h", "Event coverage (2 hours)", 60000, { images: ["camera3"], description: "Dinners, birthdays and departmental events. Includes all edited photos." }),
      s("passport-photos", "Passport photographs (8)", 2000, { description: "White background, printed same day." }),
      s("photo-editing", "Photo editing (per 10 photos)", 5000, { description: "Colour correction and skin retouching for your own photos." }),
    ],
  },
  {
    slug: "page-turner-books", name: "Page Turner Books", owner: "grace.ekpo", category: "books", sellerType: "student",
    location: "library", delivery: false, verified: false, hours: "student", tagline: "Used textbooks and past questions, half the price.",
    description: "Second-hand textbooks from final-year students. Pickup near the Centre for Learning Resources.",
    products: [
      p("engineering-mathematics-stroud", "Engineering Mathematics (K.A. Stroud)", 9000, { condition: "used", stock: 2, images: [], description: "7th edition. A few highlights in chapters 1–3, otherwise clean." }),
      p("gst-past-questions", "GST past questions (2019–2025)", 2500, { condition: "new", stock: 15, images: ["notes"], description: "Compiled past questions for GST courses with answers." }),
      p("campbell-biology-used", "Campbell Biology (used)", 12000, { condition: "used", stock: 1, images: ["books2"], description: "11th edition, hardcover. Spine slightly worn." }),
      p("novel-bundle", "Novel bundle (3 books)", 3500, { condition: "used", stock: 4, images: ["books3"], description: "Three contemporary African novels. Ask for the current titles." }),
      p("financial-accounting-text", "Financial Accounting textbook", 7000, { condition: "like_new", stock: 2, images: ["books4"], description: "Frank Wood's Business Accounting, Volume 1." }),
    ],
  },
  {
    slug: "kicks-republic", name: "Kicks Republic", owner: "emeka.udo", category: "shoes", sellerType: "student",
    location: "john-hall", delivery: false, verified: true, hours: "student", tagline: "Sneakers for every budget, checked before sale.",
    description: "New and lightly used sneakers. Every pair is inspected and cleaned. Pickup at John Hall.",
    products: [
      p("air-force-1-white", "Air Force 1 '07 (white)", 70000, { images: ["sneakerWhite"], stock: 4, description: "All-white AF1. New, with box.", variants: { name: "Size", values: SHOE_SIZES.map((v, i) => [v, i % 2]) } }),
      p("adidas-samba-og", "Adidas Samba OG", 78000, { images: [], stock: 3, description: "White/black Samba OG. New, with box.", variants: { name: "Size", values: [["41", 1], ["42", 1], ["43", 1]] } }),
      p("crocs-classic-clog", "Crocs Classic Clog", 35000, { images: [], stock: 5, description: "Original Crocs in black. Comfortable for hostel days.", variants: { name: "Size", values: [["M8", 2], ["M9", 2], ["M10", 1]] } }),
      p("everyday-slides", "Everyday slides", 9000, { images: [], stock: 15, description: "Cushioned slides, sizes 40–45." }),
      p("new-balance-550", "New Balance 550 (used)", 52000, { condition: "used", images: [], stock: 1, description: "Worn three times, size 43. Cleaned and in very good condition." }),
    ],
  },
  {
    slug: "scent-lab", name: "Scent Lab", owner: "kunle.adeyemi", category: "accessories", sellerType: "student",
    location: "paul-hall", delivery: true, deliveryNote: "Free delivery to any hall on weekdays.", verified: true, hours: "student",
    tagline: "Oils, perfumes and decants that last all day.",
    description: "Long-lasting oil perfumes and designer-inspired fragrances. Try a 5ml decant before buying a full bottle.",
    products: [
      p("oud-oil-10ml", "Oud oil (10ml)", 8000, { images: ["perfume4"], stock: 20, description: "Concentrated oud oil roll-on. One dab lasts all day." }),
      p("designer-inspired-edp", "Designer-inspired EDP (50ml)", 18000, { images: ["perfume", "perfume3"], stock: 9, description: "Inspired by popular designer scents. Ask for the current list." }),
      p("body-mist-vanilla", "Vanilla body mist", 6500, { images: ["perfume2"], stock: 11, description: "Light vanilla and musk body mist, 200ml." }),
      p("perfume-decant-5ml", "Perfume decant (5ml)", 4000, { images: ["perfume5"], stock: 30, description: "Try before you commit. Choose from 12 scents at pickup." }),
      p("reed-diffuser", "Room reed diffuser", 7000, { category: "other", stock: 6, description: "Keeps your room smelling fresh for weeks. Lavender or oud." }),
    ],
  },
  {
    slug: "braids-by-ada", name: "Braids by Ada", owner: "adaeze.nnamdi", category: "hair-beauty", sellerType: "student",
    location: "lydia-hall", delivery: false, verified: true, hours: "student", tagline: "Neat, painless braids in Lydia Hall.",
    description: "Knotless braids, twists and cornrows. Bring your own extensions or add them to your booking.",
    products: [
      s("knotless-braids-mid-back", "Knotless braids (mid-back)", 25000, { images: ["salon"], description: "Medium knotless braids, mid-back length. Extensions not included. Takes about 5 hours." }),
      s("cornrows", "Cornrows (straight back)", 8000, { images: [], description: "Straight-back cornrows, 8–12 lines." }),
      s("passion-twists", "Passion twists", 18000, { description: "Shoulder-length passion twists. Extensions included." }),
      s("wig-install", "Wig install", 10000, { description: "Frontal or closure install with customisation." }),
      s("wash-and-style", "Wash & style", 5000, { description: "Wash, deep condition and simple style for natural hair." }),
    ],
  },
  {
    slug: "spinclean-laundry", name: "SpinClean Laundry", owner: "tunde.bakare", category: "laundry", sellerType: "business",
    location: "hostel-area-male", delivery: true, deliveryNote: "Pickup and drop-off at your hall at no extra cost.", verified: true, hours: "service",
    tagline: "Wash, fold and iron, picked up from your hall.",
    description: "We pick up from your hall, wash and fold, then return within 48 hours. Express same-day service is available before 10am.",
    products: [
      s("wash-and-fold-bag", "Wash & fold (per bag)", 3000, { images: ["laundry"], description: "One standard laundry bag, about 15 items." }),
      s("ironing-10-pieces", "Ironing (10 pieces)", 2500, { images: ["laundry2"], description: "Shirts, trousers and native wear pressed and hung." }),
      s("duvet-wash", "Duvet wash", 4000, { images: ["washer"], description: "Single or double duvet, washed and dried." }),
      s("express-same-day", "Express same-day", 5000, { description: "Drop before 10am and get it back by 6pm." }),
      s("suit-blazer-cleaning", "Suit or blazer cleaning", 2000, { description: "Gentle cleaning and pressing for suits and blazers." }),
    ],
  },
  {
    slug: "printpoint", name: "PrintPoint", owner: "bola.ige", category: "school-essentials", sellerType: "business",
    location: "cst", delivery: false, verified: true, hours: "service", tagline: "Printing, binding and stationery beside CST.",
    description: "Fast printing for assignments and projects. Send your files by message and pick up at CST.",
    products: [
      s("bw-printing-per-page", "Black & white printing (per page)", 50, { images: [], description: "A4 printing. Send your PDF and we'll have it ready in 15 minutes." }),
      s("colour-printing-per-page", "Colour printing (per page)", 200, { description: "A4 colour printing for diagrams and covers." }),
      s("spiral-binding", "Spiral binding", 1000, { description: "Plastic cover and spiral binding for up to 100 pages." }),
      p("a4-hardcover-notebook", "A4 hardcover notebook", 1500, { images: ["notebooks"], stock: 60, description: "200-page ruled notebook." }),
      p("casio-fx-991es-plus", "Casio fx-991ES Plus calculator", 18000, { category: "school-essentials", stock: 7, description: "Original Casio scientific calculator, approved for exams." }),
    ],
  },
  {
    slug: "chop-express", name: "Chop Express", owner: "ngozi.eze", category: "food", sellerType: "student",
    location: "joseph-hall", delivery: true, deliveryNote: "Delivery to male halls for ₦200.", verified: false, hours: "student",
    tagline: "Small chops and drinks for late-night reading.",
    description: "Small chops packs, puff-puff and zobo, made fresh every evening in Joseph Hall.",
    products: [
      p("small-chops-pack", "Small chops pack", 3000, { stock: null, images: ["samosa"], description: "Samosa, spring rolls, puff-puff and peppered chicken." }),
      p("puff-puff-20", "Puff-puff (20 pieces)", 1500, { stock: null, description: "Soft, golden puff-puff. Sugar dusting on request." }),
      p("meat-pie", "Meat pie", 800, { stock: 24, images: [], description: "Buttery crust with minced beef and potato." }),
      p("zobo-1l", "Zobo drink (1L)", 1500, { stock: 12, images: [], description: "Chilled zobo with ginger and pineapple." }),
      p("peppered-gizzard", "Peppered gizzard", 2500, { stock: null, description: "Spicy peppered gizzard, a takeaway bowl." }),
    ],
  },
  {
    slug: "gadget-doctor", name: "Gadget Doctor", owner: "yusuf.bello", category: "services", sellerType: "student",
    location: "student-centre", delivery: false, verified: true, hours: "service", tagline: "Phone and laptop repairs, usually same day.",
    description: "Screen replacements, batteries and laptop servicing. Most repairs are done within 24 hours, with a 14-day warranty on parts.",
    products: [
      s("phone-screen-replacement", "Phone screen replacement", 25000, { images: ["repair2"], description: "Price depends on model; this is the starting price. Message with your phone model for an exact quote." }),
      s("phone-battery-replacement", "Phone battery replacement", 12000, { images: [], description: "Original-grade batteries, 14-day warranty." }),
      s("laptop-cleaning-service", "Laptop cleaning & thermal paste", 8000, { images: ["laptop"], description: "Fixes overheating and fan noise." }),
      s("os-software-install", "OS & software install", 5000, { description: "Windows or Linux install, drivers and Office setup." }),
      s("charging-port-repair", "Charging port repair", 7000, { description: "Fixes loose or dead charging ports on most phones." }),
    ],
  },
  {
    slug: "ankara-avenue", name: "Ankara Avenue", owner: "funmi.alade", category: "fashion", sellerType: "student",
    location: "dorcas-hall", delivery: false, verified: true, hours: "student", tagline: "Ankara pieces and custom tailoring.",
    description: "Ready-to-wear Ankara and custom sewing. Measurements are taken at Dorcas Hall; allow 5–7 days for custom pieces.",
    products: [
      p("ankara-two-piece", "Ankara two-piece set", 22000, { images: [], stock: 3, description: "Crop top and wide-leg trousers in bold Ankara print.", variants: { name: "Size", values: [["S", 1], ["M", 1], ["L", 1]] } }),
      s("custom-tailoring", "Custom tailoring (sewing only)", 15000, { images: ["dress2"], description: "Bring your fabric. Includes measurements and one fitting." }),
      p("ankara-tote-bag", "Ankara tote bag", 6000, { images: [], stock: 8, description: "Lined tote with an inner pocket. Fits a 15\" laptop." }),
      p("ankara-bucket-hat", "Ankara bucket hat", 4500, { category: "accessories", images: [], stock: 6, description: "Reversible bucket hat: Ankara on one side, black on the other." }),
      p("ankara-headwrap", "Ankara headwrap", 3000, { category: "accessories", stock: 10, description: "Extra-long headwrap for church and owambe." }),
    ],
  },
  {
    slug: "mathpro-tutors", name: "MathPro Tutors", owner: "samuel.okon", category: "tutoring", sellerType: "student",
    location: "cmss", delivery: false, verified: false, hours: "student", tagline: "Maths and physics tutorials from 400-level students.",
    description: "Small-group tutorials for 100 and 200-level maths and physics. Sessions run in CMSS classrooms in the evenings.",
    products: [
      s("mat-101-tutorial", "MAT 101 tutorial (per session)", 3000, { images: ["math"], description: "Two-hour group session covering the week's topics." }),
      s("exam-prep-bundle", "Exam prep bundle (4 sessions)", 10000, { images: ["study"], description: "Four sessions in exam week with past-question practice." }),
      s("physics-tutorial", "PHY 101/102 tutorial", 3000, { images: ["classroom"], description: "Mechanics, electricity and magnetism with worked examples." }),
      s("statistics-help", "Statistics help (1-on-1)", 3500, { images: ["notes"], description: "One-hour session for STA courses or project data analysis." }),
      s("past-question-walkthrough", "Past-question walkthrough", 2000, { description: "We solve the last three years of past questions together." }),
    ],
  },
  {
    slug: "trinkets-and-co", name: "Trinkets & Co", owner: "ope.salami", category: "accessories", sellerType: "student",
    location: "esther-hall", delivery: true, deliveryNote: "Delivery to female halls for ₦200.", verified: false, hours: "student",
    tagline: "Jewellery and little bags that finish an outfit.",
    description: "Handmade beaded pieces and affordable jewellery. Gift wrapping is free.",
    products: [
      p("beaded-bracelet", "Beaded bracelet", 2500, { images: ["bracelet"], stock: 25, description: "Handmade glass-bead bracelet. Custom colours on request." }),
      p("gold-tone-necklace", "Gold-tone layered necklace", 6000, { images: ["necklace", "jewelry"], stock: 8, description: "Tarnish-resistant layered chain necklace." }),
      p("mini-handbag", "Mini handbag", 14000, { images: ["handbag2"], stock: 4, description: "Structured mini bag with a detachable strap." }),
      p("satin-scrunchie-set", "Satin scrunchie set (5)", 2000, { stock: 20, description: "Five satin scrunchies, gentle on natural hair." }),
      p("earrings-set", "Earrings set (6 pairs)", 3500, { images: ["earrings"], stock: 10, description: "Studs and small hoops for everyday wear." }),
    ],
  },
  {
    slug: "smoothie-spot", name: "Smoothie Spot", owner: "kemi.fashola", category: "food", sellerType: "student",
    location: "cafeteria-1", delivery: true, deliveryNote: "Delivery to any hall for ₦300.", verified: true, hours: "food",
    tagline: "Fresh smoothies and parfaits by Cafeteria 1.",
    description: "Blended to order with fresh fruit, with no added sugar unless you ask.",
    products: [
      p("strawberry-banana-smoothie", "Strawberry-banana smoothie", 2500, { stock: null, images: ["smoothie"], description: "Strawberry, banana and yoghurt. 500ml." }),
      p("yoghurt-parfait", "Yoghurt parfait", 3000, { stock: null, images: ["parfait"], description: "Greek yoghurt, granola, honey and seasonal fruit." }),
      p("fruit-salad-bowl", "Fruit salad bowl", 2000, { stock: null, images: ["fruitSalad"], description: "Pineapple, watermelon, apple and grapes." }),
      p("tiger-nut-drink", "Tiger-nut drink (kunu aya)", 1500, { stock: 15, images: [], description: "Chilled tiger-nut milk with dates and coconut." }),
      p("green-detox-smoothie", "Green detox smoothie", 2800, { stock: null, images: [], description: "Spinach, cucumber, apple, ginger and lime." }),
    ],
  },
];

export const ownerNames = {
  "daniel.eze": "Daniel Eze", "chioma.nwosu": "Chioma Nwosu", "ibrahim.musa": "Ibrahim Musa", "seun.balogun": "Seun Balogun",
  "ada.obi": "Ada Obi", "ife.akinola": "Ife Akinola", "tolu.adebayo": "Tolu Adebayo", "femi.ogunleye": "Femi Ogunleye",
  "grace.ekpo": "Grace Ekpo", "emeka.udo": "Emeka Udo", "kunle.adeyemi": "Kunle Adeyemi", "adaeze.nnamdi": "Adaeze Nnamdi",
  "tunde.bakare": "Tunde Bakare", "bola.ige": "Bola Ige", "ngozi.eze": "Ngozi Eze", "yusuf.bello": "Yusuf Bello",
  "funmi.alade": "Funmi Alade", "samuel.okon": "Samuel Okon", "ope.salami": "Ope Salami", "kemi.fashola": "Kemi Fashola",
};

export const reviewTexts = {
  product: [
    "Exactly as pictured. Pickup was quick and the seller was on time.",
    "Good quality for the price. I'd buy again.",
    "Fits well. True to size.",
    "Came in perfect condition. The seller even double-checked the size with me first.",
    "Original, not a copy. Very happy with it.",
    "Fast response and easy pickup at the hall.",
    "Packaging was neat. Would recommend to friends.",
    "Great value. Much cheaper than buying in Lagos.",
    "The material is thicker than I expected, in a good way.",
    "Seller was honest about a small mark on it. Fair price.",
    "Works perfectly. Charging is fast.",
    "Bought it as a gift and my roommate loved it.",
    "Battery life is as described. No complaints.",
    "Smells amazing and lasts all day.",
    "Second time buying from this seller. Consistent.",
    "Clean and well kept for a used item.",
    "Arrived on time, works as described.",
  ],
  food: [
    "Still hot when it got to my hall. Portion was generous.",
    "Best jollof on campus, no argument.",
    "Fresh and not too sweet. Perfect after lectures.",
    "The cake was beautiful and everyone at the birthday loved it.",
    "Good value for the price. The chicken was well seasoned.",
    "Ordered for my study group and everyone wanted more.",
    "Cupcakes were soft and the frosting wasn't too heavy.",
    "Fast delivery to Daniel Hall. Will order again.",
    "Consistent every time I order.",
  ],
  service: [
    "Very professional and on time. The result was exactly what I asked for.",
    "Clean cut and a clean space. Booked my next slot already.",
    "Fair price and the quality is great.",
    "The photos came out beautiful. Delivered in four days.",
    "Explained everything clearly. My grades improved.",
    "My phone works like new. Good warranty too.",
    "Clothes came back fresh and neatly folded.",
    "Friendly and patient. Would recommend.",
    "Quick and affordable. Good for exam week.",
    "Painless braids and neat parting.",
    "Showed up on time to collect and return the laundry.",
  ],
};

// Simple scripted exchanges for demo conversations: [buyer message, seller reply, optional follow-up]
// Lukewarm and negative texts, used for 1–3 star ratings so text and stars agree.
export const mixedReviewTexts = {
  product: [
    "Slightly different shade from the photo but still nice.",
    "Took a day longer than expected but the seller kept me updated.",
    "Decent, but I wish there were more sizes.",
    "Okay for the price. The finishing could be better.",
    "Not exactly as described. The seller offered to swap it, though.",
    "Smaller than I expected. Check the measurements before you order.",
  ],
  food: [
    "Tasty, but it took about an hour on a Friday evening.",
    "A little too spicy for me, but well made.",
    "Portion was smaller than last time but still good.",
    "Arrived lukewarm. The taste was fine.",
  ],
  service: [
    "Took longer than I expected, but the result was worth it.",
    "Had to wait 40 minutes past my slot.",
    "Good result, but communication before the appointment could be better.",
    "Fine, but not worth the price for me.",
  ],
};

export const conversationScripts = [
  ["Is this still available?", "Yes, it is. When would you like to pick it up?", "This evening works, around 6."],
  ["Where can I pick this up?", "At my hall reception. I'll send exact details once you order.", "Okay, thanks!"],
  ["Can I order this today?", "Yes, order before 7pm and it'll be ready tonight."],
  ["Do you offer delivery?", "Yes, to any hall. The delivery fee is in the listing.", "Perfect, ordering now."],
  ["Do you have it in a bigger size?", "I have one size up left. Should I hold it for you?", "Yes please, I'll order in an hour."],
  ["Is the price negotiable?", "It's already a student price, sorry. Delivery is free this week though."],
  ["Hi, are you open on Sunday?", "Only from 2pm on Sundays.", "Alright, I'll come by then."],
  ["Can you do it by Friday?", "Yes, if you book by Wednesday."],
];
