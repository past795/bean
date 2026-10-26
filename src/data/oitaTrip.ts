import { AccommodationInfo, FlightInfo, Stop, TransportMode, TripDay, TripPlan } from "../types";

// One-time migration: later edits made on any device must remain untouched.
export const OITA_ITINERARY_VERSION = 2026102602;
type Row = [string, string, string, string, string, number?, number?];

const makeStop = (d: number, row: Row, i: number): Stop => {
  const [time, title, address, transport, note, transitMinutes = 0, durationMinutes = 0] = row;
  const transportMode: TransportMode = transport.includes("步行") ? "步行" : transport.includes("計程車") ? "計程車" : transport.includes("飛機") ? "飛機" : /巴士|公車|JR|電車/.test(transport) ? "公車" : "其他";
  return { id: `oita-${d}-${i + 1}`, time, title, address, transport, note, transportMode,
    routeMode: transportMode === "步行" ? "walking" : transportMode === "公車" ? "transit" : "driving",
    transitMinutes, durationMinutes };
};
const day = (n: number, date: string, title: string, rows: Row[]): TripDay => ({ id: `oita-day-${n}`, label: `DAY ${n}`, date, title, stops: rows.map((r, i) => makeStop(n, r, i)) });

export const OITA_DAYS: TripDay[] = [
  day(1, "11/28（六）", "抵達別府・大分逛街", [
    ["15:00", "大分機場", "大分県国東市安岐町下原13（大分空港）", "班機抵達", "抵達大分機場。", 0, 30],
    ["15:30", "別府北濱", "大分県別府市北浜2丁目10（別府北浜バス停）", "B 公車｜大分機場 → 別府北濱", "建議搭乘 B 公車，乘車約 45–50 分鐘。", 50, 60],
    ["16:45", "APARTMENT HOTEL YAEZAKI Check-in", "5-12 Minami matogahama, Beppu, Oita", "步行約 5 分鐘", "辦理入住。", 5, 30],
    ["17:15", "Matogahama Park", "5 Kitamatogahamacho, Beppu, Oita", "步行約 3 分鐘", "別府灣海景與夕陽拍照。", 3, 45],
    ["18:15", "JR Oita City AMU PLAZA 大分", "1-14 Kanamemachi, Oita", "JR 日豐本線｜約 15 分鐘", "推薦商店：URBAN RESEARCH、BEAMS、niko and...、PLAZA、LoFt。推薦晚餐：豐後茶屋（大分名物團子汁）、City Dining 三びし（在地鳥天炸雞）。", 15, 120]
  ]),
  day(2, "11/29（日）", "大分市區・購物", [
    ["09:00", "APARTMENT HOTEL YAEZAKI 出發", "5-12 Minami matogahama, Beppu, Oita", "飯店出發", "準備前往大分市區。", 0, 15],
    ["09:30", "大分站", "1-1 Kanamemachi, Oita（大分駅）", "JR 日豐本線｜約 15 分鐘", "抵達大分站。", 15, 15],
    ["10:00", "大分縣立美術館 OPAM", "2-1 Kotobukimachi, Oita", "步行約 15 分鐘", "備案行程。", 15, 45],
    ["11:00", "Park Place 大分", "大分県大分市公園通り西2丁目1番", "大分巴士｜約 30 分鐘", "開放式戶外購物中心與美食街。推薦商店：WEGO、Global Work、ABC-MART GRAND STAGE、3COINS+plus。推薦午餐：商場內人氣蛋包飯或在地拉麵。", 30, 195],
    ["14:30", "大分縣護國神社", "1371 Maki, Oita", "大分巴士｜約 15 分鐘", "清幽神社與花手水拍照。", 15, 75],
    ["16:00", "驚安殿堂 唐吉訶德 大分店", "大分県大分市新川西1丁目1-1（MEGAドン・キホーテ大分店）", "公車｜約 15 分鐘", "採買藥妝、零食。", 15, 105],
    ["18:00", "別府市區", "大分県別府市駅前町（別府駅周邊）", "JR 日豐本線｜約 15 分鐘", "享用別府冷麵或地雞料理、溫泉街散步。", 15, 120]
  ]),
  day(3, "11/30（一）", "九重夢大吊橋・巴士接駁", [
    ["07:00", "飯店早餐與出發", "5-12 Minami matogahama, Beppu, Oita", "步行前往別府站", "早餐後出發。", 0, 50],
    ["07:50", "別府站", "大分県別府市駅前町12-13（別府駅）", "步行抵達車站", "準備搭乘 JR 日豐本線／久大本線。", 10, 5],
    ["08:45", "由布院站前", "大分県由布市湯布院町川北8-2（由布院駅）", "JR 日豐本線／久大本線｜約 50 分鐘", "抵達由布院，準備轉乘巴士。", 50, 20],
    ["09:10", "由布院站前公交中心（去程乘車）", "大分県由布市湯布院町川北3-1（Yufuin Bus Terminal）", "九州橫斷巴士 2 號｜09:10 發車", "去程座位已購買完成；請依票券指定位置候車。", 5],
    ["10:02", "久住登山入口［長者原］", "大分県玖珠郡九重町田野（Kuju Tozan Road／長者原）", "九州橫斷巴士 2 號｜52 分鐘", "10:02 抵達；現場轉乘候車 18 分鐘。", 52, 18],
    ["10:20", "九重登山口花山醉（社區巴士乘車）", "大分県玖珠郡九重町田野260-1（花山酔前站牌）", "步行／候車", "九重町社區巴士 10:20 發車；免預約，準備現金零錢。"],
    ["11:09", "九重夢大吊橋", "大分県玖珠郡九重町田野1208", "九重町社區巴士｜49 分鐘", "由大吊橋中村口進入園區；停留約 3.5 小時，漫步吊橋、展望台並享用九重夢漢堡。", 49, 212],
    ["14:41", "大吊橋中村口（回程乘車）", "大分県玖珠郡九重町田野1215（大吊橋中村口站牌）", "步行至站牌／候車", "九重町社區巴士 14:41 發車。"],
    ["15:30", "久住登山入口［長者原］", "大分県玖珠郡九重町田野（Kuju Tozan Road／長者原）", "九重町社區巴士｜49 分鐘", "15:30 抵達；現場轉乘候車 11 分鐘。", 49, 11],
    ["15:41", "久住登山入口［長者原］（回程乘車）", "大分県玖珠郡九重町田野（Kuju Tozan Road／長者原）", "九州橫斷巴士 6 號｜15:41 發車", "回程座位已購買完成；請依票券指定位置候車。"],
    ["16:33", "由布院站前公交中心", "大分県由布市湯布院町川北3-1（Yufuin Bus Terminal）", "九州橫斷巴士 6 號｜52 分鐘", "順利返回由布院，車站周邊小逛。", 52, 27],
    ["17:00", "由布院站", "大分県由布市湯布院町川北8-2（由布院駅）", "步行前往車站", "準備搭乘 JR 或高速巴士返回別府。", 5, 10],
    ["18:00", "別府市區", "大分県別府市駅前町（別府駅周邊）", "JR 或高速巴士｜約 50 分鐘", "返回飯店稍作休息，享用晚餐與溫泉放鬆。", 50, 120]
  ]),
  day(4, "12/01（二）", "由布院散策・美術館", [
    ["08:30", "飯店出發", "5-12 Minami matogahama, Beppu, Oita", "前往由布院", "由別府出發。", 0, 10],
    ["09:30", "由布院駅前", "大分県由布市湯布院町川北8-2（由布院駅）", "JR 久大本線或龜之井巴士｜約 50 分鐘", "抵達由布院。", 50],
    ["09:30", "金鱗湖", "大分県由布市湯布院町川上1561-1", "步行約 20 分鐘", "湖面晨霧與湖畔神社。", 20, 40],
    ["10:30", "Yufuin Floral Village", "1503-3 Yufuinchō Kawakami, Yufu", "步行約 3 分鐘", "歐風童話村與吉卜力小店。", 3, 47],
    ["11:20", "COMICO ART MUSEUM YUFUIN", "2995-1 Yufuinchō Kawakami, Yufu", "步行約 5 分鐘", "隈研吾設計美術館，需預約。", 5, 50],
    ["12:15", "湯之坪街道", "大分県由布市湯布院町川上（湯の坪街道）", "步行可達", "B-Speak 瑞士捲、可樂餅、午餐。", 5, 75],
    ["13:30", "由布院田園區／質感咖啡廳", "大分県由布市湯布院町川上", "步行隨性漫步", "欣賞由布岳山景。", 0, 140],
    ["16:00", "別府市區", "大分県別府市駅前町（別府駅周邊）", "JR 久大本線或龜之井巴士｜約 50 分鐘", "返回別府市區。", 50, 60],
    ["17:00", "別府市區晚餐", "大分県別府市駅前町（別府站周邊）", "步行覓食", "在地黑毛和牛或溫泉蒸氣料理。", 0, 120]
  ]),
  day(5, "12/02（三）", "別府地獄巡禮・返程", [
    ["08:00", "APARTMENT HOTEL YAEZAKI", "5-12 Minami matogahama, Beppu, Oita", "辦理退房", "行李寄放飯店櫃台。", 0, 40],
    ["09:00", "海地獄前／鐵輪溫泉區", "大分県別府市鉄輪559-1（海地獄前）", "龜之井巴士｜約 20 分鐘", "抵達鐵輪溫泉區。", 20, 30],
    ["09:30", "別府地獄巡禮", "559-1 Kannawa, Beppu", "步行漫步", "參觀蔚藍海地獄。", 0, 105],
    ["11:15", "地獄蒸し工房 鉄輪", "大分県別府市風呂本5組", "步行可達", "午餐體驗天然溫泉蒸氣料理。", 5, 60],
    ["12:30", "APARTMENT HOTEL YAEZAKI", "5-12 Minami matogahama, Beppu, Oita", "公車｜約 15 分鐘", "取回寄放行李。", 15, 50],
    ["13:40", "別府北濱", "大分県別府市北浜2丁目10（別府北浜バス停）", "前往別府北濱站牌", "務必搭乘 13:40 的 K 公車。", 10],
    ["14:48", "大分機場", "大分県国東市安岐町下原13（大分空港）", "K 公車｜48 分鐘", "提前 1 小時 42 分鐘抵達機場。", 48, 102],
    ["16:30", "班機 IT751 起飛返台", "大分県国東市安岐町下原13（大分空港）", "台灣虎航 IT751", "辦理登機後返台。"]
  ])
];

