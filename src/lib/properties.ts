export type PropertyCategory =
  | "apartment"
  | "luxury-apartment"
  | "villa"
  | "building"
  | "office"
  | "land"
  | "studio"
  | "commercial";

export type PropertyStatus = "available" | "sold" | "rented" | "maintenance";
export type PropertyListing = "rent" | "sale";

export type RoomCategory =
  | "main"
  | "living-room"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "balcony"
  | "gym"
  | "pool"
  | "garden"
  | "exterior"
  | "other";

export const ROOM_META: Record<RoomCategory, { label: string }> = {
  main: { label: "Main" },
  "living-room": { label: "Living Room" },
  kitchen: { label: "Kitchen" },
  bedroom: { label: "Bedroom" },
  bathroom: { label: "Bathroom" },
  balcony: { label: "Balcony" },
  gym: { label: "Gym" },
  pool: { label: "Pool" },
  garden: { label: "Garden" },
  exterior: { label: "Exterior" },
  other: { label: "Other" },
};

export interface RoomImage {
  room: RoomCategory;
  label?: string;
  src: string;
}

export interface NeighborhoodPlace {
  name: string;
  type: "shopping" | "dining" | "hospital" | "school" | "transit" | "park" | "landmark";
  distance: string;
  note?: string;
}

export interface PropertyAgent {
  name: string;
  title: string;
  avatar: string;
  phone: string;
  email: string;
  whatsapp?: string;
  rating?: number;
  reviews?: number;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  category: PropertyCategory;
  listing: PropertyListing;
  status: PropertyStatus;
  luxury: boolean;
  featured?: boolean;
  price: number;
  currency: "USD" | "RWF";
  priceUnit?: "month" | "total";
  location: string;
  district: string;
  beds?: number;
  baths?: number;
  area: number;
  description: string;
  image: string;
  /** @deprecated use roomGallery */
  gallery?: { label: string; src: string }[];
  roomGallery?: RoomImage[];
  videoUrl?: string;
  tourUrl?: string; // 3D walkthrough
  floorPlanUrl?: string; // PDF (optional)
  amenities?: string[];
  // Detailed metadata
  reference?: string; // e.g. NW-KGL-001
  furnishing?: "Furnished" | "Semi-Furnished" | "Unfurnished";
  yearBuilt?: number;
  floor?: number | string;
  facing?: string;
  parking?: number;
  address?: string;
  lat?: number;
  lng?: number;
  neighborhood?: NeighborhoodPlace[];
  agent?: PropertyAgent;
  structureMode?: "standalone" | "building" | "mixed" | string;
  totalUnits?: number;
  availableUnits?: number;
}

