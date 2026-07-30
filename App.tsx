import "react-native-gesture-handler";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { toolboxItems } from "./src/data/toolbox";
import { shoppingItems } from "./src/data/shopping";
import { initialTrip as busanInitialTrip } from "./src/data/trip";
import { FlightInfo, Stop, TripDay, TripPlan } from "./src/types";
import { RouteMap } from "./src/components/RouteMap";

type Tab = "home" | "itinerary" | "toolbox" | "expenses";
const STORE_KEY = "travel-companion-v2";
const EXPENSE_KEY = "travel-expenses-v1";
const CLOUD_LINK_KEY = "douyou-cloud-links-v1";
const AUTH_KEY = "douyou-google-auth-v1";
const SYNC_URL = "https://script.google.com/macros/s/AKfycbx59WE7iqgehx4nsE4xxxp_Q8-eQrd59VSfR4xSa3IlU7lIBtikr1gvG3EZgxWHEOwj/exec";
const GOOGLE_CLIENT_ID = "280761518317-gdvrt4provk183vi87j6uoapmu5umn30.apps.googleusercontent.com";
const buildInviteMessage = (tripId: string, inviteCode: string) => `一起編輯豆遊行程 ✈️

加入步驟：
1. 開啟豆遊網站並登入自己的 Google 帳號
2. 在「我的旅行」頁面按右上角「加入旅行」
3. 輸入下方旅行 ID、邀請碼與成員名稱
4. 按「加入並開始同步」

旅行 ID：${tripId}
邀請碼：${inviteCode}
豆遊網站：https://past795.github.io/bean/

加入成功後，行程與記帳會自動同步。`;
const isGoogleTokenFresh = (token: string) => {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const segment = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse((globalThis as any).atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, "=")));
    return Number(payload.exp || 0) * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
};
const screenWidth = Dimensions.get("window").width;
const KNOWN_COORDINATES: Record<string, [number, number]> = {
  "d3-1": [35.1712, 129.1277], "d3-2": [35.0770, 129.0208],
  "d3-3": [35.0775, 129.0234], "d3-4": [35.0627, 129.0165],
  "d3-5": [35.1552, 129.0647], "d3-6": [35.1568, 129.0575],
  "d3-7": [35.1547, 129.0636],
  "d4-1": [35.1690, 129.1292], "d4-2": [35.1690, 129.1292],
  "d4-3": [35.1690, 129.1292], "d4-4": [35.1516, 129.1165],
  "d4-5": [35.1439, 129.1106], "d4-6": [35.1532, 129.1187],
  "d5-1": [35.1457, 129.0654], "d5-2": [35.1883, 129.2233],
  "d5-3": [35.1960, 129.2280], "d5-4": [35.1960, 129.2120],
  "d5-5": [35.1967, 129.2190], "d5-6": [35.1915, 129.2125],
  "d5-7": [35.3210, 129.2700], "d5-8": [35.1796, 128.9380],
  "d5-9": [35.1796, 128.9380]
};
const VERIFIED_OPENING_HOURS: Record<string, { hours: string; source: string }> = {
  "d1-1": { hours: "機場航廈依當日航班開放", source: "金海國際機場／航班資訊" },
  "d1-2": { hours: "櫃檯 24 小時・入住 15:00 起", source: "Toyoko Inn Busan Jungang Station 官方網站" },
  "d1-3": { hours: "每日 08:00–21:00", source: "Tabling／店家公開資訊" },
  "d1-4": { hours: "戶外街區・全天可通行（店家各自營業）", source: "Visit Busan" },
  "d1-5": { hours: "09:00 起（出發前請再確認當日閉店時間）", source: "Aether Cafe 官方網站／店家公開資訊" },
  "d1-6": { hours: "10 月 04:00–24:00", source: "Visit Busan／太宗臺官方旅遊資訊" },
  "d1-7": { hours: "15:00 起（需確認影島分店當日資訊）", source: "店家公開資訊／原行程指定分店" },
  "d1-8": { hours: "公共街區・全天可通行（店家各自營業）", source: "Visit Busan" },
  "d1-9": { hours: "百貨約 10:30–20:00（週末可能延長）", source: "樂天百貨光復店公開資訊" },
  "d1-10": { hours: "市場約 06:00–21:00（攤商各自營業）", source: "新東亞水產市場公開資訊" },
  "d1-11": { hours: "櫃檯 24 小時・入住 15:00 起", source: "Toyoko Inn Busan Jungang Station 官方網站" },
  "d2-1": { hours: "櫃檯 24 小時・入住 15:00 起", source: "Avani Central Busan 官方資料" },
  "d2-2": { hours: "09:00–18:30", source: "Haeundae Blueline Park／VISITKOREA" },
  "d2-3": { hours: "10 月 09:00–21:00", source: "VISITKOREA／海雲臺區廳" },
  "d2-4": { hours: "午餐時段起營業（需確認青沙浦分店當日時間）", source: "Nasari 食堂店家公開資訊" },
  "d2-5": { hours: "09:00–18:30", source: "Haeundae Blueline Park／VISITKOREA" },
  "d2-6": { hours: "公共海灘・全天開放", source: "Visit Busan" },
  "d2-7": { hours: "10:00–21:00", source: "Busan X the SKY 官方網站" },
  "d2-8": { hours: "依預約航班報到時間", source: "Diamond Bay 遊艇公開預約資訊" },
  "d2-9": { hours: "午餐至晚間營業（需確認廣安分店當日時間）", source: "味贊王鹽烤肉店家公開資訊" },
  "d2-10": { hours: "公共海灘・全天開放", source: "Visit Busan" },
  "d2-11": { hours: "櫃檯 24 小時・入住 15:00 起", source: "Avani Central Busan 官方資料" },
  "d3-1": { hours: "10:00–19:00", source: "Museum 1／VISITKOREA（平日）" },
  "d3-2": { hours: "午餐至晚間營業（需確認指定烤貝店）", source: "松島烤貝村店家公開資訊" },
  "d3-3": { hours: "09:00–21:00", source: "Busan Air Cruise 官方網站（10月）" },
  "d3-4": { hours: "戶外公園・全天開放", source: "Visit Busan" },
  "d3-5": { hours: "咖啡廳日間至晚間營業（出發前確認店家公告）", source: "Cuoiano 店家公開資訊" },
  "d3-6": { hours: "尚缺確切店名，無法對應正確分店", source: "原行程僅寫「西面豬肉湯飯」" },
  "d3-7": { hours: "公共街區・全天可通行（店家各自營業）", source: "Visit Busan" },
  "d4-1": { hours: "08:00–23:00・最晚入場 22:00", source: "新世界百貨 SPA LAND 官方網站" },
  "d4-2": { hours: "約 10:30–20:00（依百貨當日公告）", source: "新世界百貨 Centum City 官方網站" },
  "d4-3": { hours: "約 10:30–20:00（依百貨當日公告）", source: "新世界百貨 Centum City 官方網站" },
  "d4-4": { hours: "10:00–21:00", source: "Duplit 廣安店公開資訊" },
  "d4-5": { hours: "晚餐時段營業（需確認 Catch Table 當日場次）", source: "Catch Table／店家公開資訊" },
  "d4-6": { hours: "公共海灘・全天開放", source: "Visit Busan" },
  "d5-1": { hours: "櫃檯 24 小時・退房依訂房資料", source: "Avani Central Busan 官方資料" },
  "d5-2": { hours: "寺院戶外區域每日開放・建議白天參觀", source: "VISITKOREA／海東龍宮寺" },
  "d5-3": { hours: "Eternal Journey 10:00–21:00", source: "Ananti Cove 官方網站" },
  "d5-4": { hours: "園區公共空間開放・餐廳各自營業", source: "Osiria Tourist Complex" },
  "d5-5": { hours: "10:00–18:00", source: "Skyline Luge Busan 官方網站" },
  "d5-6": { hours: "10:30–20:30", source: "Visit Busan（週一至週四）" },
  "d5-7": { hours: "10:00–24:00（特殊日期依店家公告）", source: "Waveon Coffee 官方網站／店家公開資訊" },
  "d5-8": { hours: "機場航廈依當日航班開放", source: "金海國際機場／航班資訊" },
  "d5-9": { hours: "依航班時間", source: "航空公司航班資訊" }
};

type Expense = { id: string; title: string; amount: number; payer: string; currency?: string };
type CloudLink = { inviteCode: string; memberName?: string; memberId?: string; role?: "owner" | "member" };
type CloudLinks = Record<string, CloudLink>;

type RouteMode = "driving" | "walking" | "transit" | "taxi";
type GoogleUser = { sub: string; name: string; email: string; picture?: string; idToken: string };

const formatCloudDateTime = (value: unknown) => {
  const text = String(value || "");
  if (!/^\d{4}-\d\d-\d\dT/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  if (date.getUTCFullYear() <= 1900) {
    return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(" ", " ");
};

const parseStopMeta = (value: unknown): { routeMode?: RouteMode; openingHours?: string; openingHoursSource?: string; durationMinutes?: number } => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return {
      routeMode: (["walking", "driving", "transit", "taxi"] as RouteMode[]).includes(parsed.routeMode) ? parsed.routeMode : undefined,
      openingHours: typeof parsed.openingHours === "string" ? parsed.openingHours : undefined,
      openingHoursSource: typeof parsed.openingHoursSource === "string" ? parsed.openingHoursSource : undefined,
      durationMinutes: Number.isFinite(Number(parsed.durationMinutes)) ? Number(parsed.durationMinutes) : undefined
    };
  } catch {
    return {};
  }
};

const tripToCloud = (trip: TripPlan, tripExpenses: Expense[]) => ({
  trip: {
    "旅行ID": trip.id, "名稱": trip.title, "目的地": trip.destination,
    "開始日期": trip.period, "結束日期": "", "主要幣別": tripExpenses[0]?.currency || "TWD"
  },
  members: [],
  itinerary: trip.days.flatMap((day) => day.stops.map((stop, index) => ({
    "日期ID": day.id, "景點ID": stop.id, "日期": day.date, "開始時間": stop.time,
    "結束時間": JSON.stringify({ routeMode: stop.routeMode || "driving", openingHours: stop.openingHours || "", openingHoursSource: stop.openingHoursSource || "", durationMinutes: stop.durationMinutes || 0 }), "景點名稱": stop.title, "地址": stop.address,
    "交通方式": stop.transport, "備註": stop.note, "緯度": stop.latitude ?? "",
    "經度": stop.longitude ?? "", "排序": index
  }))),
  flights: trip.flights.map((flight) => ({
    "航班ID": flight.id, "航空公司": "", "航班編號": flight.flightNumber,
    "出發機場": flight.route, "抵達機場": "", "出發時間": flight.departure,
    "抵達時間": flight.arrival, "航廈": flight.terminal || "", "訂位代號": "",
    "備註": flight.note || ""
  })),
  accommodations: trip.accommodations.map((hotel) => ({
    "住宿ID": hotel.id, "住宿名稱": hotel.name, "入住日期": hotel.period,
    "退房日期": "", "入住時間": hotel.checkIn || "", "退房時間": hotel.checkOut || "",
    "地址": hotel.address || "", "櫃檯資訊": hotel.frontDesk || "", "設施": hotel.facilities || "",
    "訂房編號": "", "備註": hotel.note || ""
  })),
  shopping: trip.shopping.map((item) => ({
    "商品ID": item.id, "商品名稱": item.name, "分類": item.category || "",
    "價格": item.price || "", "幣別": item.currency || "", "圖片網址": item.imageUrl || "",
    "購買地點": "", "備註": "", "已購買": !!item.purchased
  })),
  expenses: tripExpenses.map((item) => ({
    "支出ID": item.id, "項目": item.title, "金額": item.amount,
    "幣別": item.currency || "TWD", "付款人": item.payer, "分攤成員": "",
    "日期": "", "分類": "", "備註": "", "建立時間": ""
  }))
});

const cloudToTrip = (data: any): { trip: TripPlan; expenses: Expense[] } => {
  const cloudTrip = data.trip || {};
  const itinerary = Array.isArray(data.itinerary) ? data.itinerary : [];
  const dayIds = [...new Set(itinerary.map((row: any) => String(row["日期ID"] || "day-1")))] as string[];
  const days: TripDay[] = dayIds.map((dayId, dayIndex) => {
    const rows = itinerary.filter((row: any) => String(row["日期ID"] || "day-1") === dayId)
      .sort((a: any, b: any) => Number(a["排序"] || 0) - Number(b["排序"] || 0));
    const date = rows[0]?.["日期"] || `第 ${dayIndex + 1} 天`;
    return {
      id: dayId, label: `DAY ${dayIndex + 1}`, date,
      title: `${cloudTrip["目的地"] || "旅行"}・自由安排`,
      stops: rows.map((row: any) => {
        const meta = parseStopMeta(row["結束時間"]);
        return {
          id: String(row["景點ID"]), time: formatCloudDateTime(row["開始時間"]) || "彈性",
          title: String(row["景點名稱"] || "未命名景點"), address: String(row["地址"] || "地址待補"),
          transport: String(row["交通方式"] || "尚未安排"), transportMode: "其他" as const,
          note: String(row["備註"] || ""), latitude: row["緯度"] === "" ? undefined : Number(row["緯度"]),
          longitude: row["經度"] === "" ? undefined : Number(row["經度"]),
          routeMode: meta.routeMode || "driving", openingHours: meta.openingHours || "", openingHoursSource: meta.openingHoursSource || "", durationMinutes: meta.durationMinutes || 0
        };
      })
    };
  });
  const id = String(cloudTrip["旅行ID"]);
  const trip: TripPlan = {
    id, title: String(cloudTrip["名稱"] || "未命名旅行"),
    destination: String(cloudTrip["目的地"] || ""), period: String(cloudTrip["開始日期"] || "日期未定"),
    travelers: Math.max(1, (data.members || []).length || 1),
    days: days.length ? days : [{ id: `${id}-day-1`, label: "DAY 1", date: "第 1 天", title: "自由安排", stops: [] }],
    flights: (data.flights || []).map((row: any) => ({
      id: String(row["航班ID"]), route: String(row["出發機場"] || ""),
      flightNumber: String(row["航班編號"] || ""), departure: formatCloudDateTime(row["出發時間"]),
      arrival: formatCloudDateTime(row["抵達時間"]), terminal: String(row["航廈"] || ""), note: String(row["備註"] || "")
    })),
    accommodations: (data.accommodations || []).map((row: any) => ({
      id: String(row["住宿ID"]), name: String(row["住宿名稱"] || ""), period: formatCloudDateTime(row["入住日期"]),
      address: String(row["地址"] || ""), checkIn: formatCloudDateTime(row["入住時間"]), checkOut: formatCloudDateTime(row["退房時間"]),
      facilities: String(row["設施"] || ""), frontDesk: String(row["櫃檯資訊"] || ""), note: String(row["備註"] || "")
    })),
    shopping: (data.shopping || []).map((row: any) => ({
      id: String(row["商品ID"]), name: String(row["商品名稱"] || ""), price: String(row["價格"] || ""),
      currency: String(row["幣別"] || ""), category: String(row["分類"] || ""), imageUrl: String(row["圖片網址"] || ""),
      purchased: row["已購買"] === true || String(row["已購買"]).toUpperCase() === "TRUE"
    }))
  };
  const expenses = (data.expenses || []).map((row: any) => ({
    id: String(row["支出ID"]), title: String(row["項目"] || ""), amount: Number(row["金額"] || 0),
    payer: String(row["付款人"] || "我"), currency: String(row["幣別"] || "TWD")
  }));
  return { trip, expenses };
};

const starterTrips: TripPlan[] = [{
  id: "local-welcome",
  title: "開始第一趟旅行",
  destination: "尚未建立",
  period: "日期未定",
  travelers: 1,
  days: [{ id: "welcome-day-1", label: "DAY 1", date: "第 1 天", title: "尚未安排", stops: [] }],
  flights: [],
  accommodations: [],
  shopping: []
}];

const transportIcon = (mode: Stop["transportMode"]) =>
  ({ 步行: "🚶", 計程車: "🚕", 公車: "🚌", 地鐵: "🚇", 飛機: "✈️", 預約制: "🎫", 百貨內: "🏬", 其他: "↗️" }[mode]);

const stopEmoji = (title: string, address = "") => {
  const text = `${title} ${address}`.toLowerCase();
  if (/\p{Extended_Pictographic}/u.test(title)) return "";
  if (/機場|airport|航廈|terminal|航空/.test(text)) return "✈️";
  if (/飯店|酒店|旅館|民宿|hotel|hostel|inn|住宿|check.?in/.test(text)) return "🏨";
  if (/咖啡|coffee|cafe|café|甜點|蛋糕|烘焙/.test(text)) return "☕";
  if (/餐廳|飯|麵|湯|烤肉|早餐|午餐|晚餐|food|restaurant/.test(text)) return "🍽️";
  if (/海|沙灘|海岸|港|島|beach|ocean/.test(text)) return "🌊";
  if (/百貨|購物|商場|商城|免稅|市場|shopping|mall|outlet/.test(text)) return "🛍️";
  if (/車站|地鐵|捷運|火車|ktx|station/.test(text)) return "🚉";
  if (/公園|森林|花園|步道|park|garden/.test(text)) return "🌿";
  if (/寺|廟|宮|教堂|神社|temple|church/.test(text)) return "⛩️";
  if (/博物館|美術館|展覽|museum|gallery/.test(text)) return "🏛️";
  if (/樂園|水族館|纜車|遊艇|體驗|票券/.test(text)) return "🎟️";
  return "📍";
};