// Verified map points for every itinerary row.  Do not rely on browser-side
// geocoding here: Japanese station/area names can otherwise resolve to the
// municipality centre (the previous Oita Station bug).
const OITA_COORDINATES: Array<Array<[number, number]>> = [
  [
    [33.479444, 131.737222], [33.280392, 131.506424], [33.283195, 131.504456],
    [33.284519, 131.504288], [33.232018, 131.606559]
  ],
  [
    [33.283195, 131.504456], [33.232018, 131.606559], [33.239140, 131.601974],
    [33.195293, 131.658203], [33.235139, 131.642028], [33.245670, 131.606796],
    [33.279415, 131.500992]
  ],
  [
    [33.283195, 131.504456], [33.279415, 131.500992], [33.262781, 131.355782],
    [33.262676, 131.355901], [33.116820, 131.232310], [33.117420, 131.231250],
    [33.173899, 131.226751], [33.173539, 131.226388], [33.116820, 131.232310],
    [33.116820, 131.232310], [33.262676, 131.355901], [33.262781, 131.355782],
    [33.279415, 131.500992]
  ],
  [
    [33.283195, 131.504456], [33.262781, 131.355782], [33.265785, 131.368439],
    [33.266160, 131.365020], [33.263740, 131.361200], [33.265010, 131.363030],
    [33.270150, 131.359430], [33.279415, 131.500992], [33.279415, 131.500992]
  ],
  [
    [33.283195, 131.504456], [33.316350, 131.470540], [33.316350, 131.470540],
    [33.315429, 131.476232], [33.283195, 131.504456], [33.280392, 131.506424],
    [33.479444, 131.737222], [33.479444, 131.737222]
  ]
];
OITA_DAYS.forEach((tripDay, dayIndex) => tripDay.stops.forEach((stop, stopIndex) => {
  const point = OITA_COORDINATES[dayIndex]?.[stopIndex];
  if (point) {
    stop.latitude = point[0];
    stop.longitude = point[1];
  }
}));

