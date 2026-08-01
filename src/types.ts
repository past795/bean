export type TransportMode =
  | "步行"
  | "計程車"
  | "公車"
  | "地鐵"
  | "飛機"
  | "預約制"
  | "百貨內"
  | "其他";

export type Stop = {
  id: string;
  time: string;
  title: string;
  address: string;
  transport: string;
  transportMode: TransportMode;
  note: string;
  pass?: string;
  latitude?: number;
  longitude?: number;
  routeMode?: "driving" | "walking" | "transit" | "taxi";
  openingHours?: string;
  openingHoursSource?: string;
  durationMinutes?: number;
};

export type TripDay = {
  id: string;
  label: string;
  date: string;
  title: string;
  stops: Stop[];
};

export type FlightInfo = {
  id: string;
  route: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  terminal?: string;
  note?: string;
};

export type AccommodationInfo = {
  id: string;
  name: string;
  period: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  facilities?: string;
  frontDesk?: string;
  note?: string;
};

export type TripShoppingItem = {
  id: string;
  name: string;
  price?: string;
  currency?: string;
  category?: string;
  imageUrl?: string;
  purchased?: boolean;
  scope?: "shared" | "personal";
  owner?: string;
};

export type TripChecklistItem = {
  id: string;
  text: string;
  completed?: boolean;
  scope?: "shared" | "personal";
  owner?: string;
};

export type TripPlan = {
  id: string;
  title: string;
  destination: string;
  period: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  homeBaseAccommodationId?: string;
  homeBaseByDay?: Record<string, string>;
  accommodationByNight?: Record<string, string>;
  travelers: number;
  days: TripDay[];
  flights: FlightInfo[];
  accommodations: AccommodationInfo[];
  shopping: TripShoppingItem[];
  shoppingCatalogImported?: boolean;
  checklist: TripChecklistItem[];
};
