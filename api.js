/* ============================================================
   OPEN MARKET — SHARED DATA-ACCESS LAYER
   ------------------------------------------------------------
   Client-side demo data layer for the Open Market D2C storefront.
   Every page (home.html, categories.html, cart.html, wishlist.html,
   settings.html) loads this file and talks to storage only through
   the OpenAPI object below. When a real backend is ready, only the
   internals here need to change — page files stay the same.

   Storage:
   - localStorage holds products (seed catalog), cart, wishlist,
     session, and view counts. No IndexedDB needed yet since the
     customer app doesn't accept user-uploaded media.
   ============================================================ */

const OpenAPI = (() => {

    /* ---------------- STORAGE KEYS ---------------- */
    const KEY_PRODUCTS      = 'OPEN_MARKET_PRODUCTS';
    const KEY_PRODUCTS_VERSION = 'OPEN_MARKET_PRODUCTS_SCHEMA_VERSION';
    // Bump this whenever SEED_PRODUCTS' shape changes (new fields like
    // `variants`/`variantStock`) so existing browsers re-seed instead of
    // keeping a stale cached catalog forever.
    const PRODUCTS_SCHEMA_VERSION = 4;
    const KEY_CART          = 'OPEN_MARKET_CART';           // { [email]: [{ cartItemId, productId, qty, variant, selected }] }
    const KEY_WISHLIST      = 'OPEN_MARKET_WISHLIST';       // { [email]: [productId, ...] }
    const KEY_VIEWS         = 'OPEN_MARKET_PRODUCT_VIEWS';  // { productId: count }
    const KEY_RECENT_VIEWS  = 'OPEN_MARKET_RECENTLY_VIEWED'; // [productId, ...] most-recent-first
    const KEY_REVIEWS       = 'OPEN_MARKET_PRODUCT_REVIEWS';  // { productId: [{id,name,avatar,rating,text,photo,date}] }
    const KEY_SESSION       = 'OPEN_MARKET_ACTIVE_SESSION';
    const KEY_USER_RECORDS  = 'OPEN_MARKET_USER_RECORDS';
    const KEY_SEARCH_HIST   = 'OPEN_MARKET_SEARCH_HISTORY';
    const KEY_ADDRESSES     = 'OPEN_MARKET_ADDRESSES';       // { [email]: [{addressId,label,fullName,phone,region,city,addressLine,isDefault}] }
    const KEY_PAYMENT_METHODS = 'OPEN_MARKET_PAYMENT_METHODS'; // { [email]: [{methodId,type,provider,display,isDefault}] }
    const KEY_ORDERS        = 'OPEN_MARKET_ORDERS';          // { [email]: [{orderId,date,status,items,subtotal,deliveryFee,total,address,paymentMethod}] }
    const KEY_SUPPORT_REQUESTS = 'OPEN_MARKET_SUPPORT_REQUESTS'; // [{id,type,name,email,subject,message,date}]

    const GHANA_REGIONS = [
        'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta',
        'Northern', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
        'Savannah', 'North East', 'Oti', 'Western North',
    ];

    // Designated self-pickup agent locations (FAQ #17/#18) — no delivery fee applies.
    const PICKUP_LOCATIONS = [
        { id: 'pickup-accra-mall', name: 'Accra Mall Pickup Point', area: 'Tetteh Quarshie, Accra' },
        { id: 'pickup-osu', name: 'Osu Oxford Street Pickup Point', area: 'Osu, Accra' },
        { id: 'pickup-kumasi-adum', name: 'Adum Pickup Point', area: 'Adum, Kumasi' },
        { id: 'pickup-takoradi', name: 'Market Circle Pickup Point', area: 'Market Circle, Takoradi' },
    ];

    /* ---------------- CATEGORIES ---------------- */
    // Phosphor icon classes — no external assets needed. But i have change to local images i have in my own folder so technically not using external icons
    const CATEGORIES = [
        { name: 'Phones & Tablets',       icon: 'ph-device-mobile', image: 'icons and images/Category - Phone.jpg' },
        { name: 'Electronics',            icon: 'ph-television', image: 'icons and images/Category - Television.png' },
        { name: 'Computers',              icon: 'ph-laptop', image: 'icons and images/Category - Laptops.jpg' },
        { name: 'Fashion & Apparel',      icon: 'ph-t-shirt', image: 'icons and images/Category - Fashion.webp' },
        { name: 'Footwear',               icon: 'ph-sneaker', image: 'icons and images/Category - Footwear.jpg' },
        { name: 'Beauty & Personal Care', icon: 'ph-sparkle', image: 'icons and images/Category - Skincare.avif' },
        { name: 'Home & Living',          icon: 'ph-armchair', image: 'icons and images/Category - Home & Living.webp' },
        { name: 'Kitchen & Appliances',   icon: 'ph-cooking-pot', image: 'icons and images/Category - Kitchen Appliance.jpg' },
        { name: 'Health & Wellness',      icon: 'ph-heartbeat', image: 'icons and images/Category - Wellness.webp' },
        { name: 'Groceries & Food',       icon: 'ph-shopping-bag', image: 'icons and images/Category - Grocieries.avif' },
        { name: 'Baby & Kids',            icon: 'ph-baby', image: 'icons and images/Category - Babbies.jpg' },
        { name: 'Sports & Outdoors',      icon: 'ph-soccer-ball', image: 'icons and images/Categories - Outdoors.webp' },
        { name: 'Automotive',             icon: 'ph-car', image: 'icons and images/Category - Automotive.jpg' },
        { name: 'Jewelry & Watches',      icon: 'ph-diamond', image: 'icons and images/Category - Jewellry.jpg' },
        { name: 'Gaming',                 icon: 'ph-game-controller', image: 'icons and images/Category - Gaming.webp' },
    ];

    function getCategoryIconClass(categoryName) {
        const found = CATEGORIES.find(c => c.name === categoryName);
        return found ? found.icon : 'ph-shopping-bag';
    }

    /* ---------------- DEPARTMENTS (Categories page navigation) ----------------
       This is a separate, richer structure from CATEGORIES above. CATEGORIES
       stays untouched (used by home.html's category row). DEPARTMENTS powers
       the sidebar + subcategory grid on categories.html.
       Each subcategory's `category` field maps to an existing CATEGORIES/
       product.category string so it can pull real seed products. `category:
       null` means there's no matching seed data yet — the UI shows an empty
       state for that tile instead of breaking. */
    const DEPARTMENTS = [
        { name: "Agriculture", icon: "ph-tractor", categories: [
            { name: "Farm Tools", image: "icons and images/categories/agriculture--farm-tools.jpg", items: ["Hoes", "Cutlasses (Machetes)", "Rakes", "Shovels", "Spades", "Garden Forks", "Hand Trowels", "Pruning Shears", "Wheelbarrows", "Watering Cans"] },
            { name: "Seeds & Seedlings", image: "icons and images/categories/agriculture--seeds-seedlings.jpg", items: ["Vegetable Seeds", "Fruit Seeds", "Herb Seeds", "Flower Seeds", "Tree Seedlings"] },
            { name: "Fertilizers & Soil Care", image: "icons and images/categories/agriculture--fertilizers-soil-care.jpg", items: ["Organic Fertilizers", "Chemical Fertilizers", "Compost", "Potting Soil", "Mulch", "Soil Conditioners"] },
            { name: "Plant Protection", image: "icons and images/categories/agriculture--plant-protection.jpg", items: ["Insecticides", "Herbicides", "Fungicides", "Pest Repellents", "Plant Sprayers"] },
            { name: "Irrigation & Watering", image: "icons and images/categories/agriculture--irrigation-watering.jpg", items: ["Garden Hoses", "Hose Nozzles", "Sprinklers", "Drip Irrigation Kits", "Water Pumps (small/portable)"] },
            { name: "Greenhouse & Gardening", image: "icons and images/categories/agriculture--greenhouse-gardening.jpg", items: ["Plant Pots", "Planters", "Seed Trays", "Garden Nets", "Plant Supports", "Greenhouse Covers"] },
            { name: "Livestock Supplies", image: "icons and images/categories/agriculture--livestock-supplies.jpg", items: ["Animal Feed", "Feeders", "Waterers", "Poultry Equipment", "Animal Supplements"] },
            { name: "Beekeeping", image: "icons and images/categories/agriculture--beekeeping.jpg", items: ["Beehives", "Protective Suits", "Smokers", "Honey Extractors"] },
            { name: "Harvest & Storage", image: "icons and images/categories/agriculture--harvest-storage.jpg", items: ["Harvest Baskets", "Storage Sacks", "Grain Storage Containers", "Produce Crates"] },
        ]},
        { name: "Automotive", icon: "ph-car", categories: [
            { name: "Car Parts", image: "icons and images/categories/automotive--car-parts.jpg", items: ["Engine Parts", "Transmission Parts", "Suspension Parts", "Steering Parts", "Brake Parts", "Exhaust Systems", "Cooling System Parts", "Fuel System Parts", "Ignition Parts", "Filters", "Belts & Hoses", "Gaskets & Seals", "Headlights", "Fog Lights", "Tail Lights", "Indicator Lights", "Interior Lights", "LED Light Bars", "Ambient Lighting", "Bulbs"] },
            { name: "Car Accessories", image: "icons and images/categories/automotive--car-accessories.jpg", items: ["Seat Covers", "Steering Wheel Covers", "Floor Mats", "Dashboard Covers", "Sun Shades", "Neck Pillows", "Seat Cushions", "Organizers", "Trash Bins", "Cup Holders"] },
            { name: "Car Electronics", image: "icons and images/categories/automotive--car-electronics.jpg", items: ["Car Stereos", "Android Head Units", "Speakers", "Subwoofers", "Amplifiers", "Reverse Cameras", "Dash Cameras", "GPS Navigation", "Car Chargers", "Bluetooth Receivers", "FM Transmitters", "Parking Sensors"] },
            { name: "Wheels & Tires", image: "icons and images/categories/automotive--wheels-tires.jpg", items: ["Tires", "Rims", "Wheel Covers", "Wheel Spacers", "Lug Nuts", "Tire Pressure Gauges", "Tire Repair Kits"] },
            { name: "Exterior Accessories", image: "icons and images/categories/automotive--exterior-accessories.jpg", items: ["Spoilers", "Body Kits", "Grilles", "Side Mirrors", "Mirror Covers", "Door Handles", "Window Visors", "Mud Flaps", "Roof Racks", "Roof Boxes", "Decals & Stickers"] },
            { name: "Performance & Modification", image: "icons and images/categories/automotive--performance-modification.jpg", items: ["Air Intakes", "Performance Exhausts", "Lowering Springs", "Coilovers", "Turbo Accessories", "Blow-off Valves", "Performance Filters"] },
            { name: "Car Care & Cleaning", image: "icons and images/categories/automotive--car-care-cleaning.jpg", items: ["Car Shampoo", "Wax", "Polish", "Tire Shine", "Interior Cleaners", "Glass Cleaners", "Microfiber Towels", "Pressure Washers", "Cleaning Brushes", "Vacuum Cleaners"] },
            { name: "Oils & Fluids", image: "icons and images/categories/automotive--oils-fluids.jpg", items: ["Engine Oil", "Transmission Fluid", "Brake Fluid", "Coolant", "Power Steering Fluid", "Windshield Washer Fluid"] },
            { name: "Tools & Emergency", image: "icons and images/categories/automotive--tools-emergency.jpg", items: ["Car Jacks", "Jack Stands", "Jumper Cables", "Battery Chargers", "Tool Kits", "Tire Inflators", "Tow Ropes", "Warning Triangles", "Fire Extinguishers", "First Aid Kits"] },
            { name: "Batteries", image: "icons and images/categories/automotive--batteries.jpg", items: ["Car Batteries", "Battery Terminals", "Battery Testers", "Battery Chargers"] },
            { name: "Motorcycle Parts & Accessories", image: "icons and images/categories/automotive--motorcycle-parts-accessories.jpg", items: ["Helmets", "Riding Gloves", "Riding Jackets", "Motorcycle Covers", "Motorcycle Parts", "Motorcycle Tires", "Motorcycle Batteries", "Motorcycle Lights"] },
        ]},
        { name: "Baby & Kids", icon: "ph-baby", categories: [
            { name: "Baby Clothing", image: "icons and images/categories/baby-kids--baby-clothing.jpg", items: ["Bodysuits", "Rompers", "Sleepsuits", "T-Shirts", "Dresses", "Pants", "Jackets", "Sweaters", "Socks", "Hats", "Bibs", "Mittens"] },
            { name: "Kids' Clothing", image: "icons and images/categories/baby-kids--kids-clothing.jpg", items: ["Boys' Clothing", "Girls' Clothing", "School Uniforms", "Jackets", "Hoodies", "Jeans", "Shorts", "Dresses", "Sleepwear", "Swimwear"] },
            { name: "Baby Shoes", image: "icons and images/categories/baby-kids--baby-shoes.jpg", items: ["Pre-Walkers", "Sandals", "Sneakers", "Booties"] },
            { name: "Kids' Shoes", image: "icons and images/categories/baby-kids--kids-shoes.jpg", items: ["Sneakers", "School Shoes", "Sandals", "Boots", "Slippers"] },
            { name: "Baby Gear", image: "icons and images/categories/baby-kids--baby-gear.jpg", items: ["Strollers", "Car Seats", "Baby Carriers", "Walkers", "Playpens", "High Chairs", "Bouncers", "Rockers"] },
            { name: "Feeding", image: "icons and images/categories/baby-kids--feeding.jpg", items: ["Baby Bottles", "Bottle Brushes", "Sterilizers", "Breast Pumps", "Bibs", "Sippy Cups", "Baby Food Storage", "Feeding Sets"] },
            { name: "Diapering", image: "icons and images/categories/baby-kids--diapering.jpg", items: ["Diapers", "Baby Wipes", "Changing Mats", "Diaper Bags", "Diaper Creams", "Disposal Bags"] },
            { name: "Nursery", image: "icons and images/categories/baby-kids--nursery.jpg", items: ["Baby Cots", "Cribs", "Mattresses", "Bedding", "Blankets", "Mosquito Nets", "Night Lights", "Nursery Decor"] },
            { name: "Baby Health & Safety", image: "icons and images/categories/baby-kids--baby-health-safety.jpg", items: ["Baby Thermometers", "Nasal Aspirators", "Grooming Kits", "Baby Monitors", "Corner Guards", "Cabinet Locks", "Safety Gates"] },
            { name: "School Essentials", image: "icons and images/categories/baby-kids--school-essentials.jpg", items: ["School Bags", "Lunch Boxes", "Water Bottles", "Pencil Cases", "Kids' Backpacks"] },
            { name: "Kids' Accessories", image: "icons and images/categories/baby-kids--kids-accessories.jpg", items: ["Caps", "Hair Accessories", "Sunglasses", "Watches", "Belts", "Gloves"] },
        ]},
        { name: "Beauty & Personal Care", icon: "ph-sparkle", categories: [
            { name: "Makeup", image: "icons and images/categories/beauty-personal-care--makeup.jpg", items: ["Foundation", "Concealer", "Powder", "Blush", "Bronzer", "Highlighter", "Primer", "Setting Spray", "Lipstick", "Lip Gloss", "Lip Liner", "Mascara", "Eyeliner", "Eyeshadow", "Eyebrow Products", "Makeup Removers", "Makeup Brushes", "Makeup Sponges"] },
            { name: "Skincare", image: "icons and images/categories/beauty-personal-care--skincare.jpg", items: ["Face Wash", "Cleansers", "Toners", "Serums", "Moisturizers", "Face Creams", "Sunscreen", "Face Masks", "Exfoliators", "Eye Creams", "Lip Care", "Acne Treatments"] },
            { name: "Hair Care", image: "icons and images/categories/beauty-personal-care--hair-care.jpg", items: ["Shampoo", "Conditioner", "Hair Oils", "Hair Creams", "Hair Serums", "Hair Masks", "Hair Sprays", "Hair Dye", "Hair Relaxers", "Curl Products", "Hair Growth Products", "Hair Gel", "Hair Wax", "Hair Mousse", "Hair Foam", "Hair Pomade", "Hair Dryers", "Hair Straighteners", "Curling Irons", "Hair Clippers", "Trimmers", "Hair Rollers", "Hair Brushes", "Hair Combs"] },
            { name: "Fragrances", image: "icons and images/categories/beauty-personal-care--fragrances.jpg", items: ["Perfumes", "Body Sprays", "Body Mists", "Colognes", "Perfume Gift Sets"] },
            { name: "Bath & Body", image: "icons and images/categories/beauty-personal-care--bath-body.jpg", items: ["Body Wash", "Bath Soap", "Hand Wash", "Body Lotion", "Body Butter", "Body Oil", "Body Scrubs", "Bath Salts", "Deodorants"] },
            { name: "Oral Care", image: "icons and images/categories/beauty-personal-care--oral-care.jpg", items: ["Toothbrushes", "Electric Toothbrushes", "Toothpaste", "Mouthwash", "Dental Floss", "Teeth Whitening Products", "Tongue Cleaners"] },
            { name: "Men's Grooming", image: "icons and images/categories/beauty-personal-care--men-s-grooming.jpg", items: ["Beard Oil", "Beard Balm", "Beard Wash", "Shaving Cream", "Aftershave", "Razors", "Electric Shavers", "Men's Grooming Kits"] },
            { name: "Nail Care", image: "icons and images/categories/beauty-personal-care--nail-care.jpg", items: ["Nail Polish", "Gel Polish", "Nail Polish Remover", "Nail Files", "Nail Clippers", "Cuticle Care", "Manicure Kits", "Pedicure Kits", "Nail Art Supplies"] },
            { name: "Beauty Tools & Accessories", image: "icons and images/categories/beauty-personal-care--beauty-tools-accessories.jpg", items: ["Makeup Organizers", "Vanity Mirrors", "Cosmetic Bags", "Tweezers", "Eyelash Curlers", "Facial Rollers", "Blackhead Removers", "Beauty Blenders"] },
            { name: "Personal Hygiene", image: "icons and images/categories/beauty-personal-care--personal-hygiene.jpg", items: ["Feminine Hygiene", "Cotton Buds", "Cotton Pads", "Wet Wipes", "Hand Sanitizers", "Disposable Razors"] },
        ]},
        { name: "Books & Stationery", icon: "ph-book", categories: [
            { name: "Books", image: "icons and images/categories/books-stationery--books.jpg", items: ["Fiction", "Non-Fiction", "Children's Books", "Educational Books", "Textbooks", "Religious Books", "Cookbooks", "Business Books", "Self-Help Books", "Biographies", "Comics & Graphic Novels", "Dictionaries", "Magazines", "Bookmarks", "Book Covers", "Book Stands", "Reading Lights", "Book Storage"] },
            { name: "School Supplies", image: "icons and images/categories/books-stationery--school-supplies.jpg", items: ["Exercise Books", "Notebooks", "Diaries", "Assignment Books", "Graph Books", "Manuscript Books", "Revision Cards"] },
            { name: "Writing Supplies", image: "icons and images/categories/books-stationery--writing-supplies.jpg", items: ["Ballpoint Pens", "Gel Pens", "Fountain Pens", "Pencils", "Mechanical Pencils", "Markers", "Highlighters", "Whiteboard Markers", "Permanent Markers", "Erasers", "Sharpeners", "Correction Pens", "Correction Tape"] },
            { name: "Paper Products", image: "icons and images/categories/books-stationery--paper-products.jpg", items: ["A4 Paper", "A3 Paper", "Cardstock", "Construction Paper", "Sticky Notes", "Index Cards", "Envelopes", "Labels"] },
            { name: "Office Stationery", image: "icons and images/categories/books-stationery--office-stationery.jpg", items: ["Staplers", "Staples", "Hole Punches", "Paper Clips", "Binder Clips", "Rubber Bands", "Glue", "Glue Sticks", "Adhesive Tape", "Scissors", "Rulers", "Calculators", "Desk Organizers", "Clipboards"] },
            { name: "Filing & Organization", image: "icons and images/categories/books-stationery--filing-organization.jpg", items: ["Files", "Lever Arch Files", "Ring Binders", "Document Wallets", "Expanding Files", "Filing Boxes", "Magazine Holders"] },
            { name: "Arts & Crafts", image: "icons and images/categories/books-stationery--arts-crafts.jpg", items: ["Sketchbooks", "Drawing Paper", "Colored Pencils", "Crayons", "Watercolors", "Acrylic Paint", "Oil Paint", "Paint Brushes", "Canvases", "Easels", "Craft Paper", "Glitter", "Craft Glue", "Clay", "Modeling Dough"] },
            { name: "Educational Materials", image: "icons and images/categories/books-stationery--educational-materials.jpg", items: ["Flash Cards", "Alphabet Charts", "Number Charts", "Maps", "Globes", "Educational Posters", "Learning Kits", "STEM Kits"] },
            { name: "Gift Wrapping", image: "icons and images/categories/books-stationery--gift-wrapping.jpg", items: ["Gift Bags", "Wrapping Paper", "Gift Boxes", "Ribbons", "Bows", "Gift Tags"] },
        ]},
        { name: "Cell Phones & Accessories", icon: "ph-device-mobile", categories: [
            { name: "Smartphones", image: "icons and images/categories/cell-phones-accessories--smartphones.jpg", items: ["Android Phones", "iPhones", "Feature Phones", "Refurbished Phones"] },
            { name: "Tablets", image: "icons and images/categories/cell-phones-accessories--tablets.jpg", items: ["Android Tablets", "iPads", "Windows Tablets", "Kids' Tablets"] },
            { name: "Smartwatches & Wearables", image: "icons and images/categories/cell-phones-accessories--smartwatches-wearables.jpg", items: ["Smartwatches", "Fitness Trackers", "Smart Rings"] },
            { name: "Chargers & Power", image: "icons and images/categories/cell-phones-accessories--chargers-power.jpg", items: ["Wall Chargers", "Fast Chargers", "Wireless Chargers", "Car Chargers", "Charging Cables", "Power Banks", "Charging Stations"] },
            { name: "Cases & Protection", image: "icons and images/categories/cell-phones-accessories--cases-protection.jpg", items: ["Phone Cases", "Tablet Cases", "Screen Protectors", "Camera Lens Protectors", "Waterproof Cases"] },
            { name: "Headphones & Earphones", image: "icons and images/categories/cell-phones-accessories--audio-accessories.jpg", items: ["Wireless Earbuds", "Wired Earphones", "Headphones", "Bluetooth Headsets"] },
            { name: "Mounts & Holders", image: "icons and images/categories/cell-phones-accessories--mounts-holders.jpg", items: ["Car Phone Holders", "Desk Phone Holders", "Bike Phone Mounts", "Tablet Stands"] },
            { name: "Mobile Photography", image: "icons and images/categories/cell-phones-accessories--mobile-photography.jpg", items: ["Selfie Sticks", "Phone Tripods", "Clip-on Camera Lenses", "Selfie Lights", "Gimbals"] },
            { name: "Memory Cards & Storage", image: "icons and images/categories/cell-phones-accessories--storage.jpg", items: ["Memory Cards", "OTG Flash Drives", "Card Readers"] },
            { name: "Mobile Gaming", image: "icons and images/categories/cell-phones-accessories--mobile-gaming.jpg", items: ["Phone Controllers", "Cooling Fans", "Gaming Triggers", "Finger Sleeves"] },
            { name: "Smart Device Accessories", image: "icons and images/categories/cell-phones-accessories--smart-device-accessories.jpg", items: ["Watch Bands", "Watch Chargers", "Watch Screen Protectors", "Tablet Keyboards", "Tablet Stylus Pens"] },
            { name: "Replacement Parts", image: "icons and images/categories/cell-phones-accessories--replacement-parts.jpg", items: ["Phone Batteries", "Charging Ports", "Phone Screens", "Camera Modules", "Replacement Back Covers", "Phone Repair Tools"] },
        ]},
        { name: "Computers & Office", icon: "ph-laptop", categories: [
            { name: "Laptops", image: "icons and images/categories/computers-office--laptops.jpg", items: ["Windows Laptops", "MacBooks", "Chromebooks", "Gaming Laptops", "Business Laptops"] },
            { name: "Desktop Computers", image: "icons and images/categories/computers-office--desktop-computers.jpg", items: ["Desktop PCs", "All-in-One PCs", "Mini PCs", "Gaming PCs", "Workstations"] },
            { name: "Monitors", image: "icons and images/categories/computers-office--monitors.jpg", items: ["Office Monitors", "Gaming Monitors", "Portable Monitors", "Monitor Stands"] },
            { name: "Computer Accessories", image: "icons and images/categories/computers-office--computer-accessories.jpg", items: ["Keyboards", "Mouse", "Mouse Pads", "Webcams", "Computer Speakers", "USB Hubs", "Docking Stations", "Laptop Cooling Pads", "Laptop Stands", "UPS (Uninterruptible Power Supply)", "Surge Protectors", "Power Strips", "Extension Cords", "Laptop Chargers"] },
            { name: "Storage Devices", image: "icons and images/categories/computers-office--storage-devices.jpg", items: ["External Hard Drives", "External SSDs", "Internal SSDs", "Internal Hard Drives", "USB Flash Drives", "Memory Cards", "NAS Storage"] },
            { name: "Printers & Scanners", image: "icons and images/categories/computers-office--printers-scanners.jpg", items: ["Inkjet Printers", "Laser Printers", "Photo Printers", "Label Printers", "Scanners", "Ink Cartridges", "Toner Cartridges", "Printer Paper"] },
            { name: "Networking", image: "icons and images/categories/computers-office--networking.jpg", items: ["Wi-Fi Routers", "Wi-Fi Extenders", "Modems", "Network Switches", "Ethernet Cables", "Network Adapters"] },
            { name: "Office Supplies", image: "icons and images/categories/computers-office--office-supplies.jpg", items: ["Office Paper", "Files & Folders", "Staplers", "Hole Punches", "Paper Clips", "Binder Clips", "Tape", "Glue", "Scissors", "Calculators", "Desk Organizers", "Whiteboards", "Notice Boards"] },
            { name: "Office Furniture", image: "icons and images/categories/computers-office--office-furniture.jpg", items: ["Office Chairs", "Office Desks", "Filing Cabinets", "Bookshelves", "Footrests", "Monitor Risers"] },
            { name: "Presentation Equipment", image: "icons and images/categories/computers-office--presentation-equipment.jpg", items: ["Projectors", "Projector Screens", "Laser Pointers", "Presentation Remotes"] },
        ]},
        { name: "Electronics", icon: "ph-television", categories: [
            { name: "TV & Home Entertainment", image: "icons and images/categories/electronics--tv-home-entertainment.jpg", items: ["Smart TVs", "LED TVs", "OLED TVs", "QLED TVs", "TV Boxes", "Streaming Devices", "TV Mounts", "TV Stands", "TV Remote Controls", "HDMI Switches", "Home Projectors", "Business Projectors", "Portable Projectors", "Projector Screens", "Projector Mounts", "Projector Accessories", "HDMI Cables", "DisplayPort Cables", "VGA Cables", "Universal Remote Controls"] },
            { name: "Audio", image: "icons and images/categories/electronics--audio.jpg", items: ["Bluetooth Speakers", "Portable Speakers", "Home Theatre Systems", "Soundbars", "Amplifiers", "Receivers", "Studio Speakers", "PA Systems", "Microphones", "Audio Cables", "Optical Cables", "RCA Cables"] },
            { name: "Cameras & Photography", image: "icons and images/categories/electronics--cameras-photography.jpg", items: ["DSLR Cameras", "Mirrorless Cameras", "Action Cameras", "Instant Cameras", "Digital Cameras", "Camcorders", "Camera Lenses", "Camera Flashes", "Camera Tripods", "Camera Gimbals", "Camera Bags", "Camera Batteries", "Camera Chargers", "Electronic Cleaning Kits"] },
            { name: "Drones", image: "icons and images/categories/electronics--drones.jpg", items: ["Camera Drones", "Mini Drones", "Racing Drones", "Drone Batteries", "Drone Propellers", "Drone Accessories"] },
            { name: "Gaming", image: "icons and images/categories/electronics--gaming.jpg", items: ["PlayStation", "Xbox", "Nintendo", "VR Headsets", "Gaming Controllers", "Console Accessories", "Gaming Chairs"] },
            { name: "Major Appliances", image: "icons and images/categories/electronics--home-appliances.jpg", items: ["Refrigerators", "Freezers", "Washing Machines", "Dryers", "Dishwashers", "Air Conditioners", "Fans", "Air Purifiers", "Humidifiers", "Dehumidifiers", "Water Dispensers"] },
            { name: "Kitchen Appliances", image: "icons and images/categories/electronics--kitchen-appliances.jpg", items: ["Microwaves", "Air Fryers", "Blenders", "Food Processors", "Mixers", "Rice Cookers", "Pressure Cookers", "Electric Kettles", "Coffee Machines", "Toasters", "Sandwich Makers", "Juicers"] },
            { name: "Small Appliances", image: "icons and images/categories/electronics--small-household-appliances.jpg", items: ["Vacuum Cleaners", "Steam Cleaners", "Irons", "Garment Steamers", "Sewing Machines", "Hair Clippers", "Water Heaters"] },
            { name: "Smart Home", image: "icons and images/categories/electronics--smart-home.jpg", items: ["Smart Lights", "Smart Plugs", "Smart Switches", "Smart Doorbells", "Smart Locks", "Smart Cameras", "Smart Sensors", "Smart Hubs", "Surge Protectors", "Extension Boards", "Voltage Protectors", "Travel Adapters", "Travel Power Strips"] },
            { name: "Security & Surveillance", image: "icons and images/categories/electronics--security-surveillance.jpg", items: ["CCTV Cameras", "DVR Systems", "NVR Systems", "Alarm Systems", "Motion Sensors", "Video Doorbells", "Access Control Systems"] },
        ]},
        { name: "Fashion & Accessories", icon: "ph-t-shirt", categories: [
            { name: "Women's Fashion", image: "icons and images/categories/fashion-accessories--women-s-fashion.jpg", items: ["Tops", "T-Shirts", "Blouses", "Shirts", "Dresses", "Skirts", "Jeans", "Trousers", "Leggings", "Shorts", "Jumpsuits", "Hoodies", "Sweaters", "Jackets", "Coats", "Lingerie", "Sleepwear", "Swimwear", "Activewear", "Traditional Wear"] },
            { name: "Men's Fashion", image: "icons and images/categories/fashion-accessories--men-s-fashion.jpg", items: ["T-Shirts", "Polo Shirts", "Casual Shirts", "Dress Shirts", "Jeans", "Trousers", "Chinos", "Cargo Pants", "Shorts", "Hoodies", "Sweaters", "Jackets", "Blazers", "Suits", "Underwear", "Sleepwear", "Swimwear", "Sportswear", "Traditional Wear"] },
            { name: "Boys' Fashion", image: "icons and images/categories/fashion-accessories--boys-fashion.jpg", items: ["Clothing", "Shoes", "Accessories"] },
            { name: "Girls' Fashion", image: "icons and images/categories/fashion-accessories--girls-fashion.jpg", items: ["Clothing", "Shoes", "Accessories"] },
            { name: "Baby Fashion", image: "icons and images/categories/fashion-accessories--baby-fashion.jpg", items: ["Baby Clothing", "Baby Shoes", "Baby Accessories"] },
            { name: "Women's Shoes", image: "icons and images/categories/fashion-accessories--women-s-shoes.jpg", items: ["Sneakers", "Heels", "Flats", "Sandals", "Boots", "Loafers", "Slippers", "Wedges"] },
            { name: "Men's Shoes", image: "icons and images/categories/fashion-accessories--men-s-shoes.jpg", items: ["Sneakers", "Formal Shoes", "Loafers", "Boots", "Sandals", "Slippers", "Running Shoes"] },
            { name: "Bags", image: "icons and images/categories/fashion-accessories--bags.jpg", items: ["Handbags", "Tote Bags", "Shoulder Bags", "Crossbody Bags", "Clutches", "Wallets", "Backpacks", "Laptop Bags", "Duffel Bags", "Travel Bags"] },
            { name: "Watches", image: "icons and images/categories/fashion-accessories--watches.jpg", items: ["Men's Watches", "Women's Watches", "Smartwatches", "Sports Watches", "Luxury Watches", "Fashion Watches", "Pocket Watches"] },
            { name: "Jewelry", image: "icons and images/categories/fashion-accessories--jewelry.jpg", items: ["Necklaces", "Chains", "Pendants", "Chokers", "Lockets", "Earrings", "Stud Earrings", "Hoop Earrings", "Drop Earrings", "Dangle Earrings", "Clip-On Earrings", "Ear Cuffs", "Rings", "Fashion Rings", "Wedding Bands", "Engagement Rings", "Promise Rings", "Adjustable Rings", "Bracelets", "Bangles", "Charm Bracelets", "Cuffs", "Beaded Bracelets", "Anklets", "Chain Anklets", "Beaded Anklets", "Charm Anklets", "Brooches", "Jewelry Sets", "Necklace Sets", "Bridal Sets", "Matching Sets", "Men's Chains", "Cufflinks", "Tie Clips", "Cross Necklaces", "Islamic Jewelry", "Prayer Bracelets", "Religious Pendants", "Nose Rings", "Belly Rings", "Lip Rings", "Eyebrow Rings", "Tongue Rings", "Jewelry Boxes", "Ring Holders", "Watch Boxes", "Jewelry Organizers", "Jewelry Cleaning Cloths", "Jewelry Cleaning Solutions"] },
            { name: "Sunglasses & Eyewear", image: "icons and images/categories/fashion-accessories--sunglasses-eyewear.jpg", items: ["Sunglasses", "Blue Light Glasses", "Reading Glasses", "Eyeglass Frames"] },
            { name: "Fashion Accessories", image: "icons and images/categories/fashion-accessories--fashion-accessories.jpg", items: ["Belts", "Caps", "Hats", "Beanies", "Scarves", "Gloves", "Socks", "Ties", "Bow Ties", "Pocket Squares", "Suspenders", "Umbrellas", "Hair Accessories", "Wallets", "Card Holders", "Lapel Pins", "Keychains"] },
            { name: "Luggage & Travel", image: "icons and images/categories/fashion-accessories--luggage-travel.jpg", items: ["Suitcases", "Carry-On Luggage", "Carry-On Suitcases", "Medium Suitcases", "Large Suitcases", "Hard Shell Suitcases", "Soft Shell Suitcases", "Luggage Sets", "Travel Backpacks", "Travel Organizers", "Passport Holders", "Luggage Tags", "Travel Pillows", "Duffel Bags", "Weekender Bags", "Garment Bags", "Travel Totes", "Laptop Backpacks", "Hiking Backpacks", "School Backpacks", "Casual Backpacks", "Anti-Theft Backpacks", "Neck Pillows", "Eye Masks", "Ear Plugs", "Luggage Straps", "Document Organizers", "Travel Wallets", "Travel Bottles", "Packing Cubes", "Shoe Bags", "Travel Blankets", "Inflatable Pillows", "Seat Cushions", "Footrests", "Compression Socks", "TSA Locks", "Combination Locks", "Luggage Covers", "Money Belts", "RFID Wallets", "Hidden Travel Pouches", "Toiletry Bags", "Electronics Organizers", "Cable Organizers", "Packing Organizers", "Reusable Water Bottles", "Travel Umbrellas", "Rain Ponchos", "Travel Laundry Bags", "Reusable Shopping Bags", "Portable Luggage Scales"] },
            { name: "Wigs & Hair Extensions", image: "icons and images/categories/fashion-accessories--wigs-hair-extensions.jpg", items: ["Human Hair Wigs", "Synthetic Wigs", "Hair Bundles", "Hair Extensions", "Closures", "Frontals", "Wig Accessories"] },
        ]},
        { name: "Food, Beverages & Groceries", icon: "ph-shopping-cart", categories: [
            { name: "Snacks & Confectionery", image: "icons and images/categories/food-beverages-groceries--snacks-confectionery.jpg", items: ["Biscuits", "Cookies", "Crackers", "Chips", "Popcorn", "Chocolate", "Candy", "Chewing Gum", "Nuts"] },
            { name: "Beverages", image: "icons and images/categories/food-beverages-groceries--beverages.jpg", items: ["Soft Drinks", "Hydration Drinks", "Energy Drinks", "Fruit Juices", "Bottled Water", "Sparkling Water", "Tea", "Coffee", "Hot Chocolate", "Malt Drinks"] },
            { name: "Alcohol", image: "icons and images/categories/food-beverages-groceries--alcohol.jpg", items: ["Beer", "Wine", "Champagne", "Whisky", "Vodka", "Gin", "Rum", "Brandy", "Liqueurs", "Ciders", "Mixers"] },
            { name: "Rice, Pasta & Grains", image: "icons and images/categories/food-beverages-groceries--rice-pasta-grains.jpg", items: ["Rice", "Spaghetti", "Macaroni", "Noodles", "Flour", "Oats", "Semolina", "Couscous"] },
            { name: "Cooking Ingredients", image: "icons and images/categories/food-beverages-groceries--cooking-ingredients.jpg", items: ["Cooking Oil", "Salt", "Sugar", "Tomato Paste", "Vinegar", "Soy Sauce", "Corn Starch", "Baking Ingredients"] },
            { name: "Herbs, Spices & Seasonings", image: "icons and images/categories/food-beverages-groceries--herbs-spices-seasonings.jpg", items: ["Curry", "Black Pepper", "White Pepper", "Cinnamon", "Nutmeg", "Garlic Powder", "Ginger Powder", "Stock Cubes", "Mixed Seasonings"] },
            { name: "Canned & Packaged Foods", image: "icons and images/categories/food-beverages-groceries--canned-packaged-foods.jpg", items: ["Canned Fish", "Canned Meat", "Canned Beans", "Canned Vegetables", "Instant Noodles", "Instant Soups"] },
            { name: "Dairy & Alternatives", image: "icons and images/categories/food-beverages-groceries--dairy-alternatives.jpg", items: ["UHT Milk", "Powdered Milk", "Evaporated Milk", "Condensed Milk", "Plant-Based Milk", "Cheese", "Butter"] },
            { name: "Breakfast Foods", image: "icons and images/categories/food-beverages-groceries--breakfast-foods.jpg", items: ["Cereals", "Granola", "Pancake Mix", "Honey", "Jam", "Peanut Butter", "Chocolate Spread"] },
            { name: "Baking Supplies", image: "icons and images/categories/food-beverages-groceries--baking-supplies.jpg", items: ["Cake Mix", "Cocoa Powder", "Chocolate Chips", "Vanilla Extract", "Food Colouring", "Sprinkles"] },
            { name: "Baby Food", image: "icons and images/categories/food-beverages-groceries--baby-food.jpg", items: ["Infant Formula", "Baby Cereals", "Baby Purees", "Baby Snacks"] },
            { name: "Paper & Household Supplies", image: "icons and images/categories/food-beverages-groceries--household-essentials.jpg", items: ["Tissue Paper", "Paper Towels", "Toilet Paper", "Aluminium Foil", "Cling Film", "Food Storage Bags", "Disposable Plates", "Disposable Cups", "Disposable Cutlery"] },
            { name: "Cleaning Supplies", image: "icons and images/categories/food-beverages-groceries--cleaning-supplies.jpg", items: ["Laundry Detergent", "Dishwashing Liquid", "Floor Cleaner", "Bleach", "Disinfectants", "Air Fresheners", "Sponges", "Cleaning Brushes", "Garbage Bags"] },
        ]},
        { name: "Furniture & Home", icon: "ph-armchair", categories: [
            { name: "Living Room Furniture", image: "icons and images/categories/furniture-home--living-room-furniture.jpg", items: ["Sofas", "Sectional Sofas", "Recliners", "Coffee Tables", "TV Stands", "Side Tables", "Console Tables", "Bookshelves", "Display Cabinets"] },
            { name: "Bedroom Furniture", image: "icons and images/categories/furniture-home--bedroom-furniture.jpg", items: ["Beds", "Bed Frames", "Mattresses", "Wardrobes", "Dressers", "Bedside Tables", "Chest of Drawers", "Vanity Tables"] },
            { name: "Dining Room Furniture", image: "icons and images/categories/furniture-home--dining-room-furniture.jpg", items: ["Dining Tables", "Dining Chairs", "Bar Stools", "Kitchen Islands", "Sideboards", "Buffets"] },
            { name: "Office Furniture", image: "icons and images/categories/furniture-home--office-furniture.jpg", items: ["Office Desks", "Office Chairs", "Filing Cabinets", "Bookshelves", "Computer Tables"] },
            { name: "Outdoor Furniture", image: "icons and images/categories/furniture-home--outdoor-furniture.jpg", items: ["Garden Chairs", "Garden Tables", "Patio Sets", "Outdoor Benches", "Hammocks"] },
            { name: "Home Décor", image: "icons and images/categories/furniture-home--home-d-cor.jpg", items: ["Wall Art", "Mirrors", "Wall Clocks", "Artificial Plants", "Vases", "Decorative Bowls", "Picture Frames", "Candles", "Candle Holders"] },
            { name: "Curtains & Window Treatments", image: "icons and images/categories/furniture-home--curtains-window-treatments.jpg", items: ["Curtains", "Curtain Rods", "Curtain Rings", "Blinds", "Shades"] },
            { name: "Rugs & Carpets", image: "icons and images/categories/furniture-home--rugs-carpets.jpg", items: ["Area Rugs", "Carpets", "Door Mats", "Floor Mats"] },
            { name: "Bedding", image: "icons and images/categories/furniture-home--bedding.jpg", items: ["Bed Sheets", "Duvets", "Duvet Covers", "Pillows", "Pillow Cases", "Blankets", "Mattress Protectors"] },
            { name: "Kitchen & Dining", image: "icons and images/categories/furniture-home--kitchen-dining.jpg", items: ["Dinner Sets", "Plates", "Bowls", "Cups & Mugs", "Glassware", "Cutlery", "Serving Trays", "Food Storage Containers", "Cookware", "Frying Pans", "Cooking Pots", "Baking Dishes", "Kitchen Utensils", "Knife Sets", "Chopping Boards"] },
            { name: "Bathroom Accessories", image: "icons and images/categories/furniture-home--bathroom.jpg", items: ["Shower Curtains", "Bathroom Mats", "Soap Dispensers", "Toothbrush Holders", "Laundry Baskets", "Towel Racks", "Bathroom Cabinets"] },
            { name: "Storage & Organization", image: "icons and images/categories/furniture-home--storage-organization.jpg", items: ["Storage Boxes", "Plastic Drawers", "Shoe Racks", "Clothes Hangers", "Closet Organizers", "Shelving Units"] },
            { name: "Home Improvement Tools & Supplies", image: "icons and images/categories/furniture-home--home-improvement.jpg", items: ["Door Handles", "Cabinet Handles", "Locks", "Hinges", "Wall Shelves", "Hooks", "Mailboxes"] },
        ]},
        { name: "Health & Wellness", icon: "ph-heartbeat", categories: [
            { name: "Vitamins & Supplements", image: "icons and images/categories/health-wellness--vitamins-supplements.jpg", items: ["Multivitamins", "Vitamin A", "Vitamin B Complex", "Vitamin C", "Vitamin D", "Vitamin E", "Calcium", "Magnesium", "Zinc", "Iron", "Fish Oil", "Omega-3", "Probiotics", "Herbal Supplements", "Protein Supplements", "Whey Protein", "Mass Gainers", "Creatine", "BCAAs", "Electrolyte Drinks", "Energy Gels", "Protein Bars"] },
            { name: "Medical Supplies", image: "icons and images/categories/health-wellness--medical-supplies.jpg", items: ["Bandages", "Gauze", "Medical Tape", "Cotton Wool", "Antiseptics", "Wound Dressings", "First Aid Kits", "Disposable Gloves", "Face Masks"] },
            { name: "Health Monitoring", image: "icons and images/categories/health-wellness--health-monitoring.jpg", items: ["Blood Pressure Monitors", "Blood Glucose Monitors", "Thermometers", "Pulse Oximeters", "Weighing Scales", "Body Fat Scales"] },
            { name: "Mobility & Support", image: "icons and images/categories/health-wellness--mobility-support.jpg", items: ["Wheelchairs", "Walking Sticks", "Crutches", "Walking Frames", "Back Supports", "Knee Braces", "Ankle Supports", "Wrist Braces", "Neck Braces", "Compression Socks"] },
            { name: "Recovery & Therapy", image: "icons and images/categories/health-wellness--recovery-therapy.jpg", items: ["Massage Guns", "Foam Rollers", "Massage Balls", "Heating Pads", "Ice Packs", "Posture Correctors", "TENS Machines"] },
            { name: "Personal Wellness", image: "icons and images/categories/health-wellness--personal-wellness.jpg", items: ["Sleep Aids", "Humidifiers", "Air Purifiers", "Aromatherapy Diffusers", "Essential Oils"] },
            { name: "Sexual Wellness", image: "icons and images/categories/health-wellness--sexual-wellness.jpg", items: ["Condoms", "Personal Lubricants", "Pregnancy Tests", "Ovulation Test Kits", "Fertility Products"] },
            { name: "Medical Equipment", image: "icons and images/categories/health-wellness--medical-equipment.jpg", items: ["Nebulizers", "CPAP Accessories", "Oxygen Concentrators", "Medical Pill Organizers", "Medicine Storage Boxes"] },
        ]},
        { name: "Industrial & Tools", icon: "ph-wrench", categories: [
            { name: "Hand Tools", image: "icons and images/categories/industrial-tools--hand-tools.jpg", items: ["Hammer", "Screwdrivers", "Spanners", "Wrenches", "Pliers", "Adjustable Wrenches", "Socket Sets", "Allen Keys", "Chisels", "Files", "Hand Saws", "Utility Knives", "Tape Measures", "Spirit Levels", "Clamps"] },
            { name: "Power Tools", image: "icons and images/categories/industrial-tools--power-tools.jpg", items: ["Drills", "Impact Drivers", "Angle Grinders", "Circular Saws", "Jigsaws", "Rotary Hammers", "Sanders", "Heat Guns", "Nail Guns", "Polishers", "Power Tool Accessories"] },
            { name: "Electrical Supplies", image: "icons and images/categories/industrial-tools--electrical-supplies.jpg", items: ["Electrical Cables", "Extension Cords", "Circuit Breakers", "Wall Sockets", "Switches", "Junction Boxes", "Cable Ties", "Electrical Tape", "Fuses", "Voltage Testers"] },
            { name: "Plumbing Supplies", image: "icons and images/categories/industrial-tools--plumbing-supplies.jpg", items: ["PVC Pipes", "Pipe Fittings", "Faucets", "Shower Heads", "Water Taps", "Valves", "Pipe Sealants", "Pipe Wrenches", "Drain Covers"] },
            { name: "Welding Equipment", image: "icons and images/categories/industrial-tools--welding-equipment.jpg", items: ["Welding Machines", "Welding Rods", "Welding Helmets", "Welding Gloves", "Welding Clamps"] },
            { name: "Measuring Tools", image: "icons and images/categories/industrial-tools--measuring-tools.jpg", items: ["Laser Measures", "Vernier Calipers", "Micrometers", "Measuring Wheels", "Digital Levels"] },
            { name: "Safety Equipment", image: "icons and images/categories/industrial-tools--safety-equipment.jpg", items: ["Safety Helmets", "Safety Glasses", "Safety Gloves", "Reflective Vests", "Ear Protection", "Respirators", "Safety Boots"] },
            { name: "Fasteners", image: "icons and images/categories/industrial-tools--fasteners.jpg", items: ["Nails", "Screws", "Bolts", "Nuts", "Washers", "Anchors", "Rivets"] },
            { name: "Adhesives & Sealants", image: "icons and images/categories/industrial-tools--adhesives-sealants.jpg", items: ["Super Glue", "Construction Adhesives", "Silicone Sealants", "Epoxy", "Wood Glue", "Thread Seal Tape"] },
            { name: "Paint & Painting Supplies", image: "icons and images/categories/industrial-tools--paint-painting-supplies.jpg", items: ["Paint Brushes", "Rollers", "Paint Trays", "Spray Guns", "Masking Tape", "Drop Cloths", "Scrapers"] },
            { name: "Ladders & Access Equipment", image: "icons and images/categories/industrial-tools--ladders-access-equipment.jpg", items: ["Step Ladders", "Extension Ladders", "Folding Ladders", "Scaffolding (Portable)"] },
            { name: "Workshop Equipment", image: "icons and images/categories/industrial-tools--workshop-equipment.jpg", items: ["Tool Boxes", "Tool Cabinets", "Workbenches", "Vices", "Air Compressors", "Pressure Washers"] },
        ]},
        { name: "Pet Supplies", icon: "ph-paw-print", categories: [
            { name: "Dog Supplies", image: "icons and images/categories/pet-supplies--dog-supplies.jpg", items: ["Dog Food", "Dog Treats", "Dog Toys", "Dog Beds", "Dog Collars", "Dog Leashes", "Dog Harnesses", "Dog Bowls", "Dog Clothing", "Dog Crates", "Dog Carriers"] },
            { name: "Cat Supplies", image: "icons and images/categories/pet-supplies--cat-supplies.jpg", items: ["Cat Food", "Cat Treats", "Cat Toys", "Cat Beds", "Cat Trees", "Cat Scratchers", "Cat Litter", "Litter Boxes", "Cat Carriers", "Cat Collars"] },
            { name: "Fish & Aquatic", image: "icons and images/categories/pet-supplies--fish-aquatic.jpg", items: ["Aquariums", "Fish Tanks", "Aquarium Filters", "Aquarium Pumps", "Fish Food", "Aquarium Decorations", "Aquarium Gravel", "Water Conditioners"] },
            { name: "Bird Supplies", image: "icons and images/categories/pet-supplies--bird-supplies.jpg", items: ["Bird Cages", "Bird Food", "Bird Feeders", "Bird Toys", "Perches", "Nesting Boxes"] },
            { name: "Small Pet Supplies", image: "icons and images/categories/pet-supplies--small-pet-supplies.jpg", items: ["Rabbit Food", "Guinea Pig Food", "Hamster Food", "Small Animal Cages", "Small Pet Bedding", "Exercise Wheels", "Water Bottles"] },
            { name: "Reptile Supplies", image: "icons and images/categories/pet-supplies--reptile-supplies.jpg", items: ["Reptile Tanks", "Heat Lamps", "Heating Mats", "Reptile Food", "Terrarium Decorations", "Humidity Equipment"] },
            { name: "Pet Grooming", image: "icons and images/categories/pet-supplies--pet-grooming.jpg", items: ["Pet Shampoo", "Grooming Brushes", "Nail Clippers", "Pet Towels", "Grooming Clippers", "Flea Combs"] },
            { name: "Pet Health", image: "icons and images/categories/pet-supplies--pet-health.jpg", items: ["Flea & Tick Control", "Dewormers", "Vitamins & Supplements", "Dental Care", "Ear Cleaners", "Eye Care Products"] },
            { name: "Feeding Supplies", image: "icons and images/categories/pet-supplies--feeding-supplies.jpg", items: ["Food Bowls", "Water Bowls", "Automatic Feeders", "Water Dispensers", "Food Storage Containers"] },
            { name: "Pet Travel", image: "icons and images/categories/pet-supplies--pet-travel.jpg", items: ["Pet Carriers", "Travel Bags", "Car Seat Covers", "Seat Belts for Pets", "Portable Bowls"] },
            { name: "Pet Training", image: "icons and images/categories/pet-supplies--pet-training.jpg", items: ["Training Pads", "Clickers", "Training Treats", "Training Collars", "Pet Gates"] },
            { name: "Cleaning & Waste", image: "icons and images/categories/pet-supplies--cleaning-waste.jpg", items: ["Waste Bags", "Litter Scoops", "Cage Cleaners", "Pet Stain Removers", "Odour Eliminators"] },
        ]},
        { name: "Sports & Outdoors", icon: "ph-soccer-ball", categories: [
            { name: "Fitness Equipment", image: "icons and images/categories/sports-outdoors--fitness-equipment.jpg", items: ["Dumbbells", "Barbells", "Kettlebells", "Weight Plates", "Resistance Bands", "Exercise Mats", "Jump Ropes", "Pull-Up Bars", "Push-Up Bars", "Foam Rollers", "Water Bottles", "Gym Bags", "Sports Towels", "Fitness Trackers", "Armbands", "Sweatbands"] },
            { name: "Exercise Machines", image: "icons and images/categories/sports-outdoors--exercise-machines.jpg", items: ["Treadmills", "Exercise Bikes", "Rowing Machines", "Ellipticals", "Home Gyms", "Steppers"] },
            { name: "Team Sports", image: "icons and images/categories/sports-outdoors--team-sports.jpg", items: ["Football", "Basketball", "Volleyball", "Handball", "Rugby", "Cricket", "Baseball", "Netball", "Balls", "Goal Nets", "Shin Guards", "Goalkeeper Gloves", "Cones", "Training Bibs", "Pumps", "Whistles", "Stopwatches"] },
            { name: "Racket Sports", image: "icons and images/categories/sports-outdoors--racket-sports.jpg", items: ["Tennis Rackets", "Tennis Balls", "Badminton Rackets", "Shuttlecocks", "Squash Rackets", "Table Tennis Bats", "Ping Pong Balls"] },
            { name: "Cycling", image: "icons and images/categories/sports-outdoors--cycling.jpg", items: ["Bicycles", "Kids' Bikes", "Mountain Bikes", "Road Bikes", "Helmets", "Bike Lights", "Bike Pumps", "Bike Locks", "Cycling Gloves", "Water Bottle Holders"] },
            { name: "Camping & Hiking", image: "icons and images/categories/sports-outdoors--camping-hiking.jpg", items: ["Tents", "Sleeping Bags", "Camping Chairs", "Camping Tables", "Camping Lanterns", "Camping Stoves", "Backpacks", "Hiking Boots", "Trekking Poles", "Coolers", "Dry Bags", "Waterproof Bags", "Cooler Bags", "Picnic Backpacks", "Hydration Packs"] },
            { name: "Outdoor Recreation", image: "icons and images/categories/sports-outdoors--outdoor-recreation.jpg", items: ["Picnic Sets", "Hammocks", "Binoculars", "Flashlights", "Multi-Tools", "Compass"] },
            { name: "Water Sports", image: "icons and images/categories/sports-outdoors--water-sports.jpg", items: ["Swimming Goggles", "Swim Caps", "Swim Fins", "Snorkeling Gear", "Life Jackets", "Inflatable Floats"] },
            { name: "Martial Arts & Boxing", image: "icons and images/categories/sports-outdoors--martial-arts-boxing.jpg", items: ["Boxing Gloves", "Punching Bags", "Hand Wraps", "Karate Uniforms", "Martial Arts Belts", "Protective Gear"] },
            { name: "Sportswear", image: "icons and images/categories/sports-outdoors--sportswear.jpg", items: ["Sports Jerseys", "Tracksuits", "Compression Wear", "Gym Shorts", "Sports Leggings", "Sports Bras", "Rain Jackets"] },
            { name: "Sports Footwear", image: "icons and images/categories/sports-outdoors--sports-footwear.jpg", items: ["Running Shoes", "Football Boots", "Basketball Shoes", "Tennis Shoes", "Hiking Boots", "Cycling Shoes"] },
            { name: "Fishing", image: "icons and images/categories/sports-outdoors--fishing.jpg", items: ["Fishing Rods", "Fishing Reels", "Fishing Lines", "Hooks", "Baits", "Tackle Boxes", "Fishing Nets"] },
            { name: "Outdoor Games", image: "icons and images/categories/sports-outdoors--outdoor-games.jpg", items: ["Frisbees", "Kites", "Cornhole Sets", "Giant Jenga", "Outdoor Chess", "Outdoor Volleyball Sets"] },
        ]},
        { name: "Toys & Games", icon: "ph-puzzle-piece", categories: [
            { name: "Baby & Toddler Toys", image: "icons and images/categories/toys-games--baby-toddler-toys.jpg", items: ["Rattles", "Soft Toys", "Activity Toys", "Stacking Toys", "Shape Sorters", "Musical Toys", "Push & Pull Toys"] },
            { name: "Educational Toys", image: "icons and images/categories/toys-games--educational-toys.jpg", items: ["Alphabet Toys", "Number Toys", "STEM Kits", "Science Kits", "Learning Tablets", "Building Blocks", "Puzzle Games", "Montessori Toys"] },
            { name: "Dolls & Dollhouses", image: "icons and images/categories/toys-games--dolls-dollhouses.jpg", items: ["Fashion Dolls", "Baby Dolls", "Dollhouses", "Doll Furniture", "Doll Accessories"] },
            { name: "Action Figures & Collectibles", image: "icons and images/categories/toys-games--action-figures-collectibles.jpg", items: ["Action Figures", "Superhero Figures", "Anime Figures", "Collectible Figures", "Toy Vehicles"] },
            { name: "Building Toys", image: "icons and images/categories/toys-games--building-toys.jpg", items: ["LEGO-Compatible Blocks", "Magnetic Tiles", "Construction Sets", "Model Kits"] },
            { name: "Remote Control Toys", image: "icons and images/categories/toys-games--remote-control-toys.jpg", items: ["RC Cars", "RC Boats", "RC Helicopters", "RC Drones (Toy Grade)", "RC Trucks"] },
            { name: "Outdoor Toys", image: "icons and images/categories/toys-games--outdoor-toys.jpg", items: ["Scooters", "Tricycles", "Ride-On Toys", "Toy Basketball Hoops", "Toy Football Goals", "Bubble Machines", "Water Guns", "Sand Toys"] },
            { name: "Board Games", image: "icons and images/categories/toys-games--board-games.jpg", items: ["Chess", "Checkers", "Monopoly", "Scrabble", "Ludo", "Snakes & Ladders", "Playing Cards", "Dominoes"] },
            { name: "Puzzles", image: "icons and images/categories/toys-games--puzzles.jpg", items: ["Jigsaw Puzzles", "3D Puzzles", "Brain Teasers", "Puzzle Cubes"] },
            { name: "Arts, Crafts & DIY", image: "icons and images/categories/toys-games--arts-crafts.jpg", items: ["Colouring Books", "Crayons", "Markers", "Paint Sets", "Craft Kits", "Bead Kits", "Modeling Clay", "Slime Kits"] },
            { name: "Toy Vehicles", image: "icons and images/categories/toys-games--toy-vehicles.jpg", items: ["Toy Cars", "Toy Trucks", "Toy Trains", "Toy Airplanes", "Toy Boats", "Toy Construction Vehicles"] },
            { name: "Plush Toys", image: "icons and images/categories/toys-games--plush-toys.jpg", items: ["Teddy Bears", "Stuffed Animals", "Character Plushies", "Plush Pillows"] },
            { name: "Musical Toys", image: "icons and images/categories/toys-games--musical-toys.jpg", items: ["Toy Pianos", "Toy Guitars", "Toy Drums", "Toy Microphones", "Toy Keyboards"] },
            { name: "Video Games & Consoles", image: "icons and images/categories/toys-games--video-games-consoles.jpg", items: ["PlayStation Games", "Xbox Games", "Nintendo Games", "Gaming Accessories", "Handheld Consoles"] },
        ]},
        { name: "Music", icon: "ph-music-notes", categories: [
            { name: "String Instruments", image: "icons and images/categories/music--string-instruments.jpg", items: ["Acoustic Guitars", "Electric Guitars", "Bass Guitars", "Ukuleles", "Violins", "Cellos", "Harps"] },
            { name: "Keyboard Instruments", image: "icons and images/categories/music--keyboard-instruments.jpg", items: ["Digital Pianos", "Keyboards", "MIDI Keyboards", "Synthesizers"] },
            { name: "Drums & Percussion", image: "icons and images/categories/music--drums-percussion.jpg", items: ["Drum Kits", "Electronic Drums", "Cajons", "Bongos", "Congas", "Tambourines", "Drum Sticks", "Cymbals"] },
            { name: "Wind Instruments", image: "icons and images/categories/music--wind-instruments.jpg", items: ["Flutes", "Recorders", "Clarinets", "Saxophones", "Trumpets", "Trombones", "Harmonicas"] },
            { name: "DJ Equipment", image: "icons and images/categories/music--dj-equipment.jpg", items: ["DJ Controllers", "DJ Mixers", "Turntables", "DJ Headphones", "DJ Cases"] },
            { name: "Studio Recording", image: "icons and images/categories/music--studio-recording.jpg", items: ["Audio Interfaces", "Studio Monitors", "Studio Headphones", "Studio Microphones", "Microphone Stands", "Pop Filters", "Mixers"] },
            { name: "Live Sound Equipment", image: "icons and images/categories/music--live-sound-equipment.jpg", items: ["PA Speakers", "Amplifiers", "Mixers", "Wireless Microphones", "Speaker Stands", "Audio Cables"] },
            { name: "Instrument Accessories", image: "icons and images/categories/music--instrument-accessories.jpg", items: ["Guitar Strings", "Guitar Picks", "Guitar Straps", "Capos", "Tuners", "Instrument Cases", "Music Stands", "Metronomes", "Instrument Cables"] },
            { name: "Sheet Music & Books", image: "icons and images/categories/music--sheet-music-books.jpg", items: ["Music Books", "Sheet Music", "Music Theory Books", "Instrument Learning Books"] },
            { name: "Karaoke", image: "icons and images/categories/music--karaoke.jpg", items: ["Karaoke Machines", "Karaoke Microphones", "Karaoke Speakers"] },
        ]},
    ];

    const TOP_BRANDS = [
        { name: 'Samsung', color: '#1428A0', logo: 'icons and images/Brand - Samsung.png' },
        { name: 'Apple', color: '#1a1a1a', logo: 'icons and images/Brand - Apple.png' },
        { name: 'HP', color: '#0096D6', logo: 'icons and images/Brand - HP.png' },
        { name: 'Dell', color: '#007DB8', logo: 'icons and images/Brand - Dell.png' },
        { name: 'Sony', color: '#000000', logo: 'icons and images/Brand - Sony.png' },
        { name: 'LG', color: '#A50034', logo: 'icons and images/Brand - LG.png' },
        { name: 'Xiaomi', color: '#FF6900', logo: 'icons and images/Brand - Xiaomi.png' },
        { name: 'Lenovo', color: '#E2231A', logo: 'icons and images/Brand - Lenovo.png' },
    ];

    function getDepartments() {
        return DEPARTMENTS;
    }

    function getDepartmentByName(name) {
        return DEPARTMENTS.find(d => d.name === name) || null;
    }

    // Looks up the photo used for a legacy CATEGORIES entry (kept for any
    // other legacy callers — the new department/category tiles carry their
    // own `.image` field directly instead of looking this up).
    function getCategoryImageForName(legacyCategoryName) {
        if (!legacyCategoryName) return null;
        const found = CATEGORIES.find(c => c.name === legacyCategoryName);
        return found ? found.image : null;
    }

    // Finds which department + category a name belongs to, matching against
    // either the category's own name or any of its item names. Used to keep
    // old ?cat=CategoryName deep links working.
    function findDepartmentAndSubcategoryByLegacyCategory(legacyCategoryName) {
        if (!legacyCategoryName) return null;
        const needle = legacyCategoryName.toLowerCase();
        for (const dept of DEPARTMENTS) {
            const cat = dept.categories.find(c =>
                c.name.toLowerCase() === needle ||
                c.items.some(item => item.toLowerCase() === needle)
            );
            if (cat) return { department: dept, subcategory: cat };
        }
        return null;
    }

    // Popular picks for a department: pulls real seed products whose
    // category/title matches one of this department's category or item
    // names, sorted by soldCount. Returns [] if nothing matches yet (UI
    // shows an empty state instead of breaking).
    function getPopularProductsForDepartment(departmentName, limit = 5) {
        const dept = getDepartmentByName(departmentName);
        if (!dept) return [];
        const terms = [];
        dept.categories.forEach(c => {
            terms.push(c.name.toLowerCase());
            c.items.forEach(item => terms.push(item.toLowerCase()));
        });
        if (!terms.length) return [];
        const all = getAllProducts();
        return all
            .filter(p => {
                const haystack = `${p.title} ${p.category} ${p.description || ''}`.toLowerCase();
                return terms.some(term => haystack.includes(term));
            })
            .sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0))
            .slice(0, limit);
    }

    // Products for a single category tile: matches the category's own name
    // plus every item name under it against each product's title/category/
    // description. Returns [] if nothing matches yet.
    function getProductsForCategoryItems(categoryName, items) {
        const terms = [categoryName, ...(items || [])].map(t => t.toLowerCase());
        return getAllProducts().filter(p => {
            const haystack = `${p.title} ${p.category} ${p.description || ''}`.toLowerCase();
            return terms.some(term => haystack.includes(term));
        });
    }

    /* ---------------- LOW-LEVEL STORAGE HELPERS ---------------- */
    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.error(`OpenAPI: failed to read ${key}`, e);
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`OpenAPI: failed to write ${key}`, e);
            return false;
        }
    }

    // Cart/wishlist used to be stored as one flat array shared by everyone;
    // they're now per-user maps ({ [email]: [...] }). A browser that still has
    // that old flat-array value sitting under the same key would otherwise get
    // it back here instead of {} — and since JSON.stringify on an array drops
    // any non-index properties, writing `all[email] = list` onto that old
    // array would silently vanish instead of persisting. Treat anything that
    // isn't a plain object as empty so this can't happen.
    function readEmailScopedStore(key) {
        const raw = readJSON(key, {});
        return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    }

    /* ---------------- SEED CATALOG ---------------- */
    // Demo products so the storefront isn't empty on first load.
    // Real product management will come with the backend later.
    const SEED_PRODUCTS = [
        {
            productId: 'p001',
            title: 'Premium Lacoste Sneakers',
            category: 'Footwear',
            price: 950,
            discountPercent: 20,
            badgeColor: '#e0293e',
            deliveryFee: 0,
            deliveryLabel: 'Free Delivery',
            images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600'],
            description: 'Authentic Lacoste Carnaby sneakers. Clean, classic, and built to last — perfect for everyday wear.',
            rating: 4.6,
            reviewCount: 340,
            soldCount: 340,
            stock: 24,
            // Admin-added variant types — any product can have zero, one, or
            // several of these (Color, Size, Storage, RAM, whatever fits).
            variants: [
                { name: 'Color', values: ['Brown', 'White', 'Black', 'Navy'] },
                { name: 'Size', values: ['40', '41', '42', '43', '44', '45'] },
            ],
            // Optional: stock for a specific combination, keyed as
            // "<ColorValue>::<SizeValue>" (same order as the variants array
            // above). Any combination left out just falls back to the
            // product's overall `stock` figure. Here, Black in size 44 has
            // sold out even though other sizes/colors haven't.
            variantStock: {
                'Black::44': 0,
            },
        },
        {
            productId: 'p002',
            title: 'Samsung 50-inch 4K Smart TV',
            category: 'Electronics',
            price: 5800,
            discountPercent: 15,
            badgeColor: '#2e9e5b',
            deliveryFee: 0,
            deliveryLabel: 'Free Delivery',
            images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600'],
            description: 'Experience stunning 4K clarity with smart features, built-in streaming apps, and vivid color processing.',
            rating: 4.5,
            reviewCount: 1200,
            soldCount: 1200,
            stock: 12,
        },
        {
            productId: 'p003',
            title: 'Sony WH-1000XM5 Headphones',
            category: 'Electronics',
            price: 2500,
            discountPercent: 0,
            deliveryFee: 25,
            deliveryLabel: 'Paid Delivery',
            images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600'],
            description: 'Industry-leading noise cancellation and superior sound quality for all-day listening comfort.',
            rating: 4.5,
            reviewCount: 850,
            soldCount: 850,
            stock: 30,
        },
        {
            productId: 'p004',
            title: 'iPhone 15 Pro Max, 256GB',
            category: 'Phones & Tablets',
            price: 12500,
            discountPercent: 10,
            badgeColor: '#e0293e',
            deliveryFee: 0,
            deliveryLabel: 'Free Delivery',
            images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600'],
            description: 'Titanium design, A17 Pro chip, and a pro camera system — the flagship experience.',
            rating: 4.8,
            reviewCount: 610,
            soldCount: 610,
            stock: 8,
            // Shows variants aren't limited to Color/Size — any admin-defined
            // type works (Storage, RAM, connector type, volume, etc.).
            variants: [
                { name: 'Color', values: ['Black Titanium', 'White Titanium', 'Blue Titanium'] },
                { name: 'Storage', values: ['256GB', '512GB', '1TB'] },
            ],
        },
        {
            productId: 'p005',
            title: 'HP Pavilion Laptop 15.6"',
            category: 'Computers',
            price: 7200,
            saleLabel: 'SALE',
            badgeColor: '#f2994a',
            deliveryFee: 40,
            deliveryLabel: 'Paid Delivery',
            images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600'],
            description: 'Reliable everyday laptop with fast storage and a full-HD display for work and study.',
            rating: 4.3,
            reviewCount: 275,
            soldCount: 275,
            stock: 15,
        },
        {
            productId: 'p006',
            title: 'Ankara Print Kaftan Dress',
            category: 'Fashion & Apparel',
            price: 320,
            discountPercent: 18,
            badgeColor: '#2e9e5b',
            deliveryFee: 0,
            deliveryLabel: 'Pickup Available',
            images: ['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600'],
            description: 'Vibrant handmade Ankara kaftan, tailored for comfort and everyday elegance.',
            rating: 4.7,
            reviewCount: 190,
            soldCount: 190,
            stock: 40,
            variants: [
                { name: 'Color', values: ['Red/Gold', 'Blue/Gold', 'Green/Gold'] },
                { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
            ],
        },
        {
            productId: 'p007',
            title: 'Non-Stick Cookware Set (10-Piece)',
            category: 'Kitchen & Appliances',
            price: 680,
            discountPercent: 0,
            deliveryFee: 20,
            deliveryLabel: 'Local Pickup',
            images: ['https://images.unsplash.com/photo-1584990347449-a5d9f800a783?w=600'],
            description: 'Durable non-stick pots and pans with heat-resistant handles — everything a kitchen needs.',
            rating: 4.4,
            reviewCount: 410,
            soldCount: 410,
            stock: 22,
        },
        {
            productId: 'p008',
            title: 'Shea Butter Body Cream, 500ml',
            category: 'Beauty & Personal Care',
            price: 85,
            discountPercent: 12,
            badgeColor: '#e0293e',
            deliveryFee: 0,
            deliveryLabel: 'Free Delivery',
            images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'],
            description: '100% natural Ghanaian shea butter cream for deep moisturizing and soft skin.',
            rating: 4.9,
            reviewCount: 980,
            soldCount: 980,
            stock: 100,
            // Personal care item — matches the Return & Refund Policy's
            // exclusion for hygiene products once opened/used.
            refundable: false,
        },
    ];

    function getAllProducts() {
        let products = readJSON(KEY_PRODUCTS, null);
        const storedVersion = Number(readJSON(KEY_PRODUCTS_VERSION, 0));
        if (!products || storedVersion !== PRODUCTS_SCHEMA_VERSION) {
            products = SEED_PRODUCTS;
            writeJSON(KEY_PRODUCTS, products);
            writeJSON(KEY_PRODUCTS_VERSION, PRODUCTS_SCHEMA_VERSION);
        }
        return products;
    }

    // Persists a full product list back to storage, stamped with the current
    // schema version so it doesn't get treated as stale/legacy on next load.
    function saveAllProducts(products) {
        writeJSON(KEY_PRODUCTS, products);
        writeJSON(KEY_PRODUCTS_VERSION, PRODUCTS_SCHEMA_VERSION);
    }

    function generateProductId() {
        return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /* ---------------- ADMIN: PRODUCT CRUD ----------------
       These are the only functions that create/modify/remove products.
       Everything else (search, cards, detail page) just reads via
       getAllProducts()/getProductById() — so writing through here is enough
       to make a change show up everywhere in the storefront immediately. */
    function addProduct(productData) {
        const products = getAllProducts();
        const newProduct = Object.assign({
            title: 'Untitled Product',
            category: '',
            price: 0,
            discountPercent: 0,
            badgeColor: '#e0293e',
            deliveryFee: 0,
            deliveryLabel: 'Free Delivery',
            images: [],
            description: '',
            rating: 0,
            reviewCount: 0,
            soldCount: 0,
            stock: 0,
            refundable: true,
        }, productData, { productId: generateProductId() });
        // productId is always freshly generated here, after productData is
        // merged in — an admin shouldn't be able to collide with or overwrite
        // another product's id by passing one in.
        products.push(newProduct);
        saveAllProducts(products);
        return newProduct;
    }

    function updateProduct(productId, updates) {
        const products = getAllProducts();
        const idx = products.findIndex(p => p.productId === productId);
        if (idx === -1) return null;
        // productId itself is never changeable via updates.
        const { productId: _ignored, ...safeUpdates } = updates || {};
        products[idx] = Object.assign({}, products[idx], safeUpdates);
        saveAllProducts(products);
        return products[idx];
    }

    function deleteProduct(productId) {
        const products = getAllProducts().filter(p => p.productId !== productId);
        saveAllProducts(products);
        return true;
    }

    function getProductById(productId) {
        return getAllProducts().find(p => p.productId === productId) || null;
    }

    function getProductsByCategory(categoryName) {
        if (!categoryName || categoryName === 'All') return getAllProducts();
        return getAllProducts().filter(p => p.category === categoryName);
    }

    function searchProducts(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return [];
        return getAllProducts().filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
        );
    }

    /* ---------------- VIEWS / TRENDING ---------------- */
    function recordProductView(productId) {
        const views = readJSON(KEY_VIEWS, {});
        views[productId] = (views[productId] || 0) + 1;
        writeJSON(KEY_VIEWS, views);

        let recent = readJSON(KEY_RECENT_VIEWS, []).filter(id => id !== productId);
        recent.unshift(productId);
        recent = recent.slice(0, 20);
        writeJSON(KEY_RECENT_VIEWS, recent);
    }

    function getProductViews(productId) {
        const views = readJSON(KEY_VIEWS, {});
        return views[productId] || 0;
    }

    /* ---------------- WRITTEN REVIEWS ----------------
       Separate from the product's seed `rating`/`reviewCount` (which act as
       a general star-rating reference for the product). This tracks actual
       written reviews someone submits through the "Write a Review" form —
       starts empty for every product and grows for real as people submit. */
    function getProductReviews(productId) {
        const all = readJSON(KEY_REVIEWS, {});
        return all[productId] || [];
    }

    // A stable per-browser identity for guests, so someone who writes a
    // review without an account can still edit/delete it later from this
    // same browser. Logged-in users just use their email instead.
    function getOrCreateGuestId() {
        let id = localStorage.getItem('OPEN_MARKET_GUEST_ID');
        if (!id) {
            id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('OPEN_MARKET_GUEST_ID', id);
        }
        return id;
    }

    function getCurrentIdentityKey() {
        const user = getCurrentUser();
        return user ? user.email : getOrCreateGuestId();
    }

    function addProductReview(productId, { rating, text, photo = null }) {
        const all = readJSON(KEY_REVIEWS, {});
        const list = all[productId] || [];
        const user = getCurrentUser();

        const review = {
            id: `r_${Date.now()}`,
            authorKey: getCurrentIdentityKey(),
            name: user ? user.name : 'Guest Shopper',
            avatar: getAvatarUrl(user),
            rating: Number(rating),
            text: (text || '').trim(),
            photo,
            date: new Date().toLocaleDateString('en-GB'),
            edited: false,
        };

        list.unshift(review);
        all[productId] = list;
        const ok = writeJSON(KEY_REVIEWS, all);
        return ok ? review : null;
    }

    function updateProductReview(productId, reviewId, { rating, text, photo }) {
        const all = readJSON(KEY_REVIEWS, {});
        const list = all[productId] || [];
        const review = list.find(r => r.id === reviewId);
        if (!review) return null;

        review.rating = Number(rating);
        review.text = (text || '').trim();
        review.photo = photo;
        review.edited = true;

        all[productId] = list;
        const ok = writeJSON(KEY_REVIEWS, all);
        return ok ? review : null;
    }

    function deleteProductReview(productId, reviewId) {
        const all = readJSON(KEY_REVIEWS, {});
        all[productId] = (all[productId] || []).filter(r => r.id !== reviewId);
        writeJSON(KEY_REVIEWS, all);
    }

    function getReviewBreakdown(productId) {
        const reviews = getProductReviews(productId);
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            const star = Math.round(r.rating);
            if (counts[star] !== undefined) counts[star]++;
        });
        const total = reviews.length;
        const percentages = {};
        [5, 4, 3, 2, 1].forEach(star => {
            percentages[star] = total > 0 ? Math.round((counts[star] / total) * 100) : 0;
        });
        return { counts, percentages, total };
    }

    function getRecentlyViewedProducts(limit = 10) {
        const ids = readJSON(KEY_RECENT_VIEWS, []);
        return ids
            .map(id => getProductById(id))
            .filter(Boolean)
            .slice(0, limit);
    }

    function getTrendingProducts(limit = 10) {
        const views = readJSON(KEY_VIEWS, {});
        return getAllProducts()
            .slice()
            .sort((a, b) => (views[b.productId] || 0) - (views[a.productId] || 0))
            .slice(0, limit);
    }

    /* ---------------- PRODUCT VARIANTS ----------------
       Variants are entirely admin-driven: a product only gets a variant type
       (Color, Size, Storage, RAM, Volume, Connector Type — anything) if the
       admin explicitly added one while creating/editing that product. The
       storefront never invents a selector — if product.variants is missing
       or empty, no variant UI shows at all, and the customer only sees the
       quantity stepper and Add to Cart button.

       Shape: product.variants = [{ name: 'Color', values: [...] }, ...].
       A product can have zero, one, or many variant types, in any order the
       admin chose, and each type can list as many values as needed.

       Optional: product.variantStock tracks stock for one specific
       combination, keyed by the chosen values joined in the same order as
       product.variants (e.g. "Black::42" for Color then Size). A combination
       left out of that map — or a product with no map at all — just falls
       back to the product's overall `stock` figure, since not every seller
       will track inventory down to the exact combination. */
    function getProductVariantTypes(product) {
        return (product && Array.isArray(product.variants)) ? product.variants : [];
    }

    function hasVariants(product) {
        return getProductVariantTypes(product).length > 0;
    }

    // Canonical lookup key for one exact combination, built in the admin's
    // defined variant order (not click order), so selections always match
    // regardless of which selector the customer touched first.
    function buildVariantComboKey(product, selection) {
        const types = getProductVariantTypes(product);
        if (!types.length || !selection) return '';
        return types.map(t => selection[t.name] || '').join('::');
    }

    // Stock for the exact combination currently selected. Only enforces
    // per-combination stock once every variant type has a value chosen —
    // an incomplete selection can't be checked yet, so it falls back to the
    // product's overall stock.
    function getVariantComboStock(product, selection) {
        if (!product) return 0;
        const types = getProductVariantTypes(product);
        if (!types.length) return Number(product.stock) || 0;
        const complete = types.every(t => selection && selection[t.name]);
        if (!complete) return Number(product.stock) || 0;
        const key = buildVariantComboKey(product, selection);
        if (product.variantStock && Object.prototype.hasOwnProperty.call(product.variantStock, key)) {
            return Number(product.variantStock[key]) || 0;
        }
        return Number(product.stock) || 0;
    }

    function isVariantComboInStock(product, selection) {
        return getVariantComboStock(product, selection) > 0;
    }

    // Human-readable label for whatever variant values were picked/ordered —
    // e.g. "Black · 42" or "White Titanium · 256GB" — works for any variant
    // names an admin defines, not just color/size.
    function formatVariantLabel(variant) {
        if (!variant) return '';
        return Object.values(variant).filter(Boolean).join(' · ');
    }

    /* ---------------- CART ----------------
       Scoped per signed-in user (like orders/addresses/payment methods).
       Adding to cart already requires sign-in (OpenAPI.requireAuth), so a
       guest never legitimately has cart items of their own — this just makes
       sure a signed-out visitor (or a different account) can't see whatever
       was left in the cart by whoever was last signed in on this browser. */
    function readUserCart() {
        const session = getSession();
        if (!session) return [];
        const all = readEmailScopedStore(KEY_CART);
        return all[session.email] || [];
    }

    function writeUserCart(cart) {
        const session = getSession();
        if (!session) return; // nothing to persist for a guest
        const all = readEmailScopedStore(KEY_CART);
        all[session.email] = cart;
        writeJSON(KEY_CART, all);
    }

    function getCart() {
        const cart = readUserCart();
        let needsResave = false;
        cart.forEach(item => {
            // Older cart entries stored a flat color/size pair directly on
            // the item — fold them into the generic variant object so every
            // entry (old or new) has the same shape from here on.
            if (!item.variant && (item.color || item.size)) {
                item.variant = {};
                if (item.color) item.variant.Color = item.color;
                if (item.size) item.variant.Size = item.size;
                delete item.color;
                delete item.size;
                needsResave = true;
            }
            if (!item.variant) {
                item.variant = {};
                needsResave = true;
            }
            if (!item.cartItemId) {
                item.cartItemId = buildCartItemId(item.productId, item.variant);
                needsResave = true;
            }
            if (item.selected === undefined) {
                item.selected = true;
                needsResave = true;
            }
        });
        if (needsResave) writeUserCart(cart);
        return cart;
    }

    // A product added with a different variant combination (any admin-defined
    // types/values) is a distinct line item. Sorting the keys keeps the id
    // stable no matter what order the values were selected in.
    function buildCartItemId(productId, variant) {
        const bits = Object.keys(variant || {}).sort().map(k => `${k}=${variant[k]}`);
        return [productId, ...bits].join('::');
    }

    function addToCart(productId, qty = 1, variant = null) {
        const cart = getCart();
        const cleanVariant = variant || {};
        const cartItemId = buildCartItemId(productId, cleanVariant);
        const existing = cart.find(i => i.cartItemId === cartItemId);
        const maxQty = getMaxPurchaseQty(getProductById(productId), cleanVariant);

        if (existing) {
            existing.qty = Math.min(maxQty, existing.qty + qty);
        } else {
            cart.push({
                cartItemId,
                productId,
                qty: Math.min(maxQty, qty),
                variant: cleanVariant,
                selected: true,
            });
        }
        writeUserCart(cart);
        return cart;
    }

    function updateCartQty(cartItemId, qty) {
        let cart = getCart();
        if (qty <= 0) {
            cart = cart.filter(i => i.cartItemId !== cartItemId);
        } else {
            const item = cart.find(i => i.cartItemId === cartItemId);
            if (item) {
                const maxQty = getMaxPurchaseQty(getProductById(item.productId), item.variant);
                item.qty = Math.min(maxQty, qty);
            }
        }
        writeUserCart(cart);
        return cart;
    }

    function removeFromCart(cartItemId) {
        const cart = getCart().filter(i => i.cartItemId !== cartItemId);
        writeUserCart(cart);
        return cart;
    }

    function clearCart() {
        writeUserCart([]);
    }

    function getCartCount() {
        return getCart().reduce((sum, i) => sum + i.qty, 0);
    }

    function toggleCartItemSelected(cartItemId) {
        const cart = getCart();
        const item = cart.find(i => i.cartItemId === cartItemId);
        if (!item) return cart;
        item.selected = item.selected === false ? true : false;
        writeUserCart(cart);
        return cart;
    }

    // Per-order purchase limit: at most 10 units of a single product, or
    // whatever's left in stock if that's fewer than 10.
    const MAX_UNITS_PER_ORDER = 10;
    function getMaxPurchaseQty(product, selection = null) {
        if (!product) return 0;
        const stock = getVariantComboStock(product, selection);
        return Math.max(0, Math.min(MAX_UNITS_PER_ORDER, stock));
    }

    function getCartTotal() {
        const cart = getCart();
        return cart.reduce((sum, i) => {
            if (i.selected === false) return sum;
            const product = getProductById(i.productId);
            return sum + (product ? product.price * i.qty : 0);
        }, 0);
    }

    // Short, collision-safe-enough id for locally-generated records (addresses,
    // payment methods, orders). Not cryptographically unique, but fine for a
    // single-browser demo dataset — a real backend would assign its own ids.
    function generateId(prefix) {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    // Long unique orderIds (e.g. ORDER_MS4I0KM0G5NQ9B) are fine as an internal
    // storage key, but painful for a customer to read out to a pickup agent.
    // This gives every order a short human-friendly code instead, like #OM-89B2X.
    function generateOrderDisplayCode() {
        const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no O/I to avoid look-alikes
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return `OM-${code}`;
    }

    function getPickupLocations() {
        return PICKUP_LOCATIONS;
    }

    /* ---------------- SUPPORT CENTER ----------------
       General enquiries, Become a Member, Report Bug, and Feature Request all
       funnel through here. No real ticketing backend yet, so requests are just
       persisted locally and acknowledged — see help-support.html / support-center.html. */
    function submitSupportRequest({ type, name = '', email = '', subject = '', message = '' } = {}) {
        const all = readJSON(KEY_SUPPORT_REQUESTS, []);
        const request = {
            id: generateId('support'),
            type,
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
            date: Date.now(),
        };
        all.unshift(request);
        writeJSON(KEY_SUPPORT_REQUESTS, all);
        return request;
    }

    function getSupportRequests() {
        return readJSON(KEY_SUPPORT_REQUESTS, []);
    }

    /* ---------------- DELIVERY ADDRESSES ----------------
       Scoped per signed-in user (like orders/payment methods) — these are
       personal data, unlike cart/wishlist which stay global for this demo. */
    function getAddresses() {
        const session = getSession();
        if (!session) return [];
        const all = readJSON(KEY_ADDRESSES, {});
        return all[session.email] || [];
    }

    function getDefaultAddress() {
        return getAddresses().find(a => a.isDefault) || null;
    }

    function addAddress(data) {
        const session = getSession();
        if (!session) return null;
        const all = readJSON(KEY_ADDRESSES, {});
        const list = all[session.email] || [];
        const address = {
            addressId: generateId('addr'),
            label: (data.label || 'Home').trim(),
            fullName: (data.fullName || '').trim(),
            phone: (data.phone || '').trim(),
            region: data.region || '',
            city: (data.city || '').trim(),
            addressLine: (data.addressLine || '').trim(),
            isDefault: list.length === 0 || !!data.isDefault,
        };
        if (address.isDefault) list.forEach(a => { a.isDefault = false; });
        list.push(address);
        all[session.email] = list;
        writeJSON(KEY_ADDRESSES, all);
        return address;
    }

    function updateAddress(addressId, updates) {
        const session = getSession();
        if (!session) return null;
        const all = readJSON(KEY_ADDRESSES, {});
        const list = all[session.email] || [];
        const address = list.find(a => a.addressId === addressId);
        if (!address) return null;
        Object.assign(address, updates);
        if (updates.isDefault) list.forEach(a => { a.isDefault = (a.addressId === addressId); });
        all[session.email] = list;
        writeJSON(KEY_ADDRESSES, all);
        return address;
    }

    function deleteAddress(addressId) {
        const session = getSession();
        if (!session) return;
        const all = readJSON(KEY_ADDRESSES, {});
        let list = all[session.email] || [];
        const wasDefault = (list.find(a => a.addressId === addressId) || {}).isDefault;
        list = list.filter(a => a.addressId !== addressId);
        if (wasDefault && list.length > 0) list[0].isDefault = true;
        all[session.email] = list;
        writeJSON(KEY_ADDRESSES, all);
    }

    function setDefaultAddress(addressId) {
        const session = getSession();
        if (!session) return;
        const all = readJSON(KEY_ADDRESSES, {});
        const list = all[session.email] || [];
        list.forEach(a => { a.isDefault = (a.addressId === addressId); });
        all[session.email] = list;
        writeJSON(KEY_ADDRESSES, all);
    }

    /* ---------------- PAYMENT METHODS ----------------
       We deliberately never persist a full card number or CVV, even in this
       localStorage demo — only a brand/provider and a masked last-4, the same
       shape a real backend would hand back after tokenizing with a processor. */
    function getPaymentMethods() {
        const session = getSession();
        if (!session) return [];
        const all = readJSON(KEY_PAYMENT_METHODS, {});
        return all[session.email] || [];
    }

    function getDefaultPaymentMethod() {
        return getPaymentMethods().find(m => m.isDefault) || null;
    }

    function addPaymentMethod(data) {
        const session = getSession();
        if (!session) return null;
        const all = readJSON(KEY_PAYMENT_METHODS, {});
        const list = all[session.email] || [];

        let method;
        if (data.type === 'momo') {
            const digits = String(data.momoNumber || '').replace(/\D/g, '');
            method = {
                methodId: generateId('pm'),
                type: 'momo',
                provider: data.provider || 'Mobile Money',
                display: `${data.provider || 'Mobile Money'} •••• ${digits.slice(-4)}`,
                isDefault: list.length === 0,
            };
        } else {
            const digits = String(data.cardNumber || '').replace(/\D/g, '');
            method = {
                methodId: generateId('pm'),
                type: 'card',
                provider: data.cardBrand || 'Card',
                display: `${data.cardBrand || 'Card'} •••• ${digits.slice(-4)}`,
                cardholderName: (data.cardholderName || '').trim() || null,
                isDefault: list.length === 0,
            };
        }
        list.push(method);
        all[session.email] = list;
        writeJSON(KEY_PAYMENT_METHODS, all);
        return method;
    }

    function deletePaymentMethod(methodId) {
        const session = getSession();
        if (!session) return;
        const all = readJSON(KEY_PAYMENT_METHODS, {});
        let list = all[session.email] || [];
        const wasDefault = (list.find(m => m.methodId === methodId) || {}).isDefault;
        list = list.filter(m => m.methodId !== methodId);
        if (wasDefault && list.length > 0) list[0].isDefault = true;
        all[session.email] = list;
        writeJSON(KEY_PAYMENT_METHODS, all);
    }

    function setDefaultPaymentMethod(methodId) {
        const session = getSession();
        if (!session) return;
        const all = readJSON(KEY_PAYMENT_METHODS, {});
        const list = all[session.email] || [];
        list.forEach(m => { m.isDefault = (m.methodId === methodId); });
        all[session.email] = list;
        writeJSON(KEY_PAYMENT_METHODS, all);
    }

    /* ---------------- ORDERS ---------------- */
    function getOrders() {
        const session = getSession();
        if (!session) return [];
        const all = readJSON(KEY_ORDERS, {});
        return (all[session.email] || []).slice().reverse(); // newest first
    }

    function getOrderById(orderId) {
        return getOrders().find(o => o.orderId === orderId) || null;
    }

    // Mirrors the FAQ policy: cancellable only while still "Processing" and
    // within the 24-hour window. Once an admin tool exists to move orders to
    // Shipped, or the window passes, this naturally stops applying.
    function cancelOrder(orderId) {
        const session = getSession();
        if (!session) return false;
        const all = readJSON(KEY_ORDERS, {});
        const list = all[session.email] || [];
        const order = list.find(o => o.orderId === orderId);
        if (!order) return false;
        if (order.status !== 'Processing') return false;
        if (order.processingDeadline && Date.now() > order.processingDeadline) return false;
        order.status = 'Cancelled';
        writeJSON(KEY_ORDERS, all);
        return true;
    }

    // Builds a real order from the currently-selected cart items, snapshots the
    // chosen address/payment method (so later edits to those don't rewrite order
    // history), removes only the ordered items from the cart, and files it under
    // the signed-in user. Delivery fee for the combined shipment is the highest
    // single-item delivery fee among the ordered items (if everything ships free,
    // the order ships free; if anything needs paid delivery, that covers the lot).
    // Processing fee applied at checkout — placeholder rate until a real payment
    // processor (e.g. Paystack) dictates the actual fee/cut.
    const PROCESSING_FEE_RATE = 0.025;
    function calculateProcessingFee(subtotal) {
        return Math.round(subtotal * PROCESSING_FEE_RATE * 100) / 100;
    }

    function createOrder({ addressId, paymentMethodId, processingFee = 0, deliveryMethod = 'delivery', pickupLocationId = null } = {}) {
        const session = getSession();
        if (!session) return null;

        const cart = getCart();
        const selectedItems = cart.filter(i => i.selected !== false);
        if (selectedItems.length === 0) return null;

        const isPickup = deliveryMethod === 'pickup';
        const address = isPickup ? null : (getAddresses().find(a => a.addressId === addressId) || null);
        const pickupLocation = isPickup ? (PICKUP_LOCATIONS.find(p => p.id === pickupLocationId) || null) : null;
        const paymentMethod = getPaymentMethods().find(m => m.methodId === paymentMethodId) || null;
        if ((!isPickup && !address) || (isPickup && !pickupLocation) || !paymentMethod) return null;

        const lineItems = selectedItems.map(i => {
            const product = getProductById(i.productId);
            return {
                productId: i.productId,
                title: product ? product.title : 'Product',
                image: product && product.images ? product.images[0] : null,
                price: product ? product.price : 0,
                qty: i.qty,
                variant: i.variant || {},
            };
        });

        const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0);
        const deliveryFee = isPickup ? 0 : selectedItems.reduce((max, i) => {
            const product = getProductById(i.productId);
            return Math.max(max, product ? Number(product.deliveryFee) || 0 : 0);
        }, 0);
        const fee = Number(processingFee) || 0;

        const now = Date.now();
        const order = {
            orderId: generateId('order').toUpperCase(),
            displayCode: generateOrderDisplayCode(),
            date: now,
            status: 'Processing',
            // Orders typically finish processing within 24 hours. This is when
            // My Orders stops showing a countdown/cancel option — an admin tool
            // can still move the status forward (or the customer can cancel)
            // any time before this passes.
            processingDeadline: now + 24 * 60 * 60 * 1000,
            items: lineItems,
            subtotal,
            deliveryFee,
            processingFee: fee,
            total: subtotal + deliveryFee + fee,
            deliveryMethod: isPickup ? 'pickup' : 'delivery',
            address,
            pickupLocation,
            paymentMethod,
        };

        const all = readJSON(KEY_ORDERS, {});
        const list = all[session.email] || [];
        list.push(order);
        all[session.email] = list;
        writeJSON(KEY_ORDERS, all);

        // Only the ordered (selected) items leave the cart — anything the
        // shopper had left unselected stays put for later.
        writeUserCart(cart.filter(i => i.selected === false));

        return order;
    }

    /* ---------------- WISHLIST ----------------
       Scoped per signed-in user, same reasoning as cart above. */
    function readUserWishlist() {
        const session = getSession();
        if (!session) return [];
        const all = readEmailScopedStore(KEY_WISHLIST);
        return all[session.email] || [];
    }

    function writeUserWishlist(list) {
        const session = getSession();
        if (!session) return;
        const all = readEmailScopedStore(KEY_WISHLIST);
        all[session.email] = list;
        writeJSON(KEY_WISHLIST, all);
    }

    function getWishlist() {
        return readUserWishlist();
    }

    function isWishlisted(productId) {
        return getWishlist().includes(productId);
    }

    function toggleWishlist(productId) {
        let list = getWishlist();
        const isSaved = list.includes(productId);
        if (isSaved) {
            list = list.filter(id => id !== productId);
        } else {
            list.push(productId);
        }
        writeUserWishlist(list);
        return !isSaved;
    }

    /* ---------------- SEARCH HISTORY ----------------
       Capped at 5 — only the 5 most recent, distinct search terms are ever
       kept (oldest falls off automatically as new ones come in). */
    const MAX_RECENT_SEARCHES = 5;

    function getSearchHistory() {
        return readJSON(KEY_SEARCH_HIST, []);
    }

    function addSearchHistoryEntry(term) {
        if (!term || !term.trim()) return;
        let history = getSearchHistory().filter(t => t.toLowerCase() !== term.trim().toLowerCase());
        history.unshift(term.trim());
        history = history.slice(0, MAX_RECENT_SEARCHES);
        writeJSON(KEY_SEARCH_HIST, history);
    }

    function removeSearchHistoryEntry(term) {
        const history = getSearchHistory().filter(t => t !== term);
        writeJSON(KEY_SEARCH_HIST, history);
    }

    function clearSearchHistory() {
        writeJSON(KEY_SEARCH_HIST, []);
    }

    /* ---------------- LIVE SEARCH SUGGESTIONS ----------------
       Used for "as-you-type" autocomplete in the search bar. Returns matched
       KEYWORDS (product titles), not specific products — selecting one is
       meant to run a full search for that phrase (so the person still sees
       every matching ad and picks one themselves), the same way choosing a
       suggestion on Google or Amazon runs a search rather than opening one
       specific result. Titles are deduplicated, since several separate
       listings can share the same/similar name. Ranks titles that start
       with the typed text first (closest guess), then falls back to any
       product whose title/category/description merely contains it. */
    function getSearchSuggestions(query, limit = 6) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return [];

        const seen = new Set();
        const startsWith = [];
        const contains = [];

        getAllProducts().forEach(p => {
            const title = p.title;
            const key = title.toLowerCase();
            if (seen.has(key)) return;

            if (key.startsWith(q)) {
                startsWith.push(title);
                seen.add(key);
            } else if (
                key.includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            ) {
                contains.push(title);
                seen.add(key);
            }
        });

        return [...startsWith, ...contains].slice(0, limit);
    }

    /* ---------------- SESSION / USER (kept minimal for Settings) ---------------- */
    function getSession() {
        return readJSON(KEY_SESSION, null);
    }

    function setSession(email) {
        writeJSON(KEY_SESSION, { email, since: Date.now() });
    }

    function clearSession() {
        localStorage.removeItem(KEY_SESSION);
    }

    // Gate for actions that require sign-in (add to cart, wishlist, account).
    // Browsing/search stays open to guests; only these specific actions redirect.
    // Returns true if already signed in. Otherwise sends the person to login.html
    // with a returnTo param (validated on the way back by getSafeReturnTo) and
    // returns false so the caller can bail out of the action immediately.
    async function requireAuth(options = {}) {
        if (getSession()) return true;
        const returnTo = options.returnTo || (window.location.pathname.split('/').pop() + window.location.search);
        const proceed = await showConfirm(
            options.message || "You'll need to sign in or create an account to continue.",
            { title: options.title || 'Sign In Required', confirmLabel: 'Continue', cancelLabel: 'Cancel' }
        );
        if (proceed) {
            window.location.href = `login.html?returnTo=${encodeURIComponent(returnTo)}`;
        }
        return false;
    }

    // Reads a returnTo param and only accepts a plain same-app "page.html" or
    // "page.html?query" value — never an absolute URL or "//host" — so this can't
    // be used as an open redirect. Falls back to home.html otherwise.
    function getSafeReturnTo(fallback = 'home.html') {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        if (returnTo && /^[a-zA-Z0-9_-]+\.html(\?[^\s]*)?$/.test(returnTo)) return returnTo;
        return fallback;
    }

    function getCurrentUser() {
        const session = getSession();
        if (!session) return null;
        const users = readJSON(KEY_USER_RECORDS, []);
        return users.find(u => u.email === session.email) || null;
    }

    function getAllUsers() {
        return readJSON(KEY_USER_RECORDS, []);
    }

    // NOTE: this whole app is 100% client-side right now — there is no
    // real backend, so "accounts" live in this browser's localStorage
    // only (nothing is shared across devices/browsers) and passwords are
    // stored as plain text, same as everything else in here. That's fine
    // for a prototype, but must not ship as-is once a real backend exists —
    // passwords need to be hashed server-side at that point, never compared
    // client-side like this.
    function registerUser({ name, email, username, password, phone = '', provider = 'password' }) {
        const users = getAllUsers();
        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedUsername = (username || '').trim();

        if (users.some(u => u.email === normalizedEmail)) {
            return { ok: false, reason: 'email_exists' };
        }
        if (normalizedUsername && users.some(u => u.username === normalizedUsername)) {
            return { ok: false, reason: 'username_exists' };
        }

        const user = {
            name: (name || '').trim(),
            email: normalizedEmail,
            username: normalizedUsername,
            password: provider === 'password' ? password : null,
            phone,
            profilePic: null,
            provider,
        };
        users.push(user);
        writeJSON(KEY_USER_RECORDS, users);
        setSession(normalizedEmail);
        return { ok: true, user };
    }

    function validateLogin(identifier, password) {
        const users = getAllUsers();
        const cleaned = (identifier || '').trim().toLowerCase();
        const user = users.find(u => u.email === cleaned || (u.username || '').toLowerCase() === cleaned);

        if (!user) return { ok: false, reason: 'not_found' };
        if (user.provider === 'google') return { ok: false, reason: 'google_only' };
        if (user.password !== password) return { ok: false, reason: 'wrong_password' };

        setSession(user.email);
        setLastLoginEmail(user.email);
        return { ok: true, user };
    }

    function updateUser(email, updates) {
        const users = getAllUsers();
        const user = users.find(u => u.email === email);
        if (!user) return null;
        Object.assign(user, updates);
        writeJSON(KEY_USER_RECORDS, users);
        return user;
    }

    function deleteUser(email) {
        const users = getAllUsers().filter(u => u.email !== email);
        writeJSON(KEY_USER_RECORDS, users);
        clearSession();

        const carts = readEmailScopedStore(KEY_CART);
        delete carts[email];
        writeJSON(KEY_CART, carts);

        const wishlists = readEmailScopedStore(KEY_WISHLIST);
        delete wishlists[email];
        writeJSON(KEY_WISHLIST, wishlists);
    }

    function getUserByEmail(email) {
        const cleaned = (email || '').trim().toLowerCase();
        return getAllUsers().find(u => u.email === cleaned) || null;
    }

    // Addresses/payment methods/orders are all stored as { [email]: [...] } maps,
    // so changing a user's email has to re-key each of those maps too, or the
    // data becomes invisible under the new email. Called from account.html
    // whenever a saved email actually changes.
    function migrateUserEmailKeyedData(oldEmail, newEmail) {
        if (!oldEmail || !newEmail || oldEmail === newEmail) return;
        [KEY_ADDRESSES, KEY_PAYMENT_METHODS, KEY_ORDERS, KEY_CART, KEY_WISHLIST].forEach(storeKey => {
            const all = readEmailScopedStore(storeKey);
            if (Object.prototype.hasOwnProperty.call(all, oldEmail)) {
                all[newEmail] = all[oldEmail];
                delete all[oldEmail];
                writeJSON(storeKey, all);
            }
        });
        if (getLastLoginEmail() === oldEmail) setLastLoginEmail(newEmail);
    }

    function validatePassword(password) {
        if (!password || password.length < 8) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[@#$%!&*]/.test(password)) return false;
        if (!/[0-9]/.test(password)) return false;
        return true;
    }

    function getAvatarUrl(user) {
        if (user && user.profilePic) return user.profilePic;
        return getInitialsAvatarDataUri(user ? user.name : 'Guest');
    }

    /* ---------------- SOCIAL / BIOMETRIC SIGN-IN ----------------
       Google Sign-In is functional once a real Google OAuth Client ID is
       configured in login.html/signup.html (see the comment above
       GOOGLE_CLIENT_ID in those files) — this function itself doesn't
       depend on anything else being built.
       Biometric sign-in is scaffolded but intentionally inert: there's no
       settings UI yet to actually register a device credential, so
       hasBiometricEnabled() always returns false and the button stays
       hidden. Wire up a real WebAuthn registration flow before enabling it. */
    function loginOrRegisterWithGoogle(profile) {
        const users = getAllUsers();
        const email = (profile.email || '').trim().toLowerCase();
        let user = users.find(u => u.email === email);
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            user = {
                name: profile.name || email,
                email,
                username: '',
                password: null,
                phone: '',
                profilePic: profile.picture || null,
                provider: 'google',
            };
            users.push(user);
            writeJSON(KEY_USER_RECORDS, users);
        }

        setSession(email);
        setLastLoginEmail(email);
        return { ok: true, isNewUser, user };
    }

    function getLastLoginEmail() {
        return localStorage.getItem('OPEN_MARKET_LAST_LOGIN_EMAIL') || null;
    }

    function setLastLoginEmail(email) {
        localStorage.setItem('OPEN_MARKET_LAST_LOGIN_EMAIL', email);
    }

    function hasBiometricEnabled(email) {
        return false; // no registration flow built yet — see note above
    }

    async function isBiometricAvailableOnDevice() {
        return !!(window.PublicKeyCredential);
    }

    async function loginWithBiometric(email) {
        return { ok: false, reason: 'not_implemented' };
    }

    /* ---------------- PREFERENCES ---------------- */
    function getNotificationsEnabled() {
        return readJSON('OPEN_MARKET_NOTIFICATIONS_ENABLED', true);
    }

    function setNotificationsEnabled(enabled) {
        writeJSON('OPEN_MARKET_NOTIFICATIONS_ENABLED', !!enabled);
    }

    /* ---------------- MISC UI HELPERS ---------------- */
    function formatCurrency(amount) {
        const n = Number(amount) || 0;
        return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Same formatting, but as markup with "GHS" kept regular-weight and the
    // number itself bold — use this anywhere a price is actually rendered
    // in the UI (formatCurrency stays plain-text, for alerts/titles/etc).
    function formatCurrencyHTML(amount) {
        const n = Number(amount) || 0;
        const formatted = n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `<span style="font-weight:400">GHS</span> <span style="font-weight:700">${formatted}</span>`;
    }

    function formatCount(n) {
        const num = Number(n) || 0;
        if (num >= 1000) {
            return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
        }
        return String(num);
    }

    function formatDeliveryLabel(product) {
        if (product.deliveryLabel) return product.deliveryLabel;
        const fee = Number(product.deliveryFee) || 0;
        return fee > 0 ? 'Paid Delivery' : 'Free Delivery';
    }

    function getDeliveryIconClass(product) {
        const label = formatDeliveryLabel(product);
        return label.toLowerCase().includes('pickup') ? 'ph-map-pin' : 'ph-truck';
    }

    /* ---------------- PRODUCT TAGS (return eligibility) ----------------
       Every product supports both Home Delivery and Self Pickup by default —
       the fulfillment method is chosen once, for the whole order, at
       checkout, not per product. The one thing that does still vary per
       product is whether it can be returned.

       product.refundable = bool. If omitted, defaults to true (most items
       are returnable per the Return & Refund Policy) — admin flips it to
       false for hygiene items, opened consumables, underwear/swimwear, etc. */
    function isProductRefundable(product) {
        return !product || product.refundable !== false;
    }

    // Small, ordered set of tag pills for the product page. `tone` just
    // drives pill color (neutral/positive/negative) — it isn't interactive.
    function getProductTags(product) {
        if (!product) return [];
        const tags = [];
        tags.push(isProductRefundable(product)
            ? { label: 'Refundable', icon: 'ph-arrow-counter-clockwise', tone: 'positive' }
            : { label: 'Non-Refundable', icon: 'ph-x-circle', tone: 'negative' });
        return tags;
    }

    function getInitialsAvatarDataUri(name) {
        const initials = (name || 'U').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#500e8c"/><text x="50%" y="54%" font-family="Poppins, sans-serif" font-size="30" fill="#fff" text-anchor="middle" dy=".1em">${initials}</text></svg>`;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    /* ---------------- STYLED MODAL (replaces native alert/confirm) ----------------
       Injected once per page, reuses the host page's own CSS variables
       (--purple-main, --card-sub-bg, --text-body, --border-card, etc.) so it
       always matches whichever theme (light/dark) the page is currently in.
       Falls back to the brand purple/neutrals if a page hasn't defined those
       variables under a different name (e.g. settings.html). */
    let modalStylesInjected = false;
    function ensureModalStyles() {
        if (modalStylesInjected) return;
        modalStylesInjected = true;
        const style = document.createElement('style');
        style.textContent = `
            .om-modal-overlay {
                position: fixed; inset: 0; background: rgba(20, 10, 30, 0.45);
                backdrop-filter: blur(2px);
                display: flex; align-items: center; justify-content: center;
                z-index: 10000; padding: 20px; opacity: 0;
                transition: opacity 0.18s ease;
                font-family: 'Inter', system-ui, sans-serif;
            }
            .om-modal-overlay.om-visible { opacity: 1; }
            .om-modal-box {
                width: 100%; max-width: 340px;
                background: var(--card-sub-bg, #ffffff);
                border: 1px solid var(--border-card, #f2f2f7);
                border-radius: 20px; padding: 26px 22px 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.25);
                text-align: center;
                transform: scale(0.92) translateY(6px); opacity: 0;
                transition: transform 0.2s cubic-bezier(0.2,0.9,0.4,1.1), opacity 0.2s ease;
            }
            .om-modal-overlay.om-visible .om-modal-box { transform: scale(1) translateY(0); opacity: 1; }
            .om-modal-icon {
                width: 46px; height: 46px; border-radius: 50%; margin: 0 auto 14px;
                background: color-mix(in srgb, var(--purple-main, #500e8c) 12%, transparent);
                display: flex; align-items: center; justify-content: center;
            }
            .om-modal-icon svg { width: 22px; height: 22px; }
            .om-modal-title {
                font-size: 15.5px; font-weight: 700; color: var(--text-body, #1a1a1a);
                margin-bottom: 6px;
            }
            .om-modal-message {
                font-size: 13px; line-height: 1.5; color: var(--text-muted, #6b7280);
                margin-bottom: 20px; white-space: pre-line;
            }
            .om-modal-actions { display: flex; gap: 10px; }
            .om-modal-btn {
                flex: 1; border: none; border-radius: 30px; padding: 11px 14px;
                font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
                transition: opacity 0.15s ease, background 0.15s ease;
            }
            .om-modal-btn:active { transform: scale(0.97); }
            .om-modal-btn-primary { background: var(--purple-main, #500e8c); color: #fff; }
            .om-modal-btn-primary:hover { opacity: 0.9; }
            .om-modal-btn-secondary {
                background: var(--border-card, #f1f2f6); color: var(--text-body, #1a1a1a);
            }
            .om-modal-btn-secondary:hover { background: var(--text-body, #1a1a1a); color: var(--card-sub-bg, #ffffff); }
        `;
        document.head.appendChild(style);
    }

    function buildModalIconSVG(kind) {
        const color = 'var(--purple-main, #500e8c)';
        if (kind === 'confirm') {
            return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-2.96L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        if (kind === 'success') {
            const successColor = '#2e9e5b';
            return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${successColor}" stroke-width="1.7"/><path d="M8 12.3l2.5 2.5L16 9.5" stroke="${successColor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="1.7"/><path d="M12 8v4.5M12 16h.01" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/></svg>`;
    }

    function openModal({ title, message, buttons, iconKind }) {
        ensureModalStyles();
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'om-modal-overlay';

            const actionsHTML = buttons.map((b, i) =>
                `<button type="button" class="om-modal-btn ${b.primary ? 'om-modal-btn-primary' : 'om-modal-btn-secondary'}" data-idx="${i}">${b.label}</button>`
            ).join('');

            overlay.innerHTML = `
                <div class="om-modal-box" role="dialog" aria-modal="true">
                    <div class="om-modal-icon">${buildModalIconSVG(iconKind)}</div>
                    ${title ? `<div class="om-modal-title">${title}</div>` : ''}
                    <div class="om-modal-message">${message}</div>
                    <div class="om-modal-actions">${actionsHTML}</div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('om-visible'));

            function close(result) {
                overlay.classList.remove('om-visible');
                setTimeout(() => overlay.remove(), 180);
                resolve(result);
            }

            overlay.querySelectorAll('.om-modal-btn').forEach((btn, i) => {
                btn.addEventListener('click', () => close(buttons[i].value));
            });
        });
    }

    async function showAlert(message, opts = {}) {
        return openModal({
            title: opts.title || null,
            message,
            iconKind: opts.iconKind || 'alert',
            buttons: [{ label: opts.okLabel || 'OK', primary: true, value: true }],
        });
    }

    async function showConfirm(message, opts = {}) {
        return openModal({
            title: opts.title || null,
            message,
            iconKind: 'confirm',
            buttons: [
                { label: opts.cancelLabel || 'Cancel', primary: false, value: false },
                { label: opts.confirmLabel || 'Confirm', primary: true, value: true },
            ],
        });
    }

    /* ---------------- NAV BADGE (cart item count) ---------------- */
    function refreshCartNavBadge() {
        const badge = document.getElementById('nav-cart-badge');
        if (!badge) return;
        const count = getCartCount();
        if (count > 0) {
            badge.innerText = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    return {
        CATEGORIES,
        getCategoryIconClass,
        DEPARTMENTS,
        TOP_BRANDS,
        getDepartments,
        getDepartmentByName,
        getCategoryImageForName,
        findDepartmentAndSubcategoryByLegacyCategory,
        getPopularProductsForDepartment,
        getProductsForCategoryItems,
        getAllProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        getProductsByCategory,
        searchProducts,
        recordProductView,
        getProductViews,
        getProductReviews,
        addProductReview,
        updateProductReview,
        deleteProductReview,
        getCurrentIdentityKey,
        getReviewBreakdown,
        getRecentlyViewedProducts,
        getTrendingProducts,
        getProductVariantTypes,
        hasVariants,
        buildVariantComboKey,
        getVariantComboStock,
        isVariantComboInStock,
        formatVariantLabel,
        getCart,
        buildCartItemId,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        getCartCount,
        getCartTotal,
        toggleCartItemSelected,
        getMaxPurchaseQty,
        getWishlist,
        isWishlisted,
        toggleWishlist,
        getSearchHistory,
        addSearchHistoryEntry,
        removeSearchHistoryEntry,
        clearSearchHistory,
        getSearchSuggestions,
        getSession,
        clearSession,
        requireAuth,
        getSafeReturnTo,
        GHANA_REGIONS,
        getAddresses,
        getDefaultAddress,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        getPaymentMethods,
        getDefaultPaymentMethod,
        addPaymentMethod,
        deletePaymentMethod,
        setDefaultPaymentMethod,
        getOrders,
        getOrderById,
        cancelOrder,
        createOrder,
        calculateProcessingFee,
        getCurrentUser,
        getAllUsers,
        registerUser,
        validateLogin,
        updateUser,
        deleteUser,
        getUserByEmail,
        migrateUserEmailKeyedData,
        validatePassword,
        getAvatarUrl,
        loginOrRegisterWithGoogle,
        getLastLoginEmail,
        setLastLoginEmail,
        hasBiometricEnabled,
        isBiometricAvailableOnDevice,
        loginWithBiometric,
        getNotificationsEnabled,
        setNotificationsEnabled,
        getPickupLocations,
        submitSupportRequest,
        getSupportRequests,
        formatCurrency,
        formatCurrencyHTML,
        formatCount,
        formatDeliveryLabel,
        getDeliveryIconClass,
        isProductRefundable,
        getProductTags,
        getInitialsAvatarDataUri,
        showAlert,
        showConfirm,
        refreshCartNavBadge,
    };
})();