export const CATEGORY_META: Record<PropertyCategory, { label: string; plural: string; description: string }> = {
  apartment: { label: "Apartment", plural: "Apartments", description: "Modern apartments in prime locations" },
  "luxury-apartment": { label: "Luxury Apartment", plural: "Luxury Apartments", description: "Penthouses & premium residences" },
  villa: { label: "Villa", plural: "Villas", description: "Private villas with exclusive amenities" },
  building: { label: "Building", plural: "Buildings", description: "Full buildings & developments" },
  office: { label: "Office", plural: "Offices", description: "Corporate spaces & headquarters" },
  land: { label: "Land / Plot", plural: "Lands / Plots", description: "Investment land & development plots" },
  studio: { label: "Studio", plural: "Studios", description: "Compact, refined studio living" },
  commercial: { label: "Commercial", plural: "Commercial", description: "Retail & mixed-use commercial assets" },
};

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const properties: Property[] = [
  {
    id: "p1", slug: "kigali-heights-luxury-penthouse",
    title: "Kigali Heights Luxury Penthouse",
    category: "luxury-apartment", listing: "sale", status: "available", luxury: true, featured: true,
    price: 850000, currency: "USD",
    location: "Kimihurura", district: "Gasabo",
    beds: 4, baths: 3, area: 320,
    description: "An architectural triumph perched above Kigali. Floor-to-ceiling glass, private rooftop terrace and concierge-grade finishes.",
    image: u("photo-1600596542815-ffad4c1539a9"),
    roomGallery: [
      { room: "main", src: u("photo-1600596542815-ffad4c1539a9") },
      { room: "living-room", src: u("photo-1600585154340-be6161a56a0c") },
      { room: "living-room", src: u("photo-1600607687939-ce8a6c25118c") },
      { room: "kitchen", src: u("photo-1556909114-f6e7ad7d3136") },
      { room: "bedroom", src: u("photo-1600210492486-724fe5c67fb0") },
      { room: "bathroom", src: u("photo-1552321554-5fefe8c9ef14") },
      { room: "balcony", src: u("photo-1502672260266-1c1ef2d93688") },
      { room: "gym", src: u("photo-1571902943202-507ec2618e8f") },
    ],
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    tourUrl: "https://my.matterport.com/show/?m=SxQL3iGyoDo",
    amenities: ["Concierge", "Pool", "Gym", "Smart home", "Private elevator"],
    reference: "NW-KGL-001",
    furnishing: "Furnished",
    yearBuilt: 2022,
    floor: 15,
    facing: "North-East",
    parking: 2,
    address: "KG 7 Ave, Kigali Heights Tower A",
    lat: -1.9536,
    lng: 30.0928,
    neighborhood: [
      { name: "Kigali Heights Mall", type: "shopping", distance: "Building", note: "Premium shopping and dining" },
      { name: "The Hut Restaurant", type: "dining", distance: "50m", note: "Fine dining" },
      { name: "King Faisal Hospital", type: "hospital", distance: "2.5km" },
      { name: "Green Hills Academy", type: "school", distance: "3km" },
      { name: "Kigali Convention Centre", type: "landmark", distance: "800m" },
      { name: "Nyarutarama Park", type: "park", distance: "1.2km" },
    ],
    agent: {
      name: "Jean Pierre Habimana",
      title: "Senior Property Consultant",
      avatar: "https://i.pravatar.cc/160?img=12",
      phone: "+250793300080",
      email: "jp.habimana@novaworks.rw",
      whatsapp: "250793300080",
      rating: 5,
      reviews: 48,
    },
  },
  {
    id: "p2", slug: "nyarutarama-glass-villa",
    title: "Nyarutarama Glass Villa",
    category: "villa", listing: "sale", status: "available", luxury: true, featured: true,
    price: 1250000, currency: "USD",
    location: "Nyarutarama", district: "Gasabo",
    beds: 6, baths: 5, area: 580,
    description: "Sculptural minimalist villa wrapped in walnut and travertine, overlooking the golf estate.",
    image: u("photo-1613490493576-7fde63acd811"),
    gallery: [
      { label: "Exterior", src: u("photo-1613490493576-7fde63acd811") },
      { label: "Pool", src: u("photo-1600585154526-990dced4db0d") },
      { label: "Living", src: u("photo-1600607687939-ce8a6c25118c") },
      { label: "Kitchen", src: u("photo-1556909114-f6e7ad7d3136") },
    ],
    amenities: ["Infinity pool", "Cinema", "Wine cellar", "Garden", "Staff quarters"],
  },
  {
    id: "p3", slug: "kacyiru-skyline-residence",
    title: "Kacyiru Skyline Residence",
    category: "apartment", listing: "rent", status: "available", luxury: false, featured: true,
    price: 2400, currency: "USD", priceUnit: "month",
    location: "Kacyiru", district: "Gasabo",
    beds: 3, baths: 2, area: 145,
    description: "Sun-drenched corner apartment with balcony views across the Kigali skyline.",
    image: u("photo-1502672260266-1c1ef2d93688"),
    gallery: [
      { label: "Living Room", src: u("photo-1502672260266-1c1ef2d93688") },
      { label: "Kitchen", src: u("photo-1556909114-f6e7ad7d3136") },
      { label: "Bedroom", src: u("photo-1505693416388-ac5ce068fe85") },
    ],
  },
  {
    id: "p4", slug: "remera-corporate-tower",
    title: "Remera Corporate Tower — Floor 12",
    category: "office", listing: "rent", status: "available", luxury: false,
    price: 6800, currency: "USD", priceUnit: "month",
    location: "Remera", district: "Gasabo", area: 410,
    description: "Premium A-grade office floor with panoramic city views, raised flooring and turnkey fit-out.",
    image: u("photo-1497366216548-37526070297c"),
  },
  {
    id: "p5", slug: "rebero-hillside-plot",
    title: "Rebero Hillside Investment Plot",
    category: "land", listing: "sale", status: "available", luxury: false,
    price: 320000, currency: "USD",
    location: "Rebero", district: "Kicukiro", area: 2400,
    description: "Elevated 2,400 m² plot with permit-ready layout for a private residence or boutique development.",
    image: u("photo-1500382017468-9049fed747ef"),
  },
  {
    id: "p6", slug: "gishushu-design-studio",
    title: "Gishushu Design Studio",
    category: "studio", listing: "rent", status: "available", luxury: false,
    price: 850, currency: "USD", priceUnit: "month",
    location: "Gishushu", district: "Gasabo",
    beds: 1, baths: 1, area: 48,
    description: "Compact, light-filled studio with built-in joinery — perfect for creative professionals.",
    image: u("photo-1522708323590-d24dbb6b0267"),
  },
  {
    id: "p7", slug: "kimihurura-private-residence",
    title: "Kimihurura Private Residence",
    category: "villa", listing: "rent", status: "rented", luxury: true,
    price: 8500, currency: "USD", priceUnit: "month",
    location: "Kimihurura", district: "Gasabo",
    beds: 5, baths: 4, area: 420,
    description: "Discreet luxury family villa with mature gardens and full staff accommodation.",
    image: u("photo-1564013799919-ab600027ffc6"),
  },
  {
    id: "p8", slug: "downtown-mixed-use-building",
    title: "Downtown Mixed-Use Building",
    category: "building", listing: "sale", status: "available", luxury: false,
    price: 4200000, currency: "USD",
    location: "Nyarugenge", district: "Nyarugenge", area: 2800,
    description: "Income-producing mixed-use asset: ground-floor retail, four upper floors of residential.",
    image: u("photo-1486406146926-c627a92ad1ab"),
  },
  {
    id: "p9", slug: "kimihurura-garden-apartment",
    title: "Kimihurura Garden Apartment",
    category: "apartment", listing: "sale", status: "available", luxury: false, featured: true,
    price: 285000, currency: "USD",
    location: "Kimihurura", district: "Gasabo",
    beds: 2, baths: 2, area: 110,
    description: "Ground-floor garden apartment with private terrace and shared pool.",
    image: u("photo-1567496898669-ee935f5f647a"),
  },
];