const outbound = OITA_DAYS[2]!.stops[3]!;
Object.assign(outbound, { reservationRequired: true, reservationCompleted: true, reservationNote: "已購買完成｜九州橫斷巴士 2 號：由布院站前公交中心 09:10 → 久住登山入口［長者原］10:02。" });
const inbound = OITA_DAYS[2]!.stops[9]!;
Object.assign(inbound, { reservationRequired: true, reservationCompleted: true, reservationNote: "已購買完成｜九州橫斷巴士 6 號：久住登山入口［長者原］15:41 → 由布院站前公交中心 16:33。" });
const comico = OITA_DAYS[3]!.stops[4]!;
Object.assign(comico, { reservationRequired: true, reservationCompleted: false, reservationNote: "COMICO ART MUSEUM YUFUIN 需事先預約；完成後可在豆遊勾選。" });

export const OITA_FLIGHTS: FlightInfo[] = [
  { id: "oita-flight-in", route: "抵達大分機場", flightNumber: "尚未填寫", departure: "", arrival: "2026-11-28 15:00", note: "抵達後搭 B 公車前往別府北濱。" },
  { id: "oita-flight-out", route: "大分機場返台", flightNumber: "IT751", departure: "2026-12-02 16:30", arrival: "", note: "14:48 抵達大分機場。" }
];
export const OITA_ACCOMMODATIONS: AccommodationInfo[] = [{ id: "oita-hotel-yaezaki", name: "APARTMENT HOTEL YAEZAKI", period: "2026-11-28～2026-12-02", address: "5-12 Minami matogahama, Beppu, Oita", checkIn: "2026-11-28 16:45", checkOut: "2026-12-02 08:00", note: "12/02 退房後先寄放行李，12:30 回飯店取回。" }];

export const upgradeOitaItinerary = (trip: TripPlan): TripPlan => {
  const target = trip.id === "trip-1786446683379" || (/大分|Oita/i.test(`${trip.title} ${trip.destination}`) && /11[/-]28/.test(`${trip.startDate || ""} ${trip.days[0]?.date || ""}`));
  if (!target || (trip.oitaItineraryVersion || 0) >= OITA_ITINERARY_VERSION) return trip;
  return { ...trip, destination: "大分・別府・由布院・九重", period: "2026/11/28－12/02", startDate: "2026-11-28", endDate: "2026-12-02", currency: "JPY", days: OITA_DAYS, flights: OITA_FLIGHTS, accommodations: OITA_ACCOMMODATIONS, oitaItineraryVersion: OITA_ITINERARY_VERSION };
};
