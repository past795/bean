# 豆遊（Douyou Trip）專案交接

更新日期：2026-09-03  
專案路徑：`C:\Users\USER\OneDrive\文件\財務\busan-trip-app`

## 1. 接手方式

接手後先讀本文件，再依需求搜尋程式碼；不要重讀舊對話，也不要假設畫面已修好。修改前先確認 `git status --short`，保留使用者既有變更。

使用者通常希望：直接修改、型別檢查、建置、發布，再提供帶版本參數的測試網址。除非有不可逆風險，不要一直要求她手動操作。

## 2. 產品定位與使用者偏好

- 名稱：豆遊。
- 手機優先的旅行 Web App / PWA，也能用電腦瀏覽器。
- 主要給自己與旅伴共同規劃、同步與記帳。
- 使用者偏好行程排得很滿，未排入景點要清楚列為備案，不能默默丟掉。
- 地圖以 Google Maps 為主；韓國同時提供 Naver Map。
- 每段交通由使用者選擇開車、步行、大眾運輸或計程車，班次／路線與交通分鐘數分欄。
- 景點若沒有手填 emoji，才可依類型判斷；判斷不準時寧可不顯示 emoji。
- 行程、工具箱、記帳屬於「目前旅行」；首頁與收藏屬於登入帳號。
- 行前準備為個人資料；必買商品可選個人或共享。
- 字體目標為 Zen Maru Gothic + Noto Serif TC，所有頁面視覺要一致。
- 主要帳號別名：`allison@taiwanbar.cc` 與 `past795@gmail.com` 是同一人，顯示名稱都應視為 `JY`，不可算成兩位成員。

## 3. 技術架構

- Expo 53 / React Native 0.79 / React Native Web / TypeScript。
- 主畫面程式集中在 `App.tsx`（約 6,400 行），共用型別在 `src/types.ts`。
- Firebase Authentication：Google 登入。
- Cloud Firestore：旅行、成員、邀請碼、即時同步與帳號旅行索引。
- AsyncStorage：本機快取與部分個人設定。
- Apps Script：舊同步／試算表匯出與封存相關服務，程式在 `apps-script/Code.gs`。
- Cloudflare Worker AI：`cloudflare/douyou-ai-worker.js`，前端聊天端點在 `App.tsx` 的 `DOUYOU_AI_URL`。
- 網頁地圖：Leaflet / OpenStreetMap，元件在 `src/components/RouteMap.web.tsx`。

Firestore 主要結構：

- `users/{personId}`
- `users/{personId}/trips/{tripId}`
- `trips/{tripId}`
- `trips/{tripId}/members/{personId}`
- `trips/{tripId}/state/current`
- `invites/{inviteCode}`

同步邏輯主要在 `src/firestoreSync.ts`，安全規則在 `firestore.rules`。

## 4. 重要環境與網址

- GitHub repo：`https://github.com/past795/bean.git`
- 正式網站：`https://past795.github.io/bean/`
- Firebase project：`bean-98667`
- Apps Script Web App URL：見 `App.tsx` 的 `SYNC_URL`
- Worker AI URL：見 `App.tsx` 的 `DOUYOU_AI_URL`
- Google Sheet 舊資料庫 ID：見 `apps-script/Code.gs` 的 `SPREADSHEET_ID`
- Firebase Web 設定：`src/firebase.ts`（Web API key 是前端公開設定，不是管理員私鑰）

Cloudflare 曾建立多個實驗性專案／網址；不要修改 `blue-freedom-day-2027`。目前主要正式入口仍以上述 GitHub Pages 網址為準，除非使用者明確要求切換。

## 5. 重要旅行資料

- 釜山員旅：`trip-1785397565924`
- 大分旅行：`trip-1786446683379`
- 大分曾使用邀請碼：`236912`（不要假設仍有效，Firestore 为準）

`App.tsx` 仍有針對上述 ID 的相容／修復邏輯；修改同步或初始化時務必搜尋這兩個 ID。