export function formatPrice(p: Property) {
  const v = new Intl.NumberFormat("en-US").format(p.price);
  const sym = p.currency === "USD" ? "$" : "RWF ";
  const suffix = p.priceUnit === "month" ? " / mo" : "";
  return `${sym}${v}${suffix}`;
}

export function getProperty(slug: string) {
  return properties.find((p) => p.slug === slug);
}

export function listByCategory(category?: PropertyCategory) {
  if (!category) return properties;
  return properties.filter((p) => p.category === category);
}

/** Fill in sensible defaults for the detail page so every property looks complete. */
export function getEnrichedProperty(slug: string): Property | undefined {
  const p = getProperty(slug);
  if (!p) return undefined;
  const districtCenters: Record<string, [number, number]> = {
    Gasabo: [-1.9396, 30.1057],
    Kicukiro: [-1.9886, 30.1057],
    Nyarugenge: [-1.9536, 30.0606],
  };
  const [lat, lng] = districtCenters[p.district] ?? [-1.9441, 30.0619];
  const defaultAgent: PropertyAgent = {
    name: "Diane Uwase",
    title: "Property Consultant",
    avatar: "https://i.pravatar.cc/160?img=47",
    phone: "+250793300080",
    email: "diane.uwase@novaworks.rw",
    whatsapp: "250793300080",
    rating: 5,
    reviews: 24,
  };
  const defaultNeighborhood: NeighborhoodPlace[] = [
    { name: `${p.location} Market`, type: "shopping", distance: "600m", note: "Daily essentials" },
    { name: `${p.location} Bistro`, type: "dining", distance: "300m", note: "Cafés & dining" },
    { name: "King Faisal Hospital", type: "hospital", distance: "2.5km" },
    { name: "Green Hills Academy", type: "school", distance: "3km" },
    { name: "Kigali Convention Centre", type: "landmark", distance: "1.5km" },
    { name: `${p.district} Park`, type: "park", distance: "900m" },
  ];
  return {
    ...p,
    reference: p.reference ?? `NW-${p.id.toUpperCase()}`,
    furnishing: p.furnishing ?? (p.category === "land" ? undefined : "Furnished"),
    yearBuilt: p.yearBuilt ?? 2022,
    floor: p.floor ?? (p.category === "land" ? undefined : 3),
    facing: p.facing ?? "North-East",
    parking: p.parking ?? (p.category === "land" ? 0 : 2),
    address: p.address ?? `${p.location}, ${p.district}`,
    lat: p.lat ?? lat,
    lng: p.lng ?? lng,
    neighborhood: p.neighborhood ?? defaultNeighborhood,
    agent: p.agent ?? defaultAgent,
  };
}