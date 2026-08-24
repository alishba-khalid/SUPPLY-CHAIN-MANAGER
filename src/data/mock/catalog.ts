/**
 * Static reference lists used to generate realistic (but fictional) names
 * for the deterministic mock dataset. No business logic lives here.
 */

export const SUPPLIER_NAMES = [
  "Meridian Components", "Northgate Materials", "Silverline Industrial",
  "Pacific Rim Fabrication", "Vantage Metals Co.", "Cascade Supply Group",
  "Ironbridge Manufacturing", "Solstice Packaging", "Highline Textiles",
  "Redwood Electronics", "Anchor Point Logistics Supply", "Crestwood Plastics",
  "Union Forge Industries", "Bluepeak Chemicals", "Harbor & Co. Trading",
  "Sterling Precision Parts", "Delta Ridge Materials", "Kestrel Hardware",
  "Continental Fasteners", "Bright Path Foods",
] as const;

export const SUPPLIER_COUNTRIES = [
  "United States", "China", "Vietnam", "Mexico", "Germany", "India",
  "Taiwan", "Poland", "South Korea", "Canada",
] as const;

export const WAREHOUSES = [
  { name: "North DC", code: "NDC", city: "Columbus", country: "United States", type: "distribution_center" as const },
  { name: "West Coast Fulfillment", code: "WCF", city: "Reno", country: "United States", type: "fulfillment" as const },
  { name: "East Coast Fulfillment", code: "ECF", city: "Allentown", country: "United States", type: "fulfillment" as const },
  { name: "South Regional DC", code: "SRD", city: "Dallas", country: "United States", type: "distribution_center" as const },
  { name: "Retail Annex", code: "RTA", city: "Chicago", country: "United States", type: "retail" as const },
  { name: "Cross Dock Hub", code: "XDH", city: "Memphis", country: "United States", type: "cross_dock" as const },
] as const;

export const PRODUCT_CATEGORY_WEIGHTS: [string, number][] = [
  ["finished_good", 45],
  ["component", 25],
  ["raw_material", 15],
  ["packaging", 10],
  ["mro", 5],
];

const FINISHED_GOOD_NAMES = [
  "Insulated Shipping Box", "Ergonomic Task Chair", "Stainless Water Bottle",
  "Cordless Drill Kit", "LED Desk Lamp", "Modular Storage Bin",
  "Adjustable Standing Desk", "Wireless Charging Pad", "Heavy-Duty Tote",
  "Ceramic Coffee Mug Set", "Foldable Hand Truck", "Bluetooth Speaker",
  "Industrial Shelving Unit", "Padded Mailer Pack", "Safety Goggles",
  "Anti-Fatigue Floor Mat", "Portable Air Compressor", "Digital Luggage Scale",
  "Reusable Produce Bags", "Stackable Crate", "Rechargeable Flashlight",
  "Steel Toe Work Boots", "Fleece Zip Jacket", "Bamboo Cutting Board",
  "Aluminum Water Jug",
];

const COMPONENT_NAMES = [
  "Bearing Assembly", "Circuit Board Module", "Hydraulic Valve",
  "Motor Bracket", "Gear Set", "Sensor Housing", "Power Supply Unit",
  "Control Panel", "Actuator Arm", "Wiring Harness", "Pump Impeller",
  "Drive Belt", "Filter Cartridge", "LED Driver Board", "Battery Pack Module",
];

const RAW_MATERIAL_NAMES = [
  "Cold Rolled Steel Sheet", "Aluminum Billet", "Recycled PET Pellets",
  "Cotton Yarn Spool", "Hardwood Plank", "Copper Wire Coil",
  "Silicone Sheet Stock", "Corrugated Board Roll", "Epoxy Resin Drum",
  "Stainless Steel Rod",
];

const PACKAGING_NAMES = [
  "Corrugated Shipping Carton", "Bubble Wrap Roll", "Poly Mailer Bag",
  "Kraft Paper Void Fill", "Pallet Wrap Film", "Custom Print Label Roll",
  "Foam Insert Sheet", "Strapping Tape",
];

const MRO_NAMES = [
  "Replacement HEPA Filter", "Conveyor Belt Section", "Forklift Battery",
  "Safety Signage Kit", "Industrial Lubricant Drum", "Pallet Jack",
];

export const PRODUCT_NAMES_BY_CATEGORY: Record<string, string[]> = {
  finished_good: FINISHED_GOOD_NAMES,
  component: COMPONENT_NAMES,
  raw_material: RAW_MATERIAL_NAMES,
  packaging: PACKAGING_NAMES,
  mro: MRO_NAMES,
};

export const UNIT_OF_MEASURE_BY_CATEGORY: Record<string, string[]> = {
  finished_good: ["each"],
  component: ["each"],
  raw_material: ["kg", "m", "roll"],
  packaging: ["each", "case"],
  mro: ["each"],
};

export const CARRIERS = [
  "Meridian Freight", "Continental Logistics", "Blue Arrow Express",
  "Pacific Cargo Lines", "Overland Transit", "Summit Trucking Co.",
] as const;

export const CUSTOMER_NAME_PREFIXES = [
  "Northwind", "Brightside", "Cornerstone", "Lakeview", "Ironclad",
  "Summit", "Harborview", "Redstone", "Evergreen", "Metro",
  "Frontline", "Cascade", "Bluepoint", "Grandview", "Union",
  "Silverleaf", "Westgate", "Highland", "Riverside", "Parkside",
] as const;

export const CUSTOMER_NAME_SUFFIXES = [
  "Retail Group", "Distribution Co.", "Trading LLC", "Supply Partners",
  "Wholesale Inc.", "Commercial Group", "Enterprises", "& Sons",
  "Logistics LLC", "Holdings",
] as const;

export const CONTACT_FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Jamie",
  "Drew", "Cameron", "Priya", "Wei", "Elena", "Hassan", "Noor", "Mateo",
] as const;

export const CONTACT_LAST_NAMES = [
  "Chen", "Patel", "Garcia", "Kowalski", "Nguyen", "Müller", "Silva",
  "Kim", "Rossi", "Ivanov", "Anders", "Okafor",
] as const;
