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
  TouchableOpacity,
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
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "./src/firebase";
import { archiveFirestoreTrip, deleteFirestoreTrip, ensureFirestoreUser, firestorePersonId, joinFirestoreTrip, joinFirestoreTripByInvite, leaveFirestoreTrip, listenFirestoreFavorites, listenFirestoreMembers, listenFirestoreTrip, listenFirestoreTripLinks, repairFirestoreTripLink, restoreFirestoreTrip, saveFirestoreFavorites, saveFirestoreTrip, seedFirestoreFavorites, updateFirestoreMemberName, updateFirestoreTripState } from "./src/firestoreSync";

const homeTravelBean = require("./assets/home-travel-bean-transparent.png");
// This file is copied to dist with a stable name by patch-web-export.mjs.
// A plain DOM image is used on web so the transparent artwork reliably paints
// above the React Native Web layout.
const homeTravelBeanWebUri = Platform.OS === "web" && typeof window !== "undefined" && window.location.pathname.startsWith("/bean")
  ? "/bean/home-travel-bean.png"
  : "/home-travel-bean.png";
const webHomeMascotStyle = { position: "absolute", right: "30px", bottom: "-10px", width: "142px", height: "142px", objectFit: "contain", zIndex: 3, pointerEvents: "none" };
const webItineraryMascotStyle = { position: "absolute", right: "106px", top: "8px", width: "132px", height: "132px", objectFit: "contain", zIndex: 1, pointerEvents: "none" };
const webToolboxMascotStyle = { position: "absolute", right: "30px", top: "42px", width: "142px", height: "142px", objectFit: "contain", zIndex: 1, pointerEvents: "none" };
const webExpensesMascotStyle = { position: "absolute", right: "30px", top: "62px", width: "142px", height: "142px", objectFit: "contain", zIndex: 1, pointerEvents: "none" };

type Tab = "home" | "itinerary" | "favorites" | "toolbox" | "expenses";
type FavoritePlace = { id: string; name: string; address: string; country: string; city: string; latitude?: number; longitude?: number; note?: string; openingHours?: string };
const STORE_KEY = "travel-companion-v2";
const EXPENSE_KEY = "travel-expenses-v1";
const CLOUD_LINK_KEY = "douyou-cloud-links-v1";
const CLOUD_MEMBER_KEY = "douyou-cloud-members-v1";
const AUTH_KEY = "douyou-google-auth-v1";
const FAVORITES_KEY = "douyou-personal-favorites-v1";
const FAVORITE_COLLAPSE_KEY = "douyou-favorite-collapse-v1";
const ALL_DAYS_ID = "__all_days__";
const DAY_ROUTE_COLORS = ["#E98268", "#5E7FA3", "#D3A54A", "#9A72B5", "#4F9A96", "#C96B8A", "#7F8D4E"];
const SYNC_URL = "https://script.google.com/macros/s/AKfycbx59WE7iqgehx4nsE4xxxp_Q8-eQrd59VSfR4xSa3IlU7lIBtikr1gvG3EZgxWHEOwj/exec";
const GOOGLE_CLIENT_ID = "280761518317-gdvrt4provk183vi87j6uoapmu5umn30.apps.googleusercontent.com";
const currentWebOrigin = String((globalThis as any)?.location?.origin || "");
const currentWebPath = String((globalThis as any)?.location?.pathname || "/");
const currentWebBase = currentWebOrigin && currentWebPath
  ? `${currentWebOrigin}${currentWebPath.endsWith("/") ? currentWebPath : currentWebPath.replace(/[^/]*$/, "")}`
  : "https://past795.github.io/bean/";
const SHARE_URL = `${currentWebBase}?share=2026080212`;
const DOUYOU_AI_URL = "https://throbbing-dust-5d68douyou-ai.past795.workers.dev/chat";
const BUSAN_BACKUP_FAVORITES: FavoritePlace[] = [
  { id: "busan-backup-film", name: "釜山電影體驗博物館", address: "釜山廣域市中區大廳路126號街12", country: "韓國", city: "釜山", latitude: 35.1017, longitude: 129.0325, note: "Day 1 下雨或炎熱時，可替代太宗台／白淺灘的室內備案。" },
  { id: "busan-backup-seomyeon", name: "西面地下街", address: "釜山廣域市釜山鎮區西面站一帶", country: "韓國", city: "釜山", latitude: 35.1579, longitude: 129.0590, note: "下雨天適合搭配田浦咖啡街與選物店的室內備案。" },
  { id: "busan-backup-shinsegae", name: "新世界百貨 Centum City", address: "釜山廣域市海雲臺區Centum南大路35", country: "韓國", city: "釜山", latitude: 35.1689, longitude: 129.1292, note: "Day 3 下雨時的室內備案；也可與 SPA LAND、Museum 1 串聯。" },
  { id: "busan-backup-star-chicken", name: "明星一隻雞（影島區）", address: "釜山廣域市影島區", country: "韓國", city: "釜山", note: "喉嚨烤肉無法候位時的 Day 1 晚餐備案。" },
  { id: "busan-backup-cheongsapo", name: "青沙浦海鮮小吃", address: "釜山廣域市海雲臺區青沙浦路一帶", country: "韓國", city: "釜山", latitude: 35.1602, longitude: 129.1919, note: "Nasari 滿位時的午餐備案，可直接就近找海鮮餐廳。" },
  { id: "busan-backup-matwang", name: "味贊王鹽烤肉 西面店", address: "釜山廣域市釜山鎮區西面路一帶", country: "韓國", city: "釜山", latitude: 35.1571, longitude: 129.0578, note: "田浦晚餐滿位時的烤肉備案。" }
];
const dateDaysBefore = (dateText: string, days: number) => {
  const normalizedDate = normalizeTripDate(dateText);
  if (!normalizedDate) return "";
  const date = new Date(`${normalizedDate}T12:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
const isoDateAtOffset = (startDate: string, offset: number) => {
  const normalizedDate = normalizeTripDate(startDate);
  if (!normalizedDate) return "";
  const date = new Date(`${normalizedDate}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const reservationDateLabel = (dateText: string) => {
  const iso = normalizeTripDate(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}`;
  return String(dateText || "日期未定").match(/^\d{2}\/\d{2}/)?.[0] || String(dateText || "日期未定");
};
const reservationGoogleCalendarUrl = (title: string, dateText: string, note = "") => {
  const normalizedDate = normalizeTripDate(dateText);
  if (!normalizedDate) return "";
  const start = normalizedDate.replaceAll("-", "");
  const end = dateDaysBefore(normalizedDate, -1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `預約提醒｜${title}`,
    dates: `${start}/${end}`,
    details: `${note}\n\n此提醒由豆遊建立。`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
const reservationIcsDataUrl = (title: string, dateText: string, note = "") => {
  const normalizedDate = normalizeTripDate(dateText);
  if (!normalizedDate) return "";
  const start = normalizedDate.replaceAll("-", "");
  const end = dateDaysBefore(normalizedDate, -1).replaceAll("-", "");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Douyou//Reservation//ZH", "BEGIN:VEVENT", `UID:douyou-${Date.now()}@douyou`, `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${escape(`預約提醒｜${title}`)}`, `DESCRIPTION:${escape(note)}`, "BEGIN:VALARM", "TRIGGER:-PT9H", "ACTION:DISPLAY", "DESCRIPTION:豆遊預約提醒", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
};
const reservationWebsiteUrl = (value = "") => {
  const matched = String(value).match(/https?:\/\/[^\s)]+/i);
  return matched?.[0] || "";
};
const reservationInfoForStop = (stop: Stop, dayDate = "") => {
  const suggestedDate = stop.reservationSuggestedDate || (() => {
    const text = `${stop.title} ${stop.note} ${stop.transport}`;
    if (/Sky Capsule|天空膠囊/.test(text)) return dateDaysBefore(dayDate, 28);
    if (/鑽石灣|遊艇/.test(text)) return dateDaysBefore(dayDate, 30);
    return dateDaysBefore(dayDate, 14);
  })();
  if (stop.reservationRequired || stop.reservationNote) return { required: true, note: stop.reservationNote || "請於出發前完成預約或確認報到方式。", suggestedDate };
  const text = `${stop.title} ${stop.note} ${stop.transport}`;
  if (/Sky Capsule|天空膠囊/.test(text)) return { required: true, note: "建議出發前 4 週開放時預約；可優先選靠海側座位。", suggestedDate };
  if (/鑽石灣|遊艇/.test(text)) return { required: true, note: "請依預約航班提早報到；建議至少一個月前確認場次。", suggestedDate };
  if (/Catch Table|預約制/.test(text)) return { required: true, note: "請先確認可訂位時段、入場規則或取票方式。", suggestedDate };
  return { required: false, note: "", suggestedDate: "" };
};
const buildInviteMessage = (_tripId: string, inviteCode: string) => `一起編輯豆遊行程 ✈️

加入步驟：
1. 開啟豆遊網站並登入自己的 Google 帳號
2. 在「我的旅行」頁面按右上角「加入旅行」
3. 輸入下方邀請碼與成員名稱
4. 按「加入並開始同步」

邀請碼：${inviteCode}
豆遊網站：${SHARE_URL}

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
const inclusiveDayCount = (start: string, end: string) => {
  const startTime = Date.parse(`${start}T00:00:00`);
  const endTime = Date.parse(`${end}T00:00:00`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return 0;
  return Math.floor((endTime - startTime) / 86400000) + 1;
};
const tripPeriodLabel = (start: string, end: string) =>
  normalizeTripDate(start) && normalizeTripDate(end)
    ? `${normalizeTripDate(start).replaceAll("-", ".")} – ${normalizeTripDate(end).replaceAll("-", ".")}`
    : normalizeTripDate(start) || normalizeTripDate(end) || "日期未定";
const normalizeTripDate = (value: unknown) => {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(date);
      const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
      return `${get("year")}-${get("month")}-${get("day")}`;
    }
  }
  const match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:\s|$)/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
const tripDayDateLabel = (start: string, dayIndex: number) => {
  const normalizedStart = normalizeTripDate(start);
  if (!isIsoTripDate(normalizedStart)) return "日期未定";
  const [year, month, day] = normalizedStart.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + dayIndex));
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}（${weekdays[date.getUTCDay()]}）`;
};
const isIsoTripDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const pickCompressedImage = () => new Promise<string>((resolve, reject) => {
  if (Platform.OS !== "web") return reject(new Error("目前請使用網站版上傳照片"));
  const documentRef = (globalThis as any).document;
  const input = documentRef.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return reject(new Error("未選擇照片"));
    const reader = new (globalThis as any).FileReader();
    reader.onload = () => {
      const image = new (globalThis as any).Image();
      image.onload = () => {
        const canvas = documentRef.createElement("canvas");
        let maxSide = 1000;
        let quality = .84;
        let dataUrl = "";
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          if (dataUrl.length <= 46000) break;
          if (quality > .58) quality -= .08; else maxSide = Math.round(maxSide * .78);
        }
        resolve(dataUrl);
      };
      image.onerror = () => reject(new Error("無法讀取照片"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("無法讀取照片"));
    reader.readAsDataURL(file);
  };
  input.click();
});
const localizedPlaceName = (place: any) => {
  const details = place?.namedetails || {};
  const address = String(place?.display_name || "");
  const rawName = String(details["name:zh-Hant"] || details["name:zh"] || details["name:en"] || place?.name || address.split(",")[0] || "地點");
  if (/롯데백화점|樂天百貨|Lotte Department/i.test(`${rawName} ${address}`)) {
    if (/中區|南浦|中央洞|남포|중구/.test(address)) return "樂天百貨 光復店";
    if (/釜山鎮區|釜田|西面|부산진|서면/.test(address)) return "樂天百貨 釜山本店（西面）";
    if (/海雲臺|Centum|센텀|해운대/.test(address)) return "樂天百貨 Centum City 店";
    if (/機張|기장/.test(address)) return "樂天百貨 東釜山店";
    if (/東萊|동래/.test(address)) return "樂天百貨 東萊店";
    return "樂天百貨（釜山）";
  }
  return rawName;
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

type Expense = { id: string; title: string; amount: number; payer: string; currency?: string; splitBetween?: string[] };
type CloudLink = { inviteCode: string; memberName?: string; memberId?: string; role?: "owner" | "member" };
type CloudLinks = Record<string, CloudLink>;

type RouteMode = "driving" | "walking" | "transit" | "taxi";
type GoogleUser = { sub: string; name: string; email: string; picture?: string; idToken: string; firebaseUid?: string };
const JY_EMAILS = new Set(["allison@taiwanbar.cc", "past795@gmail.com"]);
const normalizeGoogleUser = (user: GoogleUser): GoogleUser =>
  JY_EMAILS.has(user.email.trim().toLowerCase()) ? { ...user, name: "JY" } : user;
const googleMemberId = (user: GoogleUser) =>
  JY_EMAILS.has(user.email.trim().toLowerCase()) ? "person:jy" : `google:${user.sub}`;
// GitHub Pages uses /bean/, while Cloudflare Pages is served from /.  Build the
// logo URL from the current site so the sign-in mark works on either host.
const WEB_APP_ICON = { uri: `${currentWebBase}apple-touch-icon.png?v=83630ed0dd00` };

const escapeExportText = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const safeExportName = (value: string) => (value || "豆遊旅行")
  .replace(/[\\/:*?\"<>|]/g, "-")
  .replace(/\s+/g, " ")
  .trim();

const tripExportSheets = (trip: TripPlan, tripExpenses: Expense[]) => {
  const itinerary = [["日期", "天數", "時間", "景點／行程", "地址", "交通", "營業時間", "停留時間（分鐘）", "備註"]];
  trip.days.forEach((day, index) => day.stops.forEach((stop) => itinerary.push([
    day.date || "日期未定", day.label || `第 ${index + 1} 天`, stop.time, stop.title, stop.address,
    stop.transport, stop.openingHours || "", stop.durationMinutes ? String(stop.durationMinutes) : "", stop.note
  ])));
  const overview = [
    ["旅行名稱", trip.title], ["目的地", trip.destination], ["期間", trip.period],
    ["開始日期", trip.startDate || ""], ["結束日期", trip.endDate || ""], ["同行人數", String(trip.travelers)]
  ];
  const flights = [["航線", "航班編號", "出發", "抵達", "航廈", "備註"], ...trip.flights.map((item) => [item.route, item.flightNumber, item.departure, item.arrival, item.terminal || "", item.note || ""])];
  const stays = [["住宿", "住宿期間", "地址", "入住", "退房", "設施", "櫃檯", "備註"], ...trip.accommodations.map((item) => [item.name, item.period, item.address || "", item.checkIn || "", item.checkOut || "", item.facilities || "", item.frontDesk || "", item.note || ""])];
  const shopping = [["商品", "價格", "幣別", "分類", "已購買", "範圍", "擁有者"], ...trip.shopping.map((item) => [item.name, item.price || "", item.currency || "", item.category || "", item.purchased ? "是" : "否", item.scope === "shared" ? "共享" : "個人", item.owner || ""])];
  const accounting = [["品項", "金額", "幣別", "付款人", "分帳成員"], ...tripExpenses.map((item) => [item.title, String(item.amount), item.currency || "", item.payer, (item.splitBetween || []).join("、")])];
  return [{ name: "旅行資訊", rows: overview }, { name: "每日行程", rows: itinerary }, { name: "班機", rows: flights }, { name: "住宿", rows: stays }, { name: "必買清單", rows: shopping }, { name: "記帳", rows: accounting }];
};

const spreadsheetXml = (trip: TripPlan, tripExpenses: Expense[]) => {
  const worksheets = tripExportSheets(trip, tripExpenses).map(({ name, rows }) => {
    const table = rows.map((row) => `<Row>${row.map((value) => {
      const isNumber = typeof value === "number" && Number.isFinite(value);
      return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeExportText(value)}</Data></Cell>`;
    }).join("")}</Row>`).join("");
    return `<Worksheet ss:Name="${escapeExportText(name)}"><Table>${table}</Table></Worksheet>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheets}</Workbook>`;
};

const printableTripHtml = (trip: TripPlan, tripExpenses: Expense[]) => {
  const sections = tripExportSheets(trip, tripExpenses).map(({ name, rows }) => `<section><h2>${escapeExportText(name)}</h2><table>${rows.map((row, index) => `<tr>${row.map((value) => `${index === 0 ? "<th>" : "<td>"}${escapeExportText(value)}${index === 0 ? "</th>" : "</td>"}`).join("")}</tr>`).join("")}</table></section>`).join("");
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeExportText(trip.title)}</title><style>@page{size:A4;margin:14mm}body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif;color:#202522;margin:0}h1{font-size:26px;margin:0 0 6px}h2{font-size:18px;margin:24px 0 8px;color:#5d6f91}p{color:#706b65}table{width:100%;border-collapse:collapse;font-size:11px;page-break-inside:auto}tr{page-break-inside:avoid}th,td{border:1px solid #ddd7cf;padding:6px;text-align:left;vertical-align:top}th{background:#edf1f9}section{page-break-inside:auto}</style></head><body><h1>${escapeExportText(trip.title)}</h1><p>${escapeExportText(trip.destination)}｜${escapeExportText(trip.period)}</p>${sections}<script>setTimeout(function(){window.print()},400)<\/script></body></html>`;
};

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

const parseStopMeta = (value: unknown): { routeMode?: RouteMode; openingHours?: string; openingHoursSource?: string; durationMinutes?: number; reservationRequired?: boolean; reservationNote?: string; reservationSuggestedDate?: string; reservationCompleted?: boolean } => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return {
      routeMode: (["walking", "driving", "transit", "taxi"] as RouteMode[]).includes(parsed.routeMode) ? parsed.routeMode : undefined,
      openingHours: typeof parsed.openingHours === "string" ? parsed.openingHours : undefined,
      openingHoursSource: typeof parsed.openingHoursSource === "string" ? parsed.openingHoursSource : undefined,
      durationMinutes: Number.isFinite(Number(parsed.durationMinutes)) ? Number(parsed.durationMinutes) : undefined,
      reservationRequired: parsed.reservationRequired === true,
      reservationNote: typeof parsed.reservationNote === "string" ? parsed.reservationNote : undefined,
      reservationSuggestedDate: typeof parsed.reservationSuggestedDate === "string" ? parsed.reservationSuggestedDate : undefined,
      reservationCompleted: parsed.reservationCompleted === true
    };
  } catch {
    return {};
  }
};

const parseListMeta = (value: unknown): { scope?: "shared" | "personal"; owner?: string } => {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return {
      scope: parsed.scope === "personal" ? "personal" : "shared",
      owner: typeof parsed.owner === "string" ? parsed.owner : ""
    };
  } catch {
    return { scope: "shared", owner: "" };
  }
};

const defaultPrepChecklist = () => [
  "確認全員護照效期至少六個月",
  "確認簽證、入境及過境規定",
  "下載或截圖來回機票、住宿與預約憑證",
  "投保旅遊平安險、海外醫療及緊急救援",
  "查詢目的地旅遊警示並完成外交部出國登錄",
  "保存駐外館處、保險公司與緊急聯絡方式",
  "準備信用卡、少量現金並開通海外交易",
  "確認網卡、eSIM、漫遊或 Wi-Fi 方案",
  "準備充電器、轉接頭；行動電源放隨身行李",
  "準備個人常用藥，保留原包裝與必要處方",
  "查詢當地疫情、疫苗及旅遊健康建議",
  "確認托運與手提行李、液體及禁帶物品規定",
  "查看天氣並準備適合衣物、雨具與好走的鞋",
  "下載離線地圖、翻譯及當地交通 App",
  "出發前確認門窗、水電、垃圾與寵物／植物安排"
].map((text, index) => ({
  id: `prep-default-${index + 1}`, text, completed: false, scope: "shared" as const, owner: ""
}));

const defaultPersonalPacking = (owner: string) => [
  "護照、錢包、手機",
  "上衣、褲子／裙子",
  "內衣褲、襪子、睡衣",
  "薄外套或保暖衣物",
  "好走的鞋、拖鞋",
  "牙刷、牙膏、牙線",
  "洗面乳、洗髮精、沐浴用品",
  "化妝水、乳液／保濕用品",
  "防曬、護唇膏",
  "化妝品、卸妝用品",
  "梳子、髮圈、生理用品",
  "眼鏡、隱形眼鏡與藥水",
  "個人常用藥、OK 繃",
  "充電器、充電線、轉接頭",
  "行動電源（放隨身行李）",
  "耳機、相機或其他電子用品",
  "雨傘、帽子、太陽眼鏡",
  "衛生紙、濕紙巾、口罩",
  "行李電子秤、行李鎖、行李吊牌",
  "髒衣袋、收納袋、購物袋"
].map((text, index) => ({
  id: `prep-personal-${encodeURIComponent(owner)}-${index + 1}`,
  text, completed: false, scope: "personal" as const, owner
}));