const stopDisplayTitle = (stop: Pick<Stop, "title" | "address">) => {
  const emoji = stopEmoji(stop.title, stop.address);
  return emoji ? `${emoji} ${stop.title}` : stop.title;
};

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [trips, setTrips] = useState<TripPlan[]>(starterTrips);
  const [activeTripId, setActiveTripId] = useState("busan-2026");
  const [selectedDayId, setSelectedDayId] = useState("day1");
  const [editing, setEditing] = useState<Stop | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftOpeningHours, setDraftOpeningHours] = useState("");
  const [draftDuration, setDraftDuration] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [newDayCount, setNewDayCount] = useState("5");
  const [newTravelers, setNewTravelers] = useState("2");
  const [addingStop, setAddingStop] = useState(false);
  const [newStopTitle, setNewStopTitle] = useState("");
  const [newStopTime, setNewStopTime] = useState("");
  const [newStopAddress, setNewStopAddress] = useState("");
  const [newStopTransport, setNewStopTransport] = useState("");
  const [newStopNote, setNewStopNote] = useState("");
  const [newStopOpeningHours, setNewStopOpeningHours] = useState("");
  const [newStopDuration, setNewStopDuration] = useState("");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [shoppingSource, setShoppingSource] = useState<"Olive Young" | "韓國藥局">("Olive Young");
  const [expenses, setExpenses] = useState<Record<string, { id: string; title: string; amount: number; payer: string; currency?: string }[]>>({});
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePayer, setExpensePayer] = useState("我");
  const [expenseCurrency, setExpenseCurrency] = useState("KRW");
  const [krwAmount, setKrwAmount] = useState("10000");
  const [addingFlight, setAddingFlight] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [flightRoute, setFlightRoute] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDeparture, setFlightDeparture] = useState("");
  const [flightArrival, setFlightArrival] = useState("");
  const [flightTerminal, setFlightTerminal] = useState("");
  const [flightNote, setFlightNote] = useState("");
  const [deletingTrip, setDeletingTrip] = useState<TripPlan | null>(null);
  const [leavingTrip, setLeavingTrip] = useState<TripPlan | null>(null);
  const [editingTravelers, setEditingTravelers] = useState(false);
  const [travelerDraft, setTravelerDraft] = useState("2");
  const [addingAccommodation, setAddingAccommodation] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelPeriod, setHotelPeriod] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelFacilities, setHotelFacilities] = useState("");
  const [hotelFrontDesk, setHotelFrontDesk] = useState("");
  const [hotelNote, setHotelNote] = useState("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherPlace, setWeatherPlace] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [addingShoppingItem, setAddingShoppingItem] = useState(false);
  const [shoppingName, setShoppingName] = useState("");
  const [shoppingPrice, setShoppingPrice] = useState("");
  const [shoppingCurrency, setShoppingCurrency] = useState("KRW");
  const [shoppingCategory, setShoppingCategory] = useState("");
  const [shoppingImageUrl, setShoppingImageUrl] = useState("");
  const [previousStops, setPreviousStops] = useState<Stop[] | null>(null);
  const [cloudLinks, setCloudLinks] = useState<CloudLinks>({});
  const [cloudMembers, setCloudMembers] = useState<Record<string, string[]>>({});
  const [memberDraft, setMemberDraft] = useState("");
  const [myNameDraft, setMyNameDraft] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [cloudPanelVisible, setCloudPanelVisible] = useState(false);
  const [bulkImportVisible, setBulkImportVisible] = useState(false);
  const [bulkItineraryText, setBulkItineraryText] = useState("");
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [syncErrorMessage, setSyncErrorMessage] = useState("");
  const [joiningTrip, setJoiningTrip] = useState(false);
  const [joinTripId, setJoinTripId] = useState("");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinMemberName, setJoinMemberName] = useState("");
  const [joinError, setJoinError] = useState("");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadingRef = useRef(false);
  const pullingRef = useRef(false);
  const localMutationAtRef = useRef(0);
  const cloudLinksRef = useRef<CloudLinks>({});
  const itineraryListRef = useRef<any>(null);
  const geocodedDaysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((value) => {
      if (!value) return;
      const saved = JSON.parse(value) as GoogleUser;
      if (isGoogleTokenFresh(saved.idToken)) setGoogleUser(saved);
      else AsyncStorage.removeItem(AUTH_KEY).catch(() => undefined);
    }).catch(() => undefined).finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((value) => {
      if (value) {
        const savedTrips = (JSON.parse(value) as TripPlan[]).map((trip) => {
          const verifiedHotels = starterTrips[0]!.accommodations;
          return {
            ...trip,
            flights: trip.flights ?? (trip.id === "busan-2026" ? starterTrips[0]!.flights : []),
            accommodations: (trip.accommodations ?? (trip.id === "busan-2026" ? verifiedHotels : [])).map((hotel) => {
              if (trip.id !== "busan-2026") return hotel;
              const verified = verifiedHotels.find((item) => item.id === hotel.id || item.name.toLowerCase().includes(hotel.name.toLowerCase().split(" ").slice(0, 2).join(" ")));
              return verified ? { ...verified, ...hotel, address: hotel.address || verified.address, checkIn: hotel.checkIn || verified.checkIn, checkOut: hotel.checkOut || verified.checkOut, facilities: hotel.facilities || verified.facilities, frontDesk: hotel.frontDesk || verified.frontDesk, note: hotel.note?.includes("資料來源") ? hotel.note : verified.note } : hotel;
            }),
            shopping: trip.shopping ?? []
          };
        });
        if (Array.isArray(savedTrips) && savedTrips.length) {
          setTrips(savedTrips);
          setActiveTripId(savedTrips[0]!.id);
          setSelectedDayId(savedTrips[0]!.days[0]?.id ?? "");
        }
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(EXPENSE_KEY).then((value) => {
      if (value) setExpenses(JSON.parse(value));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLOUD_LINK_KEY).then((value) => {
      if (!value) return;
      const links = JSON.parse(value) as CloudLinks;
      cloudLinksRef.current = links;
      setCloudLinks(links);
    }).catch(() => undefined);
  }, []);

  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? trips[0]!;
  const days = activeTrip.days;
  const selectedDay = days.find((d) => d.id === selectedDayId) ?? days[0]!;

  const selectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    setTimeout(() => itineraryListRef.current?.scrollToOffset?.({ offset: 0, animated: false }), 0);
  };
  useEffect(() => {
    if (selectedTool !== "天氣") return;
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError("");
    setWeatherData(null);
    const weatherCountry = /韓國|釜山|首爾|濟州|仁川|부산|서울|제주/.test(activeTrip.destination) ? "KR"
      : /日本|沖繩|東京|大阪|京都|北海道|福岡/.test(activeTrip.destination) ? "JP" : "";
    const weatherQuery =
      /釜山|부산/.test(activeTrip.destination) ? "Busan" :
      /首爾|서울/.test(activeTrip.destination) ? "Seoul" :
      /濟州|제주/.test(activeTrip.destination) ? "Jeju" :
      /沖繩/.test(activeTrip.destination) ? "Okinawa" :
      /東京/.test(activeTrip.destination) ? "Tokyo" :
      /大阪/.test(activeTrip.destination) ? "Osaka" :
      /京都/.test(activeTrip.destination) ? "Kyoto" :
      /福岡/.test(activeTrip.destination) ? "Fukuoka" : activeTrip.destination;
    const countryFilter = weatherCountry ? `&countryCode=${weatherCountry}` : "";
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherQuery)}&count=1&language=zh&format=json${countryFilter}`)
      .then((response) => response.json())
      .then((geo) => {
        const place = geo.results?.[0];
        if (!place) throw new Error("找不到目的地");
        if (!cancelled) setWeatherPlace([place.name, place.admin1, place.country].filter(Boolean).join("・"));
        return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`);
      })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setWeatherData(data); })
      .catch(() => { if (!cancelled) setWeatherError("目前無法取得天氣，請稍後再試。"); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTool, activeTrip.destination]);
  const routeStops = useMemo(
    () => selectedDay?.stops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({ ...s, title: stopDisplayTitle(s) })) ?? [],
    [selectedDay]
  );

  const saveCloudLinks = (next: CloudLinks) => {
    cloudLinksRef.current = next;
    setCloudLinks(next);
    AsyncStorage.setItem(CLOUD_LINK_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const postCloud = async (payload: any) => {
    const response = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "同步失敗");
    return result.data;
  };

  const syncTripNow = async (trip: TripPlan, tripExpenses: Expense[]) => {
    const link = cloudLinksRef.current[trip.id];
    if (!link?.inviteCode) {
      setSyncStatus("error");
      setSyncErrorMessage("這台裝置缺少邀請碼，請重新輸入一次以恢復同步。");
      return;
    }
    setSyncStatus("syncing");
    setSyncErrorMessage("");
    uploadingRef.current = true;
    try {
      await postCloud({
        action: "syncTrip", tripId: trip.id, inviteCode: link.inviteCode,
        data: tripToCloud(trip, tripExpenses)
      });
      setSyncStatus("synced");
    } catch (error: any) {
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "上傳失敗，請稍後再試。");
    } finally {
      uploadingRef.current = false;
    }
  };

  const syncExpensesNow = async (trip: TripPlan, tripExpenses: Expense[]) => {
    const link = cloudLinksRef.current[trip.id];
    if (!link?.inviteCode) {
      setSyncStatus("error");
      setSyncErrorMessage("這台裝置缺少邀請碼，請重新輸入一次以恢復同步。");
      return;
    }
    setSyncStatus("syncing");
    setSyncErrorMessage("");
    uploadingRef.current = true;
    try {
      const expenseRows = tripToCloud(trip, tripExpenses).expenses;
      await postCloud({
        action: "syncTrip",
        tripId: trip.id,
        inviteCode: link.inviteCode,
        data: { expenses: expenseRows }
      });
      setSyncStatus("synced");
    } catch (error: any) {
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "支出上傳失敗，請稍後再試。");
    } finally {
      uploadingRef.current = false;
    }
  };

  const queueCloudSync = (trip: TripPlan, tripExpenses: Expense[]) => {
    if (!cloudLinksRef.current[trip.id]) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncTripNow(trip, tripExpenses), 700);
  };

  const pullCloudTrip = async (tripId: string, inviteCode: string, quiet = false) => {
    if (pullingRef.current || (quiet && uploadingRef.current)) return null;
    const requestStartedAt = Date.now();
    pullingRef.current = true;
    if (!quiet) setSyncStatus("syncing");
    try {
      const url = `${SYNC_URL}?action=pull&tripId=${encodeURIComponent(tripId)}&inviteCode=${encodeURIComponent(inviteCode)}&idToken=${encodeURIComponent(googleUser?.idToken || "")}&t=${Date.now()}`;
      const response = await fetch(url);
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "讀取失敗");
      const converted = cloudToTrip(result.data);
      const localTrip = trips.find((trip) => trip.id === tripId);
      const remoteStopCount = converted.trip.days.reduce((sum, day) => sum + day.stops.length, 0);
      const localStopCount = localTrip?.days.reduce((sum, day) => sum + day.stops.length, 0) || 0;
      const shouldRecoverBusan = converted.trip.destination.includes("釜山") && remoteStopCount === 0;
      const incomingTrip = shouldRecoverBusan
        ? { ...converted.trip, days: localStopCount > 0 ? localTrip!.days : busanInitialTrip }
        : converted.trip;
      if (requestStartedAt < localMutationAtRef.current) return null;
      const memberNames = (result.data.members || []).map((row: any) => String(row["顯示名稱"] || "")).filter((name: string) => name && name !== "我");
      setCloudMembers((current) => ({ ...current, [tripId]: [...new Set(memberNames)] as string[] }));
      setTrips((current) => {
        const exists = current.some((trip) => trip.id === incomingTrip.id);
        const next = exists ? current.map((trip) => trip.id === incomingTrip.id ? incomingTrip : trip) : [...current, incomingTrip];
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setExpenses((current) => {
        const next = { ...current, [tripId]: converted.expenses };
        AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setSyncStatus("synced");
      setSyncErrorMessage("");
      if (shouldRecoverBusan) setTimeout(() => syncTripNow(incomingTrip, converted.expenses), 0);
      return incomingTrip;
    } catch (error: any) {
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "讀取同步資料失敗。");
      if (!quiet) Alert.alert("無法加入旅行", error?.message || "請確認旅行 ID 與邀請碼");
      return null;
    } finally {
      pullingRef.current = false;
    }
  };

  useEffect(() => {
    const link = cloudLinks[activeTrip.id];
    if (!googleUser || !link) return;
    pullCloudTrip(activeTrip.id, link.inviteCode, true);
    const timer = setInterval(() => {
      pullCloudTrip(activeTrip.id, link.inviteCode, true);
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTrip.id, googleUser?.sub, cloudLinks[activeTrip.id]?.inviteCode]);

  const persistTrips = (next: TripPlan[]) => {
    setTrips(next);
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
    const changed = next.find((trip) => trip.id === activeTripId);
    if (changed) queueCloudSync(changed, expenses[changed.id] ?? []);
  };

  const updateStops = (stops: Stop[]) => {
    const next = trips.map((trip) => trip.id !== activeTrip.id ? trip : {
      ...trip,
      days: trip.days.map((day) => day.id === selectedDay.id ? { ...day, stops } : day)
    });
    persistTrips(next);
  };

  useEffect(() => {
    if (!selectedDay || geocodedDaysRef.current.has(`${activeTrip.id}:${selectedDay.id}`)) return;
    const needsEnrichment = selectedDay.stops.some((stop) =>
      stop.latitude == null || stop.longitude == null || (!!VERIFIED_OPENING_HOURS[stop.id] && !stop.openingHours)
    );
    if (!needsEnrichment) return;
    geocodedDaysRef.current.add(`${activeTrip.id}:${selectedDay.id}`);
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(selectedDay.stops.map(async (stop) => {
        const verifiedHours = VERIFIED_OPENING_HOURS[stop.id];
        const enriched = verifiedHours && !stop.openingHours
          ? { ...stop, openingHours: verifiedHours.hours, openingHoursSource: verifiedHours.source }
          : stop;
        if (enriched.latitude != null && enriched.longitude != null) return enriched;
        const known = KNOWN_COORDINATES[stop.id];
        if (known) return { ...enriched, latitude: known[0], longitude: known[1] };
        const cleanTitle = enriched.title.replace(/^[^A-Za-z0-9\u3400-\u9fff\uac00-\ud7af]+/, "");
        try {
          const query = `${cleanTitle} ${enriched.address} ${activeTrip.destination}`;
          const response = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`);
          const data = await response.json();
          const coordinates = data.features?.[0]?.geometry?.coordinates;
          return coordinates?.length >= 2
            ? { ...enriched, longitude: Number(coordinates[0]), latitude: Number(coordinates[1]) }
            : enriched;
        } catch {
          return enriched;
        }
      }));
      if (!cancelled && resolved.some((stop, index) => stop !== selectedDay.stops[index])) updateStops(resolved);
    })();
    return () => { cancelled = true; };
  }, [activeTrip.id, selectedDay?.id]);

  const updateActiveTrip = (changes: Partial<TripPlan>) => {
    persistTrips(trips.map((trip) => trip.id === activeTrip.id ? { ...trip, ...changes } : trip));
  };

  const saveNote = () => {
    if (!editing) return;
    const durationMinutes = Math.max(0, Number.parseInt(draftDuration, 10) || 0);
    const next = selectedDay.stops.map((stop) =>
      stop.id === editing.id ? { ...stop, note: draftNote, openingHours: draftOpeningHours.trim(), durationMinutes } : stop
    );
    const index = next.findIndex((stop) => stop.id === editing.id);
    const current = next[index];
    const following = next[index + 1];
    if (current && following) {
      const travelMinutes = estimatedLegMinutes(current, following, current.routeMode || "driving");
      const match = current.time.match(/^(\d{1,2}):([0-5]\d)$/);
      if (travelMinutes != null && match) {
        const total = (Number(match[1]) * 60 + Number(match[2]) + durationMinutes + travelMinutes) % 1440;
        next[index + 1] = { ...following, time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}` };
      }
    }
    updateStops(next);
    setEditing(null);
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedDay.stops.length) return;
    const next = [...selectedDay.stops];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    updateStops(next);
  };

  const isKoreaTrip = /韓國|釜山|首爾|濟州|仁川|大邱|大田|光州|慶州|江原|부산|서울|제주|인천/.test(activeTrip.destination);

  const openDirections = (stop: Stop, provider: "google" | "naver") => {
    const query = encodeURIComponent(stop.address || stop.title);
    const url = provider === "naver"
      ? `https://map.naver.com/p/search/${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("無法開啟地圖", stop.address)
    );
  };

  const stopLocation = (stop: Stop) =>
    stop.latitude != null && stop.longitude != null
      ? `${stop.latitude},${stop.longitude}`
      : stop.address || stop.title;

  const openGoogleRoute = (from: Stop, to: Stop, mode: RouteMode, waypoints: Stop[] = []) => {
    const waypointQuery = waypoints.length
      ? `&waypoints=${encodeURIComponent(waypoints.map(stopLocation).join("|"))}`
      : "";
    const googleMode = mode === "taxi" ? "driving" : mode;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stopLocation(from))}&destination=${encodeURIComponent(stopLocation(to))}${waypointQuery}&travelmode=${googleMode}`;
    Linking.openURL(url).catch(() => Alert.alert("無法開啟 Google Maps"));
  };

  const setLegRouteMode = (stopId: string, routeMode: RouteMode) => {
    const index = selectedDay.stops.findIndex((stop) => stop.id === stopId);
    if (index < 0) return;
    const current = selectedDay.stops[index]!;
    const nextStop = selectedDay.stops[index + 1];
    const next = selectedDay.stops.map((stop) => stop.id === stopId ? { ...stop, routeMode } : stop);
    if (nextStop) {
      const minutes = estimatedLegMinutes(current, nextStop, routeMode);
      const match = current.time.match(/^(\d{1,2}):([0-5]\d)$/);
      if (minutes != null && match) {
        const total = (Number(match[1]) * 60 + Number(match[2]) + (current.durationMinutes || 0) + minutes) % (24 * 60);
        next[index + 1] = {
          ...next[index + 1]!,
          time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
        };
      }
    }
    updateStops(next);
  };

  const openingMinutes = (stop: Stop) => {
    const match = (stop.openingHours || "").match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
  };

  const sortByOpeningHours = () => {
    if (selectedDay.stops.length < 2) return;
    if (!selectedDay.stops.some((stop) => stop.openingHours && stop.openingHoursSource)) {
      Alert.alert("尚無網路查證資料", "這一天還沒有已查證的營業時間，因此不會用備註內容自行猜測排序。");
      return;
    }
    setPreviousStops([...selectedDay.stops]);
    updateStops(selectedDay.stops.map((stop, index) => ({ stop, index }))
      .sort((a, b) => openingMinutes(a.stop) - openingMinutes(b.stop) || a.index - b.index)
      .map(({ stop }) => stop));
  };

  const distanceBetween = (a: Stop, b: Stop) => {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return Number.POSITIVE_INFINITY;
    const toRad = (value: number) => value * Math.PI / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const estimatedLegMinutes = (from: Stop, to: Stop, mode: RouteMode) => {
    const distance = distanceBetween(from, to);
    if (!Number.isFinite(distance)) return null;
    const minutes =
      mode === "walking" ? distance / 4.5 * 60 :
      mode === "transit" ? distance / 22 * 60 + 10 :
      mode === "taxi" ? distance / 30 * 60 + 5 :
      distance / 32 * 60 + 3;
    return Math.max(mode === "walking" ? 2 : 5, Math.round(minutes / 5) * 5);
  };

  const sortByShortestRoute = () => {
    if (selectedDay.stops.length < 2) return;
    setPreviousStops([...selectedDay.stops]);
    const remaining = [...selectedDay.stops.slice(1)];
    const sorted = [selectedDay.stops[0]!];
    while (remaining.length) {
      const current = sorted[sorted.length - 1]!;
      let bestIndex = 0;
      let bestDistance = distanceBetween(current, remaining[0]!);
      remaining.forEach((candidate, index) => {
        const distance = distanceBetween(current, candidate);
        if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
      });
      sorted.push(remaining.splice(bestIndex, 1)[0]!);
    }
    updateStops(sorted);
  };

  const undoSmartSort = () => {
    if (!previousStops) return;
    updateStops(previousStops);
    setPreviousStops(null);
  };

  const selectTrip = (trip: TripPlan) => {
    setActiveTripId(trip.id);
    setSelectedDayId(trip.days[0]?.id ?? "");
    setTab("itinerary");
  };

  const shareCloudInfo = (tripId: string, inviteCode: string) => {
    const message = buildInviteMessage(tripId, inviteCode);
    Share.share({
      title: "加入我的豆遊旅行",
      message
    }).catch(() => undefined);
  };

  const copyInviteText = async (tripId: string, inviteCode: string) => {
    const message = buildInviteMessage(tripId, inviteCode);
    try {
      if (Platform.OS === "web" && (globalThis as any).navigator?.clipboard) {
        await (globalThis as any).navigator.clipboard.writeText(message);
        showToast("邀請文字已複製");
        return;
      }
      await Share.share({ title: "加入我的豆遊旅行", message });
    } catch {
      showToast("無法複製，請改用其他分享");
    }
  };

  const shareInviteToLine = (tripId: string, inviteCode: string) => {
    const message = buildInviteMessage(tripId, inviteCode);
    Linking.openURL(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`).catch(() => showToast("目前無法開啟 LINE"));
  };

  const enableCloudForExistingTrip = async () => {
    const originalTrip = activeTrip;
    const cloudTripId = `trip-${Date.now()}`;
    const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
    const memberId = `member-${Date.now()}`;
    const ownerName = myNameDraft.trim() || "未命名成員";
    const cloudTrip = { ...originalTrip, id: cloudTripId };
    const tripExpenses = expenses[originalTrip.id] ?? [];
    setSyncStatus("syncing");
    try {
      await postCloud({
        action: "createTrip", inviteCode,
        trip: { "旅行ID": cloudTripId, "名稱": cloudTrip.title, "目的地": cloudTrip.destination, "開始日期": cloudTrip.period, "主要幣別": "TWD" },
        member: { "成員ID": memberId, "顯示名稱": ownerName, "角色": "owner" }
      });
      const nextTrips = trips.map((trip) => trip.id === originalTrip.id ? cloudTrip : trip);
      setTrips(nextTrips);
      setActiveTripId(cloudTripId);
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(nextTrips)).catch(() => undefined);
      const nextExpenses = { ...expenses, [cloudTripId]: tripExpenses };
      delete nextExpenses[originalTrip.id];
      setExpenses(nextExpenses);
      AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(nextExpenses)).catch(() => undefined);
      saveCloudLinks({ ...cloudLinksRef.current, [cloudTripId]: { inviteCode, memberName: ownerName, memberId, role: "owner" } });
      await syncTripNow(cloudTrip, tripExpenses);
      setCloudPanelVisible(true);
    } catch (error: any) {
      setSyncStatus("error");
      Alert.alert("目前無法開啟同步", error?.message || "請確認網路後再試一次。");
    }
  };

  const showCloudInfo = () => {
    setCloudPanelVisible(true);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 2400);
  };

  const handleGoogleCredential = async (credential: string) => {
    try {
      const payload = JSON.parse(decodeURIComponent(Array.prototype.map.call(atob(credential.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")), (char: string) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
      const user: GoogleUser = { sub: String(payload.sub), name: String(payload.name || payload.email || "Google 使用者"), email: String(payload.email || ""), picture: payload.picture, idToken: credential };
      setGoogleUser(user);
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user)).catch(() => undefined);
      const linkedTrips = Object.entries(cloudLinksRef.current);
      await Promise.all(linkedTrips.map(([tripId, link]) => postCloud({
        action: "joinTrip", tripId, inviteCode: link.inviteCode, idToken: credential,
        member: { "成員ID": `google:${user.sub}`, "顯示名稱": user.name, "角色": link.role || "member" }
      }).catch(() => undefined)));
      setCloudMembers((current) => {
        const next = { ...current };
        linkedTrips.forEach(([tripId]) => { next[tripId] = [...new Set([...(next[tripId] || []).filter((name) => name !== "我"), user.name])]; });
        return next;
      });
      const response = await fetch(`${SYNC_URL}?action=myTrips&idToken=${encodeURIComponent(credential)}&t=${Date.now()}`);
      const result = await response.json();
      if (result.ok && Array.isArray(result.data)) {
        const restored = result.data.map((data: any) => ({ ...cloudToTrip(data), cloud: data }));
        const visibleTrips = restored.length ? restored.map(({ trip }: { trip: TripPlan }) => trip) : starterTrips;
        const visibleExpenses: Record<string, Expense[]> = {};
        restored.forEach(({ trip, expenses: restoredTripExpenses }: { trip: TripPlan; expenses: Expense[] }) => { visibleExpenses[trip.id] = restoredTripExpenses; });
        setTrips(visibleTrips);
        setActiveTripId(visibleTrips[0]!.id);
        setSelectedDayId(visibleTrips[0]!.days[0]?.id ?? "");
        setExpenses(visibleExpenses);
        const nextLinks: CloudLinks = {};
        restored.forEach(({ trip, cloud }: { trip: TripPlan; cloud: any }) => {
          const existing = cloudLinksRef.current[trip.id];
          const myMember = (cloud.members || []).find((row: any) => String(row["成員ID"]) === `google:${user.sub}`);
          nextLinks[trip.id] = {
            ...existing,
            inviteCode: existing?.inviteCode || "",
            memberName: existing?.memberName || user.name,
            memberId: `google:${user.sub}`,
            role: myMember?.["角色"] === "owner" ? "owner" : "member"
          };
        });
        saveCloudLinks(nextLinks);
      }
    } catch {
      Alert.alert("Google 登入失敗", "請重新選擇帳號。");
    }
  };

  const signOutGoogle = () => {
    setGoogleUser(null);
    setTrips(starterTrips);
    setActiveTripId(starterTrips[0]!.id);
    setSelectedDayId(starterTrips[0]!.days[0]?.id ?? "");
    setExpenses({});
    setCloudMembers({});
    saveCloudLinks({});
    AsyncStorage.removeItem(AUTH_KEY).catch(() => undefined);
    if (Platform.OS === "web") (globalThis as any).google?.accounts?.id?.disableAutoSelect?.();
  };

  const addTripMember = async () => {
    const name = memberDraft.trim();
    const link = cloudLinksRef.current[activeTrip.id];
    if (!name || !link) return;
    setSyncStatus("syncing");
    try {
      const data = await postCloud({
        action: "joinTrip", tripId: activeTrip.id, inviteCode: link.inviteCode,
        member: { "成員ID": `member-${Date.now()}`, "顯示名稱": name, "角色": "member" }
      });
      const memberNames = (data.members || []).map((row: any) => String(row["顯示名稱"] || "")).filter((memberName: string) => memberName && memberName !== "我");
      setCloudMembers((current) => ({ ...current, [activeTrip.id]: [...new Set(memberNames)] as string[] }));
      setMemberDraft("");
      setSyncStatus("synced");
      showToast(`${name} 已加入成員名單`);
    } catch (error: any) {
      setSyncStatus("error");
      showToast(`儲存失敗：${error?.message || "請稍後再試"}`);
      Alert.alert("無法新增成員", error?.message || "請稍後再試。");
    }
  };

  const saveMyMemberName = async () => {
    const name = myNameDraft.trim();
    const link = cloudLinksRef.current[activeTrip.id];
    if (!name || !link) return;
    const memberId = link.memberId || `member-${Date.now()}`;
    setSyncStatus("syncing");
    try {
      const data = await postCloud({
        action: "joinTrip", tripId: activeTrip.id, inviteCode: link.inviteCode,
        member: { "成員ID": memberId, "顯示名稱": name, "角色": "member" }
      });
      saveCloudLinks({ ...cloudLinksRef.current, [activeTrip.id]: { ...link, memberName: name, memberId } });
      const names = (data.members || []).map((row: any) => String(row["顯示名稱"] || "")).filter((memberName: string) => memberName && memberName !== "我");
      setCloudMembers((current) => ({ ...current, [activeTrip.id]: [...new Set(names)] as string[] }));
      setSyncStatus("synced");
      setMyNameDraft("");
      showToast(`名稱已儲存：${name}`);
    } catch (error: any) {
      setSyncStatus("error");
      showToast(`儲存失敗：${error?.message || "請稍後再試"}`);
      Alert.alert("無法儲存名稱", error?.message || "請稍後再試。");
    }
  };

  const importBulkItinerary = () => {
    const lines = bulkItineraryText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    let dayIndex = Math.max(0, activeTrip.days.findIndex((day) => day.id === selectedDay.id));
    const nextDays = activeTrip.days.map((day) => ({ ...day, stops: [...day.stops] }));
    let added = 0;
    lines.forEach((line) => {
      const dayMatch = line.match(/^(?:DAY|第)\s*(\d+)/i);
      if (dayMatch && !/[|\t,，]/.test(line)) {
        dayIndex = Math.min(nextDays.length - 1, Math.max(0, Number(dayMatch[1]) - 1));
        return;
      }
      const parts = line.split(/\t|\s*\|\s*/).map((part) => part.trim());
      if (parts.length < 2) return;
      const time = parts[0] || "彈性";
      const title = parts[1] || "";
      const address = parts[2] || "地址待補";
      const transport = parts[3] || "尚未安排";
      const note = parts[4] || "";
      if (!title || /^(時間|time)$/i.test(time)) return;
      nextDays[dayIndex]!.stops.push({
        id: `${nextDays[dayIndex]!.id}-bulk-${Date.now()}-${added}`,
        time: time || "彈性", title, address, transport, note,
        transportMode: transport.includes("步行") ? "步行" : transport.includes("地鐵") ? "地鐵" : transport.includes("公車") ? "公車" : transport.includes("計程車") ? "計程車" : "其他",
        routeMode: transport.includes("步行") ? "walking" : transport.includes("地鐵") || transport.includes("公車") ? "transit" : transport.includes("計程車") ? "taxi" : "driving"
      });
      added += 1;
    });
    if (!added) {
      Alert.alert("沒有讀到景點", "請使用：時間｜景點｜地址｜交通｜備註；不同天可用 DAY 1、DAY 2 分隔。");
      return;
    }
    persistTrips(trips.map((trip) => trip.id === activeTrip.id ? { ...trip, days: nextDays } : trip));
    setBulkItineraryText("");
    setBulkImportVisible(false);
    setAddingStop(false);
    Alert.alert("匯入完成", `已加入 ${added} 個景點。`);
  };

  const deleteTrip = (trip: TripPlan) => {
    const link = cloudLinksRef.current[trip.id];
    if (link && link.role !== "owner") {
      Alert.alert("只有建立者能刪除旅行", "旅伴只能退出自己的成員資格，不會刪除整趟行程。");
      return;
    }
    if (trips.length === 1) {
      Alert.alert("至少保留一趟旅行", "請先建立另一趟旅行再刪除。");
      return;
    }
    setDeletingTrip(trip);
  };

  const confirmDeleteTrip = () => {
    if (!deletingTrip) return;
    const next = trips.filter((item) => item.id !== deletingTrip.id);
    persistTrips(next);
    if (activeTrip.id === deletingTrip.id) {
      setActiveTripId(next[0]!.id);
      setSelectedDayId(next[0]!.days[0]?.id ?? "");
    }
    setDeletingTrip(null);
  };

  const leaveTrip = async (trip: TripPlan) => {
    const link = cloudLinksRef.current[trip.id];
    if (!link?.inviteCode || !link.memberId) {
      Alert.alert("無法退出", "這台裝置缺少同步身分，請先重新輸入邀請碼恢復連線。");
      return;
    }
    setSyncStatus("syncing");
    try {
      await postCloud({
        action: "leaveTrip",
        tripId: trip.id,
        inviteCode: link.inviteCode,
        memberId: link.memberId
      });
      const remaining = trips.filter((item) => item.id !== trip.id);
      const nextTrips = remaining.length ? remaining : starterTrips;
      persistTrips(nextTrips);
      const nextLinks = { ...cloudLinksRef.current };
      delete nextLinks[trip.id];
      saveCloudLinks(nextLinks);
      setExpenses((current) => {
        const next = { ...current };
        delete next[trip.id];
        AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setActiveTripId(nextTrips[0]!.id);
      setSelectedDayId(nextTrips[0]!.days[0]?.id ?? "");
      setSyncStatus("synced");
      setLeavingTrip(null);
      showToast(`已退出「${trip.title}」`);
    } catch (error: any) {
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "退出旅行失敗。");
      Alert.alert("無法退出旅行", error?.message || "請稍後再試。");
    }
  };

  const confirmLeaveTrip = (trip: TripPlan) => {
    setLeavingTrip(trip);
  };

  const createTrip = async () => {
    const destination = newDestination.trim();
    if (!destination) {
      Alert.alert("請填寫目的地", "例如：沖繩、東京、濟州島");
      return;
    }
    const count = Math.min(14, Math.max(1, Number.parseInt(newDayCount, 10) || 1));
    const id = `trip-${Date.now()}`;
    const trip: TripPlan = {
      id,
      title: newTripName.trim() || `${destination}旅行`,
      destination,
      period: newPeriod.trim() || "日期未定",
      travelers: Math.min(20, Math.max(1, Number.parseInt(newTravelers, 10) || 1)),
      flights: [],
      accommodations: [],
      shopping: [],
      days: Array.from({ length: count }, (_, index) => ({
        id: `${id}-day-${index + 1}`,
        label: `DAY ${index + 1}`,
        date: `第 ${index + 1} 天`,
        title: `${destination}・自由安排`,
        stops: []
      }))
    };
    const next = [...trips, trip];
    persistTrips(next);
    selectTrip(trip);
    setCreatingTrip(false);
    setNewTripName("");
    setNewDestination("");
    setNewPeriod("");
    setNewDayCount("5");
    setNewTravelers("2");
    const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
    setSyncStatus("syncing");
    try {
      await postCloud({
        action: "createTrip", inviteCode, idToken: googleUser?.idToken || "",
        trip: { "旅行ID": trip.id, "名稱": trip.title, "目的地": trip.destination, "開始日期": trip.period, "主要幣別": "TWD" },
        member: { "成員ID": googleUser ? `google:${googleUser.sub}` : `member-${Date.now()}`, "顯示名稱": googleUser?.name || "我", "角色": "owner" }
      });
      saveCloudLinks({ ...cloudLinksRef.current, [trip.id]: { inviteCode, memberName: googleUser?.name || "我", memberId: googleUser ? `google:${googleUser.sub}` : undefined, role: "owner" } });
      await syncTripNow(trip, []);
      Alert.alert("旅行已建立並同步", `旅行 ID：${trip.id}\n邀請碼：${inviteCode}\n\n把這兩項傳給旅伴即可加入。`);
    } catch {
      setSyncStatus("error");
      Alert.alert("旅行已存於本機", "目前無法連上雲端，稍後可再嘗試同步。");
    }
  };

  const joinCloudTrip = async () => {
    const tripId = joinTripId.trim();
    const inviteCode = joinInviteCode.trim();
    if (!tripId || !inviteCode) {
      setJoinError("請填寫旅行 ID 與六位數邀請碼。");
      Alert.alert("請填寫旅行 ID 與邀請碼");
      showToast("請填寫旅行 ID 與六位數邀請碼");
      return;
    }
    if (!joinMemberName.trim()) {
      setJoinError("請填寫這趟旅行顯示的成員名稱。");
      Alert.alert("請填寫這趟旅行顯示的成員名稱");
      showToast("請先填寫成員名稱");
      return;
    }
    setJoinError("");
    setSyncStatus("syncing");
    try {
      const data = await postCloud({
        action: "joinTrip", tripId, inviteCode,
        member: { "成員ID": googleUser ? `google:${googleUser.sub}` : `member-${Date.now()}`, "顯示名稱": joinMemberName.trim(), "角色": "member" }
      });
      const myMemberId = googleUser ? `google:${googleUser.sub}` : undefined;
      const myMember = (data.members || []).find((row: any) => myMemberId && String(row["成員ID"]) === myMemberId);
      const joinedRole: CloudLink["role"] = myMember?.["角色"] === "owner" ? "owner" : "member";
      saveCloudLinks({ ...cloudLinksRef.current, [tripId]: { inviteCode, memberName: joinMemberName.trim(), memberId: myMemberId, role: joinedRole } });
      const converted = cloudToTrip(data);
      const memberNames = (data.members || []).map((row: any) => String(row["顯示名稱"] || "")).filter((name: string) => name && name !== "我");
      setCloudMembers((current) => ({ ...current, [tripId]: [...new Set(memberNames)] as string[] }));
      setTrips((current) => {
        const next = current.some((trip) => trip.id === tripId)
          ? current.map((trip) => trip.id === tripId ? converted.trip : trip)
          : [...current.filter((trip) => trip.id !== "local-welcome"), converted.trip];
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setExpenses((current) => {
        const next = { ...current, [tripId]: converted.expenses };
        AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      selectTrip(converted.trip);
      setSyncStatus("synced");
      setJoiningTrip(false);
      setJoinTripId(""); setJoinInviteCode(""); setJoinMemberName("");
      showToast(`已加入「${converted.trip.title}」，現在會與旅伴同步`);
    } catch (error: any) {
      setSyncStatus("error");
      const message = error?.message || "請確認旅行 ID 與邀請碼";
      setJoinError(message);
      showToast(`加入失敗：${message}`);
      Alert.alert("無法加入旅行", error?.message || "請確認旅行 ID 與邀請碼");
    }
  };

  const createStop = () => {
    const title = newStopTitle.trim();
    if (!title) {
      Alert.alert("請填寫景點名稱");
      return;
    }
    const transport = newStopTransport.trim() || "尚未安排";
    const transportMode: Stop["transportMode"] =
      transport.includes("步行") ? "步行" :
      transport.includes("計程車") ? "計程車" :
      transport.includes("公車") ? "公車" :
      transport.includes("地鐵") ? "地鐵" :
      transport.includes("飛機") ? "飛機" : "其他";
    updateStops([...selectedDay.stops, {
      id: `${selectedDay.id}-stop-${Date.now()}`,
      time: newStopTime.trim() || "彈性",
      title,
      address: newStopAddress.trim() || "地址待補",
      transport,
      transportMode,
      note: newStopNote.trim(),
      durationMinutes: Math.max(0, Number.parseInt(newStopDuration, 10) || 0),
      routeMode: transport.includes("步行") ? "walking" : "driving"
    }]);
    setAddingStop(false);
    setNewStopTitle("");
    setNewStopTime("");
    setNewStopAddress("");
    setNewStopTransport("");
    setNewStopNote("");
    setNewStopDuration("");
  };

  const tripExpenses = expenses[activeTrip.id] ?? [];
  const localMemberAlias = cloudLinks[activeTrip.id]?.memberName;
  const myDisplayName = localMemberAlias || googleUser?.name;
  const activeMemberNames = [...new Set([
    myDisplayName,
    ...(cloudMembers[activeTrip.id] || [])
  ].filter((name): name is string => !!name && name !== "我"))];
  const expenseMemberNames = activeMemberNames;
  const openExpenseModal = () => {
    setExpensePayer(expenseMemberNames[0] || "");
    setAddingExpense(true);
  };
  const currencyTotals = tripExpenses.reduce<Record<string, number>>((totals, item) => {
    const currency = item.currency || "KRW";
    totals[currency] = (totals[currency] ?? 0) + item.amount;
    return totals;
  }, {});
  const payerTotals = Object.entries(tripExpenses.reduce<Record<string, Record<string, number>>>((totals, item) => {
    const currency = item.currency || "KRW";
    totals[item.payer] ??= {};
    totals[item.payer]![currency] = (totals[item.payer]![currency] ?? 0) + item.amount;
    return totals;
  }, {}));
  const saveExpenses = (next: typeof expenses) => {
    localMutationAtRef.current = Date.now();
    setExpenses(next);
    AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
    syncExpensesNow(activeTrip, next[activeTrip.id] ?? []);
  };
  const createExpense = () => {
    const amount = Number(expenseAmount.replace(/,/g, ""));
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert("請填寫品項與正確金額");
      return;
    }
    if (!expensePayer.trim()) {
      Alert.alert("請先選擇付款成員");
      return;
    }
    saveExpenses({
      ...expenses,
      [activeTrip.id]: [...tripExpenses, { id: `expense-${Date.now()}`, title: expenseTitle.trim(), amount, payer: expensePayer.trim(), currency: expenseCurrency }]
    });
    setExpenseTitle("");
    setExpenseAmount("");
    setExpensePayer("");
    setAddingExpense(false);
  };
  const deleteExpense = (id: string) => {
    saveExpenses({ ...expenses, [activeTrip.id]: tripExpenses.filter((item) => item.id !== id) });
  };

  const resetFlightForm = () => {
    setAddingFlight(false);
    setEditingFlightId(null);
    setFlightRoute("");
    setFlightNumber("");
    setFlightDeparture("");
    setFlightArrival("");
    setFlightTerminal("");
    setFlightNote("");
  };

  const openNewFlight = () => {
    resetFlightForm();
    setAddingFlight(true);
  };

  const openEditFlight = (flight: FlightInfo) => {
    setEditingFlightId(flight.id);
    setFlightRoute(flight.route);
    setFlightNumber(flight.flightNumber);
    setFlightDeparture(flight.departure);
    setFlightArrival(flight.arrival);
    setFlightTerminal(flight.terminal || "");
    setFlightNote(flight.note || "");
    setAddingFlight(true);
  };

  const saveFlight = () => {
    if (!flightRoute.trim() || !flightDeparture.trim() || !flightArrival.trim()) {
      Alert.alert("請填寫航線、出發與抵達時間");
      return;
    }
    const flight: FlightInfo = {
      id: editingFlightId || `flight-${Date.now()}`,
      route: flightRoute.trim(),
      flightNumber: flightNumber.trim() || "航班號碼待補",
      departure: flightDeparture.trim(),
      arrival: flightArrival.trim(),
      terminal: flightTerminal.trim(),
      note: flightNote.trim()
    };
    updateActiveTrip({
      flights: editingFlightId
        ? activeTrip.flights.map((item) => item.id === editingFlightId ? flight : item)
        : [...activeTrip.flights, flight]
    });
    showToast(editingFlightId ? "航班資訊已更新" : "航班已新增");
    resetFlightForm();
  };

  const deleteFlight = (id: string) => {
    updateActiveTrip({ flights: activeTrip.flights.filter((flight) => flight.id !== id) });
  };

  const addTripDay = () => {
    const dayNumber = activeTrip.days.length + 1;
    const day: TripDay = {
      id: `${activeTrip.id}-day-${Date.now()}`,
      label: `DAY ${dayNumber}`,
      date: `第 ${dayNumber} 天`,
      title: `${activeTrip.destination || "旅行"}・自由安排`,
      stops: []
    };
    updateActiveTrip({ days: [...activeTrip.days, day] });
    selectDay(day.id);
    showToast(`已新增 DAY ${dayNumber}`);
  };

  const createAccommodation = () => {
    if (!hotelName.trim() || !hotelPeriod.trim()) {
      Alert.alert("請填寫住宿名稱與入住日期");
      return;
    }
    updateActiveTrip({ accommodations: [...activeTrip.accommodations, {
      id: `hotel-${Date.now()}`, name: hotelName.trim(), period: hotelPeriod.trim(),
      address: hotelAddress.trim(), checkIn: hotelCheckIn.trim(), checkOut: hotelCheckOut.trim(),
      facilities: hotelFacilities.trim(), frontDesk: hotelFrontDesk.trim(), note: hotelNote.trim()
    }] });
    setAddingAccommodation(false);
    setHotelName(""); setHotelPeriod(""); setHotelAddress(""); setHotelCheckIn(""); setHotelCheckOut("");
    setHotelFacilities(""); setHotelFrontDesk(""); setHotelNote("");
  };

  const deleteAccommodation = (id: string) => {
    updateActiveTrip({ accommodations: activeTrip.accommodations.filter((hotel) => hotel.id !== id) });
  };

  const createShoppingItem = () => {
    if (!shoppingName.trim()) {
      Alert.alert("請填寫商品名稱");
      return;
    }
    updateActiveTrip({ shopping: [...activeTrip.shopping, {
      id: `shopping-${Date.now()}`, name: shoppingName.trim(), price: shoppingPrice.trim(),
      currency: shoppingCurrency, category: shoppingCategory.trim(), imageUrl: shoppingImageUrl.trim()
    }] });
    setAddingShoppingItem(false);
    setShoppingName(""); setShoppingPrice(""); setShoppingCurrency("KRW"); setShoppingCategory(""); setShoppingImageUrl("");
  };

  const deleteShoppingItem = (id: string) => {
    updateActiveTrip({ shopping: activeTrip.shopping.filter((item) => item.id !== id) });
  };

  const toggleShoppingItem = (id: string) => {
    updateActiveTrip({
      shopping: activeTrip.shopping.map((item) => item.id === id ? { ...item, purchased: !item.purchased } : item)
    });
  };

  const toggleCatalogPurchase = (catalogItem: (typeof shoppingItems)[number]) => {
    const existing = activeTrip.shopping.find((item) => item.name === catalogItem.name);
    if (existing) {
      toggleShoppingItem(existing.id);
      return;
    }
    updateActiveTrip({ shopping: [...activeTrip.shopping, {
      id: `shopping-${Date.now()}`, name: catalogItem.name, price: catalogItem.price, currency: "KRW",
      category: catalogItem.category, imageUrl: catalogItem.imageUrl, purchased: true
    }] });
  };

  const weatherLabel = (code: number) =>
    code === 0 ? "晴朗" : code <= 3 ? "多雲" : code <= 48 ? "有霧" : code <= 67 ? "下雨" : code <= 77 ? "下雪" : code <= 82 ? "陣雨" : code <= 86 ? "陣雪" : "雷雨";
  const weatherIcon = (code: number) =>
    code === 0 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "❄️" : code <= 82 ? "🌦️" : "⛈️";

  const currencyForTrip = /日本|沖繩|東京|大阪|京都|北海道|福岡|Japan|日本/.test(activeTrip.destination)
    ? { code: "JPY", symbol: "¥", rate: 0.22 }
    : { code: "KRW", symbol: "₩", rate: 0.022 };

  const toolboxSubtitle = (title: string, fallback: string) => {
    if (title === "班機") return activeTrip.flights.length ? `${activeTrip.flights.length} 段航班` : "尚未新增航班";
    if (title === "住宿") return activeTrip.accommodations.length ? `${activeTrip.accommodations.length} 筆住宿` : "尚未新增住宿";
    if (title === "天氣") return `查看 ${activeTrip.destination} 即時天氣`;
    if (title === "匯率") return `${currencyForTrip.code} → TWD 快速換算`;
    if (title === "必買商品") return isKoreaTrip ? "韓國採買清單" : `${activeTrip.destination} 尚未建立清單`;
    return fallback;
  };

  const renderStop = ({ item, drag, isActive, getIndex }: RenderItemParams<Stop>) => {
    const index = getIndex() ?? 0;
    const nextStop = selectedDay.stops[index + 1];
    const legMode: RouteMode = item.routeMode || (item.transport.includes("步行") ? "walking" : item.transport.includes("地鐵") || item.transport.includes("公車") ? "transit" : item.transport.includes("計程車") ? "taxi" : "driving");
    const legMinutes = nextStop ? estimatedLegMinutes(item, nextStop, legMode) : null;
    return (
      <View style={[styles.stopWrap, isActive && styles.dragging]}>
        <View style={styles.timeline}>
          <View style={styles.numberDot}><Text style={styles.numberText}>{index + 1}</Text></View>
          {index < selectedDay.stops.length - 1 && <View style={styles.timelineLine} />}
        </View>
        <Pressable
          onLongPress={drag}
          delayLongPress={180}
          style={styles.stopCard}
          onPress={() => { setEditing(item); setDraftNote(item.note); setDraftOpeningHours(item.openingHours || ""); setDraftDuration(String(item.durationMinutes || "")); }}
        >
          <View style={styles.stopTop}>
            <View style={styles.timePill}><Text style={styles.timeText}>{item.time || "彈性"}</Text></View>
            {Platform.OS === "web" ? (
              <View style={styles.webReorder}>
                <Pressable onPress={() => moveStop(index, -1)} disabled={index === 0} style={styles.reorderButton}><Text style={[styles.reorderText, index === 0 && styles.reorderDisabled]}>↑</Text></Pressable>
                <Pressable onPress={() => moveStop(index, 1)} disabled={index === selectedDay.stops.length - 1} style={styles.reorderButton}><Text style={[styles.reorderText, index === selectedDay.stops.length - 1 && styles.reorderDisabled]}>↓</Text></Pressable>
              </View>
            ) : <Text style={styles.dragHint}>長按拖曳  ≡</Text>}
          </View>
          <Text style={styles.stopTitle}>{stopDisplayTitle(item)}</Text>
          <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
          <View style={styles.transportRow}>
            <Text style={styles.transportIcon}>{transportIcon(item.transportMode)}</Text>
            <View>
              <Text style={styles.transportLabel}>原行程安排的交通</Text>
              <Text style={styles.transportText}>{item.transport || "尚未安排"}</Text>
            </View>
          </View>
          {nextStop && (
            <View style={styles.legRouteBox}>
              <Text style={styles.legRouteLabel}>這一段要怎麼走？</Text>
              <Text style={styles.legEstimate}>{legMinutes ? `預估約 ${legMinutes} 分鐘・選擇後更新下一站時間` : "確認座標後顯示預計時間"}</Text>
              <View style={styles.legRouteActions}>
                <Pressable onPress={() => setLegRouteMode(item.id, "driving")} style={[styles.legModeButton, legMode === "driving" && styles.legModeButtonActive]}>
                  <Text style={[styles.legModeText, legMode === "driving" && styles.legModeTextActive]}>🚗 開車</Text>
                </Pressable>
                <Pressable onPress={() => setLegRouteMode(item.id, "walking")} style={[styles.legModeButton, legMode === "walking" && styles.legModeButtonActive]}>
                  <Text style={[styles.legModeText, legMode === "walking" && styles.legModeTextActive]}>🚶 步行</Text>
                </Pressable>
                <Pressable onPress={() => setLegRouteMode(item.id, "transit")} style={[styles.legModeButton, legMode === "transit" && styles.legModeButtonActive]}>
                  <Text style={[styles.legModeText, legMode === "transit" && styles.legModeTextActive]}>🚇 大眾運輸</Text>
                </Pressable>
                <Pressable onPress={() => setLegRouteMode(item.id, "taxi")} style={[styles.legModeButton, legMode === "taxi" && styles.legModeButtonActive]}>
                  <Text style={[styles.legModeText, legMode === "taxi" && styles.legModeTextActive]}>🚕 計程車</Text>
                </Pressable>
                <Pressable style={styles.fastRouteButton} onPress={() => openGoogleRoute(item, nextStop, legMode)}>
                  <Text style={styles.fastRouteButtonText}>最快路線 ↗</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Text style={styles.openingHours}>營業時間｜{item.openingHours || "尚未查證"}</Text>
          {!!item.durationMinutes && <Text style={styles.openingHours}>停留時間｜約 {item.durationMinutes} 分鐘</Text>}
          {!!item.note && <Text style={styles.note} numberOfLines={2}>備註｜{item.note}</Text>}
          <View style={styles.cardBottom}>
            {item.pass ? <Text style={styles.pass}>{item.pass}</Text> : <View />}
            <View style={styles.mapActions}>
              <Pressable onPress={() => openDirections(item, "google")} style={styles.mapButton}>
                <Text style={styles.googleMapLink}>Google Maps ↗</Text>
              </Pressable>
              {isKoreaTrip && (
                <Pressable onPress={() => openDirections(item, "naver")} style={[styles.mapButton, styles.naverButton]}>
                  <Text style={styles.naverMapLink}>Naver Map ↗</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  if (!authReady) {
    return (
      <SafeAreaView style={[styles.safe, styles.authGate]}>
        <Text style={styles.authLogo}>豆遊</Text>
        <Text style={styles.authLoading}>正在確認登入狀態……</Text>
      </SafeAreaView>
    );
  }

  if (!googleUser) {
    return (
      <SafeAreaView style={[styles.safe, styles.authGate]}>
        <View style={styles.authCard}>
          <Image source={require("./assets/douyou-icon.png")} style={styles.authAppIcon} />
          <Text style={styles.authEyebrow}>DOUYOU TRIP</Text>
          <Text style={styles.authTitle}>登入豆遊</Text>
          <Text style={styles.authDescription}>請先登入 Google 帳號。登入後只會顯示這個帳號建立或已加入的旅行。</Text>
          <GoogleSignInButton onCredential={handleGoogleCredential} />
          <Text style={styles.authPrivacy}>旅行資料不會在登入前顯示。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === "web" && styles.webViewport]}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {!!toastMessage && <View style={styles.toast}><Text style={styles.toastText}>✓ {toastMessage}</Text></View>}
        {tab === "itinerary" && (
          <>
            <LinearGradient colors={["#F6EBDD", "#F7F3EC"]} style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.eyebrow}>{activeTrip.destination.toUpperCase()} · MY TRIP</Text>
                  <Text style={styles.mainTitle}>{activeTrip.title}</Text>
                </View>
                <View style={styles.headerBadges}>
                  <Pressable hitSlop={12} style={[styles.syncBadge, syncStatus === "local" && styles.syncBadgeLocal]} onPress={showCloudInfo}>
                    <Text style={styles.syncBadgeText}>{syncStatus === "syncing" ? "☁ 同步中" : syncStatus === "synced" ? "☁ 已同步" : syncStatus === "error" ? "☁ 待重試" : "☁ 開啟同步"}</Text>
                  </Pressable>
                  <Pressable style={styles.tripBadge} onPress={() => { setTravelerDraft(String(activeTrip.travelers)); setEditingTravelers(true); }}>
                    <Text style={styles.tripBadgeIcon}>✦</Text>
                    <Text style={styles.tripBadgeText}>{activeTrip.travelers} 人同行</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.subtitle}>所有行程、交通與預約，集中在一個地方。</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
                {days.map((day) => (
                  <Pressable key={day.id} onPress={() => selectDay(day.id)}
                    style={[styles.dayTab, day.id === selectedDay.id && styles.dayTabActive]}>
                    <Text style={[styles.dayLabel, day.id === selectedDay.id && styles.dayLabelActive]}>{day.label}</Text>
                    <Text style={[styles.dayDate, day.id === selectedDay.id && styles.dayDateActive]}>{day.date.slice(0,5)}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={addTripDay} style={[styles.dayTab, styles.addDayTab]}>
                  <Text style={styles.addDayPlus}>＋</Text>
                  <Text style={styles.addDayText}>新增一天</Text>
                </Pressable>
              </ScrollView>
            </LinearGradient>

            <View style={styles.itineraryListHost}>
              <DraggableFlatList
                ref={itineraryListRef}
                style={styles.itineraryList}
                containerStyle={styles.itineraryList}
                data={selectedDay.stops}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => updateStops(data)}
                renderItem={renderStop}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                <View style={styles.emptyItinerary}>
                  <Text style={styles.emptyItineraryIcon}>⌖</Text>
                  <Text style={styles.emptyItineraryTitle}>這一天還沒有行程</Text>
                  <Text style={styles.emptyItineraryText}>先加入第一個景點，之後就能拖曳排序。</Text>
                  <Pressable style={styles.emptyAddButton} onPress={() => setAddingStop(true)}>
                    <Text style={styles.emptyAddButtonText}>＋ 新增景點</Text>
                  </Pressable>
                </View>
                }
                ListHeaderComponent={
                <>
                  <View style={styles.dayHeading}>
                    <View style={styles.dayHeadingText}>
                      <Text style={styles.dayHeadingDate}>{selectedDay.date}</Text>
                      <Text style={styles.dayHeadingTitle}>{selectedDay.title}</Text>
                    </View>
                    <View style={styles.dayHeadingActions}>
                      <Text style={styles.dayCount}>{selectedDay.stops.length} 個安排</Text>
                      <Pressable style={styles.smallAddButton} onPress={() => setAddingStop(true)}>
                        <Text style={styles.smallAddButtonText}>＋</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.mapCard}>
                    <RouteMap stops={routeStops} dayId={selectedDay.id} />
                    <View style={styles.mapFooter}>
                      <Text style={styles.mapFooterTitle}>今日移動路線</Text>
                      <Text style={styles.mapFooterText}>地圖可拖曳、放大與縮小；每一段可在下方景點卡片分別選擇開車或步行。</Text>
                      <Text style={styles.smartSortLabel}>一鍵排行程</Text>
                      <View style={styles.smartSortRow}>
                        <Pressable onPress={sortByOpeningHours} style={styles.smartSortButton}>
                          <Text style={styles.smartSortText}>🕒 依營業時間</Text>
                        </Pressable>
                        <Pressable onPress={sortByShortestRoute} style={styles.smartSortButton}>
                          <Text style={styles.smartSortText}>↗ 依最短動線</Text>
                        </Pressable>
                        {previousStops && (
                          <Pressable onPress={undoSmartSort} style={styles.undoSortButton}>
                            <Text style={styles.undoSortText}>復原</Text>
                          </Pressable>
                        )}
                      </View>
                      <Text style={styles.smartSortHint}>營業時間只採用網路查證資料；未查到的景點會保留並排在後面。</Text>
                    </View>
                  </View>
                  <View style={styles.dragBanner}>
                    <Text>☝️</Text>
                    <Text style={styles.dragBannerText}>長按卡片並拖曳，即可調整行程順序</Text>
                  </View>
                </>
                }
              />
            </View>
          </>
        )}

        {tab === "toolbox" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <Text style={styles.eyebrow}>TRIP ESSENTIALS</Text>
            <Text style={styles.pageTitle}>旅行工具箱</Text>
            <Text style={styles.pageSubtitle}>訂單、天氣與採買清單都放在同一處。</Text>
            {toolboxItems.map((item) => (
              <Pressable key={item.title} style={styles.toolCard} onPress={() => setSelectedTool(item.title)}>
                <View style={[styles.toolIcon, { backgroundColor: item.tint }]}><Text style={styles.toolEmoji}>{item.icon}</Text></View>
                <View style={styles.toolText}><Text style={styles.toolTitle}>{item.title}</Text><Text style={styles.toolSub}>{toolboxSubtitle(item.title, item.subtitle)}</Text></View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {tab === "home" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.homeContent}>
            <View style={styles.homeHeader}>
              <View>
                <Text style={styles.eyebrow}>MY JOURNEYS</Text>
                <Text style={styles.pageTitle}>我的旅行</Text>
                <Text style={styles.pageSubtitle}>每次出發，都從這裡開始。</Text>
              </View>
              <View style={styles.homeHeaderActions}>
                <Pressable style={styles.joinTripButton} onPress={() => { setJoinError(""); setJoinMemberName(googleUser?.name || ""); setJoiningTrip(true); }}>
                  <Text style={styles.joinTripButtonText}>加入旅行</Text>
                </Pressable>
                <Pressable style={styles.addTripButton} onPress={() => setCreatingTrip(true)}>
                  <Text style={styles.addTripPlus}>＋</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.accountCard}>
              {googleUser ? (
                <>
                  <View style={styles.accountIdentity}>
                    {googleUser.picture ? <Image source={{ uri: googleUser.picture }} style={styles.accountAvatar} /> : <View style={styles.accountAvatarFallback}><Text>●</Text></View>}
                    <View style={styles.accountText}><Text style={styles.accountName}>{googleUser.name}</Text><Text style={styles.accountEmail}>{googleUser.email}</Text></View>
                    <Pressable onPress={signOutGoogle}><Text style={styles.signOutText}>登出</Text></Pressable>
                  </View>
                  <Text style={styles.accountHint}>同一 Google 帳號在手機與電腦會被辨識為同一位成員。</Text>
                </>
              ) : (
                <>
                  <Text style={styles.accountTitle}>使用 Google 帳號登入</Text>
                  <Text style={styles.accountHint}>跨裝置辨識同一人，並保留旅行成員身分。</Text>
                  <GoogleSignInButton onCredential={handleGoogleCredential} />
                </>
              )}
            </View>
            {trips.map((trip, index) => (
              <Pressable key={trip.id} style={styles.tripCard} onPress={() => selectTrip(trip)}>
                <LinearGradient
                  colors={index % 2 === 0 ? ["#244C43", "#4E7467"] : ["#9B6248", "#D49772"]}
                  style={styles.tripCardCover}
                >
                  <Text style={styles.tripCardIndex}>TRIP {String(index + 1).padStart(2, "0")}</Text>
                  <Text style={styles.tripCardDestination}>{trip.destination}</Text>
                  <Text style={styles.tripCardPeriod}>{trip.period}</Text>
                  <View style={styles.tripCardMeta}>
                    <Text style={styles.tripCardMetaText}>{trip.days.length} 天</Text>
                    <Text style={styles.tripCardMetaDot}>·</Text>
                    <Text style={styles.tripCardMetaText}>{trip.travelers} 人同行</Text>
                  </View>
                </LinearGradient>
                <View style={styles.tripCardBottom}>
                  <View>
                    <Text style={styles.tripCardName}>{trip.title}</Text>
                    <Text style={styles.tripCardStatus}>{cloudLinks[trip.id] ? "☁ 已連接旅伴同步" : trip.id === activeTrip.id ? "目前開啟中" : "點擊查看行程"}</Text>
                  </View>
                  <View style={styles.tripCardActions}>
                    <Pressable
                      accessibilityLabel={`刪除 ${trip.title}`}
                      style={styles.deleteTripButton}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        if (cloudLinks[trip.id] && cloudLinks[trip.id]?.role !== "owner") confirmLeaveTrip(trip);
                        else deleteTrip(trip);
                      }}
                    >
                      <Text style={styles.deleteTripText}>{cloudLinks[trip.id] && cloudLinks[trip.id]?.role !== "owner" ? "退出" : "刪除"}</Text>
                    </Pressable>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Pressable style={styles.newTripCard} onPress={() => setCreatingTrip(true)}>
              <Text style={styles.newTripIcon}>＋</Text>
              <Text style={styles.newTripTitle}>建立下一趟旅行</Text>
              <Text style={styles.newTripSub}>目的地、日期與天數都可以自己設定</Text>
            </Pressable>
          </ScrollView>
        )}
        {tab === "expenses" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <View style={styles.expenseHeader}>
              <View>
                <Text style={styles.eyebrow}>SPLIT TOGETHER</Text>
                <Text style={styles.pageTitle}>旅行記帳</Text>
                <Text style={styles.pageSubtitle}>{activeTrip.title}・多幣別支出</Text>
                <Text selectable style={styles.expenseTripId}>旅行 ID｜{activeTrip.id}</Text>
              </View>
              <Pressable style={styles.addTripButton} onPress={openExpenseModal}><Text style={styles.addTripPlus}>＋</Text></Pressable>
            </View>
            {cloudLinks[activeTrip.id] && (
              cloudLinks[activeTrip.id]!.inviteCode
                ? <View style={styles.refreshSyncButton}><Text style={styles.refreshSyncText}>{syncStatus === "syncing" ? "☁ 正在自動同步……" : "● 自動同步已開啟・每 3 秒更新"}</Text></View>
                : <Pressable
                    style={styles.refreshSyncButton}
                    onPress={() => {
                      const link = cloudLinks[activeTrip.id]!;
                      setJoinError("請重新輸入原本的六位數邀請碼，恢復這台裝置的同步連線。");
                      setJoinTripId(activeTrip.id);
                      setJoinMemberName(link.memberName || googleUser?.name || "");
                      setJoiningTrip(true);
                    }}
                  >
                    <Text style={styles.refreshSyncText}>⚠ 修復這台裝置的同步</Text>
                  </Pressable>
            )}
            {!!syncErrorMessage && <Text style={styles.joinErrorText}>同步失敗｜{syncErrorMessage}</Text>}
            <LinearGradient colors={["#244C43", "#54796D"]} style={styles.totalCard}>
              <Text style={styles.totalLabel}>目前總支出</Text>
              {Object.keys(currencyTotals).length === 0
                ? <Text style={styles.totalAmount}>尚無支出</Text>
                : Object.entries(currencyTotals).map(([currency, total]) => <Text key={currency} style={styles.totalAmount}>{currency} {total.toLocaleString()}</Text>)}
              <Text style={styles.totalSub}>{tripExpenses.length} 筆紀錄・此旅程獨立保存</Text>
            </LinearGradient>
            {payerTotals.length > 0 && (
              <View style={styles.payerSummary}>
                <Text style={styles.summaryTitle}>付款人統計</Text>
                <View style={styles.payerGrid}>
                  {payerTotals.map(([payer, totals]) => (
                    <View key={payer} style={styles.payerCard}>
                      <Text style={styles.payerName}>{payer}</Text>
                      {Object.entries(totals).map(([currency, total]) => <Text key={currency} style={styles.payerAmount}>{currency} {total.toLocaleString()}</Text>)}
                    </View>
                  ))}
                </View>
              </View>
            )}
            {tripExpenses.length === 0 ? (
              <Pressable style={styles.emptyExpense} onPress={openExpenseModal}>
                <Text style={styles.emptyExpenseIcon}>₩</Text>
                <Text style={styles.emptyExpenseTitle}>還沒有任何支出</Text>
                <Text style={styles.emptyExpenseSub}>點這裡新增第一筆餐費、交通或購物</Text>
              </Pressable>
            ) : tripExpenses.map((item) => (
              <View key={item.id} style={styles.expenseRow}>
                <View style={styles.expenseBadge}><Text>₩</Text></View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseName}>{item.title}</Text>
                  <Text style={styles.expensePayer}>付款人：{item.payer}</Text>
                </View>
                <Text style={styles.expenseValue}>{item.currency || "KRW"} {item.amount.toLocaleString()}</Text>
                <Pressable onPress={() => deleteExpense(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.bottomBar}>
          <TabButton icon="⌂" label="首頁" active={tab === "home"} onPress={() => setTab("home")} />
          <TabButton icon="≣" label="行程" active={tab === "itinerary"} onPress={() => setTab("itinerary")} />
          <TabButton icon="✦" label="工具箱" active={tab === "toolbox"} onPress={() => setTab("toolbox")} />
          <TabButton icon="₩" label="記帳" active={tab === "expenses"} onPress={() => setTab("expenses")} />
        </View>

        <Modal visible={cloudPanelVisible} animationType="fade" transparent onRequestClose={() => setCloudPanelVisible(false)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>TRIP SYNC</Text>
              <Text style={styles.sheetTitle}>{cloudLinks[activeTrip.id] ? "旅伴加入資訊" : "開啟雙人同步"}</Text>
              {cloudLinks[activeTrip.id] ? (
                <>
                  <Text style={styles.cloudLabel}>旅行 ID</Text>
                  <Text selectable style={styles.cloudCode}>{activeTrip.id}</Text>
                  <Text style={styles.cloudLabel}>六位數邀請碼</Text>
                  <Text selectable style={styles.cloudInvite}>{cloudLinks[activeTrip.id]!.inviteCode}</Text>
                  <Text style={styles.cloudLabel}>這趟旅行的成員</Text>
                  <View style={styles.memberChips}>
                    {activeMemberNames.map((name) => (
                      <View key={name} style={styles.memberChip}><Text style={styles.memberChipText}>● {name}{myDisplayName === name ? "（我）" : ""}</Text></View>
                    ))}
                  </View>
                  {!activeMemberNames.length && <Text style={styles.sourceHint}>尚未設定成員名稱</Text>}
                  <Text style={styles.cloudLabel}>我的名稱</Text>
                  <View style={styles.memberAddRow}>
                    <TextInput value={myNameDraft} onChangeText={setMyNameDraft} placeholder={cloudLinks[activeTrip.id]?.memberName || "例如：Julie"} placeholderTextColor="#AAA198" style={styles.memberInput} />
                    <Pressable style={styles.memberAddButton} onPress={saveMyMemberName}><Text style={styles.memberAddText}>儲存</Text></Pressable>
                  </View>
                  <View style={styles.memberAddRow}>
                    <TextInput value={memberDraft} onChangeText={setMemberDraft} placeholder="輸入成員名稱" placeholderTextColor="#AAA198" style={styles.memberInput} />
                    <Pressable style={styles.memberAddButton} onPress={addTripMember}><Text style={styles.memberAddText}>新增</Text></Pressable>
                  </View>
                  <Text style={styles.sheetAddress}>旅伴在豆遊首頁點「加入旅行」，輸入上面兩項資料。</Text>
                  <View style={styles.inviteShareGrid}>
                    <Pressable style={styles.inviteShareButton} onPress={() => copyInviteText(activeTrip.id, cloudLinks[activeTrip.id]!.inviteCode)}>
                      <Text style={styles.inviteShareText}>複製邀請文字</Text>
                    </Pressable>
                    <Pressable style={[styles.inviteShareButton, styles.lineShareButton]} onPress={() => shareInviteToLine(activeTrip.id, cloudLinks[activeTrip.id]!.inviteCode)}>
                      <Text style={[styles.inviteShareText, styles.lineShareText]}>傳到 LINE</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.primaryButton} onPress={() => shareCloudInfo(activeTrip.id, cloudLinks[activeTrip.id]!.inviteCode)}>
                    <Text style={styles.primaryButtonText}>其他分享方式</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sheetAddress}>開啟後會將這趟旅行上傳到豆遊同步服務，並產生旅行 ID 與邀請碼。</Text>
                  <Text style={styles.cloudLabel}>你的名稱</Text>
                  <TextInput value={myNameDraft} onChangeText={setMyNameDraft} placeholder="例如：Julie" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  <Pressable disabled={syncStatus === "syncing"} style={styles.primaryButton} onPress={enableCloudForExistingTrip}>
                    <Text style={styles.primaryButtonText}>{syncStatus === "syncing" ? "正在開啟……" : "開啟同步"}</Text>
                  </Pressable>
                </>
              )}
              <Pressable style={styles.cancelButton} onPress={() => setCloudPanelVisible(false)}><Text style={styles.cancelText}>關閉</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>景點備註</Text>
              <Text style={styles.sheetTitle}>{editing?.title}</Text>
              <Text style={styles.sheetAddress}>{editing?.address}</Text>
              <Text style={styles.fieldLabel}>營業時間（網路查證資料）</Text>
              <TextInput
                value={draftOpeningHours}
                onChangeText={setDraftOpeningHours}
                placeholder="尚未查證"
                placeholderTextColor="#A49C90"
                style={styles.fieldInput}
              />
              {!!editing?.openingHoursSource && <Text style={styles.sourceHint}>來源｜{editing.openingHoursSource}</Text>}
              <Text style={styles.fieldLabel}>預計停留時間（分鐘）</Text>
              <TextInput
                value={draftDuration}
                onChangeText={setDraftDuration}
                keyboardType="number-pad"
                placeholder="例如：60"
                placeholderTextColor="#A49C90"
                style={styles.fieldInput}
              />
              <Text style={styles.fieldLabel}>備註</Text>
              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                multiline
                autoFocus
                placeholder="加入集合地點、訂位資訊、想買的東西……"
                placeholderTextColor="#A49C90"
                style={styles.noteInput}
              />
              <Pressable style={styles.primaryButton} onPress={saveNote}><Text style={styles.primaryButtonText}>儲存景點資料</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditing(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!selectedTool} animationType="slide" transparent onRequestClose={() => setSelectedTool(null)}>
          <View style={styles.modalShade}>
            <View style={[styles.sheet, styles.toolSheet]}>
              <View style={styles.sheetHandle} />
              <View style={styles.toolSheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>TRIP TOOL</Text>
                  <Text style={styles.sheetTitle}>{selectedTool}</Text>
                </View>
                <Pressable
                  accessibilityLabel="關閉工具箱"
                  style={styles.sheetCloseButton}
                  onPress={() => { setAddingFlight(false); setAddingAccommodation(false); setAddingShoppingItem(false); setSelectedTool(null); }}
                >
                  <Text style={styles.sheetCloseText}>×</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.toolSheetBody} contentContainerStyle={styles.toolSheetBodyContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {selectedTool === "班機" && (
                <View style={styles.detailBlock}>
                  {addingFlight ? (
                    <>
                      <Text style={styles.fieldLabel}>航線 *</Text>
                      <TextInput value={flightRoute} onChangeText={setFlightRoute} placeholder="例如：桃園 → 那霸" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>航班號碼</Text>
                      <TextInput value={flightNumber} onChangeText={setFlightNumber} placeholder="例如：BR186" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>出發 *</Text><TextInput value={flightDeparture} onChangeText={setFlightDeparture} placeholder="10/10 06:30" placeholderTextColor="#AAA198" style={styles.fieldInput} /></View>
                        <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>抵達 *</Text><TextInput value={flightArrival} onChangeText={setFlightArrival} placeholder="10/10 09:00" placeholderTextColor="#AAA198" style={styles.fieldInput} /></View>
                      </View>
                      <Text style={styles.fieldLabel}>航廈</Text>
                      <TextInput value={flightTerminal} onChangeText={setFlightTerminal} placeholder="例如：桃園機場 T2" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>備註</Text>
                      <TextInput value={flightNote} onChangeText={setFlightNote} placeholder="行李、報到櫃檯或訂位代碼" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Pressable style={styles.primaryButton} onPress={saveFlight}><Text style={styles.primaryButtonText}>{editingFlightId ? "更新航班資訊" : "儲存航班"}</Text></Pressable>
                      <Pressable style={styles.cancelButton} onPress={resetFlightForm}><Text style={styles.cancelText}>返回航班列表</Text></Pressable>
                    </>
                  ) : (
                    <>
                      {activeTrip.flights.length === 0 && <Text style={styles.detailText}>這趟旅行還沒有航班資訊。</Text>}
                      {activeTrip.flights.map((flight) => (
                        <Pressable key={flight.id} style={styles.flightCard} onPress={() => openEditFlight(flight)}>
                          <View style={styles.flightTop}><Text style={styles.flightRoute}>{flight.route}</Text><Pressable onPress={(event) => { event.stopPropagation?.(); deleteFlight(flight.id); }}><Text style={styles.deleteExpense}>×</Text></Pressable></View>
                          <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
                          <View style={styles.flightTimes}><Text style={styles.flightTime}>出發　{flight.departure}</Text><Text style={styles.flightTime}>抵達　{flight.arrival}</Text></View>
                          {!!flight.terminal && <Text style={styles.detailHint}>{flight.terminal}</Text>}
                          {!!flight.note && <Text style={styles.detailHint}>{flight.note}</Text>}
                          <Text style={styles.editFlightHint}>點擊卡片即可編輯</Text>
                        </Pressable>
                      ))}
                      <Pressable style={styles.primaryButton} onPress={openNewFlight}><Text style={styles.primaryButtonText}>＋ 新增航班</Text></Pressable>
                    </>
                  )}
                </View>
              )}
              {selectedTool === "住宿" && (
                <View style={styles.detailBlock}>
                  {addingAccommodation ? (
                    <>
                      <Text style={styles.fieldLabel}>住宿名稱 *</Text><TextInput value={hotelName} onChangeText={setHotelName} placeholder="例如：Hotel Collective" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>住宿日期 *</Text><TextInput value={hotelPeriod} onChangeText={setHotelPeriod} placeholder="10/10–10/13" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>地址</Text><TextInput value={hotelAddress} onChangeText={setHotelAddress} placeholder="完整地址" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>入住時間</Text><TextInput value={hotelCheckIn} onChangeText={setHotelCheckIn} placeholder="15:00" placeholderTextColor="#AAA198" style={styles.fieldInput} /></View>
                        <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>退房時間</Text><TextInput value={hotelCheckOut} onChangeText={setHotelCheckOut} placeholder="11:00" placeholderTextColor="#AAA198" style={styles.fieldInput} /></View>
                      </View>
                      <Text style={styles.fieldLabel}>設施</Text><TextInput value={hotelFacilities} onChangeText={setHotelFacilities} placeholder="早餐、洗衣房、停車場、泳池……" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>櫃檯服務</Text><TextInput value={hotelFrontDesk} onChangeText={setHotelFrontDesk} placeholder="例如：24 小時有人櫃檯" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Text style={styles.fieldLabel}>備註</Text><TextInput value={hotelNote} onChangeText={setHotelNote} placeholder="訂房代碼、寄放行李……" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      <Pressable style={styles.primaryButton} onPress={createAccommodation}><Text style={styles.primaryButtonText}>儲存住宿</Text></Pressable>
                      <Pressable style={styles.cancelButton} onPress={() => setAddingAccommodation(false)}><Text style={styles.cancelText}>返回住宿列表</Text></Pressable>
                    </>
                  ) : <>
                    {activeTrip.accommodations.length === 0 && <Text style={styles.detailText}>這趟旅行尚未新增住宿。</Text>}
                    {activeTrip.accommodations.map((hotel) => (
                      <View key={hotel.id} style={styles.flightCard}>
                        <View style={styles.flightTop}><Text style={styles.flightRoute}>{hotel.name}</Text><Pressable onPress={() => deleteAccommodation(hotel.id)}><Text style={styles.deleteExpense}>×</Text></Pressable></View>
                        <Text style={styles.flightNumber}>{hotel.period}</Text>
                        {!!hotel.address && <Text style={styles.hotelDetail}>📍 {hotel.address}</Text>}
                        {!!hotel.checkIn && <Text style={styles.hotelDetail}>入住 {hotel.checkIn}　退房 {hotel.checkOut || "待確認"}</Text>}
                        {!!hotel.facilities && <Text style={styles.hotelDetail}>設施｜{hotel.facilities}</Text>}
                        {!!hotel.frontDesk && <Text style={styles.hotelDetail}>櫃檯｜{hotel.frontDesk}</Text>}
                        {!!hotel.note && <Text style={styles.detailHint}>{hotel.note}</Text>}
                      </View>
                    ))}
                    <Pressable style={styles.primaryButton} onPress={() => setAddingAccommodation(true)}><Text style={styles.primaryButtonText}>＋ 新增住宿</Text></Pressable>
                  </>}
                </View>
              )}
              {selectedTool === "天氣" && (
                <View style={styles.detailBlock}>
                  {weatherLoading && <Text style={styles.weatherLoading}>正在取得 {activeTrip.destination} 天氣……</Text>}
                  {!!weatherError && <Text style={styles.weatherError}>{weatherError}</Text>}
                  {weatherData && <>
                    <Text style={styles.weatherPlace}>{weatherPlace}</Text>
                    <LinearGradient colors={["#DCEBEE", "#EFF5F2"]} style={styles.weatherCurrent}>
                      <Text style={styles.weatherBigIcon}>{weatherIcon(weatherData.current.weather_code)}</Text>
                      <View><Text style={styles.weatherTemperature}>{Math.round(weatherData.current.temperature_2m)}°</Text><Text style={styles.weatherCondition}>{weatherLabel(weatherData.current.weather_code)}・體感 {Math.round(weatherData.current.apparent_temperature)}°</Text></View>
                    </LinearGradient>
                    <View style={styles.weatherMetrics}>
                      <Text style={styles.weatherMetric}>濕度 {weatherData.current.relative_humidity_2m}%</Text>
                      <Text style={styles.weatherMetric}>降雨 {weatherData.current.precipitation} mm</Text>
                      <Text style={styles.weatherMetric}>風速 {weatherData.current.wind_speed_10m} km/h</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
                      {weatherData.daily.time.map((date: string, index: number) => (
                        <View key={date} style={styles.forecastCard}>
                          <Text style={styles.forecastDate}>{date.slice(5).replace("-", "/")}</Text>
                          <Text style={styles.forecastIcon}>{weatherIcon(weatherData.daily.weather_code[index])}</Text>
                          <Text style={styles.forecastTemp}>{Math.round(weatherData.daily.temperature_2m_max[index])}° / {Math.round(weatherData.daily.temperature_2m_min[index])}°</Text>
                          <Text style={styles.forecastRain}>雨 {weatherData.daily.precipitation_probability_max[index] ?? 0}%</Text>
                        </View>
                      ))}
                    </ScrollView>
                    <Text style={styles.detailHint}>資料來源：Open-Meteo・依目的地自動更新</Text>
                  </>}
                </View>
              )}
              {selectedTool === "匯率" && (
                <View style={styles.detailBlock}>
                  <Text style={styles.fieldLabel}>{currencyForTrip.code} 金額</Text>
                  <TextInput value={krwAmount} onChangeText={setKrwAmount} keyboardType="numeric" style={styles.fieldInput} />
                  <Text style={styles.exchangeResult}>約 NT$ {(Number(krwAmount.replace(/,/g, "")) * currencyForTrip.rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  <Text style={styles.detailHint}>暫以 1 {currencyForTrip.code} ≈ {currencyForTrip.rate} TWD 估算，刷卡與換匯以實際匯率為準。</Text>
                </View>
              )}
              {selectedTool === "必買商品" && (
                <View style={styles.shoppingWrap}>
                  {addingShoppingItem ? <>
                    <Text style={styles.fieldLabel}>商品名稱 *</Text><TextInput value={shoppingName} onChangeText={setShoppingName} placeholder="例如：沖繩黑糖" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                    <Text style={styles.fieldLabel}>預估價格</Text><TextInput value={shoppingPrice} onChangeText={setShoppingPrice} placeholder="例如：800" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                    <Text style={styles.fieldLabel}>幣別</Text>
                    <View style={styles.currencyChoices}>
                      {["KRW", "JPY", "TWD", "USD"].map((currency) => (
                        <Pressable key={currency} onPress={() => setShoppingCurrency(currency)} style={[styles.currencyChoice, shoppingCurrency === currency && styles.currencyChoiceActive]}>
                          <Text style={[styles.currencyChoiceText, shoppingCurrency === currency && styles.currencyChoiceTextActive]}>{currency}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.fieldLabel}>分類</Text><TextInput value={shoppingCategory} onChangeText={setShoppingCategory} placeholder="伴手禮／藥妝／食品" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                    <Text style={styles.fieldLabel}>商品圖片網址</Text><TextInput value={shoppingImageUrl} onChangeText={setShoppingImageUrl} placeholder="貼上圖片網址（可留空）" placeholderTextColor="#AAA198" style={styles.fieldInput} autoCapitalize="none" />
                    <Pressable style={styles.imageSearchButton} onPress={() => Linking.openURL(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(shoppingName || activeTrip.destination + " 必買商品")}`)}>
                      <Text style={styles.imageSearchText}>用 Google 搜尋商品圖片 ↗</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={createShoppingItem}><Text style={styles.primaryButtonText}>儲存商品</Text></Pressable>
                    <Pressable style={styles.cancelButton} onPress={() => setAddingShoppingItem(false)}><Text style={styles.cancelText}>返回必買清單</Text></Pressable>
                  </> : <>
                    <View style={styles.shoppingHeader}>
                      <View><Text style={styles.detailTitle}>{activeTrip.destination} 必買清單</Text><Text style={styles.detailHint}>{activeTrip.shopping.length} 項自訂商品</Text></View>
                      <Pressable style={styles.smallAddButton} onPress={() => setAddingShoppingItem(true)}><Text style={styles.smallAddButtonText}>＋</Text></Pressable>
                    </View>
                    {!!activeTrip.shopping.filter((item) => !item.purchased).length && <Text style={styles.shoppingSectionTitle}>待購買</Text>}
                    {activeTrip.shopping.filter((item) => !item.purchased).map((item) => (
                      <View key={item.id} style={[styles.shoppingItem, item.purchased && styles.shoppingItemPurchased]}>
                        <Pressable accessibilityLabel={item.purchased ? "取消已購買" : "標記已購買"} onPress={() => toggleShoppingItem(item.id)} style={[styles.shoppingCheck, item.purchased && styles.shoppingCheckActive]}>
                          <Text style={styles.shoppingCheckText}>{item.purchased ? "✓" : ""}</Text>
                        </Pressable>
                        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.productImageFallback}><Text style={styles.productImageEmoji}>🛍️</Text></View>}
                        <View style={styles.shoppingInfo}><Text style={[styles.shoppingName, item.purchased && styles.shoppingNamePurchased]}>{item.name}</Text><Text style={styles.shoppingCategory}>{item.purchased ? "已購買" : item.category || "未分類"}</Text></View>
                        <Text style={styles.shoppingPrice}>{item.currency || "KRW"} {item.price}</Text>
                        <Pressable onPress={() => deleteShoppingItem(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
                      </View>
                    ))}
                    {!!activeTrip.shopping.filter((item) => item.purchased).length && <Text style={styles.shoppingSectionTitle}>已購買</Text>}
                    {activeTrip.shopping.filter((item) => item.purchased).map((item) => (
                      <View key={item.id} style={[styles.shoppingItem, styles.shoppingItemPurchased]}>
                        <Pressable accessibilityLabel="取消已購買" onPress={() => toggleShoppingItem(item.id)} style={[styles.shoppingCheck, styles.shoppingCheckActive]}>
                          <Text style={styles.shoppingCheckText}>✓</Text>
                        </Pressable>
                        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.productImageFallback}><Text style={styles.productImageEmoji}>🛍️</Text></View>}
                        <View style={styles.shoppingInfo}><Text style={[styles.shoppingName, styles.shoppingNamePurchased]}>{item.name}</Text><Text style={styles.shoppingCategory}>已購買</Text></View>
                        <Text style={styles.shoppingPrice}>{item.currency || "KRW"} {item.price}</Text>
                        <Pressable onPress={() => deleteShoppingItem(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
                      </View>
                    ))}
                    {activeTrip.shopping.length === 0 && <Text style={styles.emptyListText}>尚未新增商品，點右上角 ＋ 建立第一項。</Text>}
                    {isKoreaTrip && <>
                      <Text style={styles.catalogTitle}>韓國商品參考</Text>
                      <View style={styles.sourceTabs}>
                        {(["Olive Young", "韓國藥局"] as const).map((source) => (
                          <Pressable key={source} onPress={() => setShoppingSource(source)} style={[styles.sourceTab, shoppingSource === source && styles.sourceTabActive]}>
                            <Text style={[styles.sourceTabText, shoppingSource === source && styles.sourceTabTextActive]}>{source}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.shoppingList}>
                        {shoppingItems.filter((item) => item.source === shoppingSource).map((item) => (
                          <View key={`${item.source}-${item.name}`} style={styles.shoppingItem}>
                            <Pressable accessibilityLabel="標記已購買" onPress={() => toggleCatalogPurchase(item)} style={[styles.shoppingCheck, activeTrip.shopping.find((saved) => saved.name === item.name)?.purchased && styles.shoppingCheckActive]}>
                              <Text style={styles.shoppingCheckText}>{activeTrip.shopping.find((saved) => saved.name === item.name)?.purchased ? "✓" : ""}</Text>
                            </Pressable>
                            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.productImageFallback}><Text style={styles.productImageEmoji}>🧴</Text></View>}
                            <View style={styles.shoppingInfo}><Text style={styles.shoppingName}>{item.name}</Text><Text style={styles.shoppingCategory}>{item.category}</Text></View>
                            <Text style={styles.shoppingPrice}>{item.price}</Text>
                          </View>
                        ))}
                      </View>
                    </>}
                  </>}
                </View>
              )}
              {!addingFlight && !addingAccommodation && !addingShoppingItem && <Pressable style={styles.cancelButton} onPress={() => setSelectedTool(null)}><Text style={styles.cancelText}>關閉</Text></Pressable>}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={addingExpense} animationType="slide" transparent onRequestClose={() => setAddingExpense(false)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>NEW EXPENSE</Text>
              <Text style={styles.sheetTitle}>新增一筆支出</Text>
              <Text style={styles.fieldLabel}>品項 *</Text>
              <TextInput value={expenseTitle} onChangeText={setExpenseTitle} placeholder="例如：烤肉晚餐" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Text style={styles.fieldLabel}>金額 *</Text>
              <TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" placeholder="45000" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Text style={styles.fieldLabel}>幣別</Text>
              <View style={styles.currencyChoices}>
                {["KRW", "JPY", "TWD", "USD"].map((currency) => (
                  <Pressable key={currency} onPress={() => setExpenseCurrency(currency)} style={[styles.currencyChoice, expenseCurrency === currency && styles.currencyChoiceActive]}>
                    <Text style={[styles.currencyChoiceText, expenseCurrency === currency && styles.currencyChoiceTextActive]}>{currency}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>付款人</Text>
              <View style={styles.payerChoices}>
                {expenseMemberNames.map((name) => (
                  <Pressable key={name} onPress={() => setExpensePayer(name)} style={[styles.payerChoice, expensePayer === name && styles.payerChoiceActive]}>
                    <Text style={[styles.payerChoiceText, expensePayer === name && styles.payerChoiceTextActive]}>{name}</Text>
                  </Pressable>
                ))}
              </View>
              {expenseMemberNames.length === 0 && <TextInput value={expensePayer} onChangeText={setExpensePayer} placeholder="尚無成員，請先輸入付款人" placeholderTextColor="#AAA198" style={styles.fieldInput} />}
              <Pressable style={styles.primaryButton} onPress={createExpense}><Text style={styles.primaryButtonText}>儲存支出</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setAddingExpense(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={creatingTrip} animationType="slide" transparent onRequestClose={() => setCreatingTrip(false)}>
          <View style={styles.modalShade}>
            <ScrollView contentContainerStyle={styles.createSheetWrap}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetEyebrow}>NEW JOURNEY</Text>
                <Text style={styles.sheetTitle}>建立一趟新旅行</Text>
                <Text style={styles.sheetAddress}>建立後可逐日新增景點、交通與備註。</Text>
                <Text style={styles.fieldLabel}>目的地 *</Text>
                <TextInput value={newDestination} onChangeText={setNewDestination} placeholder="例如：沖繩" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <Text style={styles.fieldLabel}>旅行名稱</Text>
                <TextInput value={newTripName} onChangeText={setNewTripName} placeholder="例如：沖繩自駕六日" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>日期</Text>
                    <TextInput value={newPeriod} onChangeText={setNewPeriod} placeholder="2026.12.01–12.06" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                  <View style={styles.dayCountField}>
                    <Text style={styles.fieldLabel}>天數</Text>
                    <TextInput value={newDayCount} onChangeText={setNewDayCount} keyboardType="number-pad" placeholder="5" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                  <View style={styles.dayCountField}>
                    <Text style={styles.fieldLabel}>同行人數</Text>
                    <TextInput value={newTravelers} onChangeText={setNewTravelers} keyboardType="number-pad" placeholder="2" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                </View>
                <Pressable style={styles.primaryButton} onPress={createTrip}><Text style={styles.primaryButtonText}>建立旅行</Text></Pressable>
                <Pressable style={styles.cancelButton} onPress={() => setCreatingTrip(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={joiningTrip} animationType="slide" transparent onRequestClose={() => setJoiningTrip(false)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>JOIN JOURNEY</Text>
              <Text style={styles.sheetTitle}>加入旅伴的旅行</Text>
              <Text style={styles.sheetAddress}>使用目前登入的 Google 帳號加入。成功後會出現在你的首頁，行程與記帳會共同同步。</Text>
              <Text style={styles.fieldLabel}>這趟旅行顯示的成員名稱 *</Text>
              <TextInput value={joinMemberName} onChangeText={setJoinMemberName} placeholder="例如：小豆、Julie" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Text style={styles.fieldLabel}>旅行 ID *</Text>
              <TextInput value={joinTripId} onChangeText={setJoinTripId} autoCapitalize="none" placeholder="trip-..." placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Text style={styles.fieldLabel}>邀請碼 *</Text>
              <TextInput value={joinInviteCode} onChangeText={setJoinInviteCode} keyboardType="number-pad" placeholder="六位數邀請碼" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              {!!joinError && <Text style={styles.joinErrorText}>加入失敗｜{joinError}</Text>}
              <Pressable disabled={syncStatus === "syncing"} style={styles.primaryButton} onPress={joinCloudTrip}>
                <Text style={styles.primaryButtonText}>{syncStatus === "syncing" ? "正在加入並同步……" : "加入並開始同步"}</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setJoiningTrip(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!deletingTrip} animationType="fade" transparent onRequestClose={() => setDeletingTrip(null)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>DELETE JOURNEY</Text>
              <Text style={styles.sheetTitle}>刪除這趟旅行？</Text>
              <Text style={styles.sheetAddress}>「{deletingTrip?.title}」的行程、工具箱與設定會一併刪除。</Text>
              <Pressable style={styles.destructiveButton} onPress={confirmDeleteTrip}><Text style={styles.primaryButtonText}>確認刪除</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setDeletingTrip(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!leavingTrip} animationType="fade" transparent onRequestClose={() => setLeavingTrip(null)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>LEAVE JOURNEY</Text>
              <Text style={styles.sheetTitle}>退出這趟旅行？</Text>
              <Text style={styles.sheetAddress}>退出「{leavingTrip?.title}」後，只會移除你自己的成員資格，不會刪除其他旅伴的行程。日後仍可用邀請碼重新加入。</Text>
              <Pressable
                disabled={syncStatus === "syncing"}
                style={styles.destructiveButton}
                onPress={() => leavingTrip && leaveTrip(leavingTrip)}
              >
                <Text style={styles.primaryButtonText}>{syncStatus === "syncing" ? "正在退出……" : "確認退出"}</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setLeavingTrip(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={editingTravelers} animationType="fade" transparent onRequestClose={() => setEditingTravelers(false)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>TRAVELERS</Text>
              <Text style={styles.sheetTitle}>修改同行人數</Text>
              <Text style={styles.fieldLabel}>人數</Text>
              <TextInput value={travelerDraft} onChangeText={setTravelerDraft} keyboardType="number-pad" placeholder="1" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Pressable style={styles.primaryButton} onPress={() => {
                updateActiveTrip({ travelers: Math.min(20, Math.max(1, Number.parseInt(travelerDraft, 10) || 1)) });
                setEditingTravelers(false);
              }}><Text style={styles.primaryButtonText}>儲存人數</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditingTravelers(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={addingStop} animationType="slide" transparent onRequestClose={() => setAddingStop(false)}>
          <View style={styles.modalShade}>
            <ScrollView contentContainerStyle={styles.createSheetWrap}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetEyebrow}>ADD A PLACE</Text>
                <Text style={styles.sheetTitle}>新增景點或行程</Text>
                <Pressable style={styles.bulkImportButton} onPress={() => setBulkImportVisible(!bulkImportVisible)}>
                  <Text style={styles.bulkImportButtonText}>{bulkImportVisible ? "收起批次貼上" : "一次貼上整份行程"}</Text>
                </Pressable>
                {bulkImportVisible && (
                  <View style={styles.bulkImportBox}>
                    <Text style={styles.bulkHelp}>每行格式：時間｜景點｜地址｜交通｜備註{"\n"}不同天請插入 DAY 1、DAY 2…</Text>
                    <TextInput
                      value={bulkItineraryText}
                      onChangeText={setBulkItineraryText}
                      multiline
                      placeholder={"DAY 1\n09:00｜海雲台｜地址｜地鐵｜吃早餐\n10:30｜藍線公園｜地址｜步行｜已訂票"}
                      placeholderTextColor="#AAA198"
                      style={styles.bulkInput}
                    />
                    <Pressable style={styles.primaryButton} onPress={importBulkItinerary}><Text style={styles.primaryButtonText}>匯入全部景點</Text></Pressable>
                  </View>
                )}
                <Text style={styles.fieldLabel}>景點名稱 *</Text>
                <TextInput value={newStopTitle} onChangeText={setNewStopTitle} placeholder="例如：國際通" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <View style={styles.fieldRow}>
                  <View style={styles.dayCountField}>
                    <Text style={styles.fieldLabel}>時間</Text>
                    <TextInput value={newStopTime} onChangeText={setNewStopTime} placeholder="10:30" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>交通方式</Text>
                    <TextInput value={newStopTransport} onChangeText={setNewStopTransport} placeholder="地鐵約 20 分鐘" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>地址</Text>
                <TextInput value={newStopAddress} onChangeText={setNewStopAddress} placeholder="貼上地址或地標名稱" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <Text style={styles.fieldLabel}>預計停留時間（分鐘）</Text>
                <TextInput value={newStopDuration} onChangeText={setNewStopDuration} keyboardType="number-pad" placeholder="例如：90" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <Text style={styles.fieldLabel}>備註</Text>
                <TextInput value={newStopNote} onChangeText={setNewStopNote} multiline placeholder="預約、營業時間、想買的東西……" placeholderTextColor="#AAA198" style={[styles.noteInput, styles.compactNoteInput]} />
                <Pressable style={styles.primaryButton} onPress={createStop}><Text style={styles.primaryButtonText}>加入這一天</Text></Pressable>
                <Pressable style={styles.cancelButton} onPress={() => setAddingStop(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function EmptyPage({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <View style={styles.emptyPage}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSubtitle}>{text}</Text></View>;
}

function TabButton({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={styles.tabButton} onPress={onPress}><Text style={[styles.tabIcon, active && styles.tabActive]}>{icon}</Text><Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text></Pressable>;
}

function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const render = () => {
      const google = (globalThis as any).google;
      const target = (globalThis as any).document?.getElementById("douyou-google-signin");
      if (!google?.accounts?.id || !target) return;
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (response: any) => onCredential(response.credential) });
      target.innerHTML = "";
      google.accounts.id.renderButton(target, { theme: "outline", size: "large", shape: "pill", text: "signin_with", locale: "zh-TW", width: 280 });
    };
    const document = (globalThis as any).document;
    if ((globalThis as any).google?.accounts?.id) { render(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, []);
  if (Platform.OS !== "web") return <Text style={styles.accountHint}>請先使用網站版登入 Google。</Text>;
  return <View nativeID="douyou-google-signin" style={styles.googleButtonHost} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F3EC" },
  authGate: { alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { width: "100%", maxWidth: 430, alignItems: "center", backgroundColor: "#FFF", borderRadius: 32, paddingHorizontal: 28, paddingVertical: 42, borderWidth: 1, borderColor: "#E9E1D7", shadowColor: "#2F5147", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  authAppIcon: { width: 104, height: 104, borderRadius: 28, marginBottom: 20 },
  authLogo: { color: "#2F5147", fontSize: 35, fontWeight: "900" },
  authLoading: { color: "#8B8177", fontSize: 13, marginTop: 10 },
  authEyebrow: { color: "#9A6248", fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  authTitle: { color: "#243B35", fontSize: 32, fontWeight: "900", marginTop: 8 },
  authDescription: { color: "#7E756D", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 12, marginBottom: 24 },
  authPrivacy: { color: "#A0978F", fontSize: 10, marginTop: 18 },
  joinErrorText: { color: "#A5443C", backgroundColor: "#FBECEA", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 11, fontWeight: "800", marginTop: 10 },
  webViewport: { height: "100dvh" as never, maxHeight: "100dvh" as never, minHeight: 0, overflow: "hidden" },
  app: { flex: 1, minHeight: 0, overflow: "hidden", position: "relative", backgroundColor: "#FBFAF7", maxWidth: 520, width: "100%", alignSelf: "center" },
  header: { paddingTop: 18, paddingHorizontal: 22, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#9A6A4F", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  mainTitle: { color: "#1F2925", fontSize: 32, fontWeight: "900", marginTop: 5, letterSpacing: -1 },
  subtitle: { color: "#756E65", fontSize: 13, marginTop: 10 },
  tripBadge: { backgroundColor: "#2F5147", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  headerBadges: { alignItems: "flex-end", gap: 6 },
  syncBadge: { backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#CFC4B6", minWidth: 92, alignItems: "center", zIndex: 20 },
  syncBadgeLocal: { backgroundColor: "#FFF8E8", borderColor: "#D9B86D" },
  syncBadgeText: { color: "#49675E", fontSize: 10, fontWeight: "900" },
  cloudLabel: { color: "#897E73", fontSize: 11, fontWeight: "800", marginTop: 15 },
  cloudCode: { color: "#233D35", backgroundColor: "#EFF4F1", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: "800", marginTop: 5 },
  cloudInvite: { color: "#233D35", fontSize: 29, letterSpacing: 7, fontWeight: "900", marginTop: 4 },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  memberChip: { backgroundColor: "#E7EFEA", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  memberChipText: { color: "#315248", fontSize: 11, fontWeight: "800" },
  memberAddRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  memberInput: { flex: 1, backgroundColor: "#F5F2ED", borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, color: "#302B27", fontSize: 12 },
  memberAddButton: { backgroundColor: "#315248", borderRadius: 11, paddingHorizontal: 15, justifyContent: "center" },
  memberAddText: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  inviteShareGrid: { flexDirection: "row", gap: 8, marginTop: 13 },
  inviteShareButton: { flex: 1, backgroundColor: "#E7EFEA", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  inviteShareText: { color: "#315248", fontSize: 11, fontWeight: "900" },
  lineShareButton: { backgroundColor: "#E4F8E9" },
  lineShareText: { color: "#06A944" },
  toast: { position: "absolute", top: 18, alignSelf: "center", zIndex: 9999, elevation: 40, backgroundColor: "#244C43", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, shadowColor: "#000", shadowOpacity: .18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  toastText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  expenseTripId: { color: "#9A9188", fontSize: 9, marginTop: 5 },
  refreshSyncButton: { alignSelf: "flex-start", backgroundColor: "#E7EFEA", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  refreshSyncText: { color: "#315248", fontSize: 11, fontWeight: "900" },
  bulkImportButton: { backgroundColor: "#E7EFEA", borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "center" },
  bulkImportButtonText: { color: "#315248", fontSize: 12, fontWeight: "900" },
  bulkImportBox: { backgroundColor: "#F7F4EE", borderRadius: 14, padding: 11, marginBottom: 12 },
  bulkHelp: { color: "#766E66", fontSize: 10, lineHeight: 16, marginBottom: 8 },
  bulkInput: { minHeight: 170, maxHeight: 300, backgroundColor: "#FFF", borderRadius: 12, padding: 11, color: "#302B27", fontSize: 12, textAlignVertical: "top", borderWidth: 1, borderColor: "#E3DDD5" },
  tripBadgeIcon: { color: "#F4C88B", fontSize: 13 },
  tripBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800", marginTop: 2 },
  dayTabs: { gap: 8, paddingTop: 18, paddingBottom: 2 },
  addDayTab: { minWidth: 88, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  addDayPlus: { color: "#315248", fontSize: 20, fontWeight: "700", lineHeight: 21 },
  addDayText: { color: "#315248", fontSize: 10, fontWeight: "800", marginTop: 2 },
  dayTab: { width: 65, borderRadius: 18, backgroundColor: "rgba(255,255,255,.7)", paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: "#EAE0D5" },
  dayTabActive: { backgroundColor: "#2F5147", borderColor: "#2F5147" },
  dayLabel: { fontSize: 11, fontWeight: "800", color: "#7D756C" },
  dayLabelActive: { color: "#FFF" },
  dayDate: { fontSize: 10, marginTop: 3, color: "#A49C92" },
  dayDateActive: { color: "#DAE8E2" },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  itineraryListHost: { flex: 1, minHeight: 0, overflow: "hidden" },
  itineraryList: { flex: 1, minHeight: 0 },
  dayHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24, marginBottom: 13 },
  dayHeadingText: { flex: 1, paddingRight: 10 },
  dayHeadingDate: { fontSize: 11, fontWeight: "800", color: "#A06447", marginBottom: 4 },
  dayHeadingTitle: { fontSize: 23, fontWeight: "900", color: "#252D29", letterSpacing: -.4 },
  dayHeadingActions: { alignItems: "flex-end", gap: 7 },
  smallAddButton: { width: 30, height: 30, borderRadius: 11, backgroundColor: "#2F5147", alignItems: "center", justifyContent: "center" },
  smallAddButtonText: { color: "#FFF", fontSize: 19, marginTop: -2 },
  dayCount: { fontSize: 12, color: "#978F85" },
  mapCard: { backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#ECE7DF", shadowColor: "#3A2E22", shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  mapFooter: { padding: 14 },
  mapFooterTitle: { fontWeight: "800", color: "#2C2925", fontSize: 15 },
  mapFooterText: { color: "#8C8379", fontSize: 12, marginTop: 3 },
  smartSortLabel: { color: "#315248", fontSize: 11, fontWeight: "900", marginTop: 12 },
  smartSortRow: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 7, flexWrap: "wrap" },
  smartSortButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#E7EFEA" },
  smartSortText: { color: "#315248", fontSize: 10, fontWeight: "900" },
  undoSortButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#F3E8DE" },
  undoSortText: { color: "#9C613F", fontSize: 10, fontWeight: "900" },
  smartSortHint: { color: "#9A9188", fontSize: 10, lineHeight: 15, marginTop: 7 },
  dragBanner: { flexDirection: "row", backgroundColor: "#F0E8DC", borderRadius: 14, padding: 12, marginTop: 14, marginBottom: 10, alignItems: "center", gap: 8 },
  dragBannerText: { color: "#7B604F", fontSize: 12, fontWeight: "600" },
  emptyItinerary: { marginTop: 18, padding: 30, borderRadius: 22, backgroundColor: "#F3EFE7", alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "#CFC5B9" },
  emptyItineraryIcon: { fontSize: 30, color: "#315248", fontWeight: "900" },
  emptyItineraryTitle: { fontSize: 16, fontWeight: "900", color: "#2D3732", marginTop: 10 },
  emptyItineraryText: { color: "#8A8178", fontSize: 11, marginTop: 5, textAlign: "center" },
  emptyAddButton: { marginTop: 16, backgroundColor: "#2F5147", borderRadius: 14, paddingHorizontal: 17, paddingVertical: 11 },
  emptyAddButtonText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  stopWrap: { flexDirection: "row", minHeight: 170 },
  dragging: { opacity: .92, transform: [{ scale: 1.02 }] },
  timeline: { width: 36, alignItems: "center" },
  numberDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#2F5147", alignItems: "center", justifyContent: "center", zIndex: 2, marginTop: 20 },
  numberText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  timelineLine: { width: 2, backgroundColor: "#D9D4CC", flex: 1 },
  stopCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#EEE8E0" },
  stopTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timePill: { backgroundColor: "#F7E5D6", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  timeText: { color: "#A75E3B", fontWeight: "800", fontSize: 12 },
  dragHint: { color: "#B3ACA3", fontSize: 11 },
  webReorder: { flexDirection: "row", gap: 5 },
  reorderButton: { width: 30, height: 27, borderRadius: 9, backgroundColor: "#EEE9E2", alignItems: "center", justifyContent: "center" },
  reorderText: { color: "#2F5147", fontSize: 15, fontWeight: "900" },
  reorderDisabled: { color: "#C8C1B9" },
  stopTitle: { color: "#292622", fontWeight: "800", fontSize: 17, marginTop: 10 },
  address: { color: "#8D857C", fontSize: 12, marginTop: 7 },
  transportRow: { flexDirection: "row", backgroundColor: "#F2F6F3", padding: 10, borderRadius: 13, marginTop: 11, gap: 9, alignItems: "center" },
  transportIcon: { fontSize: 20 },
  transportLabel: { color: "#819087", fontSize: 9, fontWeight: "700" },
  transportText: { color: "#35554B", fontSize: 12, fontWeight: "800", marginTop: 2 },
  legRouteBox: { marginTop: 9, borderRadius: 13, backgroundColor: "#F7F5F1", padding: 9 },
  legRouteLabel: { color: "#756E66", fontSize: 10, fontWeight: "800", marginBottom: 7 },
  legEstimate: { color: "#315248", fontSize: 13, fontWeight: "900", marginBottom: 8 },
  legRouteActions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  legModeButton: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: "#EAE6E0" },
  legModeButtonActive: { backgroundColor: "#315248" },
  legModeText: { color: "#766E65", fontSize: 10, fontWeight: "900" },
  legModeTextActive: { color: "#FFF" },
  fastRouteButton: { borderRadius: 9, borderWidth: 1, borderColor: "#D7E4DE", paddingHorizontal: 9, paddingVertical: 8, alignItems: "center", backgroundColor: "#F7FAF8" },
  fastRouteButtonText: { color: "#3974D8", fontSize: 10, fontWeight: "900" },
  openingHours: { color: "#4D6C62", fontSize: 11, fontWeight: "700", marginTop: 9 },
  sourceHint: { color: "#928A81", fontSize: 10, marginTop: -5, marginBottom: 8 },
  note: { color: "#756E66", fontSize: 12, lineHeight: 17, marginTop: 10 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 11, alignItems: "center", gap: 8 },
  pass: { color: "#34815E", backgroundColor: "#E5F3EA", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: "800" },
  mapActions: { flexDirection: "row", gap: 7, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 1 },
  mapButton: { backgroundColor: "#F4F0EA", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  naverButton: { backgroundColor: "#E8F7EE" },
  googleMapLink: { color: "#3974D8", fontSize: 11, fontWeight: "800" },
  naverMapLink: { color: "#03A94D", fontSize: 11, fontWeight: "800" },
  bottomBar: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, zIndex: 100, elevation: 20, backgroundColor: "rgba(255,255,255,.98)", borderRadius: 24, flexDirection: "row", shadowColor: "#281E16", shadowOpacity: .16, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, borderWidth: 1, borderColor: "#EEE9E2" },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIcon: { fontSize: 20, color: "#A8A199", fontWeight: "700" },
  tabText: { fontSize: 10, color: "#A8A199", marginTop: 4, fontWeight: "700" },
  tabActive: { color: "#2F5147" },
  page: { flex: 1, backgroundColor: "#FBFAF7" },
  pageContent: { padding: 22, paddingTop: 36, paddingBottom: 110 },
  homeContent: { padding: 22, paddingTop: 32, paddingBottom: 115 },
  homeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  addTripButton: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#2F5147", alignItems: "center", justifyContent: "center", shadowColor: "#2F5147", shadowOpacity: .18, shadowRadius: 10 },
  homeHeaderActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  accountCard: { backgroundColor: "#FFF", borderRadius: 18, padding: 14, marginTop: 14, marginBottom: 4, borderWidth: 1, borderColor: "#E9E2D9" },
  accountTitle: { color: "#263D35", fontSize: 14, fontWeight: "900" },
  accountHint: { color: "#887F76", fontSize: 10, lineHeight: 15, marginTop: 4 },
  googleButtonHost: { minHeight: 44, marginTop: 10 },
  accountIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  accountAvatar: { width: 38, height: 38, borderRadius: 19 },
  accountAvatarFallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E7EFEA", alignItems: "center", justifyContent: "center" },
  accountText: { flex: 1 },
  accountName: { color: "#263D35", fontSize: 13, fontWeight: "900" },
  accountEmail: { color: "#8C837A", fontSize: 10, marginTop: 2 },
  signOutText: { color: "#A46448", fontSize: 10, fontWeight: "800" },
  joinTripButton: { backgroundColor: "#E9E2D8", borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11 },
  joinTripButtonText: { color: "#2F5147", fontSize: 11, fontWeight: "900" },
  addTripPlus: { color: "#FFF", fontSize: 25, fontWeight: "500", marginTop: -2 },
  tripCard: { backgroundColor: "#FFF", borderRadius: 24, marginBottom: 18, overflow: "hidden", borderWidth: 1, borderColor: "#EDE7DF", shadowColor: "#34261F", shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  tripCardCover: { minHeight: 168, padding: 20, justifyContent: "flex-end" },
  tripCardIndex: { position: "absolute", left: 20, top: 18, color: "rgba(255,255,255,.7)", letterSpacing: 1.5, fontWeight: "800", fontSize: 10 },
  tripCardDestination: { color: "#FFF", fontSize: 33, fontWeight: "900", letterSpacing: -1 },
  tripCardPeriod: { color: "rgba(255,255,255,.82)", fontSize: 12, fontWeight: "700", marginTop: 4 },
  tripCardMeta: { flexDirection: "row", marginTop: 14, alignItems: "center", gap: 7 },
  tripCardMetaText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  tripCardMetaDot: { color: "rgba(255,255,255,.5)" },
  tripCardBottom: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tripCardActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  deleteTripButton: { backgroundColor: "#F5EAE5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  deleteTripText: { color: "#A95D4C", fontSize: 10, fontWeight: "900" },
  tripCardName: { color: "#292622", fontSize: 16, fontWeight: "900" },
  tripCardStatus: { color: "#938A80", fontSize: 11, marginTop: 4 },
  newTripCard: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CFC5BA", borderRadius: 22, padding: 24, alignItems: "center", backgroundColor: "#F8F5EF" },
  newTripIcon: { color: "#2F5147", fontSize: 28 },
  newTripTitle: { color: "#2F5147", fontSize: 15, fontWeight: "900", marginTop: 7 },
  newTripSub: { color: "#91877D", fontSize: 11, marginTop: 5 },
  pageTitle: { color: "#292622", fontSize: 29, fontWeight: "800", marginTop: 7 },
  pageSubtitle: { color: "#817970", lineHeight: 21, marginTop: 6, marginBottom: 22 },
  toolCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 19, padding: 14, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#EEE8E0" },
  toolIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  toolEmoji: { fontSize: 23, fontWeight: "800" },
  toolText: { flex: 1, paddingLeft: 13 },
  toolTitle: { fontSize: 16, color: "#2E2A26", fontWeight: "800" },
  toolSub: { fontSize: 12, color: "#918980", marginTop: 3 },
  chevron: { fontSize: 28, color: "#B7B0A8" },
  emptyPage: { flex: 1, padding: 24, paddingTop: 45 },
  modalShade: { flex: 1, backgroundColor: "rgba(20,18,16,.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FBFAF7", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34 },
  createSheetWrap: { flexGrow: 1, justifyContent: "flex-end" },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#D8D2CA", alignSelf: "center", marginBottom: 20 },
  sheetEyebrow: { fontSize: 11, letterSpacing: 1.4, color: "#9A6A4F", fontWeight: "800" },
  sheetTitle: { fontSize: 23, fontWeight: "800", color: "#292622", marginTop: 6 },
  sheetAddress: { color: "#8B837A", fontSize: 12, marginTop: 6 },
  noteInput: { minHeight: 130, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5DED5", borderRadius: 17, padding: 14, marginTop: 18, textAlignVertical: "top", color: "#38332E", fontSize: 15, lineHeight: 21 },
  compactNoteInput: { minHeight: 92, marginTop: 0 },
  fieldLabel: { color: "#696159", fontSize: 11, fontWeight: "800", marginTop: 16, marginBottom: 7 },
  fieldInput: { height: 48, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5DED5", borderRadius: 14, paddingHorizontal: 13, color: "#38332E", fontSize: 14 },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1 },
  dayCountField: { width: 90 },
  primaryButton: { backgroundColor: "#2F5147", height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 16 },
  primaryButtonText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  destructiveButton: { backgroundColor: "#A85445", height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
  cancelButton: { height: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#8A8178", fontWeight: "700" },
  toolSheet: { height: "90%", paddingBottom: 10, overflow: "hidden" },
  toolSheetBody: { flex: 1, marginTop: 4 },
  toolSheetBodyContent: { paddingBottom: 28 },
  toolSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#FBFAF7", zIndex: 3, paddingBottom: 8 },
  sheetCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ECE7E0", alignItems: "center", justifyContent: "center", marginTop: -4 },
  sheetCloseText: { color: "#625A53", fontSize: 27, lineHeight: 29, fontWeight: "500" },
  detailBlock: { marginTop: 12 },
  detailTitle: { color: "#2F5147", fontSize: 14, fontWeight: "900", marginTop: 13 },
  detailText: { color: "#756D65", fontSize: 13, lineHeight: 20, marginTop: 4 },
  detailHint: { color: "#9A9188", fontSize: 11, lineHeight: 17, marginTop: 9 },
  flightCard: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E9E2DA", borderRadius: 16, padding: 14, marginTop: 10 },
  flightTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flightRoute: { color: "#2F5147", fontSize: 15, fontWeight: "900" },
  flightNumber: { color: "#9A6248", fontSize: 11, fontWeight: "800", marginTop: 5 },
  flightTimes: { gap: 4, marginTop: 10 },
  flightTime: { color: "#5F5851", fontSize: 12, fontWeight: "700" },
  editFlightHint: { color: "#9A9188", fontSize: 10, fontWeight: "700", marginTop: 10 },
  hotelDetail: { color: "#625B54", fontSize: 11, lineHeight: 17, marginTop: 7 },
  weatherLoading: { color: "#62736D", textAlign: "center", paddingVertical: 35, fontWeight: "700" },
  weatherError: { color: "#A85445", textAlign: "center", paddingVertical: 25 },
  weatherPlace: { color: "#7D756D", fontSize: 11, marginBottom: 9 },
  weatherCurrent: { flexDirection: "row", alignItems: "center", gap: 18, borderRadius: 21, padding: 18 },
  weatherBigIcon: { fontSize: 46 },
  weatherTemperature: { color: "#26483F", fontSize: 38, fontWeight: "900" },
  weatherCondition: { color: "#587067", fontSize: 11, fontWeight: "700", marginTop: 2 },
  weatherMetrics: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13 },
  weatherMetric: { color: "#756D65", fontSize: 10, fontWeight: "700" },
  forecastScroll: { marginHorizontal: -2 },
  forecastCard: { width: 92, backgroundColor: "#FFF", borderRadius: 16, padding: 11, marginRight: 8, alignItems: "center", borderWidth: 1, borderColor: "#ECE6DE" },
  forecastDate: { color: "#817970", fontSize: 10, fontWeight: "800" },
  forecastIcon: { fontSize: 24, marginVertical: 7 },
  forecastTemp: { color: "#344F47", fontSize: 11, fontWeight: "900" },
  forecastRain: { color: "#6791A0", fontSize: 9, marginTop: 5 },
  contextEmpty: { minHeight: 260, alignItems: "center", justifyContent: "center", padding: 25 },
  exchangeResult: { color: "#2F5147", fontWeight: "900", fontSize: 28, marginTop: 18 },
  shoppingWrap: { marginTop: 16, minHeight: 360 },
  shoppingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  shoppingSectionTitle: { color: "#315248", fontSize: 12, fontWeight: "900", backgroundColor: "#EEF3F0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 9 },
  shoppingColumns: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#DDD6CD" },
  shoppingColumnCheck: { width: 64, color: "#887E74", fontSize: 10, fontWeight: "800" },
  shoppingColumnName: { flex: 1, color: "#887E74", fontSize: 10, fontWeight: "800" },
  shoppingColumnPrice: { width: 70, textAlign: "right", color: "#887E74", fontSize: 10, fontWeight: "800" },
  catalogTitle: { color: "#39342F", fontSize: 14, fontWeight: "900", marginTop: 22, marginBottom: 10 },
  emptyListText: { color: "#938A80", fontSize: 11, textAlign: "center", paddingVertical: 22 },
  sourceTabs: { flexDirection: "row", backgroundColor: "#EEE9E2", padding: 4, borderRadius: 14, gap: 4 },
  sourceTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11 },
  sourceTabActive: { backgroundColor: "#FFF" },
  sourceTabText: { color: "#8B837A", fontWeight: "800", fontSize: 12 },
  sourceTabTextActive: { color: "#2F5147" },
  shoppingList: { marginTop: 10 },
  shoppingItem: { flexDirection: "row", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#ECE7E0", alignItems: "center" },
  shoppingItemPurchased: { opacity: .6, backgroundColor: "#F1F5F2" },
  shoppingCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#B9B1A8", alignItems: "center", justifyContent: "center" },
  shoppingCheckActive: { backgroundColor: "#2F5147", borderColor: "#2F5147" },
  shoppingCheckText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  shoppingNamePurchased: { textDecorationLine: "line-through", color: "#7C857F" },
  productImage: { width: 58, height: 58, borderRadius: 12, backgroundColor: "#FFF" },
  productImageFallback: { width: 58, height: 58, borderRadius: 12, backgroundColor: "#F2EEE8", alignItems: "center", justifyContent: "center" },
  productImageEmoji: { fontSize: 24 },
  findImageText: { color: "#8D6B59", fontSize: 10, fontWeight: "900" },
  imageSearchButton: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#D8CFC4", alignItems: "center", justifyContent: "center", marginTop: 10 },
  imageSearchText: { color: "#775A49", fontSize: 11, fontWeight: "800" },
  shoppingInfo: { flex: 1 },
  shoppingName: { color: "#302B27", fontWeight: "800", fontSize: 13, lineHeight: 18 },
  shoppingCategory: { color: "#9A9188", fontSize: 10, marginTop: 3 },
  shoppingPrice: { color: "#9A6248", fontWeight: "900", fontSize: 11, maxWidth: 105, textAlign: "right" },
  expenseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  totalCard: { borderRadius: 24, padding: 21, marginBottom: 18 },
  totalLabel: { color: "rgba(255,255,255,.72)", fontSize: 11, fontWeight: "800" },
  totalAmount: { color: "#FFF", fontSize: 31, fontWeight: "900", marginTop: 7 },
  totalSub: { color: "rgba(255,255,255,.68)", fontSize: 11, marginTop: 7 },
  payerSummary: { marginBottom: 18 },
  summaryTitle: { color: "#39342F", fontSize: 14, fontWeight: "900", marginBottom: 9 },
  payerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  payerCard: { minWidth: 105, flexGrow: 1, backgroundColor: "#FFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: "#EDE7DF" },
  payerName: { color: "#726A62", fontSize: 10, fontWeight: "800" },
  payerAmount: { color: "#2F5147", fontSize: 17, fontWeight: "900", marginTop: 5 },
  payerShare: { color: "#A08774", fontSize: 9, marginTop: 3 },
  emptyExpense: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CFC5BA", borderRadius: 22, padding: 28, alignItems: "center", backgroundColor: "#F8F5EF" },
  emptyExpenseIcon: { color: "#2F5147", fontSize: 27, fontWeight: "900" },
  emptyExpenseTitle: { color: "#2F5147", fontSize: 15, fontWeight: "900", marginTop: 8 },
  emptyExpenseSub: { color: "#91877D", fontSize: 11, marginTop: 5 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, backgroundColor: "#FFF", borderRadius: 17, borderWidth: 1, borderColor: "#EEE8E0", marginBottom: 10 },
  expenseBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#E5F3EA", alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { color: "#302B27", fontSize: 14, fontWeight: "900" },
  expensePayer: { color: "#958C83", fontSize: 10, marginTop: 3 },
  expenseValue: { color: "#2F5147", fontWeight: "900", fontSize: 13 },
  deleteExpense: { color: "#B8AFA7", fontSize: 22, paddingLeft: 4 },
  currencyChoices: { flexDirection: "row", gap: 8 },
  currencyChoice: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 12, backgroundColor: "#EEE9E2" },
  currencyChoiceActive: { backgroundColor: "#2F5147" },
  currencyChoiceText: { color: "#776F67", fontSize: 11, fontWeight: "900" },
  currencyChoiceTextActive: { color: "#FFF" },
  payerChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7, marginBottom: 8 },
  payerChoice: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: "#EEE9E2", borderWidth: 1, borderColor: "#E5DED5" },
  payerChoiceActive: { backgroundColor: "#2F5147", borderColor: "#2F5147" },
  payerChoiceText: { color: "#776F67", fontSize: 12, fontWeight: "900" },
  payerChoiceTextActive: { color: "#FFF" }
});