## 6. 已實作的主要功能

- Google 登入、帳號旅行首頁、新增／加入／退出／刪除旅行。
- 旅行邀請碼與旅伴成員。
- 多日行程、整日搬移、景點增刪改、拖曳／整日編排、上一步。
- 地址搜尋、地址與座標、地圖、多日總覽。
- 交通方式、交通路線與分鐘數、Google Maps / Naver Map / Uber 入口。
- 工具箱：行前準備、班機、住宿、天氣、匯率、預約提醒、備案、必買商品。
- 記帳、付款人、成員分帳與 Firestore 同步。
- 個人收藏、批次匯入、依國家／城市整理、由收藏產生旅行。
- 豆遊小助手與編輯行程内 AI 提問。
- 打包／封存與試算表、Excel/PDF 方向（歷史上反覆修過，不能視為完全穩定）。

## 7. 最新完成事項

最新 commit：`4662b3f Return backup editor to backup list`

備案正確互動需求：

1. 在工具箱開啟「備案」。
2. 按新增或編輯時，保留 `selectedTool === "備案"`。
3. 顯示備案編輯層。
4. 儲存或取消後關閉編輯層，重新顯示原本備案清單。

目前做法是編輯期間暫時隱藏工具 Modal，但不清除 `selectedTool`，結束後會回到備案。相關函式：`openNewBackupPlan`、`openBackupPlanEditor`；相關 Modal：`addingBackupPlan` 與 `selectedTool`。

若使用者仍要求「清單在後方可見、編輯視窗真正疊在上方」，應將 `addingBackupPlan` Modal 的 JSX 移到 `selectedTool` Modal 之後，讓它成為較上層的 React Native Modal；不要再次 `setSelectedTool(null)`。

## 8. 已知風險／仍可能不穩定

- `App.tsx` 過大，功能互相影響；小改也需跑完整 typecheck 與 web export。
- README 與部分終端輸出有 Big5/UTF-8 顯示亂碼，避免用終端輸出的亂碼文字覆寫原始中文。
- 打包／封存過去出現：按鈕無反應、資料來源不正確、Google 登入失效、寄送成功但正式打包失敗。修改前應沿完整前端请求到 Apps Script/下載流程逐段驗證。
- Firestore 曾出現權限不足、undefined 欄位、旅行重複、旅伴單向可見、同帳號別名重複成員。同步改動要同時檢查 rules、會員文件、使用者旅行索引與 state/current。
- PWA / iPhone 主畫面可能使用舊 Service Worker 或快取。發布後測試網址加 `?v=YYYYMMDDNN`，必要時移除主畫面捷徑再加入。
- 地址地理編碼曾把日本／韓國景點定位到錯誤區域。必須用旅行目的地限制查詢，地址與座標一起驗證。
- AI 回答不是即時搜尋結果；涉及營業時間、班次、價格時應標示來源與查證日期，不能假裝已驗證。

## 9. 開發與驗證指令

在專案資料夾執行：

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\expo.cmd export --platform web
node scripts\patch-web-export.mjs
```

若 PATH 不含 Node，使用 Codex bundled runtime：

```powershell
$env:PATH='C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:PATH
```

發布：

```powershell
git add <本次修改的檔案>
git commit -m "清楚描述修改"
git push origin main
.\node_modules\.bin\gh-pages.cmd --nojekyll -d dist
```

不要使用 `git reset --hard`、不要覆蓋使用者未提交的變更，也不要碰 `blue-freedom-day-2027`。

## 10. 接手時的最小檢查清單

1. `git status --short`
2. `git log -5 --oneline`
3. 讀本文件和與當前問題直接相關的程式段落。
4. 修改後執行 TypeScript 檢查與 Web export。
5. 確認只提交本次檔案。
6. 推送 `main` 並部署 `dist` 到 `gh-pages`。
7. 回覆正式網址加新的 `?v=` 版本參數。