const tripToCloud = (trip: TripPlan, tripExpenses: Expense[]) => ({
  trip: {
    "旅行ID": trip.id, "名稱": trip.title, "目的地": trip.destination,
    "開始日期": trip.startDate || trip.period, "結束日期": trip.endDate || "", "主要幣別": tripExpenses[0]?.currency || "TWD",
    "封面圖片": trip.coverImage || ""
  },
  itinerary: trip.days.flatMap((day) => day.stops.map((stop, index) => ({
    "日期ID": day.id, "景點ID": stop.id, "日期": day.date, "開始時間": stop.time,
    "結束時間": JSON.stringify({ routeMode: stop.routeMode || "driving", openingHours: stop.openingHours || "", openingHoursSource: stop.openingHoursSource || "", durationMinutes: stop.durationMinutes || 0, reservationRequired: !!stop.reservationRequired, reservationNote: stop.reservationNote || "", reservationSuggestedDate: stop.reservationSuggestedDate || "", reservationCompleted: !!stop.reservationCompleted }), "景點名稱": stop.title, "地址": stop.address,
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
    "地址": hotel.address || "", "緯度": hotel.latitude ?? "", "經度": hotel.longitude ?? "", "櫃檯資訊": hotel.frontDesk || "", "設施": hotel.facilities || "",
    "訂房編號": "", "備註": hotel.note || ""
  })),
  shopping: trip.shopping.map((item) => ({
    "商品ID": item.id, "商品名稱": item.name, "分類": item.category || "",
    "價格": item.price || "", "幣別": item.currency || "", "圖片網址": item.imageUrl || "",
    "購買地點": "", "備註": JSON.stringify({ scope: item.scope || "shared", owner: item.owner || "" }), "已購買": !!item.purchased
  })).concat([{
    "商品ID": `trip-meta-${trip.id}`, "商品名稱": "旅行設定", "分類": "__TRIP_META__", "價格": "", "幣別": "",
    "圖片網址": "", "購買地點": "", "備註": JSON.stringify({
      homeBaseAccommodationId: trip.homeBaseAccommodationId,
      homeBaseByDay: trip.homeBaseByDay || {},
      accommodationByNight: trip.accommodationByNight || {},
      shoppingCatalogImported: !!trip.shoppingCatalogImported,
      unscheduledPlaces: trip.unscheduledPlaces || [],
      reservations: trip.reservations || [],
      days: trip.days.map((day) => ({ id: day.id, date: day.date, title: day.title }))
    }), "已購買": false
  }]).concat((trip.checklist || []).filter((item) => item.scope !== "personal").map((item) => ({
    "商品ID": item.id, "商品名稱": item.text, "分類": "__PREP__", "價格": "", "幣別": "",
    "圖片網址": "", "購買地點": "", "備註": JSON.stringify({ scope: item.scope || "shared", owner: item.owner || "" }),
    "已購買": !!item.completed
  }))),
  expenses: tripExpenses.map((item) => ({
    "支出ID": item.id, "項目": item.title, "金額": item.amount,
    "幣別": item.currency || "TWD", "付款人": item.payer, "分攤成員": JSON.stringify(item.splitBetween || []),
    "日期": "", "分類": "", "備註": "", "建立時間": ""
  }))
});

const cloudToTrip = (data: any): { trip: TripPlan; expenses: Expense[] } => {
  const cloudTrip = data.trip || {};
  const id = String(cloudTrip["旅行ID"]);
  const storedStartDate = normalizeTripDate(cloudTrip["開始日期"]);
  const storedEndDate = normalizeTripDate(cloudTrip["結束日期"]);
  const startDate = storedStartDate || (id === "trip-1785397565924" ? "2026-10-04" : "");
  const endDate = storedEndDate || (id === "trip-1785397565924" ? "2026-10-08" : "");
  const itinerary = Array.isArray(data.itinerary) ? data.itinerary : [];
  const tripMetaRow = (data.shopping || []).find((item: any) => String(item["分類"] || "") === "__TRIP_META__");
  let tripMeta: any = {};
  try { tripMeta = JSON.parse(String(tripMetaRow?.["備註"] || "{}")); } catch { tripMeta = {}; }
  const savedDays = Array.isArray(tripMeta.days) ? tripMeta.days : [];
  const dayIds = [...new Set([
    ...savedDays.map((day: any) => String(day.id || "")),
    ...itinerary.map((row: any) => String(row["日期ID"] || "day-1"))
  ].filter(Boolean))] as string[];
  const days: TripDay[] = dayIds.map((dayId, dayIndex) => {
    const rows = itinerary.filter((row: any) => String(row["日期ID"] || "day-1") === dayId)
      .sort((a: any, b: any) => Number(a["排序"] || 0) - Number(b["排序"] || 0));
    const savedDay = savedDays.find((day: any) => String(day.id) === dayId);
    const savedDate = String(rows[0]?.["日期"] || savedDay?.date || "");
    const date = startDate ? tripDayDateLabel(startDate, dayIndex) : (/^第\s*\d+\s*天$/.test(savedDate) ? "日期未定" : savedDate || "日期未定");
    return {
      id: dayId, label: `DAY ${dayIndex + 1}`, date,
      title: savedDay?.title || `${cloudTrip["目的地"] || "旅行"}・自由安排`,
      stops: rows.map((row: any) => {
        const meta = parseStopMeta(row["結束時間"]);
        return {
          id: String(row["景點ID"]), time: formatCloudDateTime(row["開始時間"]) || "彈性",
          title: String(row["景點名稱"] || "未命名景點"), address: String(row["地址"] || "地址待補"),
          transport: String(row["交通方式"] || "尚未安排"), transportMode: "其他" as const,
          note: String(row["備註"] || ""), latitude: row["緯度"] === "" ? undefined : Number(row["緯度"]),
          longitude: row["經度"] === "" ? undefined : Number(row["經度"]),
          routeMode: meta.routeMode || "driving", openingHours: meta.openingHours || "", openingHoursSource: meta.openingHoursSource || "", durationMinutes: meta.durationMinutes || 0, reservationRequired: meta.reservationRequired, reservationNote: meta.reservationNote || "", reservationSuggestedDate: meta.reservationSuggestedDate || "", reservationCompleted: meta.reservationCompleted
        };
      })
    };
  });
  const trip: TripPlan = {
    id, title: String(cloudTrip["名稱"] || "未命名旅行"),
    destination: String(cloudTrip["目的地"] || ""),
    startDate,
    endDate,
    coverImage: String(cloudTrip["封面圖片"] || ""),
    homeBaseAccommodationId: (() => {
      const row = (data.shopping || []).find((item: any) => String(item["分類"] || "") === "__TRIP_META__");
      try { return JSON.parse(String(row?.["備註"] || "{}")).homeBaseAccommodationId || ""; } catch { return ""; }
    })(),
    homeBaseByDay: (() => {
      const row = (data.shopping || []).find((item: any) => String(item["分類"] || "") === "__TRIP_META__");
      try { return JSON.parse(String(row?.["備註"] || "{}")).homeBaseByDay || {}; } catch { return {}; }
    })(),
    accommodationByNight: (() => {
      const row = (data.shopping || []).find((item: any) => String(item["分類"] || "") === "__TRIP_META__");
      try { return JSON.parse(String(row?.["備註"] || "{}")).accommodationByNight || {}; } catch { return {}; }
    })(),
    shoppingCatalogImported: !!tripMeta.shoppingCatalogImported,
    unscheduledPlaces: Array.isArray(tripMeta.unscheduledPlaces) ? tripMeta.unscheduledPlaces : [],
    reservations: Array.isArray(tripMeta.reservations) ? tripMeta.reservations : [],
    period: startDate
      ? tripPeriodLabel(startDate, endDate)
      : String(cloudTrip["開始日期"] || "日期未定"),
    travelers: Math.max(1, (data.members || []).length || 1),
    days: days.length ? days : [{ id: `${id}-day-1`, label: "DAY 1", date: tripDayDateLabel(startDate, 0), title: "自由安排", stops: [] }],
    flights: (data.flights || []).map((row: any) => ({
      id: String(row["航班ID"]), route: String(row["出發機場"] || ""),
      flightNumber: String(row["航班編號"] || ""), departure: formatCloudDateTime(row["出發時間"]),
      arrival: formatCloudDateTime(row["抵達時間"]), terminal: String(row["航廈"] || ""), note: String(row["備註"] || "")
    })),
    accommodations: ((data.accommodations || []).length
      ? data.accommodations
      : String(cloudTrip["旅行ID"] || "") === "trip-1785397565924" ? BUSAN_ACCOMMODATIONS : []
    ).map((row: any) => ({
      id: String(row["住宿ID"]), name: String(row["住宿名稱"] || ""), period: formatCloudDateTime(row["入住日期"]),
      address: String(row["地址"] || ""), latitude: row["緯度"] === "" || row["緯度"] == null ? undefined : Number(row["緯度"]), longitude: row["經度"] === "" || row["經度"] == null ? undefined : Number(row["經度"]), checkIn: formatCloudDateTime(row["入住時間"]), checkOut: formatCloudDateTime(row["退房時間"]),
      facilities: String(row["設施"] || ""), frontDesk: String(row["櫃檯資訊"] || ""), note: String(row["備註"] || "")
    })),
    shopping: (data.shopping || []).filter((row: any) => !["__PREP__", "__TRIP_META__"].includes(String(row["分類"] || ""))).map((row: any) => {
      const meta = parseListMeta(row["備註"]);
      return {
        id: String(row["商品ID"]), name: String(row["商品名稱"] || ""), price: String(row["價格"] || ""),
        currency: String(row["幣別"] || ""), category: String(row["分類"] || ""), imageUrl: String(row["圖片網址"] || ""),
        purchased: row["已購買"] === true || String(row["已購買"]).toUpperCase() === "TRUE",
        scope: meta.scope, owner: meta.owner
      };
    }),
    checklist: (() => {
      const rows = (data.shopping || []).filter((row: any) => String(row["分類"] || "") === "__PREP__");
      if (!rows.length) return defaultPrepChecklist();
      return rows.map((row: any) => {
      const meta = parseListMeta(row["備註"]);
      return {
        id: String(row["商品ID"]), text: String(row["商品名稱"] || ""),
        completed: row["已購買"] === true || String(row["已購買"]).toUpperCase() === "TRUE",
        scope: meta.scope, owner: meta.owner
      };
      });
    })()
  };
  const expenses = (data.expenses || []).map((row: any) => {
    let splitBetween: string[] = [];
    try {
      const parsed = JSON.parse(String(row["分攤成員"] || "[]"));
      if (Array.isArray(parsed)) splitBetween = parsed.map(String).filter(Boolean);
    } catch {
      splitBetween = String(row["分攤成員"] || "").split(/[、,]/).map((name) => name.trim()).filter(Boolean);
    }
    return {
      id: String(row["支出ID"]), title: String(row["項目"] || ""), amount: Number(row["金額"] || 0),
      payer: String(row["付款人"] || "我"), currency: String(row["幣別"] || "TWD"), splitBetween
    };
  });
  return { trip, expenses };
};

const BUSAN_ACCOMMODATIONS = [
  {
    "住宿ID": "busan-hotel-1", "住宿名稱": "Toyoko Inn Busan Jungang Station", "入住日期": "2026-10-04",
    "退房日期": "2026-10-05", "入住時間": "15:00", "退房時間": "10:00",
    "地址": "125 Jungang-daero, Jung-gu, Busan 48924", "櫃檯資訊": "24 小時櫃檯；電話 +82 51-442-1045",
    "設施": "免費早餐 06:30–09:00、免費 Wi-Fi、投幣洗衣、微波爐、飲水／製冰機、販賣機、按摩椅、停車場",
    "訂房編號": "", "備註": "中央站 17 號出口步行約 5 分鐘；資料來源：Toyoko Inn 官方網站"
  },
  {
    "住宿ID": "busan-hotel-2", "住宿名稱": "Avani Central Busan", "入住日期": "2026-10-05",
    "退房日期": "2026-10-08", "入住時間": "15:00", "退房時間": "11:00",
    "地址": "133 Jeonpo-daero, Nam-gu, Busan 48400", "櫃檯資訊": "24 小時櫃檯；電話 +82 51-791-5800",
    "設施": "免費 Wi-Fi、健身中心、SPA、餐廳、會議及活動空間", "訂房編號": "",
    "備註": "釜山國際金融中心旁、地鐵 2 號線 BIFC／Busan Bank Station 附近；資料來源：Avani 官方網站"
  }
];

const starterTrips: TripPlan[] = [{
  id: "local-welcome",
  title: "開始第一趟旅行",
  destination: "尚未建立",
  period: "日期未定",
  travelers: 1,
  days: [{ id: "welcome-day-1", label: "DAY 1", date: "日期未定", title: "尚未安排", stops: [] }],
  flights: [],
  accommodations: [],
  shopping: [],
  checklist: defaultPrepChecklist()
}];

const verifiedOitaHours = (title: string) => {
  if (/Park Place 大分|パークプレイス大分/i.test(title)) return { hours: "物販 10:00–21:00（部分店舖不同）", source: "Park Place Oita 官方網站" };
  if (/AMU PLAZA 大分|アミュプラザおおいた/i.test(title)) return { hours: "物販 10:00–21:00（餐飲與個別店舖不同）", source: "JR 九州／AMU PLAZA 官方資料" };
  return undefined;
};

const verifiedStopLocation = (stop: Stop): Partial<Stop> | undefined => {
  const text = `${stop.title} ${stop.address}`;
  if (/大分機場|大分空港|Oita Airport/i.test(text)) {
    return {
      address: "〒873-0231 大分県国東市安岐町下原13",
      latitude: 33.479444,
      longitude: 131.737222
    };
  }
  return undefined;
};

const normalizeTripSchedule = (trip: TripPlan): TripPlan => {
  // Older entries created from Google Sheets sometimes use YYYY/MM/DD.
  // Keep one internal ISO format, so the home-card period and each day tab
  // are always calculated from exactly the same dates.
  const startDate = normalizeTripDate(trip.startDate || "");
  const endDate = normalizeTripDate(trip.endDate || "");
  return {
    ...trip,
    startDate: startDate || trip.startDate,
    endDate: endDate || trip.endDate,
    period: startDate ? tripPeriodLabel(startDate, endDate) : trip.period,
    days: trip.days.map((day, dayIndex) => ({
      ...day,
      date: startDate ? tripDayDateLabel(startDate, dayIndex) : day.date,
      title: day.title.replace(/（住宿未完整設定・草稿）/g, ""),
      stops: day.stops.map((stop) => {
      const hour = Number(stop.time.match(/^(\d{1,2}):/)?.[1]);
      const verified = verifiedOitaHours(stop.title);
      const verifiedLocation = verifiedStopLocation(stop);
      return {
        ...stop,
        ...verifiedLocation,
        time: Number.isFinite(hour) && hour >= 24 ? "彈性" : stop.time,
        openingHours: stop.openingHours || verified?.hours,
        openingHoursSource: stop.openingHoursSource || verified?.source
      };
      })
    }))
  };
};

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
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [trips, setTrips] = useState<TripPlan[]>(starterTrips);
  const [activeTripId, setActiveTripId] = useState("busan-2026");
  const [selectedDayId, setSelectedDayId] = useState("day1");
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [addingFavorite, setAddingFavorite] = useState(false);
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteAddress, setFavoriteAddress] = useState("");
  const [favoriteCountry, setFavoriteCountry] = useState("");
  const [favoriteCity, setFavoriteCity] = useState("");
  const [favoriteNote, setFavoriteNote] = useState("");
  const [favoriteDayCount, setFavoriteDayCount] = useState("5");
  const [favoriteIncludeAll, setFavoriteIncludeAll] = useState(true);
  const [favoriteArrivalDate, setFavoriteArrivalDate] = useState("");
  const [favoriteArrivalTime, setFavoriteArrivalTime] = useState("");
  const [favoriteArrivalPlace, setFavoriteArrivalPlace] = useState("");
  const [favoriteDepartureDate, setFavoriteDepartureDate] = useState("");
  const [favoriteDepartureTime, setFavoriteDepartureTime] = useState("");
  const [favoriteDeparturePlace, setFavoriteDeparturePlace] = useState("");
  const [favoriteAccommodationText, setFavoriteAccommodationText] = useState("");
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<string[]>([]);
  const [collapsedFavoriteCountries, setCollapsedFavoriteCountries] = useState<string[]>([]);
  const [collapsedFavoriteCities, setCollapsedFavoriteCities] = useState<string[]>([]);
  const [favoriteCollapseReady, setFavoriteCollapseReady] = useState(false);
  const [favoriteTargetTripId, setFavoriteTargetTripId] = useState("");
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);
  const [unscheduledExpanded, setUnscheduledExpanded] = useState(true);
  const [favoriteSuggestions, setFavoriteSuggestions] = useState<any[]>([]);
  const [favoriteSearchStatus, setFavoriteSearchStatus] = useState<"idle" | "loading" | "empty">("idle");
  const [favoriteLatitude, setFavoriteLatitude] = useState<number | undefined>();
  const [favoriteLongitude, setFavoriteLongitude] = useState<number | undefined>();
  const [batchFavoriteVisible, setBatchFavoriteVisible] = useState(false);
  const [batchFavoriteText, setBatchFavoriteText] = useState("");
  const [batchFavoriteCountry, setBatchFavoriteCountry] = useState("");
  const [batchFavoriteCity, setBatchFavoriteCity] = useState("");
  const [batchFavoriteStatus, setBatchFavoriteStatus] = useState("");
  const [favoriteBulkUpdating, setFavoriteBulkUpdating] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [cloudLinksLoaded, setCloudLinksLoaded] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [archivedTrips, setArchivedTrips] = useState<any[]>([]);
  const [archiveTripTarget, setArchiveTripTarget] = useState<TripPlan | null>(null);
  const [archiveEmail, setArchiveEmail] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [editing, setEditing] = useState<Stop | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftOpeningHours, setDraftOpeningHours] = useState("");
  const [draftDuration, setDraftDuration] = useState("");
  const [draftTransport, setDraftTransport] = useState("");
  const [draftRouteMode, setDraftRouteMode] = useState<RouteMode>("driving");
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newCoverImage, setNewCoverImage] = useState("");
  const [newDayCount, setNewDayCount] = useState("5");
  const [newTravelers, setNewTravelers] = useState("2");
  const [addingStop, setAddingStop] = useState(false);
  const [newStopTitle, setNewStopTitle] = useState("");
  const [newStopTime, setNewStopTime] = useState("");
  const [newStopAddress, setNewStopAddress] = useState("");
  const [newStopTransport, setNewStopTransport] = useState("");
  const [newStopRouteMode, setNewStopRouteMode] = useState<RouteMode>("transit");
  const [newStopNote, setNewStopNote] = useState("");
  const [newStopOpeningHours, setNewStopOpeningHours] = useState("");
  const [newStopDuration, setNewStopDuration] = useState("");
  const [newStopLatitude, setNewStopLatitude] = useState<number | undefined>();
  const [newStopLongitude, setNewStopLongitude] = useState<number | undefined>();
  const [addressLookupStatus, setAddressLookupStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [addressLookupMessage, setAddressLookupMessage] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [placeSuggestionStatus, setPlaceSuggestionStatus] = useState<"idle" | "loading" | "empty">("idle");
  const suppressNextPlaceSearchRef = useRef(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [addingReservation, setAddingReservation] = useState(false);
  const [reservationTitleDraft, setReservationTitleDraft] = useState("");
  const [reservationDateDraft, setReservationDateDraft] = useState("");
  const [reservationNoteDraft, setReservationNoteDraft] = useState("");
  const [reservationWebsiteDraft, setReservationWebsiteDraft] = useState("");
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePayer, setExpensePayer] = useState("我");
  const [expenseCurrency, setExpenseCurrency] = useState("KRW");
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>([]);
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
  const [deletingDay, setDeletingDay] = useState<TripDay | null>(null);
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null);
  const [leavingTrip, setLeavingTrip] = useState<TripPlan | null>(null);
  const [editingTravelers, setEditingTravelers] = useState(false);
  const [travelerDraft, setTravelerDraft] = useState("2");
  const [tripNameDraft, setTripNameDraft] = useState("");
  const [tripStartDraft, setTripStartDraft] = useState("");
  const [tripEndDraft, setTripEndDraft] = useState("");
  const [tripCoverDraft, setTripCoverDraft] = useState("");
  const [addingAccommodation, setAddingAccommodation] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelPeriod, setHotelPeriod] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelLatitude, setHotelLatitude] = useState<number | undefined>();
  const [hotelLongitude, setHotelLongitude] = useState<number | undefined>();
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelFacilities, setHotelFacilities] = useState("");
  const [hotelFrontDesk, setHotelFrontDesk] = useState("");
  const [hotelNote, setHotelNote] = useState("");
  const [hotelSuggestions, setHotelSuggestions] = useState<any[]>([]);
  const [hotelSearchStatus, setHotelSearchStatus] = useState<"idle" | "loading" | "empty">("idle");
  const suppressNextHotelSearchRef = useRef(false);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [exchangeRateDate, setExchangeRateDate] = useState("");
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState("");
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFocusStop, setAiFocusStop] = useState<Stop | null>(null);

  useEffect(() => {
    const count = inclusiveDayCount(newStartDate, newEndDate);
    if (count) setNewDayCount(String(Math.min(14, count)));
  }, [newStartDate, newEndDate]);
  const [addingShoppingItem, setAddingShoppingItem] = useState(false);
  const [shoppingName, setShoppingName] = useState("");
  const [shoppingPrice, setShoppingPrice] = useState("");
  const [shoppingCurrency, setShoppingCurrency] = useState("KRW");
  const [shoppingCategory, setShoppingCategory] = useState("");
  const [shoppingImageUrl, setShoppingImageUrl] = useState("");
  const [shoppingScope, setShoppingScope] = useState<"shared" | "personal">("shared");
  const [shoppingView, setShoppingView] = useState<"shared" | "mine">("shared");
  const [checklistText, setChecklistText] = useState("");
  const [checklistError, setChecklistError] = useState("");
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
  const tripDirtyRef = useRef(false);
  const cloudLinksRef = useRef<CloudLinks>({});
  const itineraryListRef = useRef<any>(null);
  const geocodedDaysRef = useRef<Set<string>>(new Set());
  const firestoreStartedRef = useRef("");
  const firestoreStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firestoreSeededTripsRef = useRef<Set<string>>(new Set());

  useEffect(() => onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    try {
      const savedText = await AsyncStorage.getItem(AUTH_KEY);
      const saved = savedText ? normalizeGoogleUser(JSON.parse(savedText) as GoogleUser) : null;
      if (firebaseUser) {
        const firebaseToken = await firebaseUser.getIdToken();
        const user = normalizeGoogleUser({
          sub: saved?.sub || firebaseUser.uid,
          name: firebaseUser.displayName || saved?.name || firebaseUser.email || "Google 使用者",
          email: firebaseUser.email || saved?.email || "",
          picture: firebaseUser.photoURL || saved?.picture || undefined,
          // Firebase 的登入工作階段不等於 Google Identity 的 id_token。
          // Apps Script 打包要驗證後者；過期時保留登入畫面，但要求使用者重新取得 Google 授權。
          idToken: saved && isGoogleTokenFresh(saved.idToken) ? saved.idToken : "",
          firebaseUid: firebaseUser.uid
        });
        setGoogleUser(user);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
      } else if (saved && isGoogleTokenFresh(saved.idToken)) {
        try {
          await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(saved.idToken));
          return;
        } catch {
          setGoogleUser(saved);
        }
      } else {
        setGoogleUser(null);
        await AsyncStorage.removeItem(AUTH_KEY);
      }
    } catch {
      setGoogleUser(null);
    } finally {
      setAuthReady(true);
    }
  }), []);

  useEffect(() => {
    AsyncStorage.getItem(CLOUD_MEMBER_KEY).then((value) => {
      if (value) setCloudMembers(JSON.parse(value));
    }).catch(() => undefined);
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
            shopping: trip.shopping ?? [],
            checklist: trip.checklist?.length ? trip.checklist : defaultPrepChecklist()
          };
        });
        if (Array.isArray(savedTrips) && savedTrips.length) {
          setTrips(savedTrips);
          setActiveTripId(savedTrips[0]!.id);
          setSelectedDayId(savedTrips[0]!.days[0]?.id ?? "");
        }
      }
    }).catch(() => undefined).finally(() => setTripsLoaded(true));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(EXPENSE_KEY).then((value) => {
      if (value) setExpenses(JSON.parse(value));
    }).catch(() => undefined).finally(() => setExpensesLoaded(true));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((value) => {
      if (!value) return;
      const parsed = JSON.parse(value) as FavoritePlace[];
      const repaired = parsed.map((place) => {
        if (!/白淺灘|huinnyeoul/i.test(place.name) || (place.address && place.address !== "地址待補")) return place;
        return {
          ...place,
          address: "釜山廣域市影島區瀛仙洞4街 1044-4",
          country: "韓國",
          city: "釜山",
          latitude: 35.0787,
          longitude: 129.0443,
          note: place.note || "海景散步、拍照、欣賞海岸風景。",
        };
      });
      setFavorites(repaired);
      if (JSON.stringify(repaired) !== JSON.stringify(parsed)) AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(repaired)).catch(() => undefined);
    }).catch(() => undefined).finally(() => setFavoritesLoaded(true));
  }, []);

  const persistFavorites = (next: FavoritePlace[]) => {
    setFavorites(next);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => undefined);
    if (firestoreConnected && googleUser?.firebaseUid) {
      saveFirestoreFavorites(firestorePersonId(googleUser.email, googleUser.firebaseUid), next).catch(() => undefined);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(CLOUD_LINK_KEY).then((value) => {
      if (!value) return;
      const links = JSON.parse(value) as CloudLinks;
      cloudLinksRef.current = links;
      setCloudLinks(links);
    }).catch(() => undefined).finally(() => setCloudLinksLoaded(true));
  }, []);

  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? trips[0]!;
  const days = activeTrip.days;
  const selectedDay = days.find((d) => d.id === selectedDayId) ?? days[0]!;
  const showingAllDays = selectedDayId === ALL_DAYS_ID;
  const reservationStops = useMemo(() => activeTrip.days.flatMap((day, index) => {
    const itineraryDate = isoDateAtOffset(activeTrip.startDate || "", index) || day.date;
    return day.stops.map((stop) => ({ day, stop, info: reservationInfoForStop(stop, itineraryDate) })).filter((item) => item.info.required);
  }), [activeTrip.days, activeTrip.startDate]);
  const toggleReservationCompleted = (dayId: string, stopId: string) => {
    updateActiveTrip({ days: activeTrip.days.map((day) => day.id !== dayId ? day : { ...day, stops: day.stops.map((stop) => stop.id !== stopId ? stop : { ...stop, reservationRequired: true, reservationCompleted: !stop.reservationCompleted }) }) });
  };
  const saveManualReservation = () => {
    const title = reservationTitleDraft.trim();
    if (!title) { showToast("請先填寫預約事項名稱"); return; }
    updateActiveTrip({ reservations: [...(activeTrip.reservations || []), { id: `reservation-${Date.now()}`, title, suggestedDate: reservationDateDraft.trim(), note: reservationNoteDraft.trim(), website: reservationWebsiteDraft.trim(), completed: false }] });
    setReservationWebsiteDraft("");
    setReservationTitleDraft(""); setReservationDateDraft(""); setReservationNoteDraft(""); setAddingReservation(false);
    showToast("已新增預約提醒，並同步給旅伴");
  };
  const toggleManualReservation = (id: string) => updateActiveTrip({ reservations: (activeTrip.reservations || []).map((item) => item.id === id ? { ...item, completed: !item.completed } : item) });
  const removeManualReservation = (id: string) => updateActiveTrip({ reservations: (activeTrip.reservations || []).filter((item) => item.id !== id) });
  const importBusanBackupsToFavorites = () => {
    const names = new Set(favorites.map((item) => item.name.trim().toLowerCase()));
    const additions = BUSAN_BACKUP_FAVORITES.filter((item) => !names.has(item.name.trim().toLowerCase()));
    if (!additions.length) {
      showToast("釜山備案已經都在你的收藏中");
      return;
    }
    persistFavorites([...favorites, ...additions]);
    setSelectedFavoriteIds((current) => [...new Set([...current, ...additions.map((item) => item.id)])]);
    showToast(`已加入 ${additions.length} 個釜山備案到收藏`);
  };
  const selectedFavorites = favorites.filter((place) => selectedFavoriteIds.includes(place.id));
  const favoriteTree = useMemo(() => favorites.reduce((countries, place) => {
    const country = place.country || "未分類國家";
    const city = place.city || "未分類城市";
    countries[country] ||= {};
    (countries[country]![city] ||= []).push(place);
    return countries;
  }, {} as Record<string, Record<string, FavoritePlace[]>>), [favorites]);

  useEffect(() => {
    if (!googleUser?.firebaseUid || !tripsLoaded || !expensesLoaded || !favoritesLoaded || !cloudLinksLoaded) return;
    const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid);
    const migrationKey = `${personId}:${trips.map((trip) => trip.id).join(",")}`;
    if (firestoreStartedRef.current === migrationKey) return;
    firestoreStartedRef.current = migrationKey;
    let cancelled = false;
    let stopFavorites: (() => void) | undefined;
    (async () => {
      try {
        await ensureFirestoreUser(personId, { name: googleUser.name, email: googleUser.email, picture: googleUser.picture });
        await seedFirestoreFavorites(personId, favorites);
        // Firestore is authoritative after sign-in. Do not upload every trip
        // found in this browser's local storage here: an old Safari/PWA cache
        // could otherwise recreate trips that were already deleted in cloud.
        if (personId === "person-jy") {
          await repairFirestoreTripLink(personId, "trip-1785397565924").catch(() => false);
        }
        if (cancelled) return;
        stopFavorites = listenFirestoreFavorites(personId, (incoming) => {
          setFavorites(incoming as FavoritePlace[]);
          AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(incoming)).catch(() => undefined);
        });
        setFirestoreConnected(true);
      } catch (error: any) {
        firestoreStartedRef.current = "";
        setFirestoreConnected(false);
        setSyncErrorMessage(`Firebase 尚未連線：${error?.message || "請確認 Firestore 規則"}`);
      }
    })();
    return () => { cancelled = true; stopFavorites?.(); };
  }, [googleUser?.firebaseUid, tripsLoaded, expensesLoaded, favoritesLoaded, cloudLinksLoaded]);

  useEffect(() => {
    if (!firestoreConnected || !activeTrip?.id) return;
    return listenFirestoreTrip(activeTrip.id, (incomingTrip, incomingExpenses) => {
      if (Date.now() - localMutationAtRef.current < 1800) return;
      const normalizedTrip = normalizeTripSchedule(incomingTrip as TripPlan);
      setTrips((current) => {
        const next = current.some((trip) => trip.id === normalizedTrip.id)
          ? current.map((trip) => trip.id === normalizedTrip.id ? normalizedTrip : trip)
          : [...current, normalizedTrip];
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setExpenses((current) => {
        const next = { ...current, [normalizedTrip.id]: incomingExpenses as Expense[] };
        AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    });
  }, [firestoreConnected, activeTrip?.id]);

  // Member chips must come from the same realtime source as the trip itself.
  // Reading old Apps Script rows here made a renamed user look like a second
  // person and prevented newly joined companions from appearing.
  useEffect(() => {
    if (!firestoreConnected || !activeTrip?.id) return;
    return listenFirestoreMembers(activeTrip.id, (members) => {
      const names = members.map((member) => member.displayName.trim()).filter(Boolean);
      setCloudMembers((current) => ({ ...current, [activeTrip.id]: [...new Set(names)] }));
    });
  }, [firestoreConnected, activeTrip?.id]);

  // A home-screen installation has its own local storage on iOS. Rebuild the
  // complete trip list from the signed-in user's Firestore links so Safari,
  // the installed web app and desktop all show the same journeys.
  useEffect(() => {
    if (!firestoreConnected || !googleUser?.firebaseUid) return;
    const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid);
    const tripStops = new Map<string, () => void>();
    const stopLinks = listenFirestoreTripLinks(personId, (links) => {
      const validLinks = links.filter((link) => typeof link?.tripId === "string" && link.tripId && !link.archived);
      const hasRealTrip = validLinks.some((link) => String(link.tripId) !== "local-welcome");
      const linkedIds = new Set(validLinks.map((link) => String(link.tripId)));
      tripStops.forEach((stop, tripId) => {
        if (!linkedIds.has(tripId)) { stop(); tripStops.delete(tripId); }
      });
      // Rebuild links from Firestore instead of merging stale local links.
      const mergedLinks: CloudLinks = {};
      validLinks.forEach((link) => {
        const tripId = String(link.tripId);
        if (tripId === "local-welcome" && hasRealTrip) return;
        const existing = mergedLinks[tripId] || cloudLinksRef.current[tripId];
        const recoveredInviteCode = tripId === "trip-1786446683379" && link.role === "owner" ? "236912" : "";
        mergedLinks[tripId] = {
          inviteCode: String(link.inviteCode || existing?.inviteCode || recoveredInviteCode),
          memberName: existing?.memberName || googleUser.name,
          memberId: existing?.memberId || personId,
          role: link.role === "owner" ? "owner" : "member"
        };
        if (!link.inviteCode && mergedLinks[tripId].inviteCode && link.role === "owner") {
          const localTrip = trips.find((trip) => trip.id === tripId);
          if (localTrip) saveFirestoreTrip(personId, "owner", localTrip, expenses[tripId] || [], mergedLinks[tripId].inviteCode).catch(() => undefined);
        }
        if (tripStops.has(tripId)) return;
        tripStops.set(tripId, listenFirestoreTrip(tripId, (incomingTrip, incomingExpenses) => {
          const rawTrip = incomingTrip as TripPlan;
          const trip = normalizeTripSchedule(rawTrip);
          if (JSON.stringify(rawTrip) !== JSON.stringify(trip)) {
            updateFirestoreTripState(personId, trip, incomingExpenses).catch(() => undefined);
          }
          setTrips((current) => {
            const withoutWelcome = current.filter((item) => item.id !== "local-welcome");
            const merged = withoutWelcome.some((item) => item.id === trip.id)
              ? withoutWelcome.map((item) => item.id === trip.id ? trip : item)
              : [...withoutWelcome, trip];
            const linked = merged.filter((item) => linkedIds.has(item.id));
            const next = linked.length ? linked : merged;
            AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
            return next;
          });
          setExpenses((current) => {
            const next = { ...current, [trip.id]: incomingExpenses as Expense[] };
            AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
            return next;
          });
          setActiveTripId((current) => current === "local-welcome" || !current ? trip.id : current);
          setSelectedDayId((current) => current === "welcome-day-1" || !current ? trip.days[0]?.id || "" : current);
          setSyncStatus("synced");
          setSyncErrorMessage("");
        }));
      });
      setTrips((current) => {
        const filtered = hasRealTrip
          ? current.filter((trip) => linkedIds.has(trip.id))
          : current.filter((trip) => trip.id === "local-welcome");
        // A fresh iOS home-screen install may receive the link snapshot before
        // the linked trip document. Never publish an empty trip array during
        // that short window; the trip listener above will replace it shortly.
        const next = filtered.length ? filtered : current;
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setExpenses((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([tripId]) => linkedIds.has(tripId)));
        AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      cloudLinksRef.current = mergedLinks;
      setCloudLinks(mergedLinks);
      AsyncStorage.setItem(CLOUD_LINK_KEY, JSON.stringify(mergedLinks)).catch(() => undefined);
    });
    return () => { stopLinks(); tripStops.forEach((stop) => stop()); };
  }, [firestoreConnected, googleUser?.firebaseUid]);
  useEffect(() => {
    const count = inclusiveDayCount(favoriteArrivalDate.replaceAll("/", "-"), favoriteDepartureDate.replaceAll("/", "-"));
    if (count) setFavoriteDayCount(String(Math.min(14, count)));
  }, [favoriteArrivalDate, favoriteDepartureDate]);
  useEffect(() => {
    AsyncStorage.getItem(FAVORITE_COLLAPSE_KEY).then((value) => {
      if (value) {
        const saved = JSON.parse(value);
        setCollapsedFavoriteCountries(Array.isArray(saved.countries) ? saved.countries : []);
        setCollapsedFavoriteCities(Array.isArray(saved.cities) ? saved.cities : []);
      }
    }).catch(() => undefined).finally(() => setFavoriteCollapseReady(true));
  }, []);
  useEffect(() => {
    if (!favoriteCollapseReady) return;
    AsyncStorage.setItem(FAVORITE_COLLAPSE_KEY, JSON.stringify({ countries: collapsedFavoriteCountries, cities: collapsedFavoriteCities })).catch(() => undefined);
  }, [favoriteCollapseReady, collapsedFavoriteCountries, collapsedFavoriteCities]);

  const favoriteFeatureText = (name: string, address = "") => {
    const text = `${name} ${address}`.toLowerCase();
    if (/白淺灘|huinnyeoul|海|沙灘|海岸|港|beach|ocean/.test(text)) return "海景散步、拍照、欣賞海岸風景。";
    if (/百貨|購物|商場|市場|mall|department|market/.test(text)) return "購物、美食與伴手禮，可安排較長停留時間。";
    if (/咖啡|coffee|cafe|café/.test(text)) return "咖啡休息、甜點與特色空間拍照。";
    if (/寺|廟|宮|神社|temple/.test(text)) return "歷史文化、建築參觀與散步。";
    if (/博物館|美術館|museum|gallery/.test(text)) return "展覽、文化體驗，建議先確認休館日。";
    if (/公園|森林|花園|步道|park|garden/.test(text)) return "散步、自然景觀與戶外拍照。";
    if (/樂園|水族館|纜車|遊艇/.test(text)) return "體驗型景點，建議預留排隊與遊玩時間。";
    return "熱門景點，適合散步、拍照並探索周邊。";
  };

  useEffect(() => {
    const title = favoriteName.trim();
    if (!addingFavorite || title.length < 2 || favoriteLatitude != null) { setFavoriteSuggestions([]); setFavoriteSearchStatus("idle"); return; }
    setFavoriteSearchStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const compact = title.replace(/\s+/g, "");
        const alias = /伏見稻荷/.test(compact) ? "Fushimi Inari Taisha"
          : /白淺灘/.test(compact) ? "Huinnyeoul Culture Village"
          : /釜山車站|釜山站/.test(compact) ? "Busan Station"
          : /樂天百貨/.test(compact) ? "Lotte Department Store Busan"
          : /新世界百貨/.test(compact) ? "Shinsegae Department Store Centum City" : title;
        const context = `${favoriteCountry} ${favoriteCity}`;
        const countryCode = /日本|japan/i.test(context) ? "jp" : /韓國|南韓|korea/i.test(context) ? "kr" : /台灣|taiwan/i.test(context) ? "tw" : "";
        const countryFilter = countryCode ? `&countrycodes=${countryCode}` : "";
        const query = encodeURIComponent(`${alias} ${favoriteCity} ${favoriteCountry}`.trim());
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=zh-TW&q=${query}${countryFilter}`, { headers: { "User-Agent": "DouyouTrip/1.0" } });
        const rows = response.ok ? await response.json() : [];
        setFavoriteSuggestions(Array.isArray(rows) ? rows : []);
        setFavoriteSearchStatus(Array.isArray(rows) && rows.length ? "idle" : "empty");
      } catch { setFavoriteSuggestions([]); setFavoriteSearchStatus("empty"); }
    }, 450);
    return () => clearTimeout(timer);
  }, [favoriteName, addingFavorite, favoriteCity, favoriteCountry, favoriteLatitude]);

  useEffect(() => {
    const title = newStopTitle.trim();
    if (suppressNextPlaceSearchRef.current) {
      suppressNextPlaceSearchRef.current = false;
      setPlaceSuggestions([]);
      setPlaceSuggestionStatus("idle");
      return;
    }
    if (!addingStop || title.length < 2) {
      setPlaceSuggestions([]);
      setPlaceSuggestionStatus("idle");
      return;
    }
    setPlaceSuggestionStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const destination = activeTrip.destination;
        const isKorea = /韓國|釜山|首爾|濟州|大邱|仁川|busan|seoul|jeju/i.test(destination);
        const isJapan = /日本|沖繩|東京|大阪|京都|北海道|福岡|japan|okinawa|tokyo|osaka|kyoto/i.test(destination);
        const countryFilter = isKorea ? "&countrycodes=kr" : isJapan ? "&countrycodes=jp" : "";
        const busanBounds = /釜山|busan/i.test(destination) ? "&viewbox=128.75,35.40,129.35,34.85&bounded=1" : "";
        const compactTitle = title.replace(/\s+/g, "");
        const alias = /釜山?樂天百貨|樂天百貨/.test(compactTitle) ? "Lotte Department Store Busan"
          : /釜山車站|釜山站/.test(compactTitle) ? "Busan Station"
          : /金海機場/.test(compactTitle) ? "Gimhae International Airport"
          : /新世界百貨/.test(compactTitle) ? "Shinsegae Department Store Centum City"
          : /海雲台/.test(compactTitle) ? title.replace(/海雲台/g, "Haeundae")
          : title;
        const query = `${alias} ${destination}`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&extratags=1&namedetails=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryFilter}${busanBounds}`);
        const rows = response.ok ? await response.json() : [];
        setPlaceSuggestions(Array.isArray(rows) ? rows : []);
        setPlaceSuggestionStatus(Array.isArray(rows) && rows.length ? "idle" : "empty");
      } catch {
        setPlaceSuggestions([]);
        setPlaceSuggestionStatus("empty");
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [newStopTitle, addingStop, activeTrip.destination]);

  useEffect(() => {
    const title = hotelName.trim();
    if (suppressNextHotelSearchRef.current) {
      suppressNextHotelSearchRef.current = false;
      setHotelSuggestions([]);
      setHotelSearchStatus("idle");
      return;
    }
    if (!addingAccommodation || title.length < 2) {
      setHotelSuggestions([]);
      setHotelSearchStatus("idle");
      return;
    }
    setHotelSearchStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const destination = activeTrip.destination;
        const countryFilter = /韓國|釜山|首爾|濟州|busan|seoul|jeju/i.test(destination) ? "&countrycodes=kr"
          : /日本|沖繩|東京|大阪|京都|japan|okinawa|tokyo|osaka|kyoto/i.test(destination) ? "&countrycodes=jp" : "";
        const query = `${title} hotel ${destination}`.trim();
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&extratags=1&namedetails=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryFilter}`);
        const rows = response.ok ? await response.json() : [];
        setHotelSuggestions(Array.isArray(rows) ? rows : []);
        setHotelSearchStatus(Array.isArray(rows) && rows.length ? "idle" : "empty");
      } catch {
        setHotelSuggestions([]);
        setHotelSearchStatus("empty");
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [hotelName, addingAccommodation, activeTrip.destination]);

  const selectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    setTimeout(() => itineraryListRef.current?.scrollToOffset?.({ offset: 0, animated: false }), 0);
  };
  useEffect(() => {
    if (selectedTool !== "天氣") return;
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError("");
    setWeatherData([]);
    const context = [activeTrip.destination, activeTrip.title, ...activeTrip.days.map((day) => day.title), ...activeTrip.days.flatMap((day) => day.stops.map((stop) => stop.address))].join("・");
    const knownPlaces = [
      { label: "大分", query: "Oita", country: "JP" }, { label: "日田", query: "Hita", country: "JP" },
      { label: "別府", query: "Beppu", country: "JP" }, { label: "由布", query: "Yufu", country: "JP" },
      { label: "九重", query: "Kokonoe", country: "JP" }, { label: "宇佐", query: "Usa Oita", country: "JP" },
      { label: "國東", query: "Kunisaki", country: "JP" }, { label: "国東", query: "Kunisaki", country: "JP" },
      { label: "豐後高田", query: "Bungotakada", country: "JP" }, { label: "豊後高田", query: "Bungotakada", country: "JP" },
      { label: "中津", query: "Nakatsu Oita", country: "JP" }, { label: "竹田", query: "Taketa Oita", country: "JP" },
      { label: "釜山", query: "Busan", country: "KR" }, { label: "首爾", query: "Seoul", country: "KR" },
      { label: "濟州", query: "Jeju", country: "KR" }, { label: "沖繩", query: "Okinawa", country: "JP" },
      { label: "東京", query: "Tokyo", country: "JP" }, { label: "大阪", query: "Osaka", country: "JP" },
      { label: "京都", query: "Kyoto", country: "JP" }, { label: "福岡", query: "Fukuoka", country: "JP" },
    ];
    const seenQueries = new Set<string>();
    const locations = knownPlaces.filter((place) => context.includes(place.label) && !seenQueries.has(place.query) && !!seenQueries.add(place.query));
    const requested = locations.length ? locations.slice(0, 12) : [{ label: activeTrip.destination, query: activeTrip.destination, country: "" }];
    Promise.allSettled(requested.map(async (location) => {
      const countryFilter = location.country ? `&countryCode=${location.country}` : "";
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.query)}&count=1&language=zh&format=json${countryFilter}`);
      const geo = await geoResponse.json();
      const place = geo.results?.[0];
      if (!place) throw new Error(`找不到 ${location.label}`);
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`);
      const data = await response.json();
      return { ...data, label: location.label, place: [place.name, place.admin1].filter(Boolean).join("・") };
    }))
      .then((results) => {
        if (cancelled) return;
        const forecasts = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        setWeatherData(forecasts);
        if (!forecasts.length) setWeatherError("目前無法取得這些地點的天氣，請稍後再試。");
        else if (forecasts.length < requested.length) setWeatherError(`已顯示 ${forecasts.length} 個地點；另有 ${requested.length - forecasts.length} 個地點暫時查不到。`);
      })
      .catch(() => { if (!cancelled) setWeatherError("目前無法取得天氣，請稍後再試。"); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTool, activeTrip.id, activeTrip.destination, activeTrip.title, activeTrip.days]);
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

  const postCloud = async (payload: any, timeoutMs = 30_000) => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(SYNC_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);
        const result = await response.json();
        if (!result.ok) throw new Error(result.error || "同步失敗");
        return result.data;
      } catch (error: any) {
        lastError = error?.name === "AbortError"
          ? new Error("同步服務等待逾時，旅行沒有封存。請先執行「寄送測試信」確認 Apps Script 的寄信權限。")
          : error instanceof Error ? error : new Error(String(error || "同步失敗"));
        const lockBusy = /鎖定|lock|另一個處理程序|其他處理程序/i.test(lastError.message);
        if (!lockBusy || attempt === 2) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1) + Math.floor(Math.random() * 500)));
      }
    }
    throw lastError || new Error("同步失敗");
  };

  const loadArchivedTrips = async (user = googleUser) => {
    if (!user?.idToken) { setArchivedTrips([]); return; }
    try {
      const response = await fetch(`${SYNC_URL}?action=myArchivedTrips&idToken=${encodeURIComponent(user.idToken)}&t=${Date.now()}`);
      const result = await response.json();
      if (result.ok && Array.isArray(result.data)) setArchivedTrips(result.data);
    } catch {}
  };

  const archiveAuthorizationExpired = !googleUser?.idToken || !isGoogleTokenFresh(googleUser.idToken);

  const confirmArchiveService = async () => {
    try {
      const response = await fetch(`${SYNC_URL}?action=health&t=${Date.now()}`);
      const result = await response.json();
      if (!result?.ok || result?.archiveVersion !== "drive-sheet-v3") {
        throw new Error("Apps Script 尚未部署最新版。請到 Apps Script 的「部署 → 管理部署 → 編輯」選擇最新版本後重新部署，再回來打包。");
      }
    } catch (error: any) {
      if (String(error?.message || "").includes("Apps Script 尚未部署")) throw error;
      throw new Error("無法確認 Google Sheet 打包服務。請確認網路後再試；旅行尚未封存。");
    }
  };

  const archiveTripAndEmail = async () => {
    if (!archiveTripTarget) return;
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("請使用瀏覽器匯出", "目前的手機版是 Web App，請在 Safari 或 Chrome 開啟豆遊後下載 Excel。");
      return;
    }
    const xml = spreadsheetXml(archiveTripTarget, expenses[archiveTripTarget.id] || []);
    const blob = new Blob(["\ufeff", xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeExportName(archiveTripTarget.title)}.xls`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Excel 已下載；旅行資料仍完整保留");
  };

  const exportTripPdf = () => {
    if (!archiveTripTarget || Platform.OS !== "web" || typeof window === "undefined") return;
    const popup = window.open("", "_blank");
    if (!popup) { Alert.alert("瀏覽器阻擋了 PDF 視窗", "請允許豆遊開啟新視窗後再試一次。"); return; }
    popup.document.open();
    popup.document.write(printableTripHtml(archiveTripTarget, expenses[archiveTripTarget.id] || []));
    popup.document.close();
    showToast("請在列印畫面選擇「儲存為 PDF」");
  };

  const sendArchiveEmailTest = async () => {
    if (!archiveTripTarget || !archiveEmail.trim()) { Alert.alert("請先輸入收件信箱"); return; }
    if (!googleUser?.idToken) { Alert.alert("請先登入 Google 帳號"); return; }
    setArchiveBusy(true);
    try {
      const data = await postCloud({ action: "archiveMailTest", tripId: archiveTripTarget.id, email: archiveEmail.trim(), idToken: googleUser.idToken, data: tripToCloud(archiveTripTarget, expenses[archiveTripTarget.id] || []) });
      Alert.alert("測試信已送出", `請到 ${data.email} 的收件匣、垃圾郵件與促銷內容搜尋「豆遊寄信測試」。旅行不會受到任何影響。`);
    } catch (error: any) {
      Alert.alert("測試寄信失敗", error?.message || "Apps Script 尚未完成寄信授權。");
    } finally { setArchiveBusy(false); }
  };

  const restoreArchivedTrip = async (tripId: string) => {
    if (!googleUser?.idToken) return;
    try {
      if (firestoreConnected && googleUser?.firebaseUid) {
        await restoreFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), tripId);
        setArchivedTrips((current) => current.filter((trip) => String(trip["旅行ID"]) !== tripId));
        setActiveTripId(tripId); setTab("itinerary");
        showToast("旅行已從封存區復原");
        return;
      }
      const data = await postCloud({ action: "restoreArchivedTrip", tripId, idToken: googleUser.idToken });
      const converted = cloudToTrip(data);
      persistTrips([...trips.filter((trip) => trip.id !== converted.trip.id && !trip.id.startsWith("local-next-")), converted.trip]);
      setExpenses((current) => ({ ...current, [converted.trip.id]: converted.expenses }));
      setArchivedTrips((current) => current.filter((trip) => String(trip["旅行ID"]) !== tripId));
      setActiveTripId(converted.trip.id); setSelectedDayId(converted.trip.days[0]?.id || ""); setTab("itinerary");
      showToast("旅行已從封存區復原");
    } catch (error: any) { Alert.alert("復原失敗", error?.message || "請稍後再試。"); }
  };

  useEffect(() => {
    if (authReady && googleUser?.idToken) loadArchivedTrips(googleUser);
  }, [authReady, googleUser?.sub]);

  const recreateMissingCloudTrip = async (trip: TripPlan, tripExpenses: Expense[], link: CloudLink) => {
    const localStopCount = trip.days.reduce((sum, day) => sum + day.stops.length, 0);
    if (!localStopCount) throw new Error("這台裝置沒有完整行程，請改由保有行程資料的裝置修復");
    await postCloud({
      action: "createTrip",
      inviteCode: link.inviteCode,
      trip: {
        "旅行ID": trip.id,
        "名稱": trip.title,
        "目的地": trip.destination,
        "開始日期": trip.startDate || trip.period,
        "結束日期": trip.endDate || "",
        "封面圖片": trip.coverImage || "",
        "主要幣別": tripExpenses[0]?.currency || "TWD"
      },
      member: {
        "成員ID": link.memberId || (googleUser ? googleMemberId(googleUser) : `owner-${Date.now()}`),
        "顯示名稱": link.memberName || googleUser?.name || "建立者",
        "角色": "owner"
      }
    });
    await postCloud({
      action: "syncTrip",
      tripId: trip.id,
      inviteCode: link.inviteCode,
      data: tripToCloud(trip, tripExpenses)
    });
  };

  const resetCloudMembersToOwner = (tripId: string, link: CloudLink) => {
    const ownerNames = [link.memberName || googleUser?.name].filter((name): name is string => !!name && name !== "我");
    setCloudMembers((current) => {
      const next = { ...current, [tripId]: [...new Set(ownerNames)] };
      AsyncStorage.setItem(CLOUD_MEMBER_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const queueFirestoreState = (trip: TripPlan, tripExpenses: Expense[]) => {
    if (!firestoreConnected || !googleUser?.firebaseUid) return;
    if (firestoreStateTimerRef.current) clearTimeout(firestoreStateTimerRef.current);
    firestoreStateTimerRef.current = setTimeout(() => {
      firestoreStateTimerRef.current = null;
      const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid!);
      updateFirestoreTripState(personId, trip, tripExpenses).catch((error: any) => {
        setSyncErrorMessage(`Firebase 同步失敗：${error?.message || "請稍後重試"}`);
      });
    }, 350);
  };

  const syncTripNow = async (trip: TripPlan, tripExpenses: Expense[]) => {
    queueFirestoreState(trip, tripExpenses);
    if (firestoreConnected) {
      tripDirtyRef.current = false;
      setSyncStatus("synced");
      setSyncErrorMessage("");
      return;
    }
    if (uploadingRef.current) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => { syncTimer.current = null; syncTripNow(trip, tripExpenses); }, 1200);
      return;
    }
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
      tripDirtyRef.current = false;
      setSyncStatus("synced");
    } catch (error: any) {
      if (String(error?.message || "").includes("找不到旅行")) {
        try {
          await recreateMissingCloudTrip(trip, tripExpenses, link);
          tripDirtyRef.current = false;
          resetCloudMembersToOwner(trip.id, link);
          setSyncStatus("synced");
          setSyncErrorMessage("");
          showToast("雲端旅行已從本機資料恢復並重新同步");
          return;
        } catch (repairError: any) {
          setSyncStatus("error");
          setSyncErrorMessage(repairError?.message || "無法恢復雲端旅行");
          return;
        }
      }
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "上傳失敗，請稍後再試。");
    } finally {
      uploadingRef.current = false;
    }
  };

  const syncExpensesNow = async (trip: TripPlan, tripExpenses: Expense[]) => {
    if (firestoreConnected && googleUser?.firebaseUid) {
      setSyncStatus("syncing");
      try {
        await updateFirestoreTripState(firestorePersonId(googleUser.email, googleUser.firebaseUid), trip, tripExpenses);
        setSyncStatus("synced");
        setSyncErrorMessage("");
      } catch (error: any) {
        setSyncStatus("error");
        setSyncErrorMessage(`Firebase 記帳同步失敗：${error?.message || "請稍後重試"}`);
      }
      return;
    }
    if (uploadingRef.current) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => { syncTimer.current = null; syncExpensesNow(trip, tripExpenses); }, 1200);
      return;
    }
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
      if (String(error?.message || "").includes("找不到旅行")) {
        try {
          await recreateMissingCloudTrip(trip, tripExpenses, link);
          resetCloudMembersToOwner(trip.id, link);
          setSyncStatus("synced");
          setSyncErrorMessage("");
          showToast("雲端旅行已從本機資料恢復並重新同步");
          return;
        } catch (repairError: any) {
          setSyncStatus("error");
          setSyncErrorMessage(repairError?.message || "無法恢復雲端旅行");
          return;
        }
      }
      setSyncStatus("error");
      setSyncErrorMessage(error?.message || "支出上傳失敗，請稍後再試。");
    } finally {
      uploadingRef.current = false;
    }
  };

  const queueCloudSync = (trip: TripPlan, tripExpenses: Expense[]) => {
    if (firestoreConnected) { queueFirestoreState(trip, tripExpenses); return; }
    if (!cloudLinksRef.current[trip.id]) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      syncTripNow(trip, tripExpenses);
    }, 700);
  };

  const pullCloudTrip = async (tripId: string, inviteCode: string, quiet = false) => {
    if (pullingRef.current || (quiet && (uploadingRef.current || tripDirtyRef.current || !!syncTimer.current))) return null;
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
      const incomingTripBase = shouldRecoverBusan
        ? { ...converted.trip, days: localStopCount > 0 ? localTrip!.days : busanInitialTrip }
        : converted.trip;
      const localPersonalChecklist = (localTrip?.checklist || []).filter((item) => item.scope === "personal");
      const incomingTrip = {
        ...incomingTripBase,
        checklist: [
          ...(incomingTripBase.checklist || []).filter((item) => item.scope !== "personal"),
          ...localPersonalChecklist
        ]
      };
      const localSelectedDay = localTrip?.days.find((day) => day.id === selectedDayId);
      const incomingSelectedDay = incomingTrip.days.find((day) => day.id === selectedDayId);
      if (quiet && localSelectedDay && incomingSelectedDay &&
          JSON.stringify(localSelectedDay.stops) !== JSON.stringify(incomingSelectedDay.stops)) {
        setPreviousStops([...localSelectedDay.stops]);
      }
      const memberNames = (result.data.members || []).map((row: any) => String(row["顯示名稱"] || "")).filter((name: string) => name && name !== "我");
      setCloudMembers((current) => {
        const nextNames = [...new Set(memberNames)] as string[];
        const next = { ...current, [tripId]: nextNames };
        AsyncStorage.setItem(CLOUD_MEMBER_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      if (requestStartedAt < localMutationAtRef.current) return null;
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
      const link = cloudLinksRef.current[tripId];
      const localTripForRepair = trips.find((trip) => trip.id === tripId);
      if (String(error?.message || "").includes("找不到旅行") && link && localTripForRepair) {
        resetCloudMembersToOwner(tripId, link);
        try {
          await recreateMissingCloudTrip(localTripForRepair, expenses[tripId] || [], link);
          resetCloudMembersToOwner(tripId, link);
          setSyncStatus("synced");
          setSyncErrorMessage("");
          showToast("雲端旅行已從本機完整恢復");
          return localTripForRepair;
        } catch (repairError: any) {
          setSyncStatus("error");
          setSyncErrorMessage(repairError?.message || "無法恢復雲端旅行");
          return null;
        }
      }
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
    if (!googleUser || !link || firestoreConnected) return;
    let cancelled = false;
    const restoreMyMembership = async () => {
      try {
        await postCloud({
          action: "joinTrip",
          tripId: activeTrip.id,
          inviteCode: link.inviteCode,
          member: {
            "成員ID": link.memberId || googleMemberId(googleUser),
            "顯示名稱": link.memberName || googleUser.name,
            "角色": link.role || "member"
          }
        });
      } catch {
        // The regular pull below will surface a real connection error if needed.
      }
      if (!cancelled) pullCloudTrip(activeTrip.id, link.inviteCode, true);
    };
    restoreMyMembership();
    const timer = setInterval(() => {
      pullCloudTrip(activeTrip.id, link.inviteCode, true);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTrip.id, selectedDayId, googleUser?.sub, cloudLinks[activeTrip.id]?.inviteCode, firestoreConnected]);

  const persistTrips = (next: TripPlan[]) => {
    localMutationAtRef.current = Date.now();
    tripDirtyRef.current = true;
    setTrips(next);
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
    const changed = next.find((trip) => trip.id === activeTripId);
    if (changed) {
      queueFirestoreState(changed, expenses[changed.id] ?? []);
      queueCloudSync(changed, expenses[changed.id] ?? []);
    }
  };

  const updateStops = (stops: Stop[]) => {
    if (stops !== selectedDay.stops) setPreviousStops([...selectedDay.stops]);
    const next = trips.map((trip) => trip.id !== activeTrip.id ? trip : {
      ...trip,
      days: trip.days.map((day) => day.id === selectedDay.id ? { ...day, stops } : day)
    });
    persistTrips(next);
  };

  const selectedDayGeocodeSignature = selectedDay
    ? selectedDay.stops.map((stop) => [stop.id, stop.title, stop.address, stop.latitude ?? "", stop.longitude ?? "", stop.openingHours ?? ""].join("~")).join("|")
    : "";

  useEffect(() => {
    if (!selectedDay) return;
    // A day can receive more stops through batch import after it was first
    // visited.  Keep the actual stop state in the key so new address rows are
    // still geocoded instead of being skipped as an already-visited day.
    const geocodeKey = `${activeTrip.id}:${selectedDay.id}:${selectedDayGeocodeSignature}`;
    if (geocodedDaysRef.current.has(geocodeKey)) return;
    const needsEnrichment = selectedDay.stops.some((stop) =>
      stop.latitude == null || stop.longitude == null || (!!VERIFIED_OPENING_HOURS[stop.id] && !stop.openingHours)
    );
    if (!needsEnrichment) return;
    geocodedDaysRef.current.add(geocodeKey);
    let cancelled = false;
    (async () => {
      const resolved: Stop[] = [];
      for (const stop of selectedDay.stops) {
        const verifiedHours = VERIFIED_OPENING_HOURS[stop.id];
        const enriched = verifiedHours && !stop.openingHours
          ? { ...stop, openingHours: verifiedHours.hours, openingHoursSource: verifiedHours.source }
          : stop;
        if (enriched.latitude != null && enriched.longitude != null) { resolved.push(enriched); continue; }
        const known = KNOWN_COORDINATES[stop.id];
        if (known) { resolved.push({ ...enriched, latitude: known[0], longitude: known[1] }); continue; }
        const cleanTitle = enriched.title.replace(/^[^A-Za-z0-9\u3400-\u9fff\uac00-\ud7af]+/, "");
        try {
          const hasAddress = enriched.address && enriched.address !== "地址待補";
          const query = hasAddress ? enriched.address : `${cleanTitle} ${activeTrip.destination}`;
          const japanQuery = /日本|大分|別府|由布|日田|九重|宇佐|國東|中津|竹田/.test(`${activeTrip.destination} ${query}`);
          const countryCode = japanQuery ? "&countrycodes=jp" : /韓國|釜山|首爾|濟州/.test(`${activeTrip.destination} ${query}`) ? "&countrycodes=kr" : "";

          // Full Japanese postal addresses are more reliably resolved by the
          // Geospatial Information Authority of Japan than a place-name search.
          if (japanQuery && hasAddress) {
            const japaneseAddress = query.replace(/\s+\d+F\b.*$/i, "").replace(/\s*\/.*$/, "").trim();
            const gsiResponse = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(japaneseAddress)}`);
            const feature = gsiResponse.ok ? (await gsiResponse.json())?.[0] : null;
            const coordinates = feature?.geometry?.coordinates;
            if (Array.isArray(coordinates) && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))) {
              resolved.push({ ...enriched, longitude: Number(coordinates[0]), latitude: Number(coordinates[1]) });
              continue;
            }
          }

          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryCode}`);
          const data = response.ok ? await response.json() : [];
          const match = data?.[0];
          resolved.push(match && Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon))
            ? { ...enriched, latitude: Number(match.lat), longitude: Number(match.lon), address: enriched.address === "地址待補" ? String(match.display_name || enriched.address) : enriched.address }
            : enriched);
        } catch {
          resolved.push(enriched);
        }
        // Nominatim asks public clients to avoid rapid-fire requests.
        await new Promise((resolve) => setTimeout(resolve, 1050));
      }
      if (!cancelled && resolved.some((stop, index) => stop !== selectedDay.stops[index])) updateStops(resolved);
      if (resolved.some((stop) => stop.latitude == null || stop.longitude == null)) geocodedDaysRef.current.delete(geocodeKey);
    })();
    return () => { cancelled = true; };
  }, [activeTrip.id, selectedDay?.id, selectedDayGeocodeSignature]);

  // Finish repairing the rest of a trip in the background as well.  Previously
  // only the day currently on screen was enriched, which left older imported
  // days with an empty map until the user opened every single tab.
  const tripCoordinateSignature = activeTrip.days.map((day) =>
    `${day.id}:${day.stops.map((stop) => `${stop.id}:${stop.address}:${stop.latitude ?? ""}:${stop.longitude ?? ""}`).join(",")}`
  ).join("|");
  useEffect(() => {
    const nextDay = activeTrip.days.find((day) => day.id !== selectedDay?.id && day.stops.some((stop) => stop.latitude == null || stop.longitude == null));
    if (!nextDay) return;
    const repairKey = `background:${activeTrip.id}:${nextDay.id}:${tripCoordinateSignature}`;
    if (geocodedDaysRef.current.has(repairKey)) return;
    geocodedDaysRef.current.add(repairKey);
    let cancelled = false;

    (async () => {
      const repairedStops: Stop[] = [];
      for (const stop of nextDay.stops) {
        if (stop.latitude != null && stop.longitude != null) { repairedStops.push(stop); continue; }
        const known = KNOWN_COORDINATES[stop.id];
        if (known) { repairedStops.push({ ...stop, latitude: known[0], longitude: known[1] }); continue; }
        const query = stop.address && stop.address !== "地址待補" ? stop.address : `${stop.title} ${activeTrip.destination}`;
        const isJapan = /日本|大分|別府|由布|日田|九重|宇佐|國東|中津|竹田/.test(`${activeTrip.destination} ${query}`);
        const countryCode = isJapan ? "&countrycodes=jp" : /韓國|釜山|首爾|濟州/.test(`${activeTrip.destination} ${query}`) ? "&countrycodes=kr" : "";
        let repaired = stop;
        try {
          if (isJapan && stop.address && stop.address !== "地址待補") {
            const address = stop.address.replace(/\s+\d+F\b.*$/i, "").replace(/\s*\/.*$/, "").trim();
            const gsiResponse = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`);
            const feature = gsiResponse.ok ? (await gsiResponse.json())?.[0] : null;
            const point = feature?.geometry?.coordinates;
            if (Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))) {
              repaired = { ...stop, longitude: Number(point[0]), latitude: Number(point[1]) };
            }
          }
          if (repaired.latitude == null || repaired.longitude == null) {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryCode}`);
            const match = response.ok ? (await response.json())?.[0] : null;
            if (match && Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon))) {
              repaired = { ...stop, latitude: Number(match.lat), longitude: Number(match.lon) };
            }
          }
        } catch { /* Keep the stop unchanged; it will retry later. */ }
        repairedStops.push(repaired);
        await new Promise((resolve) => setTimeout(resolve, 1050));
      }
      if (!cancelled && repairedStops.some((stop, index) => stop !== nextDay.stops[index])) {
        persistTrips(trips.map((trip) => trip.id === activeTrip.id
          ? { ...trip, days: trip.days.map((day) => day.id === nextDay.id ? { ...day, stops: repairedStops } : day) }
          : trip));
      }
      if (repairedStops.some((stop) => stop.latitude == null || stop.longitude == null)) geocodedDaysRef.current.delete(repairKey);
    })();
    return () => { cancelled = true; };
  }, [activeTrip.id, selectedDay?.id, tripCoordinateSignature]);

  const updateActiveTrip = (changes: Partial<TripPlan>) => {
    persistTrips(trips.map((trip) => trip.id === activeTrip.id ? { ...trip, ...changes } : trip));
  };

  const openAiAssistant = (focus?: Stop | null) => {
    const stop = focus || null;
    setAiFocusStop(stop);
    setAiAnswer("");
    setAiError("");
    if (stop) {
      const index = selectedDay.stops.findIndex((item) => item.id === stop.id);
      const previous = index > 0 ? selectedDay.stops[index - 1] : null;
      setAiPrompt(previous
        ? `從「${previous.title}」前往「${stop.title}」怎麼走？請比較大眾運輸、步行與計程車，並提醒我適合的抵達時間與時間風險。`
        : `我正在安排「${stop.title}」，請建議適合抵達時間、預計停留時間、交通方式與注意事項。`);
    } else {
      setAiPrompt("");
    }
    setAiAssistantVisible(true);
  };

  const askDouyouAi = async () => {
    const message = aiPrompt.trim();
    if (!message) {
      setAiError("請先輸入想問豆遊小助手的問題。");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const payload = {
        message,
        trip: {
          title: activeTrip.title,
          destination: activeTrip.destination,
          startDate: activeTrip.startDate,
          endDate: activeTrip.endDate,
          selectedDay: {
            label: selectedDay.label,
            date: selectedDay.date,
            title: selectedDay.title,
            stops: selectedDay.stops.map((stop) => ({ title: stop.title, address: stop.address, time: stop.time, transport: stop.transport, openingHours: stop.openingHours, note: stop.note }))
          },
          accommodations: (activeTrip.accommodations || []).map((hotel: any) => ({ name: hotel.name, address: hotel.address, period: hotel.period }))
        },
        focus: aiFocusStop ? { title: aiFocusStop.title, address: aiFocusStop.address, time: aiFocusStop.time, openingHours: aiFocusStop.openingHours, note: aiFocusStop.note } : null
      };
      const response = await fetch(DOUYOU_AI_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data?.error || "小助手暫時無法回覆"));
      setAiAnswer(String(data?.answer || "目前沒有取得回覆，請再試一次。"));
    } catch (error: any) {
      setAiError(error?.message || "豆遊小助手暫時無法回覆，請稍後再試。");
    } finally {
      setAiLoading(false);
    }
  };

  const saveNote = () => {
    if (!editing) return;
    const title = draftTitle.trim();
    if (!title) {
      showToast("景點名稱不能留白");
      return;
    }
    const address = draftAddress.trim() || "地址待補";
    const addressChanged = address !== editing.address;
    const durationMinutes = Math.max(0, Number.parseInt(draftDuration, 10) || 0);
    const transport = draftTransport.trim() || "尚未安排";
    const transportMode: Stop["transportMode"] =
      draftRouteMode === "walking" ? "步行" :
      draftRouteMode === "transit" ? (/公車/.test(transport) ? "公車" : "地鐵") :
      draftRouteMode === "taxi" ? "計程車" : "其他";
    const next = selectedDay.stops.map((stop) =>
      stop.id === editing.id ? {
        ...stop,
        title,
        address,
        // 地址變更後不沿用舊座標，讓既有的定位流程重新查詢正確位置。
        latitude: addressChanged ? undefined : stop.latitude,
        longitude: addressChanged ? undefined : stop.longitude,
        note: draftNote,
        openingHours: draftOpeningHours.trim(),
        durationMinutes,
        transport,
        transportMode,
        routeMode: draftRouteMode
      } : stop
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

  useEffect(() => {
    if (selectedTool !== "必買商品" || !isKoreaTrip || activeTrip.shoppingCatalogImported) return;
    const existingNames = new Set(activeTrip.shopping.map((item) => item.name.trim().toLowerCase()));
    const imported = shoppingItems.filter((item) => !existingNames.has(item.name.trim().toLowerCase())).map((item, index) => ({
      id: `korea-shopping-${activeTrip.id}-${index}`,
      name: item.name,
      price: item.price.replace(/^₩\s*/, ""),
      currency: "KRW",
      category: item.category,
      imageUrl: item.imageUrl,
      purchased: false,
      scope: "shared" as const,
      owner: ""
    }));
    updateActiveTrip({ shopping: [...activeTrip.shopping, ...imported], shoppingCatalogImported: true });
    showToast(`已把 ${imported.length} 項韓國商品放入待購買清單`);
  }, [selectedTool, activeTrip.id, activeTrip.shoppingCatalogImported, isKoreaTrip]);

  const openDirections = (stop: Stop, provider: "google" | "naver") => {
    const query = encodeURIComponent(stop.address || stop.title);
    const url = provider === "naver"
      ? `https://map.naver.com/p/search/${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("無法開啟地圖", stop.address)
    );
  };

  const resolveFullAddress = async (stop: Stop) => {
    const specificAddress = /\d|路|街|巷|弄|號|구|동|로|길|대로/.test(stop.address || "");
    if (specificAddress && stop.address !== "地址待補") return stop.address;
    try {
      const url = stop.latitude != null && stop.longitude != null
        ? `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=zh-TW&lat=${stop.latitude}&lon=${stop.longitude}`
        : `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=zh-TW&q=${encodeURIComponent(`${stop.title} ${activeTrip.destination}`)}`;
      const response = await fetch(url);
      const data = await response.json();
      const result = Array.isArray(data) ? data[0] : data;
      const fullAddress = String(result?.display_name || stop.address || stop.title);
      if (fullAddress && fullAddress !== stop.address) {
        updateStops(selectedDay.stops.map((item) => item.id === stop.id ? {
          ...item,
          address: fullAddress,
          latitude: Number(result?.lat) || item.latitude,
          longitude: Number(result?.lon) || item.longitude
        } : item));
      }
      return fullAddress;
    } catch {
      return stop.address || stop.title;
    }
  };

  const copyAddressAndOpenUber = async (stop: Stop) => {
    const address = await resolveFullAddress(stop);
    try {
      await (globalThis as any).navigator?.clipboard?.writeText(address);
      showToast("地址已複製，正在開啟 Uber");
    } catch {
      showToast("正在開啟 Uber");
    }
    const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=${encodeURIComponent(address)}`;
    Linking.openURL(uberUrl).catch(() => Alert.alert("無法開啟 Uber", `地址已複製：${address}`));
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

  const inferFavoriteRegion = (name: string, address: string) => {
    const text = `${name} ${address} ${activeTrip.destination}`;
    const country = /韓國|南韓|釜山|首爾|濟州|부산|서울|대한민국|korea/i.test(text) ? "韓國"
      : /日本|東京|大阪|京都|沖繩|北海道|福岡|大分|別府|由布|九重|日田|宇佐|國東|国東|中津|竹田|豊後高田|豐後高田|japan/i.test(text) ? "日本" : "其他";
    const city = /釜山|부산|busan/i.test(text) ? "釜山" : /首爾|서울|seoul/i.test(text) ? "首爾"
      : /濟州|제주|jeju/i.test(text) ? "濟州" : /東京|tokyo/i.test(text) ? "東京"
      : /大阪|osaka/i.test(text) ? "大阪" : /沖繩|okinawa/i.test(text) ? "沖繩"
      : /別府|beppu/i.test(text) ? "別府" : /由布|湯布院|yufu/i.test(text) ? "由布" : /九重|kokonoe/i.test(text) ? "九重"
      : /日田|hita/i.test(text) ? "日田" : /宇佐|usa/i.test(text) ? "宇佐" : /國東|国東|kunisaki/i.test(text) ? "國東"
      : /中津|nakatsu/i.test(text) ? "中津" : /竹田|taketa/i.test(text) ? "竹田" : /豊後高田|豐後高田/i.test(text) ? "豐後高田"
      : /大分|oita/i.test(text) ? "大分" : activeTrip.destination || "未分類";
    return { country, city };
  };

  const addStopToFavorites = (stop: Stop) => {
    if (favorites.some((item) => item.name === stop.title && item.address === stop.address)) {
      showToast("這個景點已在收藏中");
      return;
    }
    const region = inferFavoriteRegion(stop.title, stop.address);
    persistFavorites([...favorites, { id: `favorite-${Date.now()}`, name: stop.title, address: stop.address, ...region, latitude: stop.latitude, longitude: stop.longitude, note: stop.note || favoriteFeatureText(stop.title, stop.address), openingHours: stop.openingHours }]);
    showToast("已加入個人收藏");
  };

  const resetFavoriteForm = () => {
    setFavoriteName(""); setFavoriteAddress(""); setFavoriteCountry(""); setFavoriteCity(""); setFavoriteNote("");
    setFavoriteLatitude(undefined); setFavoriteLongitude(undefined); setFavoriteSuggestions([]); setFavoriteSearchStatus("idle"); setEditingFavoriteId(null);
  };

  const openFavoriteEditor = (place?: FavoritePlace) => {
    if (place) {
      setEditingFavoriteId(place.id); setFavoriteName(place.name); setFavoriteAddress(place.address === "地址待補" ? "" : place.address);
      setFavoriteCountry(place.country); setFavoriteCity(place.city); setFavoriteNote(place.note || favoriteFeatureText(place.name, place.address));
      setFavoriteLatitude(place.latitude); setFavoriteLongitude(place.longitude);
    } else resetFavoriteForm();
    setAddingFavorite(true);
  };

  const selectFavoriteSuggestion = (row: any) => {
    const address = String(row.display_name || "");
    const details = row.address || {};
    const inferred = inferFavoriteRegion(favoriteName, address);
    setFavoriteAddress(address);
    setFavoriteLatitude(Number(row.lat)); setFavoriteLongitude(Number(row.lon));
    setFavoriteCountry(/韓國|대한민국|south korea/i.test(String(details.country || address)) ? "韓國" : /日本|japan/i.test(String(details.country || address)) ? "日本" : inferred.country);
    setFavoriteCity(String(details.city || details.town || details.county || inferred.city).replace(/廣域市|特別市/g, "") || inferred.city);
    if (!favoriteNote.trim()) setFavoriteNote(favoriteFeatureText(favoriteName, address));
    setFavoriteSuggestions([]); setFavoriteSearchStatus("idle");
  };

  const saveFavorite = async () => {
    if (!favoriteName.trim()) { Alert.alert("請輸入景點名稱"); return; }
    const wasEditing = !!editingFavoriteId;
    let address = favoriteAddress.trim();
    if (!address || favoriteLatitude == null || favoriteLongitude == null) {
      if (favoriteSuggestions[0]) { selectFavoriteSuggestion(favoriteSuggestions[0]); Alert.alert("請確認地點", "已找到候選地點並帶入地址，確認正確後再按一次儲存。"); return; }
      Alert.alert("尚未確認地址", "請從景點名稱下方的搜尋結果選擇正確地點，避免收藏到錯誤城市。"); return;
    }
    const inferred = inferFavoriteRegion(favoriteName, address);
    const saved: FavoritePlace = { id: editingFavoriteId || `favorite-${Date.now()}`, name: favoriteName.trim(), address, country: favoriteCountry.trim() || inferred.country, city: favoriteCity.trim() || inferred.city, latitude: favoriteLatitude, longitude: favoriteLongitude, note: favoriteNote.trim() || favoriteFeatureText(favoriteName, address) };
    persistFavorites(editingFavoriteId ? favorites.map((item) => item.id === editingFavoriteId ? saved : item) : [...favorites, saved]);
    resetFavoriteForm(); setAddingFavorite(false);
    showToast(wasEditing ? "收藏景點已更新" : "收藏景點已新增並自動分類");
  };

  const importFavoriteBatch = () => {
    const lines = batchFavoriteText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) { Alert.alert("請貼上景點清單"); return; }
    const parsed = lines.map((line, index) => {
      const parts = line.split(/[｜|\t]/).map((part) => part.trim());
      let country = batchFavoriteCountry.trim(); let city = batchFavoriteCity.trim(); let name = ""; let address = ""; let note = "";
      if (parts.length >= 5) { country = parts[0] || country; city = parts[1] || city; name = parts[2] || ""; address = parts[3] || ""; note = parts.slice(4).join("｜"); }
      else if (parts.length === 4) { city = parts[0] || city; name = parts[1] || ""; address = parts[2] || ""; note = parts[3] || ""; }
      else if (parts.length === 3) { name = parts[0] || ""; address = parts[1] || ""; note = parts[2] || ""; }
      else if (parts.length === 2) { name = parts[0] || ""; address = parts[1] || ""; }
      else name = parts[0] || "";
      const inferred = inferFavoriteRegion(name, address);
      return { index, country: country || inferred.country, city: city || inferred.city, name, address: address || "地址待補", note: note || favoriteFeatureText(name, address) };
    }).filter((item) => item.name);
    const withoutLegacyBrokenRows = favorites.filter((favorite) => !parsed.some((item) => favorite.name === item.city && favorite.note === item.address));
    const imported: FavoritePlace[] = [];
    parsed.forEach((item) => {
      const duplicate = withoutLegacyBrokenRows.some((favorite) => favorite.name === item.name && favorite.address === item.address)
        || imported.some((favorite) => favorite.name === item.name && favorite.address === item.address);
      if (!duplicate) imported.push({ id: `favorite-${Date.now()}-${item.index}`, name: item.name, address: item.address, country: item.country, city: item.city, note: item.note });
    });
    persistFavorites([...withoutLegacyBrokenRows, ...imported]);
    setBatchFavoriteStatus("");
    setBatchFavoriteVisible(false);
    setBatchFavoriteText("");
    showToast(`已匯入 ${imported.length} 個收藏景點`);
  };

  const toggleFavoriteSelection = (ids: string[]) => {
    setSelectedFavoriteIds((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  };

  const generatedStop = (place: FavoritePlace, dayIndex: number, index: number, startMinutes = 600, intervalMinutes = 120, endMinutes = 1320): Stop => {
    const scheduledMinutes = Math.min(startMinutes + index * intervalMinutes, Math.max(startMinutes, Math.min(endMinutes, 1320) - 90));
    const time = `${String(Math.floor(scheduledMinutes / 60)).padStart(2, "0")}:${String(scheduledMinutes % 60).padStart(2, "0")}`;
    return ({
    id: `generated-${Date.now()}-${dayIndex}-${index}-${place.id}`, time, title: place.name,
    address: place.address, transport: index === 0 ? "從住宿出發・大眾運輸" : "大眾運輸", transportMode: "地鐵", routeMode: "transit",
    note: place.note || "由收藏景點自動排入", latitude: place.latitude, longitude: place.longitude, openingHours: place.openingHours, durationMinutes: 90
  });
  };

  const coordinateMatchesFavoriteRegion = (place: FavoritePlace, latitude: number, longitude: number) => {
    const context = `${place.country} ${place.city} ${place.address}`.toLowerCase();
    if (/大分県|大分縣|oita/.test(context)) return latitude >= 32.70 && latitude <= 33.85 && longitude >= 130.78 && longitude <= 132.10;
    if (/釜山|busan/.test(context)) return latitude >= 34.75 && latitude <= 35.55 && longitude >= 128.65 && longitude <= 129.55;
    if (/京都|kyoto/.test(context)) return latitude >= 34.75 && latitude <= 35.35 && longitude >= 135.45 && longitude <= 136.05;
    if (/大阪|osaka/.test(context)) return latitude >= 34.35 && latitude <= 35.05 && longitude >= 135.05 && longitude <= 135.85;
    if (/日本|japan/.test(context)) return latitude >= 24 && latitude <= 46.5 && longitude >= 122 && longitude <= 146.5;
    if (/韓國|南韓|korea/.test(context)) return latitude >= 33 && latitude <= 39.5 && longitude >= 124 && longitude <= 132;
    return Number.isFinite(latitude) && Number.isFinite(longitude);
  };

  const locateFavoritePlace = async (place: FavoritePlace): Promise<FavoritePlace> => {
    if (place.latitude != null && place.longitude != null && coordinateMatchesFavoriteRegion(place, place.latitude, place.longitude)) return place;
    const unlocatedPlace = { ...place, latitude: undefined, longitude: undefined };
    const query = place.address && place.address !== "地址待補"
      ? place.address
      : `${place.name} ${place.city} ${place.country}`;
    if (/日本|japan/i.test(place.country) && place.address && place.address !== "地址待補") {
      try {
        const japaneseAddress = place.address.replace(/\s+\d+F\b.*$/i, "").replace(/\s*\/.*$/, "").trim();
        const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(japaneseAddress)}`);
        const feature = response.ok ? (await response.json())?.[0] : null;
        const coordinates = feature?.geometry?.coordinates;
        if (Array.isArray(coordinates) && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))) {
          const longitude = Number(coordinates[0]); const latitude = Number(coordinates[1]);
          if (coordinateMatchesFavoriteRegion(place, latitude, longitude)) return { ...place, longitude, latitude };
        }
      } catch { /* fall back to worldwide place search */ }
    }
    try {
      const response = await fetch(`https://photon.komoot.io/api/?limit=1&lang=en&q=${encodeURIComponent(query)}`);
      const feature = response.ok ? (await response.json())?.features?.[0] : null;
      const coordinates = feature?.geometry?.coordinates;
      if (Array.isArray(coordinates) && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))) {
        const longitude = Number(coordinates[0]); const latitude = Number(coordinates[1]);
        if (coordinateMatchesFavoriteRegion(place, latitude, longitude)) return { ...place, longitude, latitude };
      }
    } catch { /* selected-day enrichment will retry */ }
    return unlocatedPlace;
  };

  const locateFavoriteWithNominatim = async (place: FavoritePlace): Promise<FavoritePlace> => {
    if (place.latitude != null && place.longitude != null && coordinateMatchesFavoriteRegion(place, place.latitude, place.longitude)) return place;
    const unlocatedPlace = { ...place, latitude: undefined, longitude: undefined };
    const countryCode = /日本|japan/i.test(place.country) ? "&countrycodes=jp" : /韓國|korea/i.test(place.country) ? "&countrycodes=kr" : "";
    const address = place.address && place.address !== "地址待補" ? place.address.replace(/\s+\d+F\b.*$/i, "").trim() : "";
    const queries = [address, `${place.name} ${place.city} ${place.country}`].filter(Boolean);
    for (const query of queries) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryCode}`);
        const match = response.ok ? (await response.json())?.[0] : null;
        if (match && Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon))) {
          const latitude = Number(match.lat); const longitude = Number(match.lon);
          if (coordinateMatchesFavoriteRegion(place, latitude, longitude)) return { ...place, latitude, longitude };
        }
      } catch { /* try the next query */ }
      await new Promise((resolve) => setTimeout(resolve, 1050));
    }
    return unlocatedPlace;
  };

  const locateFavoritesInBatches = async (places: FavoritePlace[]) => {
    const fastLocated: FavoritePlace[] = [];
    for (let index = 0; index < places.length; index += 6) {
      fastLocated.push(...await Promise.all(places.slice(index, index + 6).map(locateFavoritePlace)));
      if (index + 6 < places.length) await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const located: FavoritePlace[] = [];
    for (const place of fastLocated) {
      located.push(await locateFavoriteWithNominatim(place));
      if (place.latitude == null || place.longitude == null) await new Promise((resolve) => setTimeout(resolve, 1050));
    }
    return located;
  };

  const updateAllFavoriteCoordinates = async () => {
    if (favoriteBulkUpdating) return;
    const missing = favorites;
    if (!missing.length) { showToast("目前沒有收藏景點"); return; }
    setFavoriteBulkUpdating(true);
    showToast(`正在重新驗證 ${missing.length} 個收藏座標…`);
    try {
      const located = await locateFavoritesInBatches(missing);
      const locatedById = new Map(located.map((place) => [place.id, place]));
      const next = favorites.map((place) => locatedById.get(place.id) || place);
      persistFavorites(next);
      const updatedCount = located.filter((place) => place.latitude != null && place.longitude != null).length;
      const missingCount = missing.length - updatedCount;
      showToast(missingCount ? `已更新 ${updatedCount} 個，${missingCount} 個仍找不到座標` : `已更新全部 ${updatedCount} 個收藏景點`);
    } finally {
      setFavoriteBulkUpdating(false);
    }
  };

  const generateTripFromFavorites = async () => {
    const count = Math.max(1, Math.min(14, Number.parseInt(favoriteDayCount, 10) || 1));
    if (!selectedFavorites.length) { Alert.alert("尚未勾選景點", "請先勾選城市或個別收藏景點。"); return; }
    const cities = [...new Set(selectedFavorites.map((place) => place.city).filter(Boolean))];
    const countries = [...new Set(selectedFavorites.map((place) => place.country).filter(Boolean))];
    const destination = cities.join("・") || countries.join("・") || "收藏景點";
    const normalizedArrivalDate = favoriteArrivalDate.trim().replaceAll("/", "-");
    const normalizedDepartureDate = favoriteDepartureDate.trim().replaceAll("/", "-");
        showToast("正在取得景點座標並建立旅行…");
        const locatedSelections = await locateFavoritesInBatches(selectedFavorites);
        const locatedById = new Map(locatedSelections.map((place) => [place.id, place]));
        persistFavorites(favorites.map((place) => locatedById.get(place.id) || place));
        const id = `trip-${Date.now()}`;
        const hotelRows = favoriteAccommodationText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const parsedHotelRows = hotelRows.map((line, rowIndex) => {
          const fields = line.split(/[｜|]/).map((field) => field.trim());
          const hasNightSpec = /^\d+(?:\s*[-–~]\s*\d+)?(?:\s*[,、]\s*\d+)*$/.test(fields[0] || "");
          const nightSpec = hasNightSpec ? fields[0]! : `1-${Math.max(1, count - 1)}`;
          const name = hasNightSpec ? fields[1] || "" : fields[0] || "";
          const address = hasNightSpec ? fields.slice(2).join("｜") : fields.slice(1).join("｜");
          const nights = new Set<number>();
          nightSpec.split(/[,、]/).forEach((part) => {
            const range = part.trim().match(/^(\d+)(?:\s*[-–~]\s*(\d+))?$/);
            if (!range) return;
            const start = Number(range[1]); const end = Number(range[2] || range[1]);
            for (let night = Math.min(start, end); night <= Math.max(start, end); night += 1) if (night >= 1 && night < count) nights.add(night);
          });
          return { rowIndex, name, address, nights: [...nights] };
        }).filter((row) => row.name && row.nights.length);
        const locatedHotels = await Promise.all(parsedHotelRows.map(async (row) => {
          const inferred = inferFavoriteRegion(row.name, row.address);
          const located = await locateFavoritePlace({ id: `${id}-hotel-${row.rowIndex}`, name: row.name, address: row.address || row.name, country: countries[0] || inferred.country, city: inferred.city });
          return { ...row, latitude: located.latitude, longitude: located.longitude };
        }));
        const plannedAccommodations: TripPlan["accommodations"] = locatedHotels.map((hotel) => ({
          id: `${id}-hotel-${hotel.rowIndex}`, name: hotel.name, period: `第 ${hotel.nights.join("、")} 晚`, address: hotel.address,
          latitude: hotel.latitude, longitude: hotel.longitude, note: "由收藏排行程時設定；入住退房時間可在工具箱補充。"
        }));
        const accommodationByNight: Record<string, string> = {};
        locatedHotels.forEach((hotel) => hotel.nights.forEach((night) => { accommodationByNight[`night-${night}`] = `${id}-hotel-${hotel.rowIndex}`; }));
        const allNightsCovered = Array.from({ length: Math.max(0, count - 1) }, (_, index) => `night-${index + 1}`).every((key) => !!accommodationByNight[key]);
        const hotelById = new Map(plannedAccommodations.map((hotel) => [hotel.id, hotel]));
        const hotelForNight = (night: number) => {
          const hotelId = accommodationByNight[`night-${night}`];
          return hotelId ? hotelById.get(hotelId) : undefined;
        };
        const verifiedFavoriteHours = (place: FavoritePlace) => {
          if (place.openingHours) return place.openingHours;
          if (/九重.*夢.*吊橋|Kokonoe Yume Otsuribashi/i.test(place.name)) return "08:30-17:00（11–12 月；最終售票 16:30）";
          if (/大分縣立美術館|OPAM/i.test(place.name)) return "10:00-19:00（最終入館 18:30）";
          if (/大分市美術館/i.test(place.name)) return "10:00-18:00（最終入館 17:30；週一原則休館）";
          if (/Park Place 大分|パークプレイス大分/i.test(place.name)) return "物販 10:00-21:00（部分店舖不同）";
          if (/AMU PLAZA 大分|アミュプラザおおいた/i.test(place.name)) return "物販 10:00-21:00（餐飲與個別店舖不同）";
          if (/海地獄|鬼石坊主地獄|灶地獄|かまど地獄|鬼山地獄|白池地獄|血池地獄|龍卷地獄|龍巻地獄/i.test(place.name)) return "08:00-17:00（到訪前仍請確認臨時異動）";
          return undefined;
        };
        const enrichedSelections = locatedSelections.map((place) => ({ ...place, openingHours: verifiedFavoriteHours(place) }));
        const uniqueSelections = enrichedSelections.filter((place, index, rows) => {
          const key = `${place.name.replace(/（.*?）|\(.*?\)/g, "").trim().toLowerCase()}|${place.address.replace(/\s+/g, "").toLowerCase()}`;
          return rows.findIndex((candidate) => `${candidate.name.replace(/（.*?）|\(.*?\)/g, "").trim().toLowerCase()}|${candidate.address.replace(/\s+/g, "").toLowerCase()}` === key) === index;
        });
        const isFoodPlace = (place: FavoritePlace) => /餐廳|食堂|定食|咖啡|coffee|cafe|café|烏龍|燒肉|釜飯|甜甜圈|銅鑼燒|蛋糕|餅店|可樂餅|糖果店|料理|拉麵|壽司|居酒屋|trattoria|restaurant/i.test(`${place.name} ${place.note || ""}`);
        const isStrenuousOutdoor = (place: FavoritePlace) => /九重山|登山|山峰|健行|步道|吊橋|溪谷|耶馬溪|一目八景|岡城跡|富貴寺/i.test(`${place.name} ${place.note || ""}`);
        const placeDurationMinutes = (place: FavoritePlace) => {
          const text = `${place.name} ${place.note || ""}`;
          if (/小吃|甜甜圈|銅鑼燒|蛋糕|可樂餅|餅店|糖果店|伴手禮/i.test(text)) return 45;
          if (/niko and|商場|百貨|mall|plaza|購物/i.test(text)) return 60;
          if (/九重山|登山|健行|步道|吊橋|溪谷|耶馬溪|地獄巡禮/i.test(text)) return 120;
          if (isFoodPlace(place)) return 75;
          return 90;
        };
        const attractionScore = (place: FavoritePlace) => {
          const text = `${place.name} ${place.note || ""}`;
          if (/金鱗湖|海地獄|夢.*吊橋|長者原|別府塔|OPAM|地獄蒸|豆田町|岡城跡|護國神社/i.test(text)) return 9;
          if (/地獄|美術館|神社|寺|湖|塔|步道|商店街/i.test(text)) return 7;
          if (/niko and|商場|百貨|mall|plaza/i.test(text)) return 3;
          return 5;
        };
        // In "include all" mode restaurants are scheduled as real stops too;
        // otherwise they remain curated meal choices with alternatives.
        const scenicSelections = favoriteIncludeAll ? uniqueSelections : uniqueSelections.filter((place) => !isFoodPlace(place));
        const foodSelections = favoriteIncludeAll ? [] : uniqueSelections.filter(isFoodPlace);
        const arrivalLocation = favoriteArrivalPlace.trim() ? await locateFavoritePlace({ id: `${id}-arrival-location`, name: favoriteArrivalPlace.trim(), address: favoriteArrivalPlace.trim(), country: countries[0] || "", city: cities[0] || "" }) : undefined;
        const departureLocation = favoriteDeparturePlace.trim() ? await locateFavoritePlace({ id: `${id}-departure-location`, name: favoriteDeparturePlace.trim(), address: favoriteDeparturePlace.trim(), country: countries[0] || "", city: cities[0] || "" }) : undefined;
        const parseMinutes = (value: string, fallback: number) => { const match = value.match(/^(\d{1,2}):(\d{2})$/); return match ? Number(match[1]) * 60 + Number(match[2]) : fallback; };
        const arrivalMinutes = parseMinutes(favoriteArrivalTime, 480);
        const departureMinutes = parseMinutes(favoriteDepartureTime, 1380);
        const windows = Array.from({ length: count }, (_, dayIndex) => {
          const start = dayIndex === 0 && favoriteArrivalTime ? Math.min(1320, arrivalMinutes + 120) : 600;
          const end = dayIndex === count - 1 && favoriteDepartureTime ? Math.max(600, departureMinutes - 180) : 1200;
          return { start, end, weight: Math.max(0, end - start) };
        });
        const buckets = Array.from({ length: count }, () => [] as FavoritePlace[]);
        const capacities = windows.map((window) => Math.max(1, Math.min(8, Math.floor(window.weight / 90))));
        const grouped = scenicSelections.reduce((map, place) => {
          const key = place.city || "未分類";
          (map[key] ||= []).push(place);
          return map;
        }, {} as Record<string, FavoritePlace[]>);
        Object.values(grouped).forEach((places) => places.sort((a, b) => attractionScore(b) - attractionScore(a)));
        const groupKeys = Object.keys(grouped).sort((a, b) => {
          const score = (key: string) => grouped[key]!.slice(0, 5).reduce((sum, place) => sum + attractionScore(place), 0);
          return score(b) - score(a);
        });
        const arrivalCity = cities.find((city) => favoriteArrivalPlace.includes(city)) || (grouped["大分"] ? "大分" : groupKeys[0]);
        const departureCity = cities.find((city) => favoriteDeparturePlace.includes(city)) || arrivalCity;
        const preferredKeys = [...new Set([arrivalCity, ...groupKeys.filter((key) => key !== arrivalCity && key !== departureCity), departureCity].filter(Boolean) as string[])];
        const usedPlaceIds = new Set<string>();
        const groupCentroid = (key: string) => {
          const located = (grouped[key] || []).filter((place) => place.latitude != null && place.longitude != null);
          if (!located.length) return undefined;
          return { latitude: located.reduce((sum, place) => sum + place.latitude!, 0) / located.length, longitude: located.reduce((sum, place) => sum + place.longitude!, 0) / located.length };
        };
        const nearestUnusedGroup = (hotel: TripPlan["accommodations"][number] | undefined) => {
          const unused = preferredKeys.filter((key) => !buckets.some((bucket) => bucket.some((place) => place.city === key)));
          if (hotel?.latitude == null || hotel.longitude == null) return unused[0];
          return [...unused].sort((a, b) => {
            const pointA = groupCentroid(a); const pointB = groupCentroid(b);
            const distance = (point: typeof pointA) => point ? Math.hypot((point.latitude - hotel.latitude!) * 111, (point.longitude - hotel.longitude!) * 91) : Number.POSITIVE_INFINITY;
            return distance(pointA) - distance(pointB);
          })[0];
        };
        const isOpenWithinWindow = (place: FavoritePlace, start: number) => {
          if (!place.openingHours) return true;
          const times = [...place.openingHours.matchAll(/([01]?\d|2[0-3]):([0-5]\d)/g)].map((match) => Number(match[1]) * 60 + Number(match[2]));
          const close = times.length >= 2 ? times[1]! : undefined;
          return close == null || close > start + 30;
        };
        windows.forEach((window, dayIndex) => {
          const isArrivalDay = dayIndex === 0 && !!favoriteArrivalTime;
          const isDepartureDay = dayIndex === count - 1 && !!favoriteDepartureTime;
          const startHotel = dayIndex > 0 ? hotelForNight(dayIndex) : undefined;
          const endHotel = dayIndex < count - 1 ? hotelForNight(dayIndex + 1) : undefined;
          const preferred = nearestUnusedGroup(endHotel || startHotel) || (isArrivalDay ? arrivalCity : isDepartureDay ? departureCity : preferredKeys.find((key) => !buckets.some((bucket) => bucket.some((place) => place.city === key))));
          let candidates = preferred ? [...(grouped[preferred] || [])].filter((place) => !usedPlaceIds.has(place.id) && isOpenWithinWindow(place, window.start)) : [];
          if (isArrivalDay || isDepartureDay) candidates = candidates.filter((place) => !isStrenuousOutdoor(place));
          if (isArrivalDay && window.start >= 960) candidates.sort((a, b) => Number(/百貨|商場|plaza|mall|美術館/i.test(`${b.name} ${b.note || ""}`)) - Number(/百貨|商場|plaza|mall|美術館/i.test(`${a.name} ${a.note || ""}`)) || attractionScore(b) - attractionScore(a));
          const chosen = candidates.slice(0, capacities[dayIndex]);
          chosen.forEach((place) => usedPlaceIds.add(place.id));
          buckets[dayIndex]!.push(...chosen);
        });
        // Fill every usable day as much as its real time window allows. "Include all"
        // changes priority, but never bypasses flight, opening-hour or capacity limits.
        scenicSelections
          .filter((place) => !usedPlaceIds.has(place.id))
          .sort((a, b) => favoriteIncludeAll ? 0 : attractionScore(b) - attractionScore(a))
          .forEach((place) => {
            const eligibleDays = windows.map((_, index) => index).filter((index) => {
              if (count <= 2 || !isStrenuousOutdoor(place)) return true;
              return index !== 0 && index !== count - 1;
            });
            const sameCityDays = eligibleDays.filter((index) => buckets[index]!.some((item) => item.city === place.city));
            const choices = sameCityDays.length ? sameCityDays : eligibleDays.length ? eligibleDays : windows.map((_, index) => index);
            const targetDay = [...choices]
              .filter((index) => buckets[index]!.length < capacities[index]! && isOpenWithinWindow(place, windows[index]!.start))
              .sort((a, b) => buckets[a]!.length - buckets[b]!.length)[0];
            if (targetDay != null) {
              buckets[targetDay]!.push(place);
              usedPlaceIds.add(place.id);
            }
          });
        const parseOpeningWindow = (value?: string) => {
          const times = [...String(value || "").matchAll(/([01]?\d|2[0-3]):([0-5]\d)/g)].map((match) => Number(match[1]) * 60 + Number(match[2]));
          return times.length >= 2 ? { open: times[0]!, close: times[1]! } : undefined;
        };
        const generatedTimes = new Map<string, number>();
        const scheduleOmissions = new Map<string, string>();
        buckets.forEach((bucket, dayIndex) => {
          const window = windows[dayIndex]!;
          let cursor = dayIndex === 0 && hotelForNight(1) ? window.start + 60 : window.start;
          const accepted: FavoritePlace[] = [];
          bucket.forEach((place) => {
            const duration = placeDurationMinutes(place);
            const business = parseOpeningWindow(place.openingHours);
            let start = Math.max(cursor, business?.open ?? cursor);
            if (start < 750 && start + duration > 750) start = 840;
            if (start < 1110 && start + duration > 1110) start = 1200;
            const close = business?.close ?? window.end;
            if (start + duration > close) {
              scheduleOmissions.set(place.id, `與營業時間 ${place.openingHours || ""} 衝突`);
              return;
            }
            if (start + duration > window.end) {
              scheduleOmissions.set(place.id, dayIndex === 0 ? "抵達後剩餘時間不足" : dayIndex === count - 1 ? "回程前剩餘時間不足" : "當天時間不足");
              return;
            }
            generatedTimes.set(place.id, start);
            accepted.push(place);
            cursor = start + duration + 25;
          });
          buckets[dayIndex] = accepted;
        });
        const nextDays: TripDay[] = buckets.map((bucket, dayIndex) => {
          const window = windows[dayIndex]!;
          const startHotel = dayIndex > 0 ? hotelForNight(dayIndex) : undefined;
          const endHotel = dayIndex < count - 1 ? hotelForNight(dayIndex + 1) : undefined;
          const hasLunch = window.start <= 780 && window.end >= 720;
          const hasDinner = window.start <= 1140 && window.end >= 1050;
          const dayCity = bucket[0]?.city || "";
          const mealCandidates = foodSelections.filter((place) => !dayCity || place.city === dayCity);
          const mealStops: Stop[] = [];
          const addMeal = (label: string, time: string, offset: number) => {
            const candidates = mealCandidates.slice(offset, offset + 3);
            if (!candidates.length) return;
            const [primary, ...alternatives] = candidates;
            mealStops.push({ ...generatedStop(primary!, dayIndex, 90 + offset), time, title: `${label}首選｜${primary!.name}`, note: alternatives.length ? `${primary!.note || "用餐建議"}\n${alternatives.map((item, index) => `備案 ${index + 1}｜${item.name}`).join("\n")}` : primary!.note || "用餐建議", durationMinutes: 75 });
          };
          if (hasLunch) addMeal("午餐", "12:30", 0);
          if (hasDinner) addMeal("晚餐", "18:30", 3);
          const availableMinutes = Math.max(120, window.end - window.start - mealStops.length * 90);
          const interval = bucket.length > 1 ? Math.max(90, Math.floor(availableMinutes / bucket.length)) : 120;
          const date = normalizedArrivalDate ? tripDayDateLabel(normalizedArrivalDate, dayIndex) : "日期未定";
          const title = !bucket.length && dayIndex === 0 && favoriteArrivalTime ? `抵達 ${destination}` : !bucket.length && dayIndex === count - 1 && favoriteDepartureTime ? "整理行李・前往機場" : `${bucket[0]?.city || destination}・建議行程`;
          const scenicStart = dayIndex === 0 && endHotel ? window.start + 60 : window.start;
          const scenicStops = bucket.map((place, index) => {
            const stop = generatedStop(place, dayIndex, index, scenicStart, interval, window.end);
            const minutes = generatedTimes.get(place.id);
            return minutes == null ? { ...stop, durationMinutes: placeDurationMinutes(place) } : { ...stop, time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`, durationMinutes: placeDurationMinutes(place) };
          });
          const arrivalStop: Stop[] = dayIndex === 0 && arrivalLocation ? [{ id: `${id}-arrival`, time: favoriteArrivalTime || "抵達", title: `抵達 ${favoriteArrivalPlace.trim()}`, address: favoriteArrivalPlace.trim(), latitude: arrivalLocation.latitude, longitude: arrivalLocation.longitude, transport: "抵達後前往住宿或第一站", transportMode: "飛機", routeMode: "transit", note: "航班抵達地點；已預留入境、領行李與移動時間。", durationMinutes: 120 }] : [];
          const departureStop: Stop[] = dayIndex === count - 1 && departureLocation ? [{ id: `${id}-departure`, time: favoriteDepartureTime || "起飛", title: `由 ${favoriteDeparturePlace.trim()} 回程`, address: favoriteDeparturePlace.trim(), latitude: departureLocation.latitude, longitude: departureLocation.longitude, transport: "提前前往機場／車站", transportMode: "飛機", routeMode: "transit", note: "回程出發地點；前方行程已預留至少 3 小時。", durationMinutes: 0 }] : [];
          const lodgingStops: Stop[] = [];
          if (startHotel) lodgingStops.push({ id: `${id}-day-${dayIndex + 1}-lodging-start`, time: dayIndex === count - 1 ? "08:30" : "08:00", title: startHotel.name, address: startHotel.address || "住宿地址待補", latitude: startHotel.latitude, longitude: startHotel.longitude, transport: "從昨晚住宿出發", transportMode: "其他", routeMode: "transit", note: endHotel && endHotel.id !== startHotel.id ? "退房並攜帶／寄放行李；今晚將更換住宿。" : "昨晚住宿・今天從這裡出發。", openingHours: "24 小時住宿地點", openingHoursSource: "建立旅行時的住宿設定", durationMinutes: 30 });
          if (endHotel) lodgingStops.push({ id: `${id}-day-${dayIndex + 1}-lodging-end`, time: dayIndex === 0 ? `${String(Math.floor(window.start / 60)).padStart(2, "0")}:${String(window.start % 60).padStart(2, "0")}` : "20:30", title: endHotel.name, address: endHotel.address || "住宿地址待補", latitude: endHotel.latitude, longitude: endHotel.longitude, transport: startHotel && startHotel.id !== endHotel.id ? "前往新住宿・辦理入住" : "返回住宿", transportMode: "其他", routeMode: "transit", note: dayIndex === 0 ? "抵達後先寄放行李或辦理入住，再開始附近行程。" : startHotel && startHotel.id !== endHotel.id ? "今晚更換住宿；請確認行李寄放及入住時間。" : "今晚住宿・行程以此為終點。", openingHours: "24 小時住宿地點", openingHoursSource: "建立旅行時的住宿設定", durationMinutes: 30 });
          const scheduledStops = [...arrivalStop, ...lodgingStops, ...scenicStops, ...mealStops, ...departureStop].sort((a, b) => a.time.localeCompare(b.time));
          return { id: `${id}-day-${dayIndex + 1}`, label: `DAY ${dayIndex + 1}`, date, title, stops: scheduledStops };
        });
        const plannedIds = new Set(buckets.flat().map((place) => place.id));
        const omittedPlaces = scenicSelections.filter((place) => !plannedIds.has(place.id));
        const omittedCount = omittedPlaces.length;
        const unverifiedPlaces = buckets.flat().filter((place) => !place.openingHours);
        const flights: FlightInfo[] = [];
        if (normalizedArrivalDate || favoriteArrivalTime || favoriteArrivalPlace) flights.push({ id: `flight-arrival-${Date.now()}`, route: `抵達 ${favoriteArrivalPlace.trim() || destination}`, flightNumber: "航班號碼待補", departure: "出發時間待補", arrival: `${normalizedArrivalDate} ${favoriteArrivalTime}`.trim(), terminal: favoriteArrivalPlace.trim(), note: "建立推薦行程時使用的抵達時間與地點" });
        if (normalizedDepartureDate || favoriteDepartureTime || favoriteDeparturePlace) flights.push({ id: `flight-departure-${Date.now()}`, route: `由 ${favoriteDeparturePlace.trim() || destination} 回程`, flightNumber: "航班號碼待補", departure: `${normalizedDepartureDate} ${favoriteDepartureTime}`.trim(), arrival: "抵達時間待補", terminal: favoriteDeparturePlace.trim(), note: "建立推薦行程時使用的回程時間與地點" });
        const period = normalizedArrivalDate && normalizedDepartureDate ? tripPeriodLabel(normalizedArrivalDate, normalizedDepartureDate) : "日期未定";
        const trip: TripPlan = { id, title: `${destination} ${count}日收藏旅行`, destination, period, startDate: normalizedArrivalDate || undefined, endDate: normalizedDepartureDate || undefined, travelers: 1, days: nextDays, flights, accommodations: plannedAccommodations, accommodationByNight, shopping: [], checklist: defaultPrepChecklist(), unscheduledPlaces: omittedPlaces.map((place) => ({ id: place.id, name: place.name, address: place.address, reason: scheduleOmissions.get(place.id) || "超過每日可用時間、距離不順或當日不適合", latitude: place.latitude, longitude: place.longitude, note: place.note, openingHours: place.openingHours })) };
        persistTrips([...trips, trip]); setSelectedFavoriteIds([]); selectTrip(trip);
        const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
        const showScheduleReview = () => {
          if (!omittedCount && !unverifiedPlaces.length) return;
          setTimeout(() => Alert.alert(
            "排程檢查結果",
            `${omittedCount ? `未排入 ${omittedCount} 個景點：\n${omittedPlaces.map((place) => `• ${place.name}：${scheduleOmissions.get(place.id) || "超過每日可用時間、距離不順或當日不適合"}`).join("\n")}` : "所有景點都已排入。"}${unverifiedPlaces.length ? `\n\n已排入但營業時間尚待確認（${unverifiedPlaces.length} 個）：\n${unverifiedPlaces.map((place) => `• ${place.name}`).join("\n")}` : ""}`,
            [{ text: "知道了" }]
          ), 350);
        };
        showScheduleReview();
        try {
          await postCloud({ action: "createTrip", inviteCode, idToken: googleUser?.idToken, trip: { "旅行ID": trip.id, "名稱": trip.title, "目的地": trip.destination, "開始日期": trip.startDate || trip.period, "結束日期": trip.endDate || "", "主要幣別": "TWD" }, member: { "成員ID": googleUser ? googleMemberId(googleUser) : `member-${Date.now()}`, "顯示名稱": googleUser?.name || "我", "角色": "owner" } });
          saveCloudLinks({ ...cloudLinksRef.current, [trip.id]: { inviteCode, memberName: googleUser?.name || "我", memberId: googleUser ? googleMemberId(googleUser) : undefined, role: "owner" } });
          if (firestoreConnected && googleUser?.firebaseUid) await saveFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), "owner", trip, [], inviteCode);
          await syncTripNow(trip, []);
          setFavoriteIncludeAll(true);
          showToast(`已建立 ${count} 天建議行程${favoriteIncludeAll ? "；已排入全部勾選景點" : ""}${!allNightsCovered ? "；部分晚間住宿待補" : ""}${omittedCount ? `；另保留 ${omittedCount} 個收藏未硬塞` : ""}`);
        } catch {
          setFavoriteIncludeAll(true);
          showToast(`已建立 ${count} 天建議行程${favoriteIncludeAll ? "；已排入全部勾選景點" : ""}${!allNightsCovered ? "；部分晚間住宿待補" : ""}${omittedCount ? `；${omittedCount} 個收藏未硬塞` : ""}；同步稍後重試`);
        }
  };

  const addFavoritesToExistingTrip = () => {
    if (!selectedFavorites.length) { Alert.alert("尚未勾選景點", "請先勾選城市或個別收藏景點。"); return; }
    const target = trips.find((trip) => trip.id === favoriteTargetTripId) || activeTrip;
    const assignments = selectedFavorites.map((place) => {
      let bestIndex = 0; let bestScore = Number.POSITIVE_INFINITY;
      target.days.forEach((day, dayIndex) => {
        const located = day.stops.filter((stop) => stop.latitude != null && stop.longitude != null);
        const score = place.latitude != null && place.longitude != null && located.length
          ? Math.min(...located.map((stop) => Math.hypot((stop.latitude! - place.latitude!) * 111, (stop.longitude! - place.longitude!) * 91)))
          : day.stops.length + dayIndex * 0.01;
        if (score < bestScore) { bestScore = score; bestIndex = dayIndex; }
      });
      return { place, dayIndex: bestIndex };
    });
    const summary = assignments.map(({ place, dayIndex }) => `${place.name} → 第 ${dayIndex + 1} 天`).join("\n");
    Alert.alert(`建議加入「${target.title}」`, summary, [{ text: "取消", style: "cancel" }, { text: "確認加入", onPress: () => {
      const nextDays = target.days.map((day, dayIndex) => {
        const additions = assignments.filter((item) => item.dayIndex === dayIndex).map((item, index) => generatedStop(item.place, dayIndex, day.stops.length + index));
        return additions.length ? { ...day, stops: [...day.stops, ...additions] } : day;
      });
      persistTrips(trips.map((trip) => trip.id === target.id ? { ...trip, days: nextDays } : trip));
      setSelectedFavoriteIds([]); setActiveTripId(target.id); setSelectedDayId(nextDays[0]?.id || ""); setTab("itinerary");
      showToast(`已依距離加入「${target.title}」`);
    }}]);
  };

  const deleteEditingStop = () => {
    if (!editing) return;
    const stopId = editing.id;
    updateStops(selectedDay.stops.filter((stop) => stop.id !== stopId));
    setEditing(null);
    showToast("景點已刪除並同步");
  };

  const confirmDeleteStop = () => {
    if (!deletingStop) return;
    const stopId = deletingStop.id;
    updateStops(selectedDay.stops.filter((stop) => stop.id !== stopId));
    setDeletingStop(null);
    setEditing(null);
    showToast("景點已刪除並同步");
  };

  const selectTrip = (trip: TripPlan) => {
    if (firestoreConnected && googleUser?.firebaseUid && !firestoreSeededTripsRef.current.has(trip.id)) {
      const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid);
      const role = cloudLinksRef.current[trip.id]?.role || "owner";
      saveFirestoreTrip(personId, role, trip, expenses[trip.id] || [], cloudLinksRef.current[trip.id]?.inviteCode || "").then(() => {
        firestoreSeededTripsRef.current.add(trip.id);
        const nextLinks = {
          ...cloudLinksRef.current,
          [trip.id]: {
            inviteCode: cloudLinksRef.current[trip.id]?.inviteCode || "",
            memberName: cloudLinksRef.current[trip.id]?.memberName || googleUser.name,
            memberId: cloudLinksRef.current[trip.id]?.memberId || personId,
            role
          }
        };
        saveCloudLinks(nextLinks);
        setSyncStatus("synced");
      }).catch((error: any) => setSyncErrorMessage(`Firebase 建立旅行失敗：${error?.message || "請稍後重試"}`));
    }
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

  const regenerateInviteCode = async () => {
    if (!googleUser?.firebaseUid) { Alert.alert("請先登入 Google 帳號"); return; }
    const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
    const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid);
    try {
      await saveFirestoreTrip(personId, "owner", activeTrip, expenses[activeTrip.id] || [], inviteCode);
      saveCloudLinks({ ...cloudLinksRef.current, [activeTrip.id]: { inviteCode, memberName: googleUser.name, memberId: personId, role: "owner" } });
      setSyncStatus("synced");
      setSyncErrorMessage("");
      showToast("已產生新的六位數邀請碼");
    } catch (error: any) {
      Alert.alert("無法產生邀請碼", error?.message || "請稍後再試");
    }
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
      // Persist the real Google ID token before Firebase auth changes state. This
      // prevents the auth observer from replacing it with a Firebase token (which
      // Apps Script cannot use to create the Google Sheet archive).
      const basicUser = normalizeGoogleUser({ sub: String(payload.sub), name: String(payload.name || payload.email || "Google 使用者"), email: String(payload.email || ""), picture: payload.picture, idToken: credential });
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(basicUser));
      const firebaseResult = await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(credential));
      const user = { ...basicUser, firebaseUid: firebaseResult.user.uid };
      const memberId = googleMemberId(user);
      setGoogleUser(user);
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user)).catch(() => undefined);
      const linkedTrips = Object.entries(cloudLinksRef.current);
      await Promise.all(linkedTrips.map(([tripId, link]) => postCloud({
        action: "joinTrip", tripId, inviteCode: link.inviteCode,
        member: { "成員ID": memberId, "顯示名稱": user.name, "角色": link.role || "member" }
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
          const myMember = (cloud.members || []).find((row: any) => String(row["成員ID"]) === memberId);
          nextLinks[trip.id] = {
            ...existing,
            inviteCode: existing?.inviteCode || "",
            memberName: existing?.memberName || user.name,
            memberId,
            role: myMember?.["角色"] === "owner" ? "owner" : "member"
          };
        });
        saveCloudLinks(nextLinks);
      }
    } catch {
      Alert.alert("Google 登入失敗", "請重新選擇帳號。");
    }
  };

  const signInGoogleWithFirebase = async () => {
    if (Platform.OS !== "web" || loginBusy) return;
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.idToken) throw new Error("沒有取得 Google 授權憑證");
      await handleGoogleCredential(credential.idToken);
    } catch (error: any) {
      const code = String(error?.code || "");
      const message = code === "auth/unauthorized-domain"
        ? "Firebase 尚未允許 past795.github.io。請到 Firebase Authentication 的已授權網域加入 past795.github.io。"
        : code === "auth/operation-not-allowed"
          ? "Firebase 尚未啟用 Google 登入。請到 Authentication → 登入方式 → Google 啟用。"
          : code === "auth/popup-blocked"
            ? "瀏覽器阻擋了登入視窗，請允許這個網站開啟彈出式視窗後再試一次。"
            : code === "auth/popup-closed-by-user"
              ? "登入視窗已關閉，請再按一次登入。"
              : `Google 登入失敗${code ? `（${code}）` : ""}，請再試一次。`;
      setLoginError(message);
    } finally {
      setLoginBusy(false);
    }
  };

  const signOutGoogle = () => {
    firebaseSignOut(firebaseAuth).catch(() => undefined);
    setGoogleUser(null);
    setTrips(starterTrips);
    setActiveTripId(starterTrips[0]!.id);
    setSelectedDayId(starterTrips[0]!.days[0]?.id ?? "");
    setExpenses({});
    setCloudMembers({});
    setArchivedTrips([]);
    saveCloudLinks({});
    AsyncStorage.removeItem(AUTH_KEY).catch(() => undefined);
    AsyncStorage.removeItem(CLOUD_MEMBER_KEY).catch(() => undefined);
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
      if (firestoreConnected && googleUser?.firebaseUid) {
        await updateFirestoreMemberName(firestorePersonId(googleUser.email, googleUser.firebaseUid), activeTrip.id, name);
        saveCloudLinks({ ...cloudLinksRef.current, [activeTrip.id]: { ...link, memberName: name, memberId: firestorePersonId(googleUser.email, googleUser.firebaseUid) } });
        setSyncStatus("synced");
        setMyNameDraft("");
        showToast(`名稱已儲存：${name}`);
        return;
      }
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
      if (dayMatch && !/[|｜\t,，]/.test(line)) {
        dayIndex = Math.min(nextDays.length - 1, Math.max(0, Number(dayMatch[1]) - 1));
        return;
      }
      const parts = line.split(/\t|\s*[|｜]\s*/).map((part) => part.trim());
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

  const confirmDeleteTrip = async () => {
    if (!deletingTrip) return;
    const target = deletingTrip;
    if (firestoreConnected && googleUser?.firebaseUid) {
      setSyncStatus("syncing");
      try {
        await deleteFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), target.id);
      } catch (error: any) {
        setSyncStatus("error");
        Alert.alert("雲端刪除失敗", error?.message || "請確認 Firestore 規則已發布。");
        return;
      }
    }
    const next = trips.filter((item) => item.id !== target.id);
    const nextTrips = next.length ? next : starterTrips;
    persistTrips(nextTrips);
    const nextLinks = { ...cloudLinksRef.current };
    delete nextLinks[target.id];
    saveCloudLinks(nextLinks);
    if (activeTrip.id === target.id) {
      setActiveTripId(nextTrips[0]!.id);
      setSelectedDayId(nextTrips[0]!.days[0]?.id ?? "");
    }
    setDeletingTrip(null);
    setSyncStatus("synced");
    showToast("旅行已從所有裝置刪除");
  };

  const leaveTrip = async (trip: TripPlan) => {
    const link = cloudLinksRef.current[trip.id];
    if (!link?.inviteCode || !link.memberId) {
      Alert.alert("無法退出", "這台裝置缺少同步身分，請先重新輸入邀請碼恢復連線。");
      return;
    }
    setSyncStatus("syncing");
    try {
      if (firestoreConnected && googleUser?.firebaseUid) {
        await leaveFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), trip.id);
      }
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
    const calculatedDays = inclusiveDayCount(newStartDate, newEndDate);
    const count = Math.min(14, Math.max(1, calculatedDays || Number.parseInt(newDayCount, 10) || 1));
    const id = `trip-${Date.now()}`;
    const trip: TripPlan = {
      id,
      title: newTripName.trim() || `${destination}旅行`,
      destination,
      startDate: newStartDate,
      endDate: newEndDate,
      coverImage: newCoverImage.trim(),
      period: tripPeriodLabel(newStartDate, newEndDate),
      travelers: Math.min(20, Math.max(1, Number.parseInt(newTravelers, 10) || 1)),
      flights: [],
      accommodations: [],
      shopping: [],
      checklist: defaultPrepChecklist(),
      days: Array.from({ length: count }, (_, index) => ({
        id: `${id}-day-${index + 1}`,
        label: `DAY ${index + 1}`,
        date: tripDayDateLabel(newStartDate, index),
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
    setNewStartDate("");
    setNewEndDate("");
    setNewCoverImage("");
    setNewDayCount("5");
    setNewTravelers("2");
    const inviteCode = String(Math.floor(100000 + Math.random() * 900000));
    setSyncStatus("syncing");
    try {
      await postCloud({
        action: "createTrip", inviteCode,
        trip: { "旅行ID": trip.id, "名稱": trip.title, "目的地": trip.destination, "開始日期": trip.startDate || trip.period, "結束日期": trip.endDate || "", "封面圖片": trip.coverImage || "", "主要幣別": "TWD" },
        member: { "成員ID": googleUser ? googleMemberId(googleUser) : `member-${Date.now()}`, "顯示名稱": googleUser?.name || "我", "角色": "owner" }
      });
      saveCloudLinks({ ...cloudLinksRef.current, [trip.id]: { inviteCode, memberName: googleUser?.name || "我", memberId: googleUser ? googleMemberId(googleUser) : undefined, role: "owner" } });
      if (firestoreConnected && googleUser?.firebaseUid) await saveFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), "owner", trip, [], inviteCode);
      await syncTripNow(trip, []);
      Alert.alert("旅行已建立並同步", `旅行 ID：${trip.id}\n邀請碼：${inviteCode}\n\n把這兩項傳給旅伴即可加入。`);
    } catch {
      setSyncStatus("error");
      Alert.alert("旅行已存於本機", "目前無法連上雲端，稍後可再嘗試同步。");
    }
  };

  const joinCloudTrip = async () => {
    const legacyTripId = joinTripId.trim();
    const inviteCode = joinInviteCode.trim();
    if (!inviteCode) {
      setJoinError("請填寫六位數邀請碼。");
      Alert.alert("請填寫邀請碼");
      showToast("請填寫六位數邀請碼");
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
      if (googleUser?.firebaseUid) {
        const personId = firestorePersonId(googleUser.email, googleUser.firebaseUid);
        const joined = legacyTripId
          ? { ...(await joinFirestoreTrip(personId, legacyTripId, inviteCode, joinMemberName.trim())), tripId: legacyTripId }
          : await joinFirestoreTripByInvite(personId, inviteCode, joinMemberName.trim());
        const tripId = joined.tripId;
        const convertedTrip = normalizeTripSchedule(joined.trip as TripPlan);
        saveCloudLinks({ ...cloudLinksRef.current, [tripId]: { inviteCode, memberName: joinMemberName.trim(), memberId: personId, role: "member" } });
        setTrips((current) => {
          const next = current.some((trip) => trip.id === tripId)
            ? current.map((trip) => trip.id === tripId ? convertedTrip : trip)
            : [...current.filter((trip) => trip.id !== "local-welcome"), convertedTrip];
          AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)).catch(() => undefined);
          return next;
        });
        setExpenses((current) => {
          const next = { ...current, [tripId]: joined.expenses as Expense[] };
          AsyncStorage.setItem(EXPENSE_KEY, JSON.stringify(next)).catch(() => undefined);
          return next;
        });
        setActiveTripId(tripId);
        setSelectedDayId(convertedTrip.days[0]?.id || "");
        setTab("itinerary");
        setSyncStatus("synced");
        setJoiningTrip(false);
        setJoinTripId(""); setJoinInviteCode(""); setJoinMemberName("");
        showToast(`已加入「${convertedTrip.title}」，Firebase 即時同步已開啟`);
        return;
      }
      if (!legacyTripId) throw new Error("請先登入 Google 帳號，再用邀請碼加入旅行。");
      const tripId = legacyTripId;
      const data = await postCloud({
        action: "joinTrip", tripId, inviteCode,
        member: { "成員ID": googleUser ? googleMemberId(googleUser) : `member-${Date.now()}`, "顯示名稱": googleUser ? googleUser.name : joinMemberName.trim(), "角色": "member" }
      });
      const myMemberId = googleUser ? googleMemberId(googleUser) : undefined;
      const myMember = (data.members || []).find((row: any) => myMemberId && String(row["成員ID"]) === myMemberId);
      const joinedRole: CloudLink["role"] = myMember?.["角色"] === "owner" ? "owner" : "member";
      saveCloudLinks({ ...cloudLinksRef.current, [tripId]: { inviteCode, memberName: joinMemberName.trim(), memberId: myMemberId, role: joinedRole } });
      const converted = cloudToTrip(data);
      if (firestoreConnected && googleUser?.firebaseUid) await saveFirestoreTrip(firestorePersonId(googleUser.email, googleUser.firebaseUid), joinedRole, converted.trip, converted.expenses, inviteCode);
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
      setTimeout(() => pullCloudTrip(tripId, inviteCode, true), 500);
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
      newStopRouteMode === "walking" ? "步行" :
      newStopRouteMode === "transit" ? (/公車/.test(transport) ? "公車" : "地鐵") :
      newStopRouteMode === "taxi" ? "計程車" : "其他";
    const nextStop: Stop = {
      id: `${selectedDay.id}-stop-${Date.now()}`,
      time: newStopTime.trim() || "彈性",
      title,
      address: newStopAddress.trim() || "地址待補",
      transport,
      transportMode,
      note: newStopNote.trim(),
      openingHours: newStopOpeningHours.trim(),
      openingHoursSource: newStopOpeningHours.trim() ? "OpenStreetMap 地點資料" : "",
      latitude: newStopLatitude,
      longitude: newStopLongitude,
      durationMinutes: Math.max(0, Number.parseInt(newStopDuration, 10) || 0),
      routeMode: newStopRouteMode
    };
    setAddingStop(false);
    setPlaceSuggestions([]);
    setPlaceSuggestionStatus("idle");
    setNewStopTitle("");
    setNewStopTime("");
    setNewStopAddress("");
    setNewStopTransport("");
    setNewStopRouteMode("transit");
    setNewStopNote("");
    setNewStopOpeningHours("");
    setNewStopDuration("");
    setNewStopLatitude(undefined);
    setNewStopLongitude(undefined);
    setAddressLookupStatus("idle");
    updateStops([...selectedDay.stops, nextStop]);
    showToast(`已把「${title}」加入 ${selectedDay.label}`);
  };

  const findStopAddress = async () => {
    const title = newStopTitle.trim();
    if (!title) {
      Alert.alert("請先輸入景點名稱");
      return;
    }
    setAddressLookupStatus("loading");
    setAddressLookupMessage(`正在搜尋「${title}」……`);
    try {
      const destination = activeTrip.destination;
      const isKorea = /韓國|釜山|首爾|濟州|大邱|仁川|busan|seoul|jeju/i.test(destination);
      const isJapan = /日本|沖繩|東京|大阪|京都|北海道|福岡|japan|okinawa|tokyo|osaka|kyoto/i.test(destination);
      const countryCode = isKorea ? "kr" : isJapan ? "jp" : "";
      const busanBounds = /釜山|busan/i.test(destination) ? "&viewbox=128.75,35.40,129.35,34.85&bounded=1" : "";
      const compactTitle = title.replace(/\s+/g, "");
      const searchTitle = /釜山?樂天百貨|樂天百貨/.test(compactTitle) ? "Lotte Department Store Busan"
        : /釜山車站|釜山站/.test(compactTitle) ? "Busan Station"
        : /金海機場/.test(compactTitle) ? "Gimhae International Airport"
        : /新世界百貨/.test(compactTitle) ? "Shinsegae Department Store Centum City"
        : title;
      const query = `${searchTitle} ${destination}`.trim();
      const countryFilter = countryCode ? `&countrycodes=${countryCode}` : "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&extratags=1&namedetails=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryFilter}${busanBounds}`, { signal: controller.signal });
      if (!response.ok) throw new Error("搜尋服務暫時無法使用");
      let rows = await response.json();
      if (!rows?.length && busanBounds) {
        response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&extratags=1&namedetails=1&accept-language=zh-TW&q=${encodeURIComponent(query)}${countryFilter}`, { signal: controller.signal });
        rows = response.ok ? await response.json() : [];
      }
      clearTimeout(timeout);
      const match = rows?.[0];
      if (!match?.display_name) {
        setAddressLookupStatus("error");
        setAddressLookupMessage("找不到符合地點，請加上分店或區域名稱。");
        return;
      }
      setNewStopAddress(String(match.display_name));
      setNewStopLatitude(Number(match.lat));
      setNewStopLongitude(Number(match.lon));
      const hours = String(match.extratags?.opening_hours || "");
      setNewStopOpeningHours(hours);
      if (!newStopNote.trim()) {
        const kind = String(match.type || match.category || "景點");
        setNewStopNote(hours ? `營業時間：${hours}。地點類型：${kind}。` : `地點類型：${kind}；營業時間尚未查證。`);
      }
      setAddressLookupStatus("found");
      setAddressLookupMessage(`已找到：${String(match.display_name).split(",").slice(0, 3).join("・")}`);
    } catch (error: any) {
      setAddressLookupStatus("error");
      setAddressLookupMessage(error?.name === "AbortError" ? "搜尋逾時，請再按一次或加上分店名稱。" : "搜尋失敗，請檢查網路後再試一次。");
    }
  };

  const tripExpenses = expenses[activeTrip.id] ?? [];
  const localMemberAlias = cloudLinks[activeTrip.id]?.memberName;
  const myDisplayName = localMemberAlias || googleUser?.name;
  const checklistOwner = myDisplayName || googleUser?.name || "我";
  const activeMemberNames = firestoreConnected
    ? [...new Set((cloudMembers[activeTrip.id] || []).filter((name): name is string => !!name && name !== "我"))]
    : [...new Set([myDisplayName, ...(cloudMembers[activeTrip.id] || [])].filter((name): name is string => !!name && name !== "我"))];
  const expenseMemberNames = activeMemberNames;
  const openExpenseModal = () => {
    setExpensePayer(expenseMemberNames[0] || "");
    setExpenseParticipants(expenseMemberNames);
    setAddingExpense(true);
  };
  const toggleExpenseParticipant = (name: string) => {
    setExpenseParticipants((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
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
  const settlements = useMemo(() => {
    const balances: Record<string, Record<string, number>> = {};
    tripExpenses.forEach((item) => {
      const currency = item.currency || "KRW";
      const participants = item.splitBetween?.length ? item.splitBetween : activeMemberNames;
      const people = participants.length ? participants : [item.payer];
      balances[currency] ??= {};
      people.forEach((name) => { balances[currency]![name] = balances[currency]![name] || 0; });
      balances[currency]![item.payer] = (balances[currency]![item.payer] || 0) + item.amount;
      const share = item.amount / people.length;
      people.forEach((name) => { balances[currency]![name] = (balances[currency]![name] || 0) - share; });
    });
    return Object.entries(balances).flatMap(([currency, values]) => {
      const creditors = Object.entries(values).filter(([, value]) => value > 0.005).map(([name, value]) => ({ name, value }));
      const debtors = Object.entries(values).filter(([, value]) => value < -0.005).map(([name, value]) => ({ name, value: -value }));
      const rows: { from: string; to: string; amount: number; currency: string }[] = [];
      let debtorIndex = 0;
      let creditorIndex = 0;
      while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const amount = Math.min(debtors[debtorIndex]!.value, creditors[creditorIndex]!.value);
        rows.push({ from: debtors[debtorIndex]!.name, to: creditors[creditorIndex]!.name, amount, currency });
        debtors[debtorIndex]!.value -= amount;
        creditors[creditorIndex]!.value -= amount;
        if (debtors[debtorIndex]!.value < 0.005) debtorIndex += 1;
        if (creditors[creditorIndex]!.value < 0.005) creditorIndex += 1;
      }
      return rows;
    });
  }, [tripExpenses, activeMemberNames.join("|")]);
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
    if (!expenseParticipants.length) {
      Alert.alert("請至少選擇一位分帳成員");
      return;
    }
    saveExpenses({
      ...expenses,
      [activeTrip.id]: [...tripExpenses, { id: `expense-${Date.now()}`, title: expenseTitle.trim(), amount, payer: expensePayer.trim(), currency: expenseCurrency, splitBetween: expenseParticipants }]
    });
    setExpenseTitle("");
    setExpenseAmount("");
    setExpensePayer("");
    setExpenseParticipants([]);
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
      date: tripDayDateLabel(activeTrip.startDate || "", dayNumber - 1),
      title: `${activeTrip.destination || "旅行"}・自由安排`,
      stops: []
    };
    const nextTrip = { ...activeTrip, days: [...activeTrip.days, day] };
    persistTrips(trips.map((trip) => trip.id === activeTrip.id ? nextTrip : trip));
    setSelectedDayId(day.id);
    setTimeout(() => itineraryListRef.current?.scrollToOffset?.({ offset: 0, animated: false }), 0);
    showToast(`已新增 DAY ${dayNumber}`);
  };

  const moveWholeDay = (direction: -1 | 1) => {
    const index = activeTrip.days.findIndex((day) => day.id === selectedDay.id);
    const otherIndex = index + direction;
    if (index < 0 || otherIndex < 0 || otherIndex >= activeTrip.days.length) return;
    const days = activeTrip.days.map((day) => ({ ...day, stops: [...day.stops] }));
    const current = days[index]!;
    const other = days[otherIndex]!;
    days[index] = { ...current, title: other.title, stops: other.stops };
    days[otherIndex] = { ...other, title: current.title, stops: current.stops };
    updateActiveTrip({ days });
    setSelectedDayId(days[otherIndex]!.id);
    setTimeout(() => itineraryListRef.current?.scrollToOffset?.({ offset: 0, animated: false }), 0);
    showToast(`${current.label} 的整天行程已${direction < 0 ? "前移" : "後移"}`);
  };

  const confirmDeleteDay = () => {
    if (!deletingDay || activeTrip.days.length <= 1) return;
    const removedIndex = activeTrip.days.findIndex((day) => day.id === deletingDay.id);
    const days = activeTrip.days.filter((day) => day.id !== deletingDay.id).map((day, index) => ({
      ...day,
      label: `DAY ${index + 1}`,
      date: tripDayDateLabel(activeTrip.startDate || "", index)
    }));
    updateActiveTrip({ days });
    setSelectedDayId(days[Math.min(Math.max(0, removedIndex), days.length - 1)]!.id);
    setDeletingDay(null);
    showToast("已刪除一天，後續日期已重新排列");
  };

  const deleteSelectedDay = () => {
    if (activeTrip.days.length <= 1) {
      showToast("旅行至少要保留一天");
      return;
    }
    // Use the same direct state transition on web and installed PWA.  This
    // deliberately avoids a nested Modal whose confirm button can be hidden
    // behind the browser viewport on iPhone.
    const removedIndex = activeTrip.days.findIndex((day) => day.id === selectedDay.id);
    const days = activeTrip.days.filter((day) => day.id !== selectedDay.id).map((day, index) => ({
      ...day,
      label: `DAY ${index + 1}`,
      date: tripDayDateLabel(activeTrip.startDate || "", index)
    }));
    updateActiveTrip({ days });
    setSelectedDayId(days[Math.min(Math.max(0, removedIndex), days.length - 1)]!.id);
    setTimeout(() => itineraryListRef.current?.scrollToOffset?.({ offset: 0, animated: false }), 0);
    showToast("這一天已刪除，後續日期已重新排列");
  };

  const createAccommodation = () => {
    if (!hotelName.trim() || !hotelPeriod.trim()) {
      Alert.alert("請填寫住宿名稱與入住日期");
      return;
    }
    const savedName = hotelName.trim();
    updateActiveTrip({ accommodations: [...activeTrip.accommodations, {
      id: `hotel-${Date.now()}`, name: hotelName.trim(), period: hotelPeriod.trim(),
      address: hotelAddress.trim(), latitude: hotelLatitude, longitude: hotelLongitude, checkIn: hotelCheckIn.trim(), checkOut: hotelCheckOut.trim(),
      facilities: hotelFacilities.trim(), frontDesk: hotelFrontDesk.trim(), note: hotelNote.trim()
    }] });
    setAddingAccommodation(false);
    setHotelName(""); setHotelPeriod(""); setHotelAddress(""); setHotelLatitude(undefined); setHotelLongitude(undefined); setHotelCheckIn(""); setHotelCheckOut("");
    setHotelFacilities(""); setHotelFrontDesk(""); setHotelNote("");
    setHotelSuggestions([]); setHotelSearchStatus("idle");
    showToast(`已新增住宿「${savedName}」`);
  };

  const selectHotelSuggestion = (place: any) => {
    suppressNextHotelSearchRef.current = true;
    const details = place?.namedetails || {};
    const name = String(details["name:zh-Hant"] || details["name:zh"] || details["name:en"] || place?.name || String(place?.display_name || "").split(",")[0]);
    const address = String(place?.display_name || "");
    const verified = starterTrips[0]?.accommodations.find((hotel) => {
      const haystack = `${name} ${address}`.toLowerCase();
      const parts = hotel.name.toLowerCase().split(" ").filter((part) => part.length > 2).slice(0, 2);
      return haystack.includes(hotel.name.toLowerCase()) || (parts.length > 0 && parts.every((part) => haystack.includes(part)));
    });
    const tags = place?.extratags || {};
    const facilities = [
      tags.internet_access === "wlan" || tags.internet_access === "yes" ? "Wi-Fi" : "",
      tags.wheelchair === "yes" ? "無障礙設施" : "",
      tags.smoking === "no" ? "禁菸" : "",
      tags.stars ? `${tags.stars} 星級` : ""
    ].filter(Boolean).join("、");
    const contact = [tags.phone ? `電話：${tags.phone}` : "", tags.website ? `官網：${tags.website}` : ""].filter(Boolean).join("；");
    setHotelName(verified?.name || name);
    setHotelAddress(verified?.address || address);
    setHotelLatitude(verified?.latitude ?? (Number.isFinite(Number(place?.lat)) ? Number(place.lat) : undefined));
    setHotelLongitude(verified?.longitude ?? (Number.isFinite(Number(place?.lon)) ? Number(place.lon) : undefined));
    setHotelCheckIn(verified?.checkIn || "");
    setHotelCheckOut(verified?.checkOut || "");
    setHotelFacilities(verified?.facilities || facilities);
    setHotelFrontDesk(verified?.frontDesk || "");
    setHotelNote(verified?.note || [contact, "入住退房時間與完整設施請以住宿方最新公告為準。"].filter(Boolean).join("\n"));
    setHotelSuggestions([]);
    setHotelSearchStatus("idle");
  };

  const deleteAccommodation = (id: string) => {
    updateActiveTrip({ accommodations: activeTrip.accommodations.filter((hotel) => hotel.id !== id) });
  };

  const setAccommodationAsHomeBase = (hotel: TripPlan["accommodations"][number]) => {
    if (activeTrip.days.length <= 2) {
      Alert.alert("目前沒有中間日期", "只有三天以上的旅行才會自動加入每日住宿起終點。");
      return;
    }
    const nextDays = activeTrip.days.map((day, index) => {
      if (index === 0 || index === activeTrip.days.length - 1) return day;
      const withoutGenerated = day.stops.filter((stop) => !stop.id.endsWith("-lodging-start") && !stop.id.endsWith("-lodging-end"));
      const lodgingBase = {
        title: hotel.name,
        address: hotel.address || "住宿地址待補",
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        transportMode: "其他" as const,
        note: "每日住宿起終點（可在住宿工具箱更換）",
        routeMode: "transit" as const,
        openingHours: "24 小時住宿地點",
        openingHoursSource: "這趟旅行的住宿設定",
        durationMinutes: 0
      };
      return {
        ...day,
        stops: [
          { ...lodgingBase, id: `${day.id}-lodging-start`, time: "08:00", transport: "從住宿出發" },
          ...withoutGenerated,
          { ...lodgingBase, id: `${day.id}-lodging-end`, time: "21:00", transport: "返回住宿" }
        ]
      };
    });
    const homeBaseByDay = Object.fromEntries(activeTrip.days.slice(1, -1).map((day) => [day.id, hotel.id]));
    updateActiveTrip({ homeBaseAccommodationId: hotel.id, homeBaseByDay, days: nextDays });
    showToast(`已將「${hotel.name}」設為中間日期的每日起終點`);
  };

  const clearAccommodationHomeBase = () => {
    updateActiveTrip({
      homeBaseAccommodationId: "",
      homeBaseByDay: {},
      days: activeTrip.days.map((day) => ({
        ...day,
        stops: day.stops.filter((stop) => !stop.id.endsWith("-lodging-start") && !stop.id.endsWith("-lodging-end"))
      }))
    });
    showToast("已取消每日住宿起終點");
  };

  const toggleAccommodationForDay = (hotel: TripPlan["accommodations"][number], dayId: string) => {
    const currentMap = Object.keys(activeTrip.homeBaseByDay || {}).length
      ? (activeTrip.homeBaseByDay || {})
      : activeTrip.homeBaseAccommodationId
        ? Object.fromEntries(activeTrip.days.slice(1, -1).map((day) => [day.id, activeTrip.homeBaseAccommodationId!]))
        : {};
    const isSelected = currentMap[dayId] === hotel.id;
    const nextMap = { ...currentMap };
    if (isSelected) delete nextMap[dayId]; else nextMap[dayId] = hotel.id;
    const nextDays = activeTrip.days.map((day) => {
      if (day.id !== dayId) return day;
      const withoutGenerated = day.stops.filter((stop) => !stop.id.endsWith("-lodging-start") && !stop.id.endsWith("-lodging-end"));
      if (isSelected) return { ...day, stops: withoutGenerated };
      const lodgingBase = {
        title: hotel.name,
        address: hotel.address || "住宿地址待補",
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        transportMode: "其他" as const,
        note: "這一天指定的住宿起終點",
        routeMode: "transit" as const,
        openingHours: "24 小時住宿地點",
        openingHoursSource: "這趟旅行的住宿設定",
        durationMinutes: 0
      };
      return { ...day, stops: [
        { ...lodgingBase, id: `${day.id}-lodging-start`, time: "08:00", transport: "從住宿出發" },
        ...withoutGenerated,
        { ...lodgingBase, id: `${day.id}-lodging-end`, time: "21:00", transport: "返回住宿" }
      ] };
    });
    const assignedHotels = [...new Set(Object.values(nextMap))];
    updateActiveTrip({
      homeBaseByDay: nextMap,
      homeBaseAccommodationId: assignedHotels.length === 1 ? assignedHotels[0] : "",
      days: nextDays
    });
    showToast(isSelected ? `已取消 ${activeTrip.days.find((day) => day.id === dayId)?.label} 的住宿起終點` : `${activeTrip.days.find((day) => day.id === dayId)?.label} 已套用「${hotel.name}」`);
  };

  const daysWithNightAccommodations = (nightMap: Record<string, string>) => activeTrip.days.map((day, dayIndex) => {
    const withoutGenerated = day.stops.filter((stop) => !stop.id.endsWith("-lodging-start") && !stop.id.endsWith("-lodging-end"));
    const startHotel = dayIndex > 0 ? activeTrip.accommodations.find((hotel) => hotel.id === nightMap[`night-${dayIndex}`]) : undefined;
    const endHotel = dayIndex < activeTrip.days.length - 1 ? activeTrip.accommodations.find((hotel) => hotel.id === nightMap[`night-${dayIndex + 1}`]) : undefined;
    const makeLodgingStop = (hotel: TripPlan["accommodations"][number], position: "start" | "end"): Stop => ({
      id: `${day.id}-lodging-${position}`,
      time: position === "start" ? "08:00" : "21:00",
      title: hotel.name,
      address: hotel.address || "住宿地址待補",
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      transport: position === "start" ? "從住宿出發" : "返回住宿",
      transportMode: "其他",
      note: position === "start" ? "昨晚住宿・今天從這裡出發" : "今晚住宿・今天回到這裡",
      routeMode: "transit",
      openingHours: "24 小時住宿地點",
      openingHoursSource: "這趟旅行的住宿設定",
      durationMinutes: 0
    });
    return {
      ...day,
      stops: [
        ...(startHotel ? [makeLodgingStop(startHotel, "start")] : []),
        ...withoutGenerated,
        ...(endHotel ? [makeLodgingStop(endHotel, "end")] : [])
      ]
    };
  });

  const toggleAccommodationForNight = (hotel: TripPlan["accommodations"][number], nightNumber: number) => {
    const key = `night-${nightNumber}`;
    const currentMap = Object.keys(activeTrip.accommodationByNight || {}).length
      ? (activeTrip.accommodationByNight || {})
      : activeTrip.homeBaseAccommodationId
        ? Object.fromEntries(Array.from({ length: Math.max(0, activeTrip.days.length - 1) }, (_, index) => [`night-${index + 1}`, activeTrip.homeBaseAccommodationId!]))
        : {};
    const nextMap = { ...currentMap };
    const isSelected = nextMap[key] === hotel.id;
    if (isSelected) delete nextMap[key]; else nextMap[key] = hotel.id;
    updateActiveTrip({ accommodationByNight: nextMap, homeBaseAccommodationId: "", homeBaseByDay: {}, days: daysWithNightAccommodations(nextMap) });
    showToast(isSelected ? `已取消第 ${nightNumber} 晚住宿` : `第 ${nightNumber} 晚已設定為「${hotel.name}」`);
  };

  const applyAccommodationToAllNights = (hotel: TripPlan["accommodations"][number]) => {
    const nextMap = Object.fromEntries(Array.from({ length: Math.max(0, activeTrip.days.length - 1) }, (_, index) => [`night-${index + 1}`, hotel.id]));
    updateActiveTrip({ accommodationByNight: nextMap, homeBaseAccommodationId: hotel.id, homeBaseByDay: {}, days: daysWithNightAccommodations(nextMap) });
    showToast(`每一晚都已設定為「${hotel.name}」`);
  };

  const clearAllNightAccommodations = () => {
    updateActiveTrip({ accommodationByNight: {}, homeBaseAccommodationId: "", homeBaseByDay: {}, days: daysWithNightAccommodations({}) });
    showToast("已取消所有晚間住宿設定");
  };

  const createShoppingItem = () => {
    if (!shoppingName.trim()) {
      Alert.alert("請填寫商品名稱");
      return;
    }
    updateActiveTrip({ shopping: [...activeTrip.shopping, {
      id: `shopping-${Date.now()}`, name: shoppingName.trim(), price: shoppingPrice.trim(),
      currency: shoppingCurrency, category: shoppingCategory.trim(), imageUrl: shoppingImageUrl.trim(),
      scope: shoppingScope, owner: shoppingScope === "personal" ? (myDisplayName || "") : ""
    }] });
    setAddingShoppingItem(false);
    setShoppingName(""); setShoppingPrice(""); setShoppingCurrency("KRW"); setShoppingCategory(""); setShoppingImageUrl("");
    setShoppingScope("shared");
  };

  const deleteShoppingItem = (id: string) => {
    updateActiveTrip({ shopping: activeTrip.shopping.filter((item) => item.id !== id) });
  };

  const toggleShoppingItem = (id: string) => {
    const item = activeTrip.shopping.find((entry) => entry.id === id);
    updateActiveTrip({
      shopping: activeTrip.shopping.map((item) => item.id === id ? { ...item, purchased: !item.purchased } : item)
    });
    if (item) showToast(item.purchased ? "已移回待購買清單" : "已移到已購買清單");
  };

  const visibleShoppingItems = activeTrip.shopping.filter((item) =>
    shoppingView === "shared"
      ? (item.scope || "shared") === "shared"
      : item.scope === "personal" && item.owner === myDisplayName
  );

  const createChecklistItem = () => {
    const text = checklistText.trim();
    if (!text) {
      setChecklistError("請先在上方輸入一項準備事項，例如：購買網卡。");
      return;
    }
    setChecklistError("");
    updateActiveTrip({
      checklist: [...(activeTrip.checklist || []), {
        id: `prep-${Date.now()}`, text, completed: false, scope: "personal",
        owner: checklistOwner
      }]
    });
    setChecklistText("");
    showToast(`已新增「${text}」`);
  };

  const toggleChecklistItem = (id: string) => {
    updateActiveTrip({ checklist: (activeTrip.checklist || []).map((item) => item.id === id ? { ...item, completed: !item.completed } : item) });
  };

  const deleteChecklistItem = (id: string) => {
    updateActiveTrip({ checklist: (activeTrip.checklist || []).filter((item) => item.id !== id) });
  };

  const visibleChecklistItems = (activeTrip.checklist || []).filter(
    (item) => item.scope === "personal" && (item.owner === checklistOwner || (!item.owner && checklistOwner === "我"))
  );

  useEffect(() => {
    if (!checklistOwner || !activeTrip.id || activeTrip.id === "local-welcome") return;
    const checklist = activeTrip.checklist || [];
    if (checklist.some((item) => item.scope === "personal" && item.owner === checklistOwner)) return;
    const personalBasics = defaultPrepChecklist().map((item) => ({
      ...item,
      id: `prep-personal-${encodeURIComponent(checklistOwner)}-${item.id}`,
      scope: "personal" as const,
      owner: checklistOwner
    }));
    updateActiveTrip({ checklist: [...checklist, ...personalBasics, ...defaultPersonalPacking(checklistOwner)] });
  }, [
    activeTrip.id,
    checklistOwner,
    (activeTrip.checklist || []).some((item) => item.scope === "personal" && item.owner === checklistOwner)
  ]);

  const weatherLabel = (code: number) =>
    code === 0 ? "晴朗" : code <= 3 ? "多雲" : code <= 48 ? "有霧" : code <= 67 ? "下雨" : code <= 77 ? "下雪" : code <= 82 ? "陣雨" : code <= 86 ? "陣雪" : "雷雨";
  const weatherIcon = (code: number) =>
    code === 0 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "❄️" : code <= 82 ? "🌦️" : "⛈️";

  const tripCurrencyContext = `${activeTrip.destination} ${activeTrip.days.flatMap((day) => day.stops.map((stop) => `${stop.title} ${stop.address}`)).join(" ")} ${activeTrip.accommodations.map((hotel) => hotel.address).join(" ")}`;
  const currencyForTrip = /日本|Japan|大分|別府|由布|九重|日田|宇佐|國東|国東|中津|竹田|豊後|豐後|沖繩|東京|大阪|京都|北海道|福岡|〒\d{3}-\d{4}|[都道府県]/i.test(tripCurrencyContext)
    ? { code: "JPY", symbol: "¥", rate: 0.22 }
    : { code: "KRW", symbol: "₩", rate: 0.022 };

  const refreshExchangeRate = async () => {
    setExchangeRateLoading(true);
    setExchangeRateError("");
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${currencyForTrip.code}`);
      const data = await response.json();
      const rate = Number(data?.rates?.TWD);
      if (!response.ok || data?.result !== "success" || !Number.isFinite(rate) || rate <= 0) throw new Error("匯率服務暫時沒有回傳資料");
      setExchangeRate(rate);
      setExchangeRateDate(String(data?.time_last_update_utc || "").replace(/\s*\+0000$/, " UTC"));
    } catch (error: any) {
      setExchangeRate(null);
      setExchangeRateError(error?.message || "無法更新匯率，請檢查網路後再試一次。");
    } finally {
      setExchangeRateLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTool === "匯率") refreshExchangeRate();
  }, [selectedTool, currencyForTrip.code]);

  const toolboxSubtitle = (title: string, fallback: string) => {
    if (title === "班機") return activeTrip.flights.length ? `${activeTrip.flights.length} 段航班` : "尚未新增航班";
    if (title === "住宿") return activeTrip.accommodations.length ? `${activeTrip.accommodations.length} 筆住宿` : "尚未新增住宿";
    if (title === "預約提醒") return reservationStops.length ? `${reservationStops.length} 項需要處理` : "目前沒有預約事項";
    if (title === "天氣") return `查看 ${activeTrip.destination} 即時天氣`;
    if (title === "匯率") return `${currencyForTrip.code} → TWD 快速換算`;
    if (title === "必買商品") return isKoreaTrip ? "韓國採買清單" : `${activeTrip.destination} 尚未建立清單`;
    return fallback;
  };

  const addUnscheduledPlaceToDay = (place: NonNullable<TripPlan["unscheduledPlaces"]>[number], dayId: string) => {
    const targetDay = activeTrip.days.find((day) => day.id === dayId);
    if (!targetDay) return;
    const latestMinutes = targetDay.stops.reduce((latest, stop) => {
      const match = stop.time.match(/^(\d{1,2}):([0-5]\d)$/);
      return match ? Math.max(latest, Number(match[1]) * 60 + Number(match[2])) : latest;
    }, 480);
    const start = Math.min(1200, latestMinutes + (targetDay.stops.length ? 120 : 0));
    const nextStop: Stop = {
      id: `scheduled-${Date.now()}-${place.id}`,
      time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
      title: place.name,
      address: place.address,
      transport: "加入後請確認交通與時間",
      transportMode: "其他",
      routeMode: "transit",
      note: place.note || "由未排入候選景點手動加入",
      latitude: place.latitude,
      longitude: place.longitude,
      openingHours: place.openingHours,
      durationMinutes: 90
    };
    persistTrips(trips.map((trip) => trip.id !== activeTrip.id ? trip : {
      ...trip,
      days: trip.days.map((day) => day.id === dayId ? { ...day, stops: [...day.stops, nextStop] } : day),
      unscheduledPlaces: (trip.unscheduledPlaces || []).filter((item) => item.id !== place.id)
    }));
    showToast(`已把「${place.name}」加入 ${targetDay.label}`);
  };

  const renderUnscheduledSection = () => {
    const places = activeTrip.unscheduledPlaces || [];
    if (!places.length) return null;
    return <View style={styles.unscheduledCard}>
      <Pressable style={styles.unscheduledHeader} onPress={() => setUnscheduledExpanded((value) => !value)}>
        <View><Text style={styles.unscheduledTitle}>未排入候選景點</Text><Text style={styles.unscheduledCount}>{places.length} 個尚未加入行程</Text></View>
        <Text style={styles.unscheduledArrow}>{unscheduledExpanded ? "⌃" : "⌄"}</Text>
      </Pressable>
      {unscheduledExpanded && places.map((place) => <View key={place.id} style={styles.unscheduledItem}>
        <Text style={styles.unscheduledName}>{place.name}</Text>
        {!!place.address && <Text style={styles.unscheduledAddress}>{place.address}</Text>}
        <Text style={styles.unscheduledReason}>未排入原因｜{place.reason}</Text>
        {!!place.openingHours && <Text style={styles.unscheduledHours}>營業時間｜{place.openingHours}</Text>}
        <Text style={styles.unscheduledAddLabel}>加入哪一天？</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unscheduledDayRow}>
          {activeTrip.days.map((day) => <Pressable key={day.id} style={styles.unscheduledDayButton} onPress={() => addUnscheduledPlaceToDay(place, day.id)}><Text style={styles.unscheduledDayText}>{day.label}</Text></Pressable>)}
        </ScrollView>
      </View>)}
    </View>;
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
          onPress={() => {
            setEditing(item);
            setDraftTitle(item.title);
            setDraftAddress(item.address === "地址待補" ? "" : item.address);
            setDraftNote(item.note);
            setDraftOpeningHours(item.openingHours || "");
            setDraftDuration(String(item.durationMinutes || ""));
            setDraftTransport(item.transport || "");
            setDraftRouteMode(item.routeMode || (item.transport.includes("步行") ? "walking" : item.transport.includes("地鐵") || item.transport.includes("公車") ? "transit" : item.transport.includes("計程車") ? "taxi" : "driving"));
          }}
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
          {reservationInfoForStop(item, selectedDay.date).required && <Text style={styles.pass}>{item.reservationCompleted ? "✅ 已完成預約" : "📌 需預約"}｜{reservationInfoForStop(item, selectedDay.date).note}</Text>}
          <Pressable onPress={() => copyAddressAndOpenUber(item)} style={styles.addressButton}>
            <Text style={styles.address} numberOfLines={2}>📍 {item.address}</Text>
            <Text style={styles.addressAction}>複製地址・開啟 Uber ↗</Text>
          </Pressable>
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
          <Image source={Platform.OS === "web" ? WEB_APP_ICON : require("./assets/douyou-icon.png")} style={styles.authAppIcon} />
          <Text style={styles.authEyebrow}>DOUYOU TRIP</Text>
          <Text style={styles.authTitle}>登入豆遊</Text>
          <Text style={styles.authDescription}>請先登入 Google 帳號。登入後只會顯示這個帳號建立或已加入的旅行。</Text>
          <FirebaseGoogleSignInButton onPress={signInGoogleWithFirebase} loading={loginBusy} />
          {!!loginError && <Text style={styles.loginErrorText}>{loginError}</Text>}
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
        <View style={[styles.scopeBar, (tab === "home" || tab === "favorites") ? styles.personalScopeBar : styles.tripScopeBar]}>
          <Text style={styles.scopeBarText}>{(tab === "home" || tab === "favorites") ? `👤 個人空間 · ${googleUser?.name || "我的帳號"}` : `✈ 本趟旅行 · ${activeTrip.title}`}</Text>
          <Text style={styles.scopeBarSub}>{(tab === "home" || tab === "favorites") ? "跨旅行保存" : "資料只屬於這趟旅行"}</Text>
        </View>
        {tab === "itinerary" && (
          <>
            <LinearGradient colors={["#F6EBDD", "#F7F3EC"]} style={styles.header}>
              {Platform.OS === "web" ? <img src={homeTravelBeanWebUri} alt="豆遊小豆" style={webItineraryMascotStyle as never} /> : <Image source={homeTravelBean} resizeMode="contain" style={styles.pageMascot} />}
              <View style={styles.headerTop}>
                <View style={styles.headerTitleBlock}>
                  <Text numberOfLines={1} style={styles.eyebrow}>{activeTrip.destination.toUpperCase()} · MY TRIP</Text>
                  <Text numberOfLines={2} style={styles.mainTitle}>{activeTrip.title}</Text>
                </View>
                <View style={styles.headerBadges}>
                  <Pressable hitSlop={12} style={[styles.syncBadge, syncStatus === "local" && styles.syncBadgeLocal]} onPress={showCloudInfo}>
                    <Text style={styles.syncBadgeText}>{syncStatus === "syncing" ? "☁ 同步中" : syncStatus === "synced" ? "☁ 已同步" : syncStatus === "error" ? "☁ 待重試" : "☁ 開啟同步"}</Text>
                  </Pressable>
                  <Pressable style={styles.tripBadge} onPress={() => {
                    setTravelerDraft(String(activeTrip.travelers));
                    setTripNameDraft(activeTrip.title);
                    setTripStartDraft(activeTrip.startDate || "");
                    setTripEndDraft(activeTrip.endDate || "");
                    setTripCoverDraft(activeTrip.coverImage || "");
                    setEditingTravelers(true);
                  }}>
                    <Text style={styles.tripBadgeIcon}>✦</Text>
                    <Text style={styles.tripBadgeText}>{activeTrip.travelers} 人同行</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.subtitle}>所有行程、交通與預約，集中在一個地方。</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
                <Pressable onPress={() => selectDay(ALL_DAYS_ID)} style={[styles.dayTab, showingAllDays && styles.dayTabActive]}>
                  <Text style={[styles.dayLabel, showingAllDays && styles.dayLabelActive]}>ALL</Text>
                  <Text style={[styles.dayDate, showingAllDays && styles.dayDateActive]}>總覽</Text>
                </Pressable>
                {days.map((day, index) => (
                  <Pressable key={day.id} onPress={() => selectDay(day.id)}
                    style={[styles.dayTab, !showingAllDays && day.id === selectedDay.id && styles.dayTabActive]}>
                    <Text style={[styles.dayLabel, !showingAllDays && day.id === selectedDay.id && styles.dayLabelActive]}>{day.date === "日期未定" ? "日期未定" : day.date.slice(0, 5)}</Text>
                    <Text style={[styles.dayDate, !showingAllDays && day.id === selectedDay.id && styles.dayDateActive]}>第 {index + 1} 天</Text>
                  </Pressable>
                ))}
                <Pressable onPress={addTripDay} style={[styles.dayTab, styles.addDayTab]}>
                  <Text style={styles.addDayPlus}>＋</Text>
                  <Text style={styles.addDayText}>新增一天</Text>
                </Pressable>
              </ScrollView>
            </LinearGradient>

            {showingAllDays ? (
              <ScrollView style={styles.itineraryListHost} contentContainerStyle={styles.listContent}>
                <View style={styles.dayHeading}>
                  <View style={styles.dayHeadingText}><Text style={styles.dayHeadingDate}>ALL DAYS</Text><Text style={styles.dayHeadingTitle}>整趟旅行總覽</Text></View>
                  <Text style={styles.dayCount}>{days.reduce((sum, day) => sum + day.stops.length, 0)} 個安排</Text>
                </View>
                <View style={styles.mapCard}>
                  <RouteMap stops={days.flatMap((day) => day.stops)} dayId={ALL_DAYS_ID} days={days.map((day, index) => ({ dayId: day.id, label: day.label, color: DAY_ROUTE_COLORS[index % DAY_ROUTE_COLORS.length]!, stops: day.stops }))} />
                  <View style={styles.mapFooter}>
                    <Text style={styles.mapFooterTitle}>全部天數移動路線</Text>
                    <Text style={styles.mapFooterText}>每一天使用不同顏色；點下方日期即可進入單日拖曳與編輯。</Text>
                    <View style={styles.routeLegend}>{days.map((day, index) => <Pressable key={day.id} style={styles.routeLegendItem} onPress={() => selectDay(day.id)}><View style={[styles.routeLegendDot, { backgroundColor: DAY_ROUTE_COLORS[index % DAY_ROUTE_COLORS.length] }]} /><Text style={styles.routeLegendText}>{day.label}</Text></Pressable>)}</View>
                  </View>
                </View>
                {days.map((day, dayIndex) => <Pressable key={day.id} style={styles.allDayCard} onPress={() => selectDay(day.id)}>
                  <View style={[styles.allDayStripe, { backgroundColor: DAY_ROUTE_COLORS[dayIndex % DAY_ROUTE_COLORS.length] }]} />
                  <View style={styles.allDayBody}><Text style={styles.allDayTitle}>{day.label}・{day.date}</Text><Text style={styles.allDaySubtitle}>{day.stops.length ? day.stops.map((stop) => stop.title).join(" → ") : "尚未安排"}</Text></View><Text style={styles.chevron}>›</Text>
                </Pressable>)}
                {renderUnscheduledSection()}
              </ScrollView>
            ) : <View style={styles.itineraryListHost}>
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
                ListFooterComponent={renderUnscheduledSection()}
                ListHeaderComponent={
                <>
                  <View style={styles.dayHeading}>
                    <View style={styles.dayHeadingText}>
                      <Text style={styles.dayHeadingDate}>{selectedDay.date}</Text>
                      <Text numberOfLines={2} style={styles.dayHeadingTitle}>{selectedDay.title}</Text>
                    </View>
                    <View style={styles.dayHeadingActions}>
                      <Text style={styles.dayCount}>{selectedDay.stops.length} 個安排</Text>
                      <View style={styles.dayActionRow}>
                        <Pressable disabled={days.findIndex((day) => day.id === selectedDay.id) === 0} style={styles.dayMoveButton} onPress={() => moveWholeDay(-1)}>
                          <Text style={[styles.dayMoveText, days.findIndex((day) => day.id === selectedDay.id) === 0 && styles.reorderDisabled]}>← 整天前移</Text>
                        </Pressable>
                        <Pressable disabled={days.findIndex((day) => day.id === selectedDay.id) === days.length - 1} style={styles.dayMoveButton} onPress={() => moveWholeDay(1)}>
                          <Text style={[styles.dayMoveText, days.findIndex((day) => day.id === selectedDay.id) === days.length - 1 && styles.reorderDisabled]}>整天後移 →</Text>
                        </Pressable>
                        {days.length > 1 && <Pressable style={styles.dayDeleteButton} onPress={deleteSelectedDay}>
                          <Text style={styles.dayDeleteText}>刪除這一天</Text>
                        </Pressable>}
                        <Pressable accessibilityLabel="新增景點" style={styles.smallAddButton} onPress={() => setAddingStop(true)}>
                          <Text style={styles.smallAddButtonText}>＋ 新增景點</Text>
                        </Pressable>
                      </View>
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
                            <Text style={styles.undoSortText}>↶ 上一步</Text>
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
            </View>}
          </>
        )}

        {tab === "favorites" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <View style={styles.favoriteHeader}><View><Text style={styles.eyebrow}>MY SAVED PLACES</Text><Text style={styles.pageTitle}>景點收藏</Text><Text style={styles.pageSubtitle}>個人收藏會依國家與城市自動整理。</Text></View><View style={styles.favoriteHeaderActions}><Pressable style={styles.favoriteBatchButton} onPress={importBusanBackupsToFavorites}><Text style={styles.favoriteBatchButtonText}>釜山備案</Text></Pressable><Pressable style={styles.favoriteBatchButton} onPress={() => setBatchFavoriteVisible(true)}><Text style={styles.favoriteBatchButtonText}>批次匯入</Text></Pressable><Pressable style={styles.addTripButton} onPress={() => openFavoriteEditor()}><Text style={styles.addTripPlus}>＋</Text></Pressable></View></View>
            <Pressable disabled={favoriteBulkUpdating} style={[styles.favoriteBulkUpdateButton, favoriteBulkUpdating && styles.buttonDisabled]} onPress={updateAllFavoriteCoordinates}><Text style={styles.favoriteBulkUpdateText}>{favoriteBulkUpdating ? "正在更新全部收藏座標…" : "⌖ 更新全部收藏座標"}</Text></Pressable>
            <View style={styles.favoritePlanner}>
              <Text style={styles.favoritePlannerTitle}>✨ 已選 {selectedFavorites.length} 個景點</Text>
              <Text style={styles.favoritePlannerText}>{favoriteIncludeAll ? "J 人密集模式：每天盡量排滿，依景點類型分配停留時間；仍遵守航班與營業時間，排不下的全部保留為備案。" : "精選模式：依航班可用時間、地區與活動強度挑選較少的主要景點；餐廳會列首選與備案。"}</Text>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: favoriteIncludeAll }} style={styles.favoriteIncludeAllRow} onPress={() => setFavoriteIncludeAll((current) => !current)}>
                <View style={[styles.favoriteCheckbox, favoriteIncludeAll && styles.favoriteCheckboxActive]}><Text style={styles.favoriteCheckboxMark}>{favoriteIncludeAll ? "✓" : ""}</Text></View>
                <View style={styles.favoriteIncludeAllCopy}><Text style={styles.favoriteIncludeAllTitle}>J 人密集排行程</Text><Text style={styles.favoritePlannerText}>預設開啟；完整日約 6～8 個點，排不下的放進備案區。</Text></View>
              </Pressable>
              <Text style={styles.favoriteTargetLabel}>航班時間（用來限制第一天與最後一天的安排）</Text>
              <Text style={styles.fieldLabel}>抵達地點／機場／車站</Text><TextInput value={favoriteArrivalPlace} onChangeText={setFavoriteArrivalPlace} style={styles.fieldInput} placeholder="例如：大分機場" placeholderTextColor="#A49C90" />
              <View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.fieldLabel}>抵達日期</Text><TextInput value={favoriteArrivalDate} onChangeText={setFavoriteArrivalDate} style={styles.fieldInput} placeholder="YYYY-MM-DD" placeholderTextColor="#A49C90" /></View><View style={styles.formHalf}><Text style={styles.fieldLabel}>抵達時間</Text><TextInput value={favoriteArrivalTime} onChangeText={setFavoriteArrivalTime} style={styles.fieldInput} placeholder="例如 19:30" placeholderTextColor="#A49C90" /></View></View>
              <Text style={styles.fieldLabel}>回程出發地點（可與抵達地點不同）</Text><TextInput value={favoriteDeparturePlace} onChangeText={setFavoriteDeparturePlace} style={styles.fieldInput} placeholder="例如：福岡機場或別府港" placeholderTextColor="#A49C90" />
              <View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.fieldLabel}>回程日期</Text><TextInput value={favoriteDepartureDate} onChangeText={setFavoriteDepartureDate} style={styles.fieldInput} placeholder="YYYY-MM-DD" placeholderTextColor="#A49C90" /></View><View style={styles.formHalf}><Text style={styles.fieldLabel}>回程起飛</Text><TextInput value={favoriteDepartureTime} onChangeText={setFavoriteDepartureTime} style={styles.fieldInput} placeholder="例如 16:40" placeholderTextColor="#A49C90" /></View></View>
              <Text style={styles.favoriteTargetLabel}>住宿安排（會決定每天的出發點與終點）</Text>
              <Text style={styles.favoritePlannerText}>每行格式：晚次｜住宿名稱｜完整地址。若全程住同一間，可以省略晚次；換飯店時分成多行。</Text>
              <TextInput value={favoriteAccommodationText} onChangeText={setFavoriteAccommodationText} multiline style={[styles.noteInput, styles.favoriteBatchInput]} placeholder={'1-2｜大分市區飯店｜完整地址\n3-4｜由布院飯店｜完整地址\n\n全程同一間也可寫：\n飯店名稱｜完整地址'} placeholderTextColor="#A49C90" />
              <View style={styles.favoritePlannerRow}><TextInput value={favoriteDayCount} onChangeText={setFavoriteDayCount} keyboardType="number-pad" style={[styles.fieldInput, styles.favoriteDayInput]} placeholder="天數" /><Pressable style={styles.favoriteGenerateButton} onPress={generateTripFromFavorites}><Text style={styles.primaryButtonText}>建立新旅行</Text></Pressable></View>
              <Text style={styles.favoriteTargetLabel}>或加入既有旅行</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteTripChips}>{trips.map((trip) => <Pressable key={trip.id} style={[styles.favoriteTripChip, (favoriteTargetTripId || activeTrip.id) === trip.id && styles.favoriteTripChipActive]} onPress={() => setFavoriteTargetTripId(trip.id)}><Text style={[(favoriteTargetTripId || activeTrip.id) === trip.id && styles.favoriteTripChipTextActive]}>{trip.title}</Text></Pressable>)}</ScrollView>
              <Pressable style={styles.favoriteExistingButton} onPress={addFavoritesToExistingTrip}><Text style={styles.favoriteExistingButtonText}>取得建議天數並加入</Text></Pressable>
            </View>
            {Object.entries(favoriteTree).map(([country, cities]) => {
              const countryCollapsed = collapsedFavoriteCountries.includes(country);
              return <View key={country} style={styles.favoriteCountryGroup}>
                <Pressable style={styles.favoriteCountryToggle} onPress={() => setCollapsedFavoriteCountries((current) => current.includes(country) ? current.filter((item) => item !== country) : [...current, country])}>
                  <Text style={styles.favoriteTreeArrow}>{countryCollapsed ? "▸" : "▾"}</Text><Text style={styles.favoriteCountry}>{country}</Text>
                </Pressable>
                {!countryCollapsed && Object.entries(cities).map(([city, places]) => {
                  const cityKey = `${country}|||${city}`;
                  const cityCollapsed = collapsedFavoriteCities.includes(cityKey);
                  const ids = places.map((place) => place.id);
                  const citySelected = ids.length > 0 && ids.every((id) => selectedFavoriteIds.includes(id));
                  return <View key={cityKey} style={styles.favoriteGroup}>
                    <View style={styles.favoriteCitySelect}>
                      <Pressable style={[styles.favoriteCheckbox, citySelected && styles.favoriteCheckboxActive]} onPress={() => toggleFavoriteSelection(ids)}><Text style={styles.favoriteCheckboxMark}>{citySelected ? "✓" : ""}</Text></Pressable>
                      <Pressable style={styles.favoriteCityToggle} onPress={() => setCollapsedFavoriteCities((current) => current.includes(cityKey) ? current.filter((item) => item !== cityKey) : [...current, cityKey])}>
                        <Text style={styles.favoriteTreeArrow}>{cityCollapsed ? "▸" : "▾"}</Text><Text style={styles.favoriteCity}>{city}</Text>
                      </Pressable>
                    </View>
                    {!cityCollapsed && places.map((place) => { const selected = selectedFavoriteIds.includes(place.id); return <View key={place.id} style={[styles.favoriteCard, selected && styles.favoriteCardSelected]}><Pressable style={[styles.favoriteCheckbox, selected && styles.favoriteCheckboxActive]} onPress={() => toggleFavoriteSelection([place.id])}><Text style={styles.favoriteCheckboxMark}>{selected ? "✓" : ""}</Text></Pressable><Pressable style={styles.favoriteCardText} onPress={() => openFavoriteEditor(place)}><Text style={styles.favoriteName}>{place.name}</Text><Text style={styles.favoriteAddress}>{place.address}</Text><Text style={styles.favoriteFeature}>特色｜{place.note || favoriteFeatureText(place.name, place.address)}</Text><Text style={styles.favoriteEditHint}>點此編輯景點</Text></Pressable><Pressable onPress={() => { persistFavorites(favorites.filter((item) => item.id !== place.id)); setSelectedFavoriteIds((current) => current.filter((id) => id !== place.id)); }}><Text style={styles.favoriteDelete}>×</Text></Pressable></View>; })}
                  </View>;
                })}
              </View>;
            })}
            {!favorites.length && <View style={styles.emptyItinerary}><Text style={styles.emptyItineraryIcon}>♡</Text><Text style={styles.emptyItineraryTitle}>還沒有收藏景點</Text><Text style={styles.emptyItineraryText}>可以按右上角新增，或從行程景點的編輯頁加入收藏。</Text></View>}
          </ScrollView>
        )}

        {tab === "toolbox" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <View style={styles.toolboxHeader}>
              <View><Text style={styles.eyebrow}>TRIP ESSENTIALS</Text><Text style={styles.pageTitle}>旅行工具箱</Text><Text style={styles.pageSubtitle}>訂單、天氣與採買清單都放在同一處。</Text></View>
              {Platform.OS === "web" ? <img src={homeTravelBeanWebUri} alt="豆遊小豆" style={webToolboxMascotStyle as never} /> : <Image source={homeTravelBean} resizeMode="contain" style={styles.pageMascot} />}
            </View>
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
              {Platform.OS === "web" ? (
                <img src={homeTravelBeanWebUri} alt="豆遊旅行插畫" style={webHomeMascotStyle as never} />
              ) : (
                <Image source={homeTravelBean} resizeMode="contain" style={styles.homeHeaderArtwork} accessibilityLabel="豆遊旅行插畫" />
              )}
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
                    {googleUser.picture ? (
                      <Image source={{ uri: googleUser.picture }} style={styles.accountAvatar} />
                    ) : (
                      <View style={styles.accountAvatarFallback}>
                        <Text style={styles.accountAvatarInitials}>{(googleUser.name || "豆遊").trim().slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.accountText}><Text style={styles.accountName}>{googleUser.name}</Text><Text style={styles.accountEmail}>{googleUser.email}</Text></View>
                    <Pressable onPress={signOutGoogle}><Text style={styles.signOutText}>登出</Text></Pressable>
                  </View>
                  <Text style={styles.accountHint}>同一 Google 帳號在手機與電腦會被辨識為同一位成員。</Text>
                </>
              ) : (
                <>
                  <Text style={styles.accountTitle}>使用 Google 帳號登入</Text>
                  <Text style={styles.accountHint}>跨裝置辨識同一人，並保留旅行成員身分。</Text>
                  <FirebaseGoogleSignInButton onPress={signInGoogleWithFirebase} loading={loginBusy} />
                  {!!loginError && <Text style={styles.loginErrorText}>{loginError}</Text>}
                </>
              )}
            </View>
            {trips.map((trip, index) => (
              <Pressable key={trip.id} style={styles.tripCard} onPress={() => selectTrip(trip)}>
                <LinearGradient
                  colors={index % 2 === 0 ? ["#536783", "#8B9AB0"] : ["#927A73", "#C5A28C"]}
                  style={styles.tripCardCover}
                >
                  {!!trip.coverImage && <Image source={{ uri: trip.coverImage }} style={styles.tripCoverPhoto} resizeMode="cover" />}
                  {!!trip.coverImage && <View style={styles.tripCoverShade} />}
                  <Text style={styles.tripCardIndex}>TRIP {String(index + 1).padStart(2, "0")}</Text>
                  <Text style={styles.tripCardPeriod}>{trip.period}</Text>
                  <View style={styles.tripCardMeta}>
                    <Text style={styles.tripCardMetaText}>{trip.days.length} 天</Text>
                    <Text style={styles.tripCardMetaDot}>·</Text>
                    <Text style={styles.tripCardMetaText}>{trip.travelers} 人同行</Text>
                  </View>
                </LinearGradient>
                <View style={styles.tripCardBottom}>
                  <View style={styles.tripCardInfo}>
                    <Text style={styles.tripCardName} numberOfLines={2}>{trip.title}</Text>
                    <Text style={styles.tripCardStatus}>{cloudLinks[trip.id] ? "☁ 已連接旅伴同步" : trip.id === activeTrip.id ? "目前開啟中" : "點擊查看行程"}</Text>
                    {trips.filter((item) => item.title === trip.title).length > 1 && <Text style={styles.tripCardStatus}>旅行 ID｜{trip.id}</Text>}
                  </View>
                  <View style={styles.tripCardActions}>
                    <Pressable
                      style={styles.editTripButton}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        setActiveTripId(trip.id);
                        setSelectedDayId(trip.days[0]?.id || "");
                        setTravelerDraft(String(trip.travelers));
                        setTripNameDraft(trip.title);
                        setTripStartDraft(trip.startDate || "");
                        setTripEndDraft(trip.endDate || "");
                        setTripCoverDraft(trip.coverImage || "");
                        setEditingTravelers(true);
                      }}
                    >
                      <Text style={styles.editTripText}>編輯旅行</Text>
                    </Pressable>
                    <Pressable style={styles.archiveTripButton} onPress={(event) => { event.stopPropagation?.(); setArchiveTripTarget(trip); }}><Text style={styles.archiveTripText}>匯出</Text></Pressable>
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
            {!!archivedTrips.length && <View style={styles.archiveSection}><Text style={styles.archiveSectionTitle}>舊版封存區</Text><Text style={styles.archiveSectionHint}>這裡只保留以前使用雲端封存的旅行；新版匯出不會移動或刪除旅行。</Text>{archivedTrips.map((trip) => { const daysLeft = Math.max(0, Math.ceil((Date.parse(String(trip["預定刪除時間"] || "")) - Date.now()) / 86400000)); return <View key={String(trip["旅行ID"])} style={styles.archiveCard}><View style={styles.archiveCardText}><Text style={styles.archiveCardTitle}>{String(trip["名稱"] || trip["目的地"] || "已封存旅行")}</Text><Text style={styles.archiveCardSub}>舊版資料 · 剩餘 {daysLeft} 天</Text></View><Pressable style={styles.restoreArchiveButton} onPress={() => restoreArchivedTrip(String(trip["旅行ID"]))}><Text style={styles.restoreArchiveText}>復原</Text></Pressable></View>; })}</View>}
            <Pressable style={styles.newTripCard} onPress={() => setCreatingTrip(true)}>
              <Text style={styles.newTripIcon}>＋</Text>
              <Text style={styles.newTripTitle}>建立下一趟旅行</Text>
              <Text style={styles.newTripSub}>目的地、日期與天數都可以自己設定</Text>
            </Pressable>
            <Text style={styles.versionLabel}>豆遊版本 2026.08.11.1</Text>
          </ScrollView>
        )}
        {tab === "expenses" && (
          <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
            <View style={styles.expenseHeader}>
              {Platform.OS === "web" ? <img src={homeTravelBeanWebUri} alt="豆遊小豆" style={webExpensesMascotStyle as never} /> : <Image source={homeTravelBean} resizeMode="contain" style={styles.pageMascot} />}
              <View>
                <Text style={styles.eyebrow}>SPLIT TOGETHER</Text>
                <Text style={styles.pageTitle}>旅行記帳</Text>
                <Text style={styles.pageSubtitle}>{activeTrip.title}・多幣別支出</Text>
                <Text selectable style={styles.expenseTripId}>旅行 ID｜{activeTrip.id}</Text>
              </View>
              <Pressable style={styles.addTripButton} onPress={openExpenseModal}><Text style={styles.addTripPlus}>＋</Text></Pressable>
            </View>
            {cloudLinks[activeTrip.id] && (
              firestoreConnected || cloudLinks[activeTrip.id]!.inviteCode
                ? <View style={styles.refreshSyncButton}><Text style={styles.refreshSyncText}>{firestoreConnected ? "● Firebase 即時同步已開啟" : syncStatus === "syncing" ? "☁ 正在自動同步……" : "● 舊版同步暫時保留"}</Text></View>
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
            <LinearGradient colors={["#536783", "#8999B1"]} style={styles.totalCard}>
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
            {tripExpenses.length > 0 && (
              <View style={styles.settlementCard}>
                <Text style={styles.summaryTitle}>分帳結算</Text>
                {settlements.length === 0
                  ? <Text style={styles.settlementDone}>目前已平衡，不需要互相轉帳。</Text>
                  : settlements.map((row, index) => (
                    <View key={`${row.currency}-${row.from}-${row.to}-${index}`} style={styles.settlementRow}>
                      <Text style={styles.settlementText}><Text style={styles.settlementName}>{row.from}</Text> 應付給 <Text style={styles.settlementName}>{row.to}</Text></Text>
                      <Text style={styles.settlementAmount}>{row.currency} {Math.round(row.amount).toLocaleString()}</Text>
                    </View>
                  ))}
              </View>
            )}
            {tripExpenses.length === 0 ? (
              <Pressable style={styles.emptyExpense} onPress={openExpenseModal}>
                <Text style={styles.emptyExpenseIcon}>🧾</Text>
                <Text style={styles.emptyExpenseTitle}>還沒有任何支出</Text>
                <Text style={styles.emptyExpenseSub}>點這裡新增第一筆餐費、交通或購物</Text>
              </Pressable>
            ) : tripExpenses.map((item) => (
              <View key={item.id} style={styles.expenseRow}>
                <View style={styles.expenseBadge}><Text>🧾</Text></View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseName}>{item.title}</Text>
                  <Text style={styles.expensePayer}>付款人：{item.payer}</Text>
                  <Text style={styles.expensePayer}>分帳：{(item.splitBetween?.length ? item.splitBetween : activeMemberNames).join("、") || item.payer}</Text>
                </View>
                <Text style={styles.expenseValue}>{item.currency || "KRW"} {item.amount.toLocaleString()}</Text>
                <Pressable onPress={() => deleteExpense(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {tab === "itinerary" && previousStops && (
          <Pressable style={styles.floatingUndoButton} onPress={undoSmartSort}>
            <Text style={styles.floatingUndoText}>↶ 上一步</Text>
          </Pressable>
        )}

        <Pressable style={[styles.aiFloatingButton, previousStops && styles.aiFloatingButtonRaised]} onPress={() => openAiAssistant()}>
          <Text style={styles.aiFloatingIcon}>✦</Text>
          <Text style={styles.aiFloatingText}>豆遊小助手</Text>
        </Pressable>

        <View style={styles.bottomBar}>
          <TabButton icon="home" label="首頁" active={tab === "home"} onPress={() => setTab("home")} />
          <TabButton icon="heart" label="收藏" active={tab === "favorites"} onPress={() => setTab("favorites")} />
          <View style={styles.bottomGroupDivider} />
          <TabButton icon="list" label="行程" active={tab === "itinerary"} onPress={() => setTab("itinerary")} />
          <TabButton icon="toolbox" label="工具箱" active={tab === "toolbox"} onPress={() => setTab("toolbox")} />
          <TabButton icon="receipt" label="記帳" active={tab === "expenses"} onPress={() => setTab("expenses")} />
        </View>

        <Modal visible={cloudPanelVisible} animationType="fade" transparent onRequestClose={() => setCloudPanelVisible(false)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>TRIP SYNC</Text>
              <Text style={styles.sheetTitle}>{cloudLinks[activeTrip.id] ? "旅伴加入資訊" : "開啟雙人同步"}</Text>
              {cloudLinks[activeTrip.id] ? (
                <>
                  <Text style={styles.cloudLabel}>這趟旅行的專屬邀請碼</Text>
                  {cloudLinks[activeTrip.id]!.inviteCode
                    ? <Text selectable style={styles.cloudInvite}>{cloudLinks[activeTrip.id]!.inviteCode}</Text>
                    : cloudLinks[activeTrip.id]!.role === "owner"
                      ? <Pressable style={styles.primaryButton} onPress={regenerateInviteCode}><Text style={styles.primaryButtonText}>產生新的邀請碼</Text></Pressable>
                      : <Text style={styles.joinErrorText}>邀請碼只會顯示在建立者帳號，請向建立者索取。</Text>}
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
                  <Text style={styles.sheetAddress}>旅伴在豆遊首頁點「加入旅行」，輸入這組邀請碼與自己的名稱即可。</Text>
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
                  <Text style={styles.sheetAddress}>開啟後會將這趟旅行上傳到豆遊同步服務，並產生專屬邀請碼。</Text>
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

        <Modal visible={addingFavorite} animationType="slide" transparent onRequestClose={() => { resetFavoriteForm(); setAddingFavorite(false); }}>
          <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetEyebrow}>SAVE A PLACE</Text><Text style={styles.sheetTitle}>{editingFavoriteId ? "編輯收藏景點" : "新增收藏景點"}</Text>
            <Text style={styles.favoriteSearchTip}>先填國家與城市，搜尋會更準確；例如「日本／京都／伏見稻荷」。</Text>
            <View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.fieldLabel}>國家</Text><TextInput value={favoriteCountry} onChangeText={(value) => { setFavoriteCountry(value); setFavoriteLatitude(undefined); }} style={styles.fieldInput} placeholder="例如：日本" placeholderTextColor="#A49C90" /></View><View style={styles.formHalf}><Text style={styles.fieldLabel}>城市</Text><TextInput value={favoriteCity} onChangeText={(value) => { setFavoriteCity(value); setFavoriteLatitude(undefined); }} style={styles.fieldInput} placeholder="例如：京都" placeholderTextColor="#A49C90" /></View></View>
            <Text style={styles.fieldLabel}>景點名稱 *</Text><TextInput value={favoriteName} onChangeText={(value) => { setFavoriteName(value); setFavoriteLatitude(undefined); setFavoriteLongitude(undefined); }} style={styles.fieldInput} placeholder="例如：西面樂天百貨" placeholderTextColor="#A49C90" />
            {favoriteSearchStatus === "loading" && <Text style={styles.placeSearchStatus}>正在搜尋附近的正確地點…</Text>}
            {favoriteSearchStatus === "empty" && <Text style={styles.placeSearchError}>找不到相符地點，請加上城市或完整名稱再試一次。</Text>}
            {!!favoriteSuggestions.length && <View style={styles.placeSuggestions}>{favoriteSuggestions.map((row, index) => <Pressable key={`${row.place_id || index}`} style={styles.placeSuggestion} onPress={() => selectFavoriteSuggestion(row)}><Text style={styles.placeSuggestionName}>{String(row.display_name || "").split(",")[0]}</Text><Text style={styles.placeSuggestionAddress}>{String(row.display_name || "")}</Text></Pressable>)}</View>}
            <Text style={styles.fieldLabel}>地址</Text><TextInput value={favoriteAddress} onChangeText={(value) => { setFavoriteAddress(value); setFavoriteLatitude(undefined); setFavoriteLongitude(undefined); }} style={styles.fieldInput} placeholder="請從上方搜尋結果選擇" placeholderTextColor="#A49C90" />
            <Text style={styles.fieldLabel}>特色與備註（系統帶入後仍可修改）</Text><TextInput value={favoriteNote} onChangeText={setFavoriteNote} multiline style={styles.noteInput} placeholder="例如：看海、拍照、逛街或必做事項" placeholderTextColor="#A49C90" />
            <Pressable style={styles.primaryButton} onPress={saveFavorite}><Text style={styles.primaryButtonText}>{editingFavoriteId ? "更新收藏景點" : "儲存並自動分類"}</Text></Pressable><Pressable style={styles.cancelButton} onPress={() => { resetFavoriteForm(); setAddingFavorite(false); }}><Text style={styles.cancelText}>取消</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={batchFavoriteVisible} animationType="slide" transparent onRequestClose={() => !batchFavoriteStatus && setBatchFavoriteVisible(false)}>
          <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetEyebrow}>BATCH IMPORT</Text><Text style={styles.sheetTitle}>一次貼上收藏景點</Text>
            <Text style={styles.favoriteSearchTip}>只有名稱時先填共同國家／城市；若每筆不同，也可以把國家與城市寫在每行。</Text>
            <View style={styles.formRow}><View style={styles.formHalf}><Text style={styles.fieldLabel}>共同國家</Text><TextInput value={batchFavoriteCountry} onChangeText={setBatchFavoriteCountry} style={styles.fieldInput} placeholder="例如：日本" placeholderTextColor="#A49C90" /></View><View style={styles.formHalf}><Text style={styles.fieldLabel}>共同城市</Text><TextInput value={batchFavoriteCity} onChangeText={setBatchFavoriteCity} style={styles.fieldInput} placeholder="例如：京都" placeholderTextColor="#A49C90" /></View></View>
            <Text style={styles.fieldLabel}>每行一個景點</Text><TextInput value={batchFavoriteText} onChangeText={setBatchFavoriteText} multiline style={[styles.noteInput, styles.favoriteBatchInput]} placeholder={'伏見稻荷\n清水寺\n\n或完整格式：\n日本｜大阪｜大阪城｜大阪府大阪市中央區大阪城1-1｜賞櫻、天守閣'} placeholderTextColor="#A49C90" />
            {!!batchFavoriteStatus && <Text style={styles.placeSearchStatus}>{batchFavoriteStatus}</Text>}
            <Pressable style={[styles.primaryButton, !!batchFavoriteStatus && styles.disabledButton]} disabled={!!batchFavoriteStatus} onPress={importFavoriteBatch}><Text style={styles.primaryButtonText}>{batchFavoriteStatus ? "正在匯入…" : "匯入全部收藏"}</Text></Pressable>
            <Pressable style={styles.cancelButton} disabled={!!batchFavoriteStatus} onPress={() => setBatchFavoriteVisible(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={!!archiveTripTarget} animationType="slide" transparent onRequestClose={() => setArchiveTripTarget(null)}>
          <View style={styles.modalShade}><View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetEyebrow}>EXPORT TRIP</Text><Text style={styles.sheetTitle}>匯出旅行</Text>
            <View style={styles.archiveWarning}><Text style={styles.archiveWarningTitle}>直接存到目前裝置</Text><Text style={styles.archiveWarningText}>不寄信、不建立 Google Sheet，也不會刪除或封存旅行。Excel 會直接下載；PDF 會開啟系統列印畫面，請選擇「儲存為 PDF」。</Text></View>
            <Text style={styles.fieldLabel}>旅行</Text><Text style={styles.archiveTripName}>{archiveTripTarget?.title}</Text>
            <Pressable style={styles.primaryButton} onPress={archiveTripAndEmail}><Text style={styles.primaryButtonText}>下載 Excel</Text></Pressable>
            <Pressable style={styles.secondaryAction} onPress={exportTripPdf}><Text style={styles.secondaryActionText}>匯出 PDF</Text></Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setArchiveTripTarget(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
          </View></View>
        </Modal>

        <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
          <View style={styles.modalShade}>
            <ScrollView
              style={[styles.sheet, styles.editingSheet]}
              contentContainerStyle={styles.editingSheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>景點備註</Text>
              <Text style={styles.sheetTitle}>修改景點</Text>
              <Text style={styles.fieldLabel}>景點名稱</Text>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="輸入景點名稱"
                placeholderTextColor="#A49C90"
                style={styles.fieldInput}
              />
              <Text style={styles.fieldLabel}>地址</Text>
              <TextInput
                value={draftAddress}
                onChangeText={setDraftAddress}
                placeholder="輸入完整地址或景點地址"
                placeholderTextColor="#A49C90"
                style={styles.fieldInput}
              />
              <Text style={styles.routeFieldHint}>修改地址後，地圖座標會自動重新取得。</Text>
              <Pressable style={styles.aiInlineButton} onPress={() => editing && openAiAssistant(editing)}>
                <Text style={styles.aiInlineText}>✦ AI 說說這裡：問交通、最佳抵達時間或備案</Text>
              </Pressable>
              <Text style={styles.fieldLabel}>從上一站怎麼前往這裡？</Text>
              <Text style={styles.routeFieldHint}>這是「上一站 → 此景點」的交通，不是景點本身的預約方式；不確定可留「尚未安排」。</Text>
              <View style={styles.legRouteActions}>
                {([
                  ["driving", "🚗 開車"],
                  ["walking", "🚶 步行"],
                  ["transit", "🚇 大眾運輸"],
                  ["taxi", "🚕 計程車"]
                ] as [RouteMode, string][]).map(([mode, label]) => (
                  <Pressable key={mode} onPress={() => {
                    setDraftRouteMode(mode);
                    if (!draftTransport.trim() || draftTransport === "尚未安排") {
                      setDraftTransport(mode === "driving" ? "開車" : mode === "walking" ? "步行" : mode === "transit" ? "大眾運輸" : "計程車");
                    }
                  }} style={[styles.legModeButton, draftRouteMode === mode && styles.legModeButtonActive]}>
                    <Text style={[styles.legModeText, draftRouteMode === mode && styles.legModeTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draftTransport}
                onChangeText={setDraftTransport}
                placeholder="例如：地鐵約 20 分鐘（不是預約制）"
                placeholderTextColor="#A49C90"
                style={styles.fieldInput}
              />
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
              <Pressable style={styles.favoriteFromStopButton} onPress={() => editing && addStopToFavorites(editing)}><Text style={styles.favoriteFromStopText}>♡ 加入個人收藏</Text></Pressable>
              <Pressable style={styles.primaryButton} onPress={saveNote}><Text style={styles.primaryButtonText}>儲存景點資料</Text></Pressable>
              <Pressable style={styles.deleteStopButton} onPress={deleteEditingStop}><Text style={styles.deleteStopText}>刪除此景點</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditing(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={aiAssistantVisible} animationType="slide" transparent onRequestClose={() => setAiAssistantVisible(false)}>
          <View style={styles.modalShade}>
            <View style={[styles.sheet, styles.aiSheet]}>
              <View style={styles.sheetHandle} />
              <View style={styles.aiHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>DOUYOU AI</Text>
                  <Text style={styles.sheetTitle}>豆遊小助手</Text>
                  <Text style={styles.sheetAddress}>{aiFocusStop ? `正在協助：${aiFocusStop.title}` : `目前旅行：${activeTrip.title}`}</Text>
                </View>
                <Pressable style={styles.sheetCloseButton} onPress={() => setAiAssistantVisible(false)}><Text style={styles.closeButtonText}>×</Text></Pressable>
              </View>
              <Text style={styles.aiHint}>可問：怎麼去、什麼時候到比較好、景點是否排太滿、餐廳備案。</Text>
              <TextInput
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
                placeholder="例如：這一天是否來得及？請幫我調整順序。"
                placeholderTextColor="#A49C90"
                style={styles.aiPromptInput}
              />
              {!!aiError && <Text style={styles.aiError}>{aiError}</Text>}
              <Pressable style={[styles.primaryButton, aiLoading && styles.disabledButton]} disabled={aiLoading} onPress={askDouyouAi}>
                <Text style={styles.primaryButtonText}>{aiLoading ? "豆遊小助手思考中…" : "✦ 問問豆遊小助手"}</Text>
              </Pressable>
              {!!aiAnswer && <ScrollView style={styles.aiAnswerBox} contentContainerStyle={styles.aiAnswerContent}><Text style={styles.aiAnswerText}>{aiAnswer}</Text></ScrollView>}
            </View>
          </View>
        </Modal>

        <Modal visible={addingReservation} animationType="slide" transparent onRequestClose={() => setAddingReservation(false)}>
          <Pressable style={styles.modalShade} onPress={() => setAddingReservation(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHandle} /><Text style={styles.sheetEyebrow}>NEW RESERVATION</Text><Text style={styles.sheetTitle}>新增預約提醒</Text>
            <Text style={styles.fieldLabel}>預約事項 *</Text><TextInput value={reservationTitleDraft} onChangeText={setReservationTitleDraft} placeholder="例如：天空膠囊、餐廳訂位、租車" placeholderTextColor="#AAA198" style={styles.fieldInput} />
            <Text style={styles.fieldLabel}>建議預約日</Text><TextInput value={reservationDateDraft} onChangeText={setReservationDateDraft} placeholder="例如：2026-09-06" placeholderTextColor="#AAA198" style={styles.fieldInput} />
            <Text style={styles.fieldLabel}>預約網站（可留空）</Text><TextInput value={reservationWebsiteDraft} onChangeText={setReservationWebsiteDraft} placeholder="https://…" autoCapitalize="none" keyboardType="url" placeholderTextColor="#AAA198" style={styles.fieldInput} />
            <Text style={styles.fieldLabel}>備註</Text><TextInput value={reservationNoteDraft} onChangeText={setReservationNoteDraft} placeholder="例如：預約網站、開放時間、訂位代號" placeholderTextColor="#AAA198" multiline style={styles.noteInput} />
            <Pressable style={styles.primaryButton} onPress={saveManualReservation}><Text style={styles.primaryButtonText}>新增預約提醒</Text></Pressable><Pressable style={styles.cancelButton} onPress={() => setAddingReservation(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
          </Pressable></Pressable>
        </Modal>

        <Modal visible={!!selectedTool} animationType="slide" transparent onRequestClose={() => setSelectedTool(null)}>
          <Pressable style={styles.modalShade} onPress={() => { setAddingFlight(false); setAddingAccommodation(false); setAddingShoppingItem(false); setSelectedTool(null); }}>
            <Pressable style={[styles.sheet, styles.toolSheet]} onPress={(event) => event.stopPropagation()}>
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
                  <View style={styles.closeGlyph} pointerEvents="none">
                    <View style={[styles.closeGlyphLine, styles.closeGlyphLineForward]} />
                    <View style={[styles.closeGlyphLine, styles.closeGlyphLineBackward]} />
                  </View>
                </Pressable>
              </View>
              <ScrollView style={styles.toolSheetBody} contentContainerStyle={styles.toolSheetBodyContent} keyboardShouldPersistTaps="always" nestedScrollEnabled>
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
                      <Text style={styles.fieldLabel}>住宿名稱 *</Text><TextInput value={hotelName} onChangeText={setHotelName} placeholder="輸入飯店名稱，從候選結果選擇" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                      {hotelSearchStatus === "loading" && <Text style={styles.placeSearchStatus}>正在搜尋這趟旅行附近的住宿……</Text>}
                      {hotelSearchStatus === "empty" && <Text style={styles.placeSearchError}>找不到住宿，請加上城市、區域或英文名稱。</Text>}
                      {!!hotelSuggestions.length && <View style={styles.placeSuggestions}>{hotelSuggestions.map((place, index) => <Pressable key={`${place.place_id || index}`} style={styles.placeSuggestion} onPress={() => selectHotelSuggestion(place)}><Text style={styles.placeSuggestionName}>{localizedPlaceName(place)}</Text><Text style={styles.placeSuggestionAddress} numberOfLines={2}>{String(place.display_name || "")}</Text></Pressable>)}</View>}
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
                        {activeTrip.days.length > 1 && <>
                          <Text style={styles.hotelDayLabel}>哪一晚住這裡？</Text>
                          <View style={styles.hotelDayChoices}>
                            {Array.from({ length: activeTrip.days.length - 1 }, (_, index) => index + 1).map((nightNumber) => {
                              const selected = activeTrip.accommodationByNight?.[`night-${nightNumber}`] === hotel.id
                                || (!Object.keys(activeTrip.accommodationByNight || {}).length && activeTrip.homeBaseAccommodationId === hotel.id);
                              return <Pressable key={nightNumber} onPress={() => toggleAccommodationForNight(hotel, nightNumber)} style={[styles.hotelDayChoice, selected && styles.hotelDayChoiceActive]}>
                                <Text style={[styles.hotelDayChoiceText, selected && styles.hotelDayChoiceTextActive]}>{selected ? "✓ " : ""}第 {nightNumber} 晚</Text>
                              </Pressable>;
                            })}
                          </View>
                        </>}
                        <Pressable
                          style={[styles.homeBaseButton, activeTrip.homeBaseAccommodationId === hotel.id && styles.homeBaseButtonActive]}
                          onPress={() => activeTrip.homeBaseAccommodationId === hotel.id ? clearAllNightAccommodations() : applyAccommodationToAllNights(hotel)}
                        >
                          <Text style={[styles.homeBaseButtonText, activeTrip.homeBaseAccommodationId === hotel.id && styles.homeBaseButtonTextActive]}>
                            {activeTrip.homeBaseAccommodationId === hotel.id ? "✓ 每一晚都住這裡（點此取消）" : "每一晚都住這裡"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable style={styles.primaryButton} onPress={() => setAddingAccommodation(true)}><Text style={styles.primaryButtonText}>＋ 新增住宿</Text></Pressable>
                  </>}
                </View>
              )}
              {selectedTool === "天氣" && (
                <View style={styles.detailBlock}>
                  {weatherLoading && <Text style={styles.weatherLoading}>正在整理這趟旅行各地天氣……</Text>}
                  {!!weatherError && <Text style={styles.weatherError}>{weatherError}</Text>}
                  {weatherData.map((weather) => <View key={weather.label} style={styles.weatherCityCard}>
                    <Text style={styles.weatherCityTitle}>{weather.label}</Text>
                    <Text style={styles.weatherPlace}>{weather.place}</Text>
                    <LinearGradient colors={["#E9EEF8", "#F5F7FB"]} style={styles.weatherCurrent}>
                      <Text style={styles.weatherBigIcon}>{weatherIcon(weather.current.weather_code)}</Text>
                      <View><Text style={styles.weatherTemperature}>{Math.round(weather.current.temperature_2m)}°</Text><Text style={styles.weatherCondition}>{weatherLabel(weather.current.weather_code)}・體感 {Math.round(weather.current.apparent_temperature)}°</Text></View>
                    </LinearGradient>
                    <View style={styles.weatherMetrics}>
                      <Text style={styles.weatherMetric}>濕度 {weather.current.relative_humidity_2m}%</Text>
                      <Text style={styles.weatherMetric}>降雨 {weather.current.precipitation} mm</Text>
                      <Text style={styles.weatherMetric}>風速 {weather.current.wind_speed_10m} km/h</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
                      {weather.daily.time.map((date: string, index: number) => (
                        <View key={date} style={styles.forecastCard}>
                          <Text style={styles.forecastDate}>{date.slice(5).replace("-", "/")}</Text>
                          <Text style={styles.forecastIcon}>{weatherIcon(weather.daily.weather_code[index])}</Text>
                          <Text style={styles.forecastTemp}>{Math.round(weather.daily.temperature_2m_max[index])}° / {Math.round(weather.daily.temperature_2m_min[index])}°</Text>
                          <Text style={styles.forecastRain}>雨 {weather.daily.precipitation_probability_max[index] ?? 0}%</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>)}
                  {!!weatherData.length && <Text style={styles.detailHint}>資料來源：Open-Meteo・依這趟旅行出現的城市分別更新；遠期旅行會在進入預報範圍後顯示對應日期。</Text>}
                </View>
              )}
              {selectedTool === "預約提醒" && (
                <View style={styles.detailBlock}>
                  <View style={styles.reservationHeading}><View style={styles.toolText}><Text style={styles.detailTitle}>這趟旅行的預約提醒</Text><Text style={styles.detailHint}>系統會依行程日期提供建議預約日；按下「已完成」後，所有旅伴都會同步看到完成狀態。</Text></View><Pressable style={styles.reservationAddButton} onPress={() => { setSelectedTool(null); setAddingReservation(true); }}><Text style={styles.reservationAddText}>＋ 新增預約</Text></Pressable></View>
                  {reservationStops.map(({ day, stop, info }) => (
                    <View key={stop.id} style={[styles.toolCard, stop.reservationCompleted && styles.reservationCompletedCard]}>
                      <View style={styles.toolText}><Text style={styles.toolTitle}>{reservationDateLabel(day.date)}・{stop.time} {stopDisplayTitle(stop)}</Text><Text style={styles.toolSub}>{info.suggestedDate ? `建議於 ${reservationDateLabel(info.suggestedDate)} 預約` : "建議盡早確認預約"}</Text><Text style={styles.toolSub}>{info.note}</Text>{!!reservationWebsiteUrl(stop.note) && <Pressable style={styles.reservationWebsiteButton} onPress={() => Linking.openURL(reservationWebsiteUrl(stop.note))}><Text style={styles.reservationWebsiteText}>開啟預約網站 ↗</Text></Pressable>}{!!info.suggestedDate && <View style={styles.calendarActions}><Pressable style={styles.calendarButton} onPress={() => Linking.openURL(reservationGoogleCalendarUrl(stopDisplayTitle(stop), info.suggestedDate || "", info.note))}><Text style={styles.calendarButtonText}>Google 行事曆</Text></Pressable><Pressable style={styles.calendarButton} onPress={() => Linking.openURL(reservationIcsDataUrl(stopDisplayTitle(stop), info.suggestedDate || "", info.note)).catch(() => showToast("無法開啟行事曆檔，請改用 Google 行事曆。"))}><Text style={styles.calendarButtonText}>iPhone 行事曆</Text></Pressable></View>}</View>
                      <Pressable style={[styles.reservationCheckButton, stop.reservationCompleted && styles.reservationCheckButtonDone]} onPress={() => toggleReservationCompleted(day.id, stop.id)}><Text style={[styles.reservationCheckText, stop.reservationCompleted && styles.reservationCheckTextDone]}>{stop.reservationCompleted ? "✓ 已完成" : "○ 待預約"}</Text></Pressable>
                    </View>
                  ))}
                  {(activeTrip.reservations || []).map((item) => <View key={item.id} style={[styles.toolCard, item.completed && styles.reservationCompletedCard]}><View style={styles.toolText}><Text style={styles.toolTitle}>{item.title}</Text><Text style={styles.toolSub}>{item.suggestedDate ? `建議於 ${reservationDateLabel(item.suggestedDate)} 預約` : "建議預約日：請自行設定"}</Text>{!!item.note && <Text style={styles.toolSub}>{item.note}</Text>}{!!item.website && <Pressable style={styles.reservationWebsiteButton} onPress={() => Linking.openURL(item.website || "")}><Text style={styles.reservationWebsiteText}>開啟預約網站 ↗</Text></Pressable>}{!!item.suggestedDate && <View style={styles.calendarActions}><Pressable style={styles.calendarButton} onPress={() => Linking.openURL(reservationGoogleCalendarUrl(item.title, item.suggestedDate || "", item.note || ""))}><Text style={styles.calendarButtonText}>Google 行事曆</Text></Pressable><Pressable style={styles.calendarButton} onPress={() => Linking.openURL(reservationIcsDataUrl(item.title, item.suggestedDate || "", item.note || "")).catch(() => showToast("無法開啟行事曆檔，請改用 Google 行事曆。"))}><Text style={styles.calendarButtonText}>iPhone 行事曆</Text></Pressable></View>}</View><Pressable style={[styles.reservationCheckButton, item.completed && styles.reservationCheckButtonDone]} onPress={() => toggleManualReservation(item.id)}><Text style={[styles.reservationCheckText, item.completed && styles.reservationCheckTextDone]}>{item.completed ? "✓ 已完成" : "○ 待預約"}</Text></Pressable><Pressable style={styles.reservationDeleteButton} onPress={() => removeManualReservation(item.id)}><Text style={styles.reservationDeleteText}>×</Text></Pressable></View>)}
                  {!reservationStops.length && !(activeTrip.reservations || []).length && <Text style={styles.emptyListText}>目前沒有預約事項。可按右上方「＋ 新增預約」，或在景點備註填「需預約」或「預約制」。</Text>}
                </View>
              )}
              {selectedTool === "匯率" && (
                <View style={styles.detailBlock}>
                  <Text style={styles.fieldLabel}>{currencyForTrip.code} 金額</Text>
                  <TextInput value={krwAmount} onChangeText={setKrwAmount} keyboardType="numeric" style={styles.fieldInput} />
                  <Text style={styles.exchangeResult}>約 NT$ {(Number(krwAmount.replace(/,/g, "")) * (exchangeRate ?? currencyForTrip.rate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                  <Text style={styles.detailHint}>{exchangeRateLoading
                    ? "正在更新最新參考匯率…"
                    : exchangeRate
                      ? `最新可用參考匯率：1 ${currencyForTrip.code} ≈ ${exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} TWD${exchangeRateDate ? `（資料日 ${exchangeRateDate}）` : ""}`
                      : `目前無法更新，即先以 1 ${currencyForTrip.code} ≈ ${currencyForTrip.rate} TWD 估算。`}</Text>
                  {!!exchangeRateError && <Text style={styles.placeSearchError}>{exchangeRateError}</Text>}
                  <Pressable style={[styles.addressLookupButton, exchangeRateLoading && styles.disabledButton]} disabled={exchangeRateLoading} onPress={refreshExchangeRate}>
                    <Text style={styles.addressLookupText}>{exchangeRateLoading ? "更新中…" : "↻ 更新最新匯率"}</Text>
                  </Pressable>
                  <Text style={styles.detailHint}>此為每日更新的市場參考匯率；銀行、信用卡與現鈔匯率仍會因手續費不同。</Text>
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
                    <Text style={styles.fieldLabel}>商品圖片</Text>
                    {!!shoppingImageUrl && <Image source={{ uri: shoppingImageUrl }} style={styles.uploadPreview} resizeMode="contain" />}
                    <Pressable style={styles.addressLookupButton} onPress={async () => {
                      try { setShoppingImageUrl(await pickCompressedImage()); } catch (error: any) { if (error?.message !== "未選擇照片") Alert.alert("無法上傳", error?.message); }
                    }}><Text style={styles.addressLookupText}>＋ 從手機／電腦上傳照片</Text></Pressable>
                    {shoppingImageUrl.startsWith("data:image/")
                      ? <Pressable onPress={() => setShoppingImageUrl("")}><Text style={styles.removeUploadedImage}>移除已上傳照片</Text></Pressable>
                      : <TextInput value={shoppingImageUrl} onChangeText={setShoppingImageUrl} placeholder="或貼上直接圖片網址（不是 Google 搜尋頁）" placeholderTextColor="#AAA198" style={styles.fieldInput} autoCapitalize="none" />}
                    <Text style={styles.fieldLabel}>是否共享給旅伴？</Text>
                    <View style={styles.currencyChoices}>
                      <Pressable onPress={() => setShoppingScope("shared")} style={[styles.currencyChoice, shoppingScope === "shared" && styles.currencyChoiceActive]}>
                        <Text style={[styles.currencyChoiceText, shoppingScope === "shared" && styles.currencyChoiceTextActive]}>共享給大家看</Text>
                      </Pressable>
                      <Pressable onPress={() => setShoppingScope("personal")} style={[styles.currencyChoice, shoppingScope === "personal" && styles.currencyChoiceActive]}>
                        <Text style={[styles.currencyChoiceText, shoppingScope === "personal" && styles.currencyChoiceTextActive]}>只有我看</Text>
                      </Pressable>
                    </View>
                    <Pressable style={styles.imageSearchButton} onPress={() => Linking.openURL(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(shoppingName || activeTrip.destination + " 必買商品")}`)}>
                      <Text style={styles.imageSearchText}>在 Google 查看參考圖片 ↗</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={createShoppingItem}><Text style={styles.primaryButtonText}>儲存商品</Text></Pressable>
                    <Pressable style={styles.cancelButton} onPress={() => setAddingShoppingItem(false)}><Text style={styles.cancelText}>返回必買清單</Text></Pressable>
                  </> : <>
                    <View style={styles.shoppingHeader}>
                      <View><Text style={styles.detailTitle}>{activeTrip.destination} 必買清單</Text><Text style={styles.detailHint}>新增商品時可決定是否共享給旅伴</Text></View>
                      <Pressable style={styles.smallAddButton} onPress={() => setAddingShoppingItem(true)}><Text style={styles.smallAddButtonText}>＋</Text></Pressable>
                    </View>
                    <View style={styles.sourceTabs}>
                      <Pressable onPress={() => setShoppingView("shared")} style={[styles.sourceTab, shoppingView === "shared" && styles.sourceTabActive]}><Text style={[styles.sourceTabText, shoppingView === "shared" && styles.sourceTabTextActive]}>共享清單</Text></Pressable>
                      <Pressable onPress={() => setShoppingView("mine")} style={[styles.sourceTab, shoppingView === "mine" && styles.sourceTabActive]}><Text style={[styles.sourceTabText, shoppingView === "mine" && styles.sourceTabTextActive]}>我的商品</Text></Pressable>
                    </View>
                    {!!visibleShoppingItems.filter((item) => !item.purchased).length && <Text style={styles.shoppingSectionTitle}>待購買</Text>}
                    {visibleShoppingItems.filter((item) => !item.purchased).map((item) => (
                      <View key={item.id} style={[styles.shoppingItem, item.purchased && styles.shoppingItemPurchased]}>
                        <Pressable accessibilityLabel={item.purchased ? "取消已購買" : "標記已購買"} onPress={() => toggleShoppingItem(item.id)} style={[styles.shoppingCheck, item.purchased && styles.shoppingCheckActive]}>
                          <Text style={styles.shoppingCheckText}>{item.purchased ? "✓" : ""}</Text>
                        </Pressable>
                        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.productImageFallback}><Text style={styles.productImageEmoji}>🛍️</Text></View>}
                        <View style={styles.shoppingInfo}><Text style={[styles.shoppingName, item.purchased && styles.shoppingNamePurchased]}>{item.name}</Text><Text style={styles.shoppingCategory}>{item.owner ? `${item.owner}・` : ""}{item.category || "未分類"}</Text></View>
                        <Text style={styles.shoppingPrice}>{item.currency || "KRW"} {item.price}</Text>
                        <Pressable onPress={() => deleteShoppingItem(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
                      </View>
                    ))}
                    {!!visibleShoppingItems.filter((item) => item.purchased).length && <Text style={styles.shoppingSectionTitle}>已購買</Text>}
                    {visibleShoppingItems.filter((item) => item.purchased).map((item) => (
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
                    {visibleShoppingItems.length === 0 && <Text style={styles.emptyListText}>這個清單目前沒有商品，點右上角 ＋ 新增。</Text>}
                  </>}
                </View>
              )}
              {selectedTool === "行前準備" && (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailTitle}>行前準備清單</Text>
                  <Text style={styles.detailHint}>這是你的個人準備與行李清單；每位旅伴各自勾選，互不影響。</Text>
                  <TextInput value={checklistText} onChangeText={(text) => { setChecklistText(text); if (checklistError) setChecklistError(""); }} onSubmitEditing={createChecklistItem} returnKeyType="done" placeholder="例如：購買網卡、確認護照效期" placeholderTextColor="#AAA198" style={[styles.fieldInput, !!checklistError && styles.fieldInputError]} />
                  {!!checklistError && <Text style={styles.placeSearchError}>{checklistError}</Text>}
                  <TouchableOpacity accessibilityRole="button" activeOpacity={0.66} style={[styles.primaryButton, styles.checklistAddButton]} onPress={createChecklistItem}>
                    <Text style={styles.primaryButtonText}>＋ 新增準備事項</Text>
                  </TouchableOpacity>
                  <View style={styles.shoppingList}>
                    {visibleChecklistItems.map((item) => (
                      <View key={item.id} style={[styles.shoppingItem, item.completed && styles.shoppingItemPurchased]}>
                        <Pressable onPress={() => toggleChecklistItem(item.id)} style={[styles.shoppingCheck, item.completed && styles.shoppingCheckActive]}><Text style={styles.shoppingCheckText}>{item.completed ? "✓" : ""}</Text></Pressable>
                        <View style={styles.shoppingInfo}>
                          <Text style={[styles.shoppingName, item.completed && styles.shoppingNamePurchased]}>{item.text}</Text>
                        </View>
                        <Pressable onPress={() => deleteChecklistItem(item.id)}><Text style={styles.deleteExpense}>×</Text></Pressable>
                      </View>
                    ))}
                    {!visibleChecklistItems.length && <Text style={styles.emptyListText}>目前沒有準備事項。</Text>}
                  </View>
                </View>
              )}
              {!addingFlight && !addingAccommodation && !addingShoppingItem && <Pressable style={styles.cancelButton} onPress={() => setSelectedTool(null)}><Text style={styles.cancelText}>關閉</Text></Pressable>}
              </ScrollView>
            </Pressable>
          </Pressable>
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
              <Text style={styles.fieldLabel}>一起分帳的成員（平均分攤）</Text>
              <View style={styles.payerChoices}>
                {expenseMemberNames.map((name) => (
                  <Pressable key={name} onPress={() => toggleExpenseParticipant(name)} style={[styles.payerChoice, expenseParticipants.includes(name) && styles.payerChoiceActive]}>
                    <Text style={[styles.payerChoiceText, expenseParticipants.includes(name) && styles.payerChoiceTextActive]}>{expenseParticipants.includes(name) ? "✓ " : ""}{name}</Text>
                  </Pressable>
                ))}
              </View>
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
                    <Text style={styles.fieldLabel}>開始日期</Text>
                    <TextInput value={newStartDate} onChangeText={setNewStartDate} placeholder="2026-12-01" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>結束日期</Text>
                    <TextInput value={newEndDate} onChangeText={setNewEndDate} placeholder="2026-12-06" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                </View>
                <Text style={styles.sourceHint}>日期填完整後會自動計算：{newDayCount} 天</Text>
                <Text style={styles.fieldLabel}>封面照片（可留空）</Text>
                {!!newCoverImage && <Image source={{ uri: newCoverImage }} style={styles.coverUploadPreview} resizeMode="cover" />}
                <Pressable style={styles.addressLookupButton} onPress={async () => {
                  try { setNewCoverImage(await pickCompressedImage()); } catch (error: any) { if (error?.message !== "未選擇照片") Alert.alert("無法上傳", error?.message); }
                }}><Text style={styles.addressLookupText}>＋ 上傳封面照片</Text></Pressable>
                {newCoverImage.startsWith("data:image/")
                  ? <Pressable onPress={() => setNewCoverImage("")}><Text style={styles.removeUploadedImage}>移除已上傳封面</Text></Pressable>
                  : <TextInput value={newCoverImage} onChangeText={setNewCoverImage} placeholder="或貼上直接圖片網址" placeholderTextColor="#AAA198" autoCapitalize="none" style={styles.fieldInput} />}
                <View style={styles.fieldRow}>
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
              <Text style={styles.fieldLabel}>邀請碼 *</Text>
              <TextInput value={joinInviteCode} onChangeText={setJoinInviteCode} keyboardType="number-pad" placeholder="向旅伴索取六位數邀請碼" placeholderTextColor="#AAA198" style={styles.fieldInput} />
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

        <Modal visible={!!deletingDay} animationType="fade" transparent onRequestClose={() => setDeletingDay(null)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>DELETE A DAY</Text>
              <Text style={styles.sheetTitle}>刪除 {deletingDay?.label}？</Text>
              <Text style={styles.sheetAddress}>這一天的所有景點都會刪除，後面的 DAY 與日期會自動往前遞補。</Text>
              <Pressable style={styles.destructiveButton} onPress={confirmDeleteDay}><Text style={styles.primaryButtonText}>確認刪除這一天</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setDeletingDay(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!deletingStop} animationType="fade" transparent onRequestClose={() => setDeletingStop(null)}>
          <View style={styles.modalShade}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>DELETE A PLACE</Text>
              <Text style={styles.sheetTitle}>刪除景點？</Text>
              <Text style={styles.sheetAddress}>「{deletingStop?.title}」會從 {selectedDay.date || "這一天"} 的行程、地圖路線中移除。</Text>
              <Pressable style={styles.destructiveButton} onPress={confirmDeleteStop}><Text style={styles.primaryButtonText}>確認刪除此景點</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setDeletingStop(null)}><Text style={styles.cancelText}>取消</Text></Pressable>
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
            <ScrollView contentContainerStyle={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetEyebrow}>TRIP SETTINGS</Text>
              <Text style={styles.sheetTitle}>修改旅行資料</Text>
              <Text style={styles.fieldLabel}>旅行名稱</Text>
              <TextInput value={tripNameDraft} onChangeText={setTripNameDraft} placeholder="我的旅行" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>開始日期</Text>
                  <TextInput value={tripStartDraft} onChangeText={setTripStartDraft} placeholder="2026-12-01" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>結束日期</Text>
                  <TextInput value={tripEndDraft} onChangeText={setTripEndDraft} placeholder="2026-12-06" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                </View>
              </View>
              <Text style={styles.fieldLabel}>封面照片（清空即不顯示）</Text>
              {!!tripCoverDraft && <Image source={{ uri: tripCoverDraft }} style={styles.coverUploadPreview} resizeMode="cover" />}
              <Pressable style={styles.addressLookupButton} onPress={async () => {
                try { setTripCoverDraft(await pickCompressedImage()); } catch (error: any) { if (error?.message !== "未選擇照片") Alert.alert("無法上傳", error?.message); }
              }}><Text style={styles.addressLookupText}>＋ 更換封面照片</Text></Pressable>
              {tripCoverDraft.startsWith("data:image/")
                ? <Pressable onPress={() => setTripCoverDraft("")}><Text style={styles.removeUploadedImage}>移除已上傳封面</Text></Pressable>
                : <TextInput value={tripCoverDraft} onChangeText={setTripCoverDraft} placeholder="或貼上直接圖片網址" placeholderTextColor="#AAA198" autoCapitalize="none" style={styles.fieldInput} />}
              <Text style={styles.fieldLabel}>人數</Text>
              <TextInput value={travelerDraft} onChangeText={setTravelerDraft} keyboardType="number-pad" placeholder="1" placeholderTextColor="#AAA198" style={styles.fieldInput} />
              <Pressable style={styles.primaryButton} onPress={() => {
                const calculatedDays = inclusiveDayCount(tripStartDraft, tripEndDraft);
                const currentDays = activeTrip.days;
                const resizedDays = calculatedDays > currentDays.length
                  ? [...currentDays, ...Array.from({ length: calculatedDays - currentDays.length }, (_, index) => {
                      const dayNumber = currentDays.length + index + 1;
                      return { id: `${activeTrip.id}-day-${dayNumber}`, label: `DAY ${dayNumber}`, date: tripDayDateLabel(tripStartDraft, dayNumber - 1), title: `${activeTrip.destination}・自由安排`, stops: [] };
                    })]
                  : currentDays;
                const nextDays = resizedDays.map((day, index) => ({
                  ...day,
                  label: `DAY ${index + 1}`,
                  date: tripDayDateLabel(tripStartDraft, index)
                }));
                updateActiveTrip({
                  title: tripNameDraft.trim() || activeTrip.title,
                  startDate: tripStartDraft,
                  endDate: tripEndDraft,
                  period: tripPeriodLabel(tripStartDraft, tripEndDraft),
                  coverImage: tripCoverDraft.trim(),
                  days: nextDays,
                  travelers: Math.min(20, Math.max(1, Number.parseInt(travelerDraft, 10) || activeTrip.travelers))
                });
                setEditingTravelers(false);
              }}><Text style={styles.primaryButtonText}>儲存旅行資料</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setEditingTravelers(false)}><Text style={styles.cancelText}>取消</Text></Pressable>
            </ScrollView>
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
                <TextInput value={newStopTitle} onChangeText={(text) => { setNewStopTitle(text); setAddressLookupStatus("idle"); setAddressLookupMessage(""); }} placeholder="例如：釜山車站" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                {placeSuggestionStatus === "loading" && <Text style={styles.placeSearchStatus}>正在尋找這趟旅行附近的地點……</Text>}
                {placeSuggestionStatus === "empty" && !placeSuggestions.length && <Text style={styles.placeSearchError}>沒有自動候選，可按下方「幫我找地址」再次搜尋。</Text>}
                {!!placeSuggestions.length && <View style={styles.placeSuggestions}>
                  {placeSuggestions.map((place, index) => {
                    const hours = String(place.extratags?.opening_hours || "");
                    const placeName = localizedPlaceName(place);
                    return <Pressable key={`${place.place_id || index}`} style={styles.placeSuggestion} onPress={() => {
                      suppressNextPlaceSearchRef.current = true;
                      setNewStopTitle(placeName);
                      setNewStopAddress(String(place.display_name || ""));
                      setNewStopLatitude(Number(place.lat));
                      setNewStopLongitude(Number(place.lon));
                      setNewStopOpeningHours(hours);
                      if (!newStopNote.trim()) setNewStopNote(hours ? `營業時間：${hours}。` : `地點類型：${place.type || place.category || "景點"}；營業時間尚未查證。`);
                      setPlaceSuggestions([]);
                      setPlaceSuggestionStatus("idle");
                      setAddressLookupStatus("found");
                    }}>
                      <Text style={styles.placeSuggestionName}>{placeName}</Text>
                      <Text style={styles.placeSuggestionAddress} numberOfLines={2}>{String(place.display_name || "")}</Text>
                    </Pressable>;
                  })}
                </View>}
                <View style={styles.fieldRow}>
                  <View style={styles.dayCountField}>
                    <Text style={styles.fieldLabel}>時間</Text>
                    <TextInput value={newStopTime} onChangeText={setNewStopTime} placeholder="10:30" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>交通方式</Text>
                    <View style={styles.legRouteActions}>
                      {([
                        ["driving", "🚗 開車"],
                        ["walking", "🚶 步行"],
                        ["transit", "🚇 大眾運輸"],
                        ["taxi", "🚕 計程車"]
                      ] as [RouteMode, string][]).map(([mode, label]) => (
                        <Pressable key={mode} onPress={() => {
                          setNewStopRouteMode(mode);
                          if (!newStopTransport.trim() || newStopTransport === "尚未安排") {
                            setNewStopTransport(mode === "driving" ? "開車" : mode === "walking" ? "步行" : mode === "transit" ? "大眾運輸" : "計程車");
                          }
                        }} style={[styles.legModeButton, newStopRouteMode === mode && styles.legModeButtonActive]}>
                          <Text style={[styles.legModeText, newStopRouteMode === mode && styles.legModeTextActive]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput value={newStopTransport} onChangeText={setNewStopTransport} placeholder="地鐵約 20 分鐘" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                  </View>
                </View>
                <Text style={styles.fieldLabel}>地址</Text>
                <TextInput value={newStopAddress} onChangeText={setNewStopAddress} placeholder="貼上地址或地標名稱" placeholderTextColor="#AAA198" style={styles.fieldInput} />
                <Pressable disabled={addressLookupStatus === "loading"} style={styles.addressLookupButton} onPress={findStopAddress}>
                  <Text style={styles.addressLookupText}>{addressLookupStatus === "loading" ? "正在搜尋地址……" : "⌖ 幫我找地址"}</Text>
                </Pressable>
                {!!addressLookupMessage && <Text style={addressLookupStatus === "error" ? styles.placeSearchError : styles.addressFoundText}>{addressLookupStatus === "found" ? "✓ " : ""}{addressLookupMessage}</Text>}
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

type NavIconName = "home" | "heart" | "list" | "toolbox" | "receipt";

const navIconPaths: Record<NavIconName, string> = {
  home: '<path d="M3 10.8 12 3l9 7.8v9.7H14.8v-6.3H9.2v6.3H3z"/>',
  heart: '<path d="M20.8 5.9c-2-2.1-5.2-2.1-7.2 0L12 7.5l-1.6-1.6a5 5 0 0 0-7.2 7L12 21l8.8-8.1a5 5 0 0 0 0-7z"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  toolbox: '<path d="M4 8.5h16v11H4zM9 8.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5M4 12.5h16M10 12.5v2h4v-2"/>',
  receipt: '<path d="M6 3.5 8 5l2-1.5L12 5l2-1.5L16 5l2-1.5v17L16 19l-2 1.5L12 19l-2 1.5L8 19l-2 1.5zM9 9h6M9 13h6M9 17h4"/>'
};

const navIconUri = (name: NavIconName, color: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${navIconPaths[name]}</svg>`)}`;

function TabButton({ icon, label, active, onPress }: { icon: NavIconName; label: string; active: boolean; onPress: () => void }) {
  const color = active ? "#536783" : "#A8A199";
  return <Pressable style={styles.tabButton} onPress={onPress}><View style={styles.tabIconFrame}><Image source={{ uri: navIconUri(icon, color) }} style={styles.tabIconImage} resizeMode="contain" /></View><Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text></Pressable>;
}

function FirebaseGoogleSignInButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  if (Platform.OS !== "web") return <Text style={styles.accountHint}>請先使用網站版登入 Google。</Text>;
  return (
    <Pressable style={[styles.firebaseGoogleButton, loading && styles.firebaseGoogleButtonDisabled]} onPress={onPress} disabled={loading}>
      <Text style={styles.firebaseGoogleMark}>G</Text>
      <Text style={styles.firebaseGoogleButtonText}>{loading ? "正在開啟 Google 登入……" : "使用 Google 帳戶登入"}</Text>
    </Pressable>
  );
}

// React Native Web turns each style into its own generated CSS class.  Apply
// the selected font while creating those classes, so every sheet/form label
// gets the same typeface even if a browser ignores a broad CSS selector.
const createDouyouStyles = (definitions: Record<string, any>) => {
  if (Platform.OS === "web") {
    Object.values(definitions).forEach((definition: any) => {
      if (!definition || typeof definition !== "object") return;
      if ("fontSize" in definition || "lineHeight" in definition || "letterSpacing" in definition || "fontWeight" in definition) {
        definition.fontFamily = "Noto Serif TC";
      }
    });
  }
  return StyleSheet.create(definitions);
};

const styles = createDouyouStyles({
  safe: { flex: 1, backgroundColor: "#F7F3EC" },
  authGate: { alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { width: "100%", maxWidth: 430, alignItems: "center", backgroundColor: "#FFF", borderRadius: 32, paddingHorizontal: 28, paddingVertical: 42, borderWidth: 1, borderColor: "#E9E1D7", shadowColor: "#536783", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  authAppIcon: { width: 104, height: 104, borderRadius: 28, marginBottom: 20 },
  authLogo: { color: "#536783", fontSize: 35, fontWeight: "900" },
  authLoading: { color: "#8B8177", fontSize: 13, marginTop: 10 },
  authEyebrow: { color: "#9A6248", fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  authTitle: { color: "#333C4C", fontSize: 32, fontWeight: "900", marginTop: 8 },
  authDescription: { color: "#7E756D", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 12, marginBottom: 24 },
  authPrivacy: { color: "#A0978F", fontSize: 10, marginTop: 18 },
  firebaseGoogleButton: { width: 280, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "#D8D4CE", backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 18 },
  firebaseGoogleButtonDisabled: { opacity: 0.58 },
  firebaseGoogleMark: { color: "#4285F4", fontSize: 20, fontWeight: "900" },
  firebaseGoogleButtonText: { color: "#3C4043", fontSize: 14, fontWeight: "700" },
  loginErrorText: { color: "#A5443C", backgroundColor: "#FBECEA", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 11, fontWeight: "700", lineHeight: 17, marginTop: 12, maxWidth: 360, textAlign: "center" },
  joinErrorText: { color: "#A5443C", backgroundColor: "#FBECEA", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 11, fontWeight: "800", marginTop: 10 },
  webViewport: { height: "100dvh" as never, maxHeight: "100dvh" as never, minHeight: 0, overflow: "hidden" },
  app: { flex: 1, minHeight: 0, overflow: "hidden", position: "relative", backgroundColor: "#FBFAF7", maxWidth: 520, width: "100%", alignSelf: "center" },
  header: { paddingTop: 18, paddingHorizontal: 22, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: "relative" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitleBlock: { flex: 1, minWidth: 0, paddingRight: 8 },
  eyebrow: { color: "#9A6A4F", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Noto Serif TC" },
  mainTitle: { color: "#1F2925", fontSize: 32, fontWeight: "900", marginTop: 5, letterSpacing: -1 },
  subtitle: { color: "#756E65", fontSize: 13, marginTop: 10 },
  tripBadge: { backgroundColor: "#536783", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  headerBadges: { flexShrink: 0, alignItems: "flex-end", gap: 6 },
  syncBadge: { backgroundColor: "rgba(255,255,255,.9)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#CFC4B6", minWidth: 92, alignItems: "center", zIndex: 20 },
  syncBadgeLocal: { backgroundColor: "#FFF8E8", borderColor: "#D9B86D" },
  syncBadgeText: { color: "#65758E", fontSize: 10, fontWeight: "900" },
  cloudLabel: { color: "#897E73", fontSize: 11, fontWeight: "800", marginTop: 15 },
  cloudCode: { color: "#3E4B60", backgroundColor: "#F0F3F8", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: "800", marginTop: 5 },
  cloudInvite: { color: "#3E4B60", fontSize: 29, letterSpacing: 7, fontWeight: "900", marginTop: 4 },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  memberChip: { backgroundColor: "#E9EDF5", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  memberChipText: { color: "#536783", fontSize: 11, fontWeight: "800" },
  memberAddRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  memberInput: { flex: 1, backgroundColor: "#F5F2ED", borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, color: "#302B27", fontSize: 12 },
  memberAddButton: { backgroundColor: "#536783", borderRadius: 11, paddingHorizontal: 15, justifyContent: "center" },
  memberAddText: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  inviteShareGrid: { flexDirection: "row", gap: 8, marginTop: 13 },
  inviteShareButton: { flex: 1, backgroundColor: "#E9EDF5", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  inviteShareText: { color: "#536783", fontSize: 11, fontWeight: "900" },
  lineShareButton: { backgroundColor: "#E4F8E9" },
  lineShareText: { color: "#06A944" },
  toast: { position: "absolute", top: 18, alignSelf: "center", zIndex: 9999, elevation: 40, backgroundColor: "#536783", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, shadowColor: "#000", shadowOpacity: .18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  toastText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  scopeBar: { minHeight: 34, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  personalScopeBar: { backgroundColor: "#EEF2FA", borderBottomColor: "#D9E2F0" },
  tripScopeBar: { backgroundColor: "#F7EEE7", borderBottomColor: "#E9DACC" },
  scopeBarText: { color: "#425571", fontSize: 10, fontWeight: "900" },
  scopeBarSub: { color: "#8A8179", fontSize: 9, fontWeight: "700" },
  expenseTripId: { color: "#9A9188", fontSize: 9, marginTop: 5 },
  refreshSyncButton: { alignSelf: "flex-start", backgroundColor: "#E9EDF5", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  refreshSyncText: { color: "#536783", fontSize: 11, fontWeight: "900" },
  bulkImportButton: { backgroundColor: "#E9EDF5", borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "center" },
  bulkImportButtonText: { color: "#536783", fontSize: 12, fontWeight: "900" },
  bulkImportBox: { backgroundColor: "#F7F4EE", borderRadius: 14, padding: 11, marginBottom: 12 },
  bulkHelp: { color: "#766E66", fontSize: 10, lineHeight: 16, marginBottom: 8 },
  bulkInput: { minHeight: 170, maxHeight: 300, backgroundColor: "#FFF", borderRadius: 12, padding: 11, color: "#302B27", fontSize: 12, textAlignVertical: "top", borderWidth: 1, borderColor: "#E3DDD5" },
  tripBadgeIcon: { color: "#F4C88B", fontSize: 13 },
  tripBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800", marginTop: 2 },
  dayTabs: { gap: 8, paddingTop: 18, paddingBottom: 2 },
  addDayTab: { minWidth: 88, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  addDayPlus: { color: "#536783", fontSize: 20, fontWeight: "700", lineHeight: 21 },
  addDayText: { color: "#536783", fontSize: 10, fontWeight: "800", marginTop: 2 },
  dayTab: { width: 65, borderRadius: 18, backgroundColor: "rgba(255,255,255,.7)", paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: "#EAE0D5" },
  dayTabActive: { backgroundColor: "#536783", borderColor: "#536783" },
  dayLabel: { fontSize: 11, fontWeight: "800", color: "#7D756C" },
  dayLabelActive: { color: "#FFF" },
  dayDate: { fontSize: 10, marginTop: 3, color: "#A49C92" },
  dayDateActive: { color: "#DAE8E2" },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  itineraryListHost: { flex: 1, minHeight: 0, overflow: "hidden" },
  itineraryList: { flex: 1, minHeight: 0 },
  dayHeading: { alignItems: "stretch", marginTop: 24, marginBottom: 13, gap: 10 },
  dayHeadingText: { width: "100%" },
  dayHeadingDate: { fontSize: 11, fontWeight: "800", color: "#A06447", marginBottom: 4 },
  dayHeadingTitle: { fontSize: 21, lineHeight: 27, fontWeight: "900", color: "#252D29", letterSpacing: -.4 },
  dayHeadingActions: { width: "100%", alignItems: "flex-end", gap: 7 },
  dayActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 7 },
  dayMoveButton: { backgroundColor: "#EEEAE4", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  dayMoveText: { color: "#536783", fontSize: 9, fontWeight: "900" },
  dayDeleteButton: { backgroundColor: "#F5E6E1", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  dayDeleteText: { color: "#A55748", fontSize: 9, fontWeight: "900" },
  smallAddButton: { minHeight: 32, borderRadius: 11, backgroundColor: "#536783", paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  smallAddButtonText: { color: "#FFF", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  dayCount: { fontSize: 12, color: "#978F85" },
  mapCard: { backgroundColor: "#FFF", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#ECE7DF", shadowColor: "#3A2E22", shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  mapFooter: { padding: 14 },
  mapFooterTitle: { fontWeight: "800", color: "#2C2925", fontSize: 15 },
  mapFooterText: { color: "#8C8379", fontSize: 12, marginTop: 3 },
  smartSortLabel: { color: "#536783", fontSize: 11, fontWeight: "900", marginTop: 12 },
  smartSortRow: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 7, flexWrap: "wrap" },
  smartSortButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#E9EDF5" },
  smartSortText: { color: "#536783", fontSize: 10, fontWeight: "900" },
  undoSortButton: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#F3E8DE" },
  undoSortText: { color: "#9C613F", fontSize: 10, fontWeight: "900" },
  smartSortHint: { color: "#9A9188", fontSize: 10, lineHeight: 15, marginTop: 7 },
  dragBanner: { flexDirection: "row", backgroundColor: "#F0E8DC", borderRadius: 14, padding: 12, marginTop: 14, marginBottom: 10, alignItems: "center", gap: 8 },
  dragBannerText: { color: "#7B604F", fontSize: 12, fontWeight: "600" },
  emptyItinerary: { marginTop: 18, padding: 30, borderRadius: 22, backgroundColor: "#F3EFE7", alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "#CFC5B9" },
  emptyItineraryIcon: { fontSize: 30, color: "#536783", fontWeight: "900" },
  emptyItineraryTitle: { fontSize: 16, fontWeight: "900", color: "#2D3732", marginTop: 10 },
  emptyItineraryText: { color: "#8A8178", fontSize: 11, marginTop: 5, textAlign: "center" },
  emptyAddButton: { marginTop: 16, backgroundColor: "#536783", borderRadius: 14, paddingHorizontal: 17, paddingVertical: 11 },
  emptyAddButtonText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  stopWrap: { flexDirection: "row", minHeight: 170 },
  dragging: { opacity: .92, transform: [{ scale: 1.02 }] },
  timeline: { width: 36, alignItems: "center" },
  numberDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#536783", alignItems: "center", justifyContent: "center", zIndex: 2, marginTop: 20 },
  numberText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  timelineLine: { width: 2, backgroundColor: "#D9D4CC", flex: 1 },
  stopCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#EEE8E0" },
  stopTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timePill: { backgroundColor: "#F7E5D6", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  timeText: { color: "#A75E3B", fontWeight: "800", fontSize: 12 },
  dragHint: { color: "#B3ACA3", fontSize: 11 },
  webReorder: { flexDirection: "row", gap: 5 },
  reorderButton: { width: 30, height: 27, borderRadius: 9, backgroundColor: "#EEE9E2", alignItems: "center", justifyContent: "center" },
  reorderText: { color: "#536783", fontSize: 15, fontWeight: "900" },
  reorderDisabled: { color: "#C8C1B9" },
  stopTitle: { color: "#292622", fontWeight: "800", fontSize: 17, marginTop: 10 },
  addressButton: { alignSelf: "stretch", marginTop: 7, backgroundColor: "#F8F6F2", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  address: { color: "#716A63", fontSize: 12 },
  addressAction: { color: "#667B9D", fontSize: 9, fontWeight: "900", marginTop: 4 },
  transportRow: { flexDirection: "row", backgroundColor: "#F1F3F7", padding: 10, borderRadius: 13, marginTop: 11, gap: 9, alignItems: "center" },
  transportIcon: { fontSize: 20 },
  transportLabel: { color: "#8791A2", fontSize: 9, fontWeight: "700" },
  transportText: { color: "#536783", fontSize: 12, fontWeight: "800", marginTop: 2 },
  legRouteBox: { marginTop: 9, borderRadius: 13, backgroundColor: "#F7F5F1", padding: 9 },
  legRouteLabel: { color: "#756E66", fontSize: 10, fontWeight: "800", marginBottom: 7 },
  legEstimate: { color: "#536783", fontSize: 13, fontWeight: "900", marginBottom: 8 },
  legRouteActions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  routeFieldHint: { color: "#8B837A", fontSize: 11, lineHeight: 17, marginTop: -2, marginBottom: 2 },
  legModeButton: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: "#EAE6E0" },
  legModeButtonActive: { backgroundColor: "#536783" },
  legModeText: { color: "#766E65", fontSize: 10, fontWeight: "900" },
  legModeTextActive: { color: "#FFF" },
  fastRouteButton: { borderRadius: 9, borderWidth: 1, borderColor: "#D9E0EC", paddingHorizontal: 9, paddingVertical: 8, alignItems: "center", backgroundColor: "#F8F9FC" },
  fastRouteButtonText: { color: "#3974D8", fontSize: 10, fontWeight: "900" },
  openingHours: { color: "#687991", fontSize: 11, fontWeight: "700", marginTop: 9 },
  sourceHint: { color: "#928A81", fontSize: 10, marginTop: -5, marginBottom: 8 },
  note: { color: "#756E66", fontSize: 12, lineHeight: 17, marginTop: 10 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 11, alignItems: "center", gap: 8 },
  pass: { color: "#667B9D", backgroundColor: "#E8EEF8", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: "800" },
  mapActions: { flexDirection: "row", gap: 7, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 1 },
  mapButton: { backgroundColor: "#F4F0EA", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  naverButton: { backgroundColor: "#E8F7EE" },
  googleMapLink: { color: "#3974D8", fontSize: 11, fontWeight: "800" },
  naverMapLink: { color: "#03A94D", fontSize: 11, fontWeight: "800" },
  bottomBar: { position: "absolute", left: 12, right: 12, bottom: 10, height: 72, zIndex: 100, elevation: 20, backgroundColor: "rgba(255,255,255,.98)", borderRadius: 24, flexDirection: "row", shadowColor: "#281E16", shadowOpacity: .16, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, borderWidth: 1, borderColor: "#EEE9E2" },
  bottomGroupDivider: { width: 1, height: 38, alignSelf: "center", backgroundColor: "#D8DDE7" },
  floatingUndoButton: { position: "absolute", right: 20, bottom: 92, zIndex: 120, elevation: 25, backgroundColor: "#9C613F", borderRadius: 999, paddingHorizontal: 17, height: 42, alignItems: "center", justifyContent: "center", shadowColor: "#3A2419", shadowOpacity: .22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  floatingUndoText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  aiFloatingButton: { position: "absolute", right: 18, bottom: 92, zIndex: 119, elevation: 24, flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#536783", shadowColor: "#26354C", shadowOpacity: .24, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  aiFloatingButtonRaised: { bottom: 142 },
  aiFloatingIcon: { color: "#FFE2A6", fontSize: 16, fontWeight: "900", fontFamily: "Noto Serif TC" },
  aiFloatingText: { color: "#FFF", fontSize: 11, fontWeight: "900", fontFamily: "Noto Serif TC" },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIconFrame: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  tabIconImage: { width: 22, height: 22 },
  tabText: { fontSize: 10, lineHeight: 13, color: "#A8A199", marginTop: 4, fontWeight: "700" },
  tabActive: { color: "#536783" },
  page: { flex: 1, backgroundColor: "#FBFAF7" },
  pageContent: { padding: 22, paddingTop: 36, paddingBottom: 110 },
  homeContent: { padding: 22, paddingTop: 32, paddingBottom: 115 },
  homeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", position: "relative", minHeight: 228, marginBottom: 16 },
  homeHeaderArtwork: { position: "absolute", right: 30, bottom: -10, width: 142, height: 142, zIndex: 3 },
  pageMascot: { position: "absolute", right: 68, top: 62, width: 142, height: 142, zIndex: 1 },
  toolboxHeader: { position: "relative", minHeight: 190, marginBottom: 4 },
  addTripButton: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#536783", alignItems: "center", justifyContent: "center", shadowColor: "#536783", shadowOpacity: .18, shadowRadius: 10 },
  homeHeaderActions: { flexDirection: "row", alignItems: "center", gap: 9, zIndex: 2 },
  accountCard: { backgroundColor: "#FFF", borderRadius: 18, padding: 14, marginTop: 14, marginBottom: 4, borderWidth: 1, borderColor: "#E9E2D9" },
  accountTitle: { color: "#343D50", fontSize: 14, fontWeight: "900" },
  accountHint: { color: "#887F76", fontSize: 10, lineHeight: 15, marginTop: 4 },
  googleButtonHost: { width: 300, minHeight: 44, marginTop: 10, alignItems: "center", justifyContent: "center" },
  accountIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  accountAvatar: { width: 38, height: 38, borderRadius: 19 },
  accountAvatarFallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E9EDF5", alignItems: "center", justifyContent: "center" },
  accountAvatarInitials: { color: "#536783", fontSize: 12, fontWeight: "900" },
  accountText: { flex: 1 },
  accountName: { color: "#343D50", fontSize: 13, fontWeight: "900" },
  accountEmail: { color: "#8C837A", fontSize: 10, marginTop: 2 },
  signOutText: { color: "#A46448", fontSize: 10, fontWeight: "800" },
  joinTripButton: { backgroundColor: "#E9E2D8", borderRadius: 15, paddingHorizontal: 13, paddingVertical: 11 },
  joinTripButtonText: { color: "#536783", fontSize: 11, fontWeight: "900" },
  addTripPlus: { color: "#FFF", fontSize: 25, fontWeight: "500", marginTop: -2 },
  tripCard: { backgroundColor: "#FFF", borderRadius: 24, marginBottom: 18, overflow: "hidden", borderWidth: 1, borderColor: "#EDE7DF", shadowColor: "#34261F", shadowOpacity: .08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  tripCardCover: { minHeight: 132, padding: 20, justifyContent: "flex-end" },
  tripCoverPhoto: { ...StyleSheet.absoluteFillObject, width: "auto", height: "auto" },
  tripCoverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,35,31,.46)" },
  coverUploadPreview: { width: "100%", height: 150, borderRadius: 16, backgroundColor: "#EEEAE4", marginBottom: 9 },
  uploadPreview: { width: 110, height: 110, borderRadius: 14, backgroundColor: "#EEEAE4", marginBottom: 9, alignSelf: "center" },
  removeUploadedImage: { color: "#A45F49", fontSize: 10, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  placeSuggestions: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DED8D0", borderRadius: 14, overflow: "hidden", marginTop: 4, marginBottom: 12 },
  placeSuggestion: { paddingHorizontal: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#EEE9E2" },
  placeSuggestionName: { color: "#445572", fontSize: 13, fontWeight: "900" },
  placeSuggestionAddress: { color: "#8C837A", fontSize: 10, lineHeight: 14, marginTop: 3 },
  placeSearchStatus: { color: "#718099", fontSize: 10, lineHeight: 16, marginTop: 2, marginBottom: 10, paddingHorizontal: 2 },
  placeSearchError: { color: "#A45F49", fontSize: 10, lineHeight: 15, marginTop: 7, marginBottom: 5 },
  homeBaseButton: { marginTop: 12, borderRadius: 11, backgroundColor: "#E9EDF5", paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  homeBaseButtonActive: { backgroundColor: "#536783" },
  homeBaseButtonText: { color: "#536783", fontSize: 10, fontWeight: "900" },
  homeBaseButtonTextActive: { color: "#FFF" },
  hotelDayLabel: { color: "#756E66", fontSize: 10, fontWeight: "800", marginTop: 12, marginBottom: 7 },
  hotelDayChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  hotelDayChoice: { borderRadius: 10, backgroundColor: "#EEEAE4", paddingHorizontal: 11, paddingVertical: 8 },
  hotelDayChoiceActive: { backgroundColor: "#536783" },
  hotelDayChoiceText: { color: "#766E65", fontSize: 10, fontWeight: "900" },
  hotelDayChoiceTextActive: { color: "#FFF" },
  tripCardIndex: { position: "absolute", left: 20, top: 18, color: "rgba(255,255,255,.7)", letterSpacing: 1.5, fontWeight: "800", fontSize: 10 },
  tripCardPeriod: { color: "rgba(255,255,255,.82)", fontSize: 12, fontWeight: "700", marginTop: 4 },
  tripCardMeta: { flexDirection: "row", marginTop: 14, alignItems: "center", gap: 7 },
  tripCardMetaText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  tripCardMetaDot: { color: "rgba(255,255,255,.5)" },
  tripCardBottom: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  tripCardInfo: { flex: 1, minWidth: 0 },
  tripCardActions: { flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 0 },
  deleteTripButton: { backgroundColor: "#F5EAE5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  deleteTripText: { color: "#A95D4C", fontSize: 10, fontWeight: "900" },
  archiveTripButton: { backgroundColor: "#E8EDF6", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  archiveTripText: { color: "#536783", fontSize: 10, fontWeight: "900" },
  archiveSection: { marginTop: 18, backgroundColor: "#F2F4F8", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#DDE3EE" },
  archiveSectionTitle: { color: "#425571", fontSize: 15, fontWeight: "900" },
  archiveSectionHint: { color: "#718099", fontSize: 10, lineHeight: 16, marginTop: 4, marginBottom: 10 },
  archiveCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 13, padding: 12, marginTop: 8 },
  archiveCardText: { flex: 1 },
  archiveCardTitle: { color: "#343D50", fontSize: 12, fontWeight: "900" },
  archiveCardSub: { color: "#887F76", fontSize: 9, lineHeight: 14, marginTop: 4 },
  restoreArchiveButton: { backgroundColor: "#536783", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  restoreArchiveText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
  archiveWarning: { backgroundColor: "#FFF0ED", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "#F1D4CE", marginBottom: 10 },
  archiveWarningTitle: { color: "#9C4B42", fontSize: 12, fontWeight: "900" },
  archiveWarningText: { color: "#775D58", fontSize: 10, lineHeight: 17, marginTop: 5 },
  archiveTripName: { color: "#343D50", fontSize: 15, fontWeight: "900", marginBottom: 8 },
  archiveTestButton: { backgroundColor: "#E9EDF5", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 13 },
  archiveTestText: { color: "#536783", fontSize: 12, fontWeight: "900" },
  editTripButton: { backgroundColor: "#E9EDF5", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  editTripText: { color: "#536783", fontSize: 10, fontWeight: "900" },
  versionLabel: { color: "#AAA198", fontSize: 9, textAlign: "center", marginTop: 16 },
  tripCardName: { color: "#292622", fontSize: 16, fontWeight: "900", flexShrink: 1 },
  tripCardStatus: { color: "#938A80", fontSize: 11, marginTop: 4 },
  newTripCard: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CFC5BA", borderRadius: 22, padding: 24, alignItems: "center", backgroundColor: "#F8F5EF" },
  newTripIcon: { color: "#536783", fontSize: 28 },
  newTripTitle: { color: "#536783", fontSize: 15, fontWeight: "900", marginTop: 7 },
  newTripSub: { color: "#91877D", fontSize: 11, marginTop: 5 },
  pageTitle: { color: "#292622", fontSize: 29, fontWeight: "800", marginTop: 7, fontFamily: "Noto Serif TC" },
  pageSubtitle: { color: "#817970", lineHeight: 21, marginTop: 6, marginBottom: 22, fontFamily: "Noto Serif TC" },
  toolCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 19, padding: 14, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#EEE8E0" },
  reservationCompletedCard: { backgroundColor: "#F4FAF6", borderColor: "#CDE3D4" },
  reservationHeading: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  reservationAddButton: { backgroundColor: "#637595", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, marginLeft: 10, marginTop: 1 },
  calendarActions: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginTop: 8 },
  calendarButton: { borderWidth: 1, borderColor: "#CBD6E8", backgroundColor: "#F7FAFF", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  calendarButtonText: { color: "#536A92", fontSize: 11, fontWeight: "800" },
  reservationWebsiteButton: { alignSelf: "flex-start", marginTop: 8, backgroundColor: "#EEF4FF", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  reservationWebsiteText: { color: "#3D6197", fontSize: 11, fontWeight: "900" },
  reservationAddText: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  reservationCheckButton: { borderWidth: 1, borderColor: "#BFC9DA", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 8, alignItems: "center", justifyContent: "center", marginLeft: 8, backgroundColor: "#FFF" },
  reservationCheckButtonDone: { backgroundColor: "#5E7C68", borderColor: "#5E7C68" },
  reservationCheckText: { color: "#536783", fontSize: 11, fontWeight: "900" },
  reservationCheckTextDone: { color: "#FFF" },
  reservationDeleteButton: { paddingHorizontal: 6, marginLeft: 2 },
  reservationDeleteText: { color: "#B36E60", fontSize: 22, lineHeight: 24 },
  toolIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  toolEmoji: { fontSize: 23, fontWeight: "800" },
  toolText: { flex: 1, paddingLeft: 13 },
  toolTitle: { fontSize: 16, color: "#2E2A26", fontWeight: "800" },
  toolSub: { fontSize: 12, color: "#918980", marginTop: 3 },
  chevron: { fontSize: 28, color: "#B7B0A8" },
  emptyPage: { flex: 1, padding: 24, paddingTop: 45 },
  modalShade: { flex: 1, backgroundColor: "rgba(20,18,16,.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FBFAF7", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 34 },
  editingSheet: { maxHeight: "92%" },
  editingSheetContent: { paddingBottom: 34 },
  createSheetWrap: { flexGrow: 1, justifyContent: "flex-end" },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#D8D2CA", alignSelf: "center", marginBottom: 20 },
  sheetEyebrow: { fontSize: 11, letterSpacing: 1.4, color: "#9A6A4F", fontWeight: "800", fontFamily: "Noto Serif TC" },
  sheetTitle: { fontSize: 23, fontWeight: "800", color: "#292622", marginTop: 6, fontFamily: "Noto Serif TC" },
  sheetAddress: { color: "#8B837A", fontSize: 12, marginTop: 6, fontFamily: "Noto Serif TC" },
  aiInlineButton: { marginTop: 14, backgroundColor: "#EAF2FB", borderWidth: 1, borderColor: "#CFDBEB", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10, alignItems: "center" },
  aiInlineText: { color: "#536783", fontSize: 11, fontWeight: "900", fontFamily: "Noto Serif TC" },
  aiSheet: { maxHeight: "86%" },
  aiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  closeButtonText: { color: "#625A53", fontSize: 25, lineHeight: 28, fontWeight: "400", marginTop: -2 },
  aiHint: { color: "#718099", fontSize: 11, lineHeight: 17, marginTop: 12, fontFamily: "Noto Serif TC" },
  aiPromptInput: { minHeight: 100, maxHeight: 160, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DDE4EF", borderRadius: 16, padding: 13, marginTop: 12, color: "#38332E", fontSize: 16, lineHeight: 23, textAlignVertical: "top", fontFamily: "Noto Serif TC" },
  aiError: { color: "#A85445", fontSize: 11, lineHeight: 16, marginTop: 9, fontFamily: "Noto Serif TC" },
  aiAnswerBox: { maxHeight: 250, marginTop: 14, backgroundColor: "#F1F5FB", borderRadius: 16, borderWidth: 1, borderColor: "#DDE6F2" },
  aiAnswerContent: { padding: 14 },
  aiAnswerText: { color: "#3F4C60", fontSize: 13, lineHeight: 21, fontFamily: "Noto Serif TC" },
  noteInput: { minHeight: 130, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5DED5", borderRadius: 17, padding: 14, marginTop: 18, textAlignVertical: "top", color: "#38332E", fontSize: 16, lineHeight: 23 },
  compactNoteInput: { minHeight: 92, marginTop: 0 },
  fieldLabel: { color: "#696159", fontSize: 11, fontWeight: "800", marginTop: 16, marginBottom: 7 },
  fieldInput: { height: 48, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5DED5", borderRadius: 14, paddingHorizontal: 13, color: "#38332E", fontSize: 16 },
  fieldInputError: { borderColor: "#C96A5B", borderWidth: 1.5 },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1 },
  dayCountField: { width: 90 },
  primaryButton: { backgroundColor: "#536783", height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 16 },
  checklistAddButton: { position: "relative", zIndex: 12, elevation: 12 },
  primaryButtonText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  secondaryAction: { backgroundColor: "#EDF1F9", height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 10, borderWidth: 1, borderColor: "#D6DDEA" },
  secondaryActionText: { color: "#536783", fontWeight: "800", fontSize: 15 },
  destructiveButton: { backgroundColor: "#A85445", height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
  cancelButton: { height: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#8A8178", fontWeight: "700" },
  toolSheet: { height: "90%", paddingBottom: 10, overflow: "hidden" },
  toolSheetBody: { flex: 1, marginTop: 4 },
  toolSheetBodyContent: { paddingBottom: 28 },
  toolSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#FBFAF7", zIndex: 3, paddingBottom: 8 },
  sheetCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ECE7E0", alignItems: "center", justifyContent: "center", marginTop: -4, padding: 0 },
  closeGlyph: { width: 18, height: 18, alignItems: "center", justifyContent: "center", position: "relative", transform: [{ translateY: -2.5 }] },
  closeGlyphLine: { position: "absolute", width: 17, height: 2.2, borderRadius: 2, backgroundColor: "#625A53", left: 0.5, top: 7.9 },
  closeGlyphLineForward: { transform: [{ rotate: "45deg" }] },
  closeGlyphLineBackward: { transform: [{ rotate: "-45deg" }] },
  detailBlock: { marginTop: 12 },
  detailTitle: { color: "#536783", fontSize: 14, fontWeight: "900", marginTop: 13 },
  detailText: { color: "#756D65", fontSize: 13, lineHeight: 20, marginTop: 4 },
  detailHint: { color: "#9A9188", fontSize: 11, lineHeight: 17, marginTop: 9 },
  flightCard: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E9E2DA", borderRadius: 16, padding: 14, marginTop: 10 },
  flightTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flightRoute: { color: "#536783", fontSize: 15, fontWeight: "900" },
  flightNumber: { color: "#9A6248", fontSize: 11, fontWeight: "800", marginTop: 5 },
  flightTimes: { gap: 4, marginTop: 10 },
  flightTime: { color: "#5F5851", fontSize: 12, fontWeight: "700" },
  editFlightHint: { color: "#9A9188", fontSize: 10, fontWeight: "700", marginTop: 10 },
  hotelDetail: { color: "#625B54", fontSize: 11, lineHeight: 17, marginTop: 7 },
  weatherLoading: { color: "#718099", textAlign: "center", paddingVertical: 35, fontWeight: "700" },
  weatherError: { color: "#A85445", textAlign: "center", paddingVertical: 25 },
  weatherCityCard: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E8E2DA", borderRadius: 22, padding: 14, marginBottom: 14 },
  weatherCityTitle: { color: "#273641", fontSize: 20, fontWeight: "900", marginBottom: 2 },
  weatherPlace: { color: "#7D756D", fontSize: 11, marginBottom: 9 },
  weatherCurrent: { flexDirection: "row", alignItems: "center", gap: 18, borderRadius: 21, padding: 18 },
  weatherBigIcon: { fontSize: 46 },
  weatherTemperature: { color: "#536783", fontSize: 38, fontWeight: "900" },
  weatherCondition: { color: "#718099", fontSize: 11, fontWeight: "700", marginTop: 2 },
  weatherMetrics: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13 },
  weatherMetric: { color: "#756D65", fontSize: 10, fontWeight: "700" },
  forecastScroll: { marginHorizontal: -2 },
  forecastCard: { width: 92, backgroundColor: "#FFF", borderRadius: 16, padding: 11, marginRight: 8, alignItems: "center", borderWidth: 1, borderColor: "#ECE6DE" },
  forecastDate: { color: "#817970", fontSize: 10, fontWeight: "800" },
  forecastIcon: { fontSize: 24, marginVertical: 7 },
  forecastTemp: { color: "#65758E", fontSize: 11, fontWeight: "900" },
  forecastRain: { color: "#6791A0", fontSize: 9, marginTop: 5 },
  contextEmpty: { minHeight: 260, alignItems: "center", justifyContent: "center", padding: 25 },
  exchangeResult: { color: "#536783", fontWeight: "900", fontSize: 28, marginTop: 18 },
  shoppingWrap: { marginTop: 16, minHeight: 360 },
  shoppingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  shoppingSectionTitle: { color: "#536783", fontSize: 12, fontWeight: "900", backgroundColor: "#EDF1F7", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 9 },
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
  sourceTabTextActive: { color: "#536783" },
  shoppingList: { marginTop: 10 },
  shoppingItem: { flexDirection: "row", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#ECE7E0", alignItems: "center" },
  shoppingItemPurchased: { opacity: .6, backgroundColor: "#F2F4F8" },
  shoppingCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#B9B1A8", alignItems: "center", justifyContent: "center" },
  shoppingCheckActive: { backgroundColor: "#536783", borderColor: "#536783" },
  shoppingCheckText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  shoppingNamePurchased: { textDecorationLine: "line-through", color: "#818A9A" },
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
  expenseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", position: "relative", minHeight: 196 },
  totalCard: { borderRadius: 24, padding: 21, marginBottom: 18 },
  totalLabel: { color: "rgba(255,255,255,.72)", fontSize: 11, fontWeight: "800" },
  totalAmount: { color: "#FFF", fontSize: 31, fontWeight: "900", marginTop: 7 },
  totalSub: { color: "rgba(255,255,255,.68)", fontSize: 11, marginTop: 7 },
  payerSummary: { marginBottom: 18 },
  summaryTitle: { color: "#39342F", fontSize: 14, fontWeight: "900", marginBottom: 9 },
  payerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  payerCard: { minWidth: 105, flexGrow: 1, backgroundColor: "#FFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: "#EDE7DF" },
  payerName: { color: "#726A62", fontSize: 10, fontWeight: "800" },
  payerAmount: { color: "#536783", fontSize: 17, fontWeight: "900", marginTop: 5 },
  payerShare: { color: "#A08774", fontSize: 9, marginTop: 3 },
  emptyExpense: { borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CFC5BA", borderRadius: 22, padding: 28, alignItems: "center", backgroundColor: "#F8F5EF" },
  emptyExpenseIcon: { color: "#536783", fontSize: 27, fontWeight: "900" },
  emptyExpenseTitle: { color: "#536783", fontSize: 15, fontWeight: "900", marginTop: 8 },
  emptyExpenseSub: { color: "#91877D", fontSize: 11, marginTop: 5 },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, backgroundColor: "#FFF", borderRadius: 17, borderWidth: 1, borderColor: "#EEE8E0", marginBottom: 10 },
  expenseBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#E8EEF8", alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { color: "#302B27", fontSize: 14, fontWeight: "900" },
  expensePayer: { color: "#958C83", fontSize: 10, marginTop: 3 },
  expenseValue: { color: "#536783", fontWeight: "900", fontSize: 13 },
  deleteExpense: { color: "#B8AFA7", fontSize: 22, paddingLeft: 4 },
  currencyChoices: { flexDirection: "row", gap: 8 },
  currencyChoice: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 12, backgroundColor: "#EEE9E2" },
  currencyChoiceActive: { backgroundColor: "#536783" },
  currencyChoiceText: { color: "#776F67", fontSize: 11, fontWeight: "900" },
  currencyChoiceTextActive: { color: "#FFF" },
  unscheduledCard: { marginTop: 18, marginBottom: 30, padding: 16, borderRadius: 22, backgroundColor: "#F2F5FA", borderWidth: 1, borderColor: "#D9E0EC" },
  unscheduledHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  unscheduledTitle: { color: "#26364F", fontSize: 18, fontWeight: "900" },
  unscheduledCount: { color: "#718099", fontSize: 12, marginTop: 3 },
  unscheduledArrow: { color: "#536783", fontSize: 24, fontWeight: "900" },
  unscheduledItem: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E6EF" },
  unscheduledName: { color: "#1F2D42", fontSize: 15, fontWeight: "900" },
  unscheduledAddress: { color: "#7B8390", fontSize: 11, lineHeight: 17, marginTop: 4 },
  unscheduledReason: { color: "#A45E50", fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 7 },
  unscheduledHours: { color: "#64748A", fontSize: 11, lineHeight: 17, marginTop: 3 },
  unscheduledAddLabel: { color: "#536783", fontSize: 11, fontWeight: "900", marginTop: 10 },
  unscheduledDayRow: { gap: 7, paddingTop: 7 },
  unscheduledDayButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: "#536783" },
  unscheduledDayText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  payerChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7, marginBottom: 8 },
  payerChoice: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: "#EEE9E2", borderWidth: 1, borderColor: "#E5DED5" },
  payerChoiceActive: { backgroundColor: "#536783", borderColor: "#536783" },
  payerChoiceText: { color: "#776F67", fontSize: 12, fontWeight: "900" },
  payerChoiceTextActive: { color: "#FFF" }
  ,
  settlementCard: { backgroundColor: "#F2F4F8", borderRadius: 18, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: "#DDE3EE" },
  settlementDone: { color: "#718099", fontSize: 12, marginTop: 8 },
  settlementRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 11, marginTop: 7, borderTopWidth: 1, borderTopColor: "#DDE3EE" },
  settlementText: { color: "#665F58", fontSize: 12, flex: 1 },
  settlementName: { color: "#536783", fontWeight: "900" },
  settlementAmount: { color: "#9A6248", fontSize: 12, fontWeight: "900" }
  ,
  addressLookupButton: { alignSelf: "flex-start", backgroundColor: "#E9EDF5", borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  addressLookupText: { color: "#536783", fontSize: 11, fontWeight: "900" },
  addressFoundText: { color: "#718099", fontSize: 10, marginTop: 7 },
  routeLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  routeLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  routeLegendDot: { width: 10, height: 10, borderRadius: 5 },
  routeLegendText: { color: "#5F5851", fontSize: 10, fontWeight: "800" },
  allDayCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E9E2DA", marginTop: 10, overflow: "hidden" },
  allDayStripe: { width: 7, alignSelf: "stretch" },
  allDayBody: { flex: 1, padding: 14 },
  allDayTitle: { color: "#343D50", fontSize: 13, fontWeight: "900" },
  allDaySubtitle: { color: "#817970", fontSize: 10, lineHeight: 16, marginTop: 5 },
  favoriteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  favoriteHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  favoriteBatchButton: { backgroundColor: "#E8EDF6", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 11 },
  favoriteBatchButtonText: { color: "#536783", fontSize: 10, fontWeight: "900" },
  favoriteBulkUpdateButton: { backgroundColor: "#F0F3F9", borderWidth: 1, borderColor: "#D6DEEB", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: -10, marginBottom: 14 },
  favoriteBulkUpdateText: { color: "#536783", fontSize: 12, fontWeight: "900" },
  buttonDisabled: { opacity: 0.55 },
  favoriteSearchTip: { color: "#718099", fontSize: 10, lineHeight: 16, marginBottom: 8 },
  favoriteBatchInput: { minHeight: 180, textAlignVertical: "top" },
  disabledButton: { opacity: .55 },
  favoritePlanner: { backgroundColor: "#EDF1F7", borderRadius: 18, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: "#DDE3EE" },
  favoritePlannerTitle: { color: "#536783", fontSize: 15, fontWeight: "900" },
  favoritePlannerText: { color: "#718099", fontSize: 11, lineHeight: 17, marginTop: 5 },
  favoriteIncludeAllRow: { flexDirection: "row", alignItems: "center", marginTop: 13, padding: 12, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9E0EC" },
  favoriteIncludeAllCopy: { flex: 1 },
  favoriteIncludeAllTitle: { color: "#31405A", fontSize: 12, fontWeight: "900" },
  favoritePlannerRow: { flexDirection: "row", gap: 9, alignItems: "center", marginTop: 12 },
  favoriteDayInput: { width: 78, marginTop: 0 },
  favoriteGenerateButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#536783", alignItems: "center", justifyContent: "center" },
  favoriteTargetLabel: { color: "#536783", fontSize: 11, fontWeight: "900", marginTop: 15 },
  favoriteTripChips: { gap: 7, paddingVertical: 9 },
  favoriteTripChip: { backgroundColor: "#FFF", borderRadius: 999, borderWidth: 1, borderColor: "#D9E0EA", paddingHorizontal: 12, paddingVertical: 8 },
  favoriteTripChipActive: { backgroundColor: "#536783", borderColor: "#536783" },
  favoriteTripChipTextActive: { color: "#FFF", fontWeight: "900" },
  favoriteExistingButton: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#536783", borderRadius: 13, paddingVertical: 12, alignItems: "center" },
  favoriteExistingButtonText: { color: "#536783", fontSize: 12, fontWeight: "900" },
  favoriteCountryGroup: { marginBottom: 10 },
  favoriteCountryToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7 },
  favoriteTreeArrow: { color: "#65758E", fontSize: 14, fontWeight: "900", width: 14 },
  favoriteCityToggle: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, paddingVertical: 5 },
  favoriteGroup: { marginBottom: 12, marginLeft: 14 },
  favoriteCountry: { color: "#343D50", fontSize: 15, fontWeight: "900", marginBottom: 4 },
  favoriteCity: { color: "#65758E", fontSize: 13, fontWeight: "900", marginBottom: 8 },
  favoriteCitySelect: { flexDirection: "row", alignItems: "center", gap: 8 },
  favoriteCheckbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: "#A8B4C8", alignItems: "center", justifyContent: "center", marginRight: 10 },
  favoriteCheckboxActive: { backgroundColor: "#536783", borderColor: "#536783" },
  favoriteCheckboxMark: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  favoriteCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 15, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: "#E9E2DA" },
  favoriteCardSelected: { backgroundColor: "#F2F5FA", borderColor: "#8596B2" },
  favoriteCardText: { flex: 1 },
  favoriteName: { color: "#2C2925", fontSize: 13, fontWeight: "900" },
  favoriteAddress: { color: "#887F76", fontSize: 10, lineHeight: 15, marginTop: 4 },
  favoriteFeature: { color: "#65758E", fontSize: 10, lineHeight: 15, marginTop: 6 },
  favoriteEditHint: { color: "#536783", fontSize: 9, fontWeight: "900", marginTop: 6 },
  favoriteDelete: { color: "#A95D4C", fontSize: 24, paddingHorizontal: 8 },
  formRow: { flexDirection: "row", gap: 10 },
  formHalf: { flex: 1 },
  favoriteFromStopButton: { marginTop: 12, backgroundColor: "#EDF1F7", borderRadius: 13, paddingVertical: 12, alignItems: "center" },
  favoriteFromStopText: { color: "#536783", fontSize: 12, fontWeight: "900" },
  archiveAuthNotice: { backgroundColor: "#FFF5DF", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F1D6A0" },
  archiveAuthText: { color: "#755B32", fontSize: 11, lineHeight: 17 },
  archiveReauthButton: { alignSelf: "flex-start", backgroundColor: "#536783", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 9 },
  archiveReauthText: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  deleteStopButton: { marginTop: 10, backgroundColor: "#FBECEA", borderRadius: 13, paddingVertical: 12, alignItems: "center" },
  deleteStopText: { color: "#A5443C", fontSize: 12, fontWeight: "900" }
});
