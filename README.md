# 釜山同行 iPhone App — 第一版

以 Expo / React Native 製作的個人與旅伴旅行 App 原型，初始資料來自「202610 釜山」Google Sheet。

## 已完成

- 五天釜山行程與交通方式
- 日期切換
- 長按拖曳行程卡片排序
- Day 1、Day 2 地圖路線與順序編號
- 景點備註編輯與本機保存
- Apple Maps 導航
- 工具箱入口：班機、住宿、天氣、匯率、必買商品
- iPhone 優先的底部導覽與視覺設計

## 本機啟動

```powershell
npm install
npx expo start
```

安裝 iPhone 的 Expo Go 後掃描終端機顯示的 QR Code。若電腦與手機不在相同網路，可使用：

```powershell
npx expo start --tunnel
```

## 電腦瀏覽器預覽

最簡單的方式是直接雙擊 `開啟電腦預覽.cmd`。

也可以在終端機中執行：

```powershell
pnpm web
```

或：

```powershell
pnpm exec expo start --web
```

瀏覽器版會顯示與手機一致的行程、拖曳、備註及工具箱；地圖使用不需 API 金鑰的路線預覽，iPhone 版則繼續使用原生地圖。

## 下一版

- Supabase 登入、邀請旅伴與即時同步
- 工具箱各功能的詳細頁
- 記帳、分攤與 KRW/TWD 換算
- 景點搜尋、官方資訊來源與自動補充
- 所有日期的精確座標與路線時間
- 航班、天氣與匯率 API
