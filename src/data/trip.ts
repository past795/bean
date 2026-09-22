import { Stop, TransportMode, TripDay } from "../types";

const s = (
  id: string, time: string, title: string, address: string, transport: string,
  note: string, pass?: string, latitude?: number, longitude?: number,
  extras: Partial<Stop> = {}
): Stop => {
  const transportMode: TransportMode =
    transport.includes("步行") ? "步行" :
    transport.includes("計程車") ? "計程車" :
    transport.includes("公車") || transport.includes("巴士") ? "公車" :
    transport.includes("地鐵") ? "地鐵" :
    transport.includes("飛機") ? "飛機" :
    transport.includes("預約") ? "預約制" : "其他";
  return { id, time, title, address, transport, transportMode, note, pass, latitude, longitude, ...extras };
};

export const BUSAN_ITINERARY_VERSION = 2026092204;

export const initialTrip: TripDay[] = [
  {
    id: "day1", label: "DAY 1", date: "10/04（日）", title: "影島・南浦洞",
    stops: [
      s("d1-1", "06:05", "金海機場抵達", "釜山廣域市江西區機場進入路108 金海國際機場", "機場輕軌／地鐵", "入境、領行李、換匯與辦理網卡。", undefined, 35.1796, 128.9382),
      s("d1-2", "08:00", "Toyoko Inn 寄放行李", "釜山廣域市中區中央大路125", "地鐵／步行", "先寄放行李，晚上再辦理入住。", undefined, 35.1119, 129.0352),
      s("d1-3", "08:30", "梁山國飯 KTX 釜山站店", "釜山廣域市東區中央大路206 釜山站1樓", "步行", "落地早餐，清燉豬肉湯飯。", undefined, 35.1152, 129.0422),
      s("d1-4", "10:00", "白淺灘文化村", "釜山廣域市影島區瀛仙洞4街1044-6", "公車", "沿海散步、拍照。", undefined, 35.0787, 129.0443),
      s("d1-5", "11:30", "Aether 海景咖啡廳", "釜山廣域市影島區絕影路234", "步行", "白淺灘附近海景咖啡廳。", undefined, 35.0778, 129.045),
      s("d1-6", "13:30", "太宗台遊園地", "釜山廣域市影島區展望路24", "公車", "搭園內觀光列車遊覽海崖。", undefined, 35.0526, 129.0872),
      s("d1-7", "15:30", "喉嚨烤肉影島店", "釜山廣域市影島區絕影路35番街30", "計程車", "熱門時段可能候位。", undefined, 35.09, 129.0397),
      s("d1-8", "17:00", "國際市場挖寶", "釜山廣域市中區新昌洞4街", "公車", "依體力彈性逛街。"),
      s("d1-9", "17:30", "富平罐頭市場", "釜山廣域市中區富平1街48", "步行", "市場小吃與採買。"),
      s("d1-10", "18:00", "光復路時尚街", "釜山廣域市中區光復路", "步行", "南浦商圈散步。"),
      s("d1-11", "19:00", "樂天百貨光復店", "釜山廣域市中區中央大路2", "步行", "購物與觀景台。", undefined, 35.098, 129.0367),
      s("d1-12", "19:45", "BIFF 廣場＋南浦地下購物中心", "釜山廣域市中區BIFF廣場路", "步行", "街頭小吃與地下街。"),
      s("d1-13", "20:15", "札嘎其市場／新東亞水產物綜合市場", "釜山廣域市中區札嘎其海岸路52", "步行", "海鮮晚餐，可依現場營業狀況選擇。", undefined, 35.0967, 129.0304),
      s("d1-14", "22:00", "Toyoko Inn Check-in", "釜山廣域市中區中央大路125", "步行／計程車", "第一晚住宿。", undefined, 35.1119, 129.0352)
    ]
  },
  {
    id: "day2", label: "DAY 2", date: "10/05（一）", title: "海雲台・廣安里・團體晚餐",
    stops: [
      s("d2-1", "09:30", "Avani Central Busan", "부산광역시 남구 전포대로 133", "住宿出發", "由飯店出發。", undefined, 35.1483093, 129.0653741, { durationMinutes: 5 }),
      s("d2-2", "10:00", "冬柏公園 & APEC 世峰樓", "부산광역시 해운대구 우동 713", "計程車", "冬柏島海岸步道與 Nurimaru APEC House。", undefined, 35.1523543, 129.151369, { routeMode: "taxi", transitMinutes: 25, durationMinutes: 85 }),
      s("d2-3", "11:50", "嚴龍白豬肉湯飯 海雲台店", "부산광역시 해운대구 우동 635-6", "步行", "午餐；熱門時段請預留候位時間。", undefined, 35.1609, 129.1582, { routeMode: "walking", transitMinutes: 25, durationMinutes: 75 }),
      s("d2-4", "13:20", "海雲台海水浴場", "부산광역시 해운대구 우동 1015", "步行", "海灘散步。", undefined, 35.1592859, 129.1586091, { routeMode: "walking", transitMinutes: 15, durationMinutes: 30 }),
      s("d2-5", "14:00", "釜山 X the SKY 觀景台", "부산광역시 해운대구 달맞이길 30", "步行", "位於 LCT Landmark Tower。", undefined, 35.1598007, 129.169609, { routeMode: "walking", transitMinutes: 10, durationMinutes: 60 }),
      s("d2-6", "15:15", "尾浦綠色鐵道步道", "부산광역시 해운대구 중동 947-1", "步行", "由尾浦入口散步。", undefined, 35.1635017, 129.1744702, { routeMode: "walking", transitMinutes: 15, durationMinutes: 15 }),
      s("d2-7", "16:05", "Love Is Giving", "부산광역시 수영구 광남로130번길 9", "計程車", "廣安里選物店。", undefined, 35.1529522, 129.1172652, { routeMode: "taxi", transitMinutes: 35, durationMinutes: 20 }),
      s("d2-8", "16:35", "Object 廣安店", "부산광역시 수영구 광안해변로 215-1", "步行", "文具與生活選物。", undefined, 35.1531, 129.1182, { routeMode: "walking", transitMinutes: 10, durationMinutes: 15 }),
      s("d2-9", "17:00", "AOT Coffee", "부산광역시 수영구 광안해변로 237", "步行", "廣安里咖啡休息。", undefined, 35.1544, 129.1212, { routeMode: "walking", transitMinutes: 10, durationMinutes: 30 }),
      s("d2-10", "17:45", "廣安里海水浴場", "부산광역시 수영구 광안해변로 219", "步行", "傍晚海景與廣安大橋。", undefined, 35.1532, 129.1187, { routeMode: "walking", transitMinutes: 15, durationMinutes: 45 }),
      s("d2-group-dinner", "19:00", "團體晚餐地點", "부산광역시 부산진구 중앙대로680번가길 38", "計程車", "團體晚餐。", undefined, 35.1551399, 129.061065, { routeMode: "taxi", transitMinutes: 30, durationMinutes: 90 }),
      s("d2-12", "21:00", "Avani Central Busan", "부산광역시 남구 전포대로 133", "計程車", "返回住宿。", undefined, 35.1483093, 129.0653741, { routeMode: "taxi", transitMinutes: 30, durationMinutes: 0 })
    ]
  },
  {
    id: "day3", label: "DAY 3", date: "10/06（二）", title: "西面・田浦自由安排",
    stops: [
      s("d3-1", "09:30", "Avani 出發", "부산광역시 남구 전포대로 133", "步行", "睡飽後開始西面、田浦購物日。", undefined, 35.14875, 129.065277),
      s("d3-xexymix", "10:00", "XEXYMIX｜Connect Hyundai 釜山店", "부산광역시 동구 범일로 125 커넥트현대 6층", "地鐵／步行", "從 Avani 先往凡一方向，逛完再接西面，避免下午折返。", undefined, 35.141638, 129.0586562),
      s("d3-3", "11:15", "西面地下街", "부산광역시 부산진구 중앙대로 지하", "地鐵／步行", "服飾、鞋包與小物，預留約 75 分鐘。", undefined, 35.1577739, 129.0592588),
      s("d3-lunch", "12:30", "機張手工刀切麵｜기장손칼국수", "부산광역시 부산진구 서면로 56 (부전동 256-6)", "步行", "位於西面市場內；電話 051-806-6832，Google 店家資訊顯示營業至 20:00。", undefined, 35.15566, 129.05815),
      s("d3-6", "13:45", "KIDA", "부산광역시 부산진구 전포대로186번길 46 1층", "步行", "服飾店；官方資訊為 12:00–20:00，週三公休。", undefined, 35.1538546, 129.069255),
      s("d3-dustwood", "14:30", "DUSTWOOD", "부산광역시 부산진구 동성로49번길 40 1층", "步行", "服飾與雜貨選物。", undefined, 35.1549742, 129.0672592),
      s("d2-9", "15:00", "D'art Coffee Larim", "부산광역시 부산진구 동성로49번길 17 4층", "步行", "由 10/5 移至 10/6；同一街區休息約 50 分鐘。", undefined, 35.1549742, 129.0672592),
      s("d3-paper-garden", "16:05", "Paper Garden", "부산광역시 부산진구 전포대로210번길 8 2층", "步行", "生活、植物與居家小物；Visit Busan 資料為每日 11:00–22:00。", undefined, 35.1554105, 129.0669114),
      s("d3-bracket-table", "16:50", "Bracket Table", "부산광역시 부산진구 서전로68번길 109 1층", "步行", "餐廚與生活選物；約 20:00 關門，不排太晚。", undefined, 35.1561459, 129.0666791),
      s("d3-free-shopping", "17:35", "田浦選物店自由逛", "부산광역시 부산진구 전포카페거리", "步行", "保留補逛與臨時發現店家的時間；Hertz35 因目前無法確認地址，暫不列為固定站。", undefined, 35.1556, 129.0668),
      s("d2-10", "19:00", "Old Mansion", "부산광역시 부산진구 전포대로209번길 17-6 1층", "步行", "由 10/5 移至 10/6，作為晚餐。", undefined, 35.1552083, 129.0641726),
      s("d3-8", "21:00", "返回 Avani", "부산광역시 남구 전포대로 133", "地鐵／計程車", "結束西面、田浦購物日。", undefined, 35.14875, 129.065277)
    ]
  },
  {
    id: "day4", label: "DAY 4", date: "10/07（三）", title: "VBP 松島・青沙浦・SPA LAND",
    stops: [
      s("d4-avani", "09:35", "Avani Central Busan", "부산광역시 남구 전포대로 133", "住宿出發", "由飯店出發前往松島。", undefined, 35.1483093, 129.0653741, { durationMinutes: 0 }),
      s("d4-songdo-station", "10:20", "松島纜車站（松島灣站）", "부산광역시 서구 송도해변로 171", "計程車／大眾運輸", "抵達後準備搭乘纜車。", undefined, 35.0776, 129.0237, { routeMode: "transit", transitMinutes: 45, durationMinutes: 10 }),
      s("d4-cable-out", "10:30", "松島海上纜車（去程）", "부산광역시 서구 송도해변로 171", "步行", "松島灣站搭至岩南公園站；搭乘約 15 分鐘。", "VBP", 35.0776, 129.0237, { routeMode: "walking", transitMinutes: 0, durationMinutes: 15 }),
      s("d4-yonggung", "10:45", "松島龍宮雲橋", "부산광역시 서구 암남공원로 55", "步行", "使用 Visit Busan Pass；停留約 40 分鐘。", "VBP", 35.0617, 129.0186, { routeMode: "walking", transitMinutes: 0, durationMinutes: 40 }),
      s("d4-cable-return", "11:25", "松島海上纜車（回程）", "부산광역시 서구 암남공원로 181", "步行", "由岩南公園站搭回松島灣站；搭乘約 15 分鐘。", "VBP", 35.0617, 129.0186, { routeMode: "walking", transitMinutes: 0, durationMinutes: 15 }),
      s("d4-mipo-lunch", "12:15", "尾浦午餐", "부산광역시 해운대구 중동 947-1", "計程車", "可選尾浦家海鮮醬、極東豬肉湯飯或海雲台瓦房鱈魚湯；停留約 75 分鐘。", undefined, 35.1635, 129.1745, { routeMode: "taxi", transitMinutes: 35, durationMinutes: 75 }),
      s("d4-x-sky", "13:35", "BUSAN X the SKY", "부산광역시 해운대구 달맞이길 30", "步行", "使用 Visit Busan Pass；停留約 30 分鐘。", "VBP", 35.1598007, 129.169609, { routeMode: "walking", transitMinutes: 5, durationMinutes: 30 }),
      s("d4-mipo-beach", "14:05", "尾浦海灘散步／周邊咖啡廳", "부산광역시 해운대구 중동 947-1", "步行", "海灘散步或咖啡廳休息約 60 分鐘。", undefined, 35.1635, 129.1745, { routeMode: "walking", transitMinutes: 0, durationMinutes: 60 }),
      s("d4-beach-train", "15:15", "海岸列車（尾浦站上車）", "부산광역시 해운대구 달맞이길62번길 13", "步行", "尾浦搭至青沙浦；使用 Visit Busan Pass，搭乘約 15 分鐘。", "VBP", 35.1587, 129.1716, { routeMode: "walking", transitMinutes: 10, durationMinutes: 15 }),
      s("d4-cheongsapo", "15:30", "青沙浦踏石觀景台／周邊散步", "부산광역시 해운대구 청사포로 167", "步行", "停留約 50 分鐘，另含步行往返膠囊列車青沙浦站約 10 分鐘。", undefined, 35.1604, 129.1915, { routeMode: "walking", transitMinutes: 0, durationMinutes: 60 }),
      s("d4-sky-capsule", "16:30", "Sky Capsule（青沙浦站上車）", "부산광역시 해운대구 청사포로 116", "步行", "搭回尾浦，車程約 30 分鐘。", "自費", 35.1614, 129.1908, { routeMode: "walking", transitMinutes: 0, durationMinutes: 30, reservationRequired: true, reservationNote: "提前預約 10/7 16:30 青沙浦上車、前往尾浦的班次。" }),
      s("d4-yacht", "18:00", "鑽石灣遊艇夜航", "부산광역시 해운대구 해운대해변로 84", "計程車", "18:00 報到、18:30 出航；使用 Visit Busan Pass，含報到與約 40 分鐘航程共約 70 分鐘。", "VBP", 35.1531, 129.1324, { routeMode: "taxi", transitMinutes: 25, durationMinutes: 70, reservationRequired: true, reservationNote: "預約 10/7 18:30 夜航，18:00 前完成報到；https://diamondbay-tw.imweb.me/vbp-tw" }),
      s("d4-spa-land", "19:25", "SPA LAND 汗蒸幕", "부산광역시 해운대구 센텀남대로 35", "計程車／公車", "使用 Visit Busan Pass；停留約 150 分鐘，預計 21:55 離開。", "VBP", 35.1689, 129.1292, { routeMode: "taxi", transitMinutes: 15, durationMinutes: 150 }),
      s("d4-avani-return", "22:00", "Avani Central Busan", "부산광역시 남구 전포대로 133", "地鐵", "搭地鐵 2 號線返回住宿，車程約 20 分鐘。", undefined, 35.1483093, 129.0653741, { routeMode: "transit", transitMinutes: 20, durationMinutes: 0 })
    ]
  },
  {
    id: "day5", label: "DAY 5", date: "10/08（四）", title: "機張・海雲台・返程",
    stops: [
      s("d5-avani-checkout", "08:10", "Avani 退房並寄放行李", "부산광역시 남구 전포대로 133", "住宿辦理", "於大廳櫃檯辦理退房並寄存行李。", undefined, 35.1483093, 129.0653741, { durationMinutes: 20 }),
      s("d5-luge-ticket", "09:15", "Skyline Luge 現場換票等候", "부산광역시 기장군 기장읍 동부산관광로 205", "計程車", "憑釜山 PASS 兌換 2 趟搭乘券，於入口處排隊等待 10:00 開門；計程車約 35–40 分鐘，參考車資 KRW 18,000–22,000。", "VBP", 35.1969, 129.2285, { routeMode: "taxi", transitMinutes: 40, durationMinutes: 45 }),
      s("d5-luge", "10:00", "Skyline Luge 斜坡滑車", "부산광역시 기장군 기장읍 동부산관광로 205", "現場步行", "使用釜山 PASS；包含開門進場、領取頭盔裝備、纜車上山、安全講習及滑行 2 趟，首批約 10:50 完成。", "VBP", 35.1969, 129.2285, { routeMode: "walking", transitMinutes: 0, durationMinutes: 55 }),
      s("d5-haedong", "11:00", "海東龍宮寺", "부산광역시 기장군 기장읍 용궁길 86", "計程車／步行", "參觀海岸峭壁寺廟與拍照，停留約 50 分鐘；計程車約 3–5 分鐘，步行約 15 分鐘。", undefined, 35.1883, 129.2232, { routeMode: "taxi", transitMinutes: 5, durationMinutes: 50 }),
      s("d5-lunch", "11:55", "水百堂 奧西利亞店", "부산광역시 기장군 기장읍 동부산관광로 34", "計程車", "午餐首選：수백당 오시리아점，招牌蜂蜜蒜香白切肉與豬肉湯飯，設有平板點餐。備案：뜸 오시리아본점（기장해안로 98，鮑魚／海鮮釜飯）；오복식당（機張海岸路周邊，烤魚定食）；고민석 원조 불오뎅 가마솥 떡볶이（東釜山觀光路周邊，炒年糕、魚糕與炸物）。", undefined, 35.193, 129.214, { routeMode: "taxi", transitMinutes: 5, durationMinutes: 65 }),
      s("d5-outlet", "13:05", "樂天 Premium Outlet 東釜山店", "부산광역시 기장군 기장읍 기장해안로 147", "計程車", "返台前最後採買，停留約 75 分鐘。周邊備案：Ananti Cove／Eternal Journey（기장해안로 268-32）；Waveon Coffee（장안읍 해맞이로 286，距 Outlet 計程車約 15 分鐘）。", undefined, 35.1927, 129.2123, { routeMode: "taxi", transitMinutes: 5, durationMinutes: 75 }),
      s("d5-haeundae", "14:40", "海雲台海灘散步／文創小店巡禮", "부산광역시 해운대구 우동 1015", "計程車／東海線", "停留約 90 分鐘。備案：海理團路 Haeridan-gil（海雲台站舊車站後巷），可逛 Mimi Shop、Raramart 等獨立服飾、雜貨與咖啡廳。", undefined, 35.1592859, 129.1586091, { routeMode: "taxi", transitMinutes: 20, durationMinutes: 90 }),
      s("d5-avani-luggage", "16:55", "Avani 領取行李", "부산광역시 남구 전포대로 133", "計程車／地鐵", "返回飯店領取寄存行李，預計 17:20 出發前往機場；計程車約 35–40 分鐘，地鐵 2 號線至 BIFC 約 45 分鐘。", undefined, 35.1483093, 129.0653741, { routeMode: "taxi", transitMinutes: 40, durationMinutes: 25 }),
      s("d5-airport", "18:05", "金海國際機場", "부산광역시 강서구 공항진입로 108", "計程車／地鐵輕軌", "提前約 3 小時抵達，辦理退稅、行李托運及登機手續，準備搭乘 21:00 班機返台；計程車約 30–40 分鐘，地鐵／輕軌約 45–50 分鐘。", undefined, 35.1796, 128.9382, { routeMode: "taxi", transitMinutes: 45, durationMinutes: 175 })
    ]
  }
];
