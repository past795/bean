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
  category?: string;
  imageUrl?: string;
  purchased?: boolean;
};

export type TripPlan = {
  id: string;
  title: string;
  destination: string;
  period: string;
  travelers: number;
  days: TripDay[];
  flights: FlightInfo[];
  accommodations: AccommodationInfo[];
  shopping: TripShoppingItem[];
};
