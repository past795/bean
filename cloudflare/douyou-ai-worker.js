const allowedOrigins = new Set([
  "https://past795.github.io",
  "https://bean-dx2.pages.dev"
]);

const headersFor = (origin) => ({
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://bean-dx2.pages.dev",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "vary": "Origin"
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: headersFor(origin) });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/chat") {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: headersFor(origin) });
    }
    try {
      const body = await request.json();
      const question = String(body.message || "").trim().slice(0, 1600);
      if (!question) return new Response(JSON.stringify({ error: "請輸入問題" }), { status: 400, headers: headersFor(origin) });
      const trip = body.trip || {};
      const focus = body.focus || null;
      const system = `你是「豆遊小助手」，以繁體中文協助私人旅行規劃。今天是 2026-08-23。

你要直接幫使用者做可執行的旅遊規劃，而不是泛泛要求對方自己查資料。絕不可提及訓練資料截止日、知識庫年份、2023 或「我的資料只到某年」。

旅行資料是目前最優先的事實來源。對於精確的即時營業時間、票價、交通班次、天氣或道路狀況，如果資料沒有提供，請說「這項即時資料尚未接入豆遊」，接著仍給出合理的規劃建議，並在最後以一句話提醒「出發前可用 Google Maps／當地地圖確認」。絕不捏造精確的即時資訊。

回答要具體、精簡、條列清楚。若在問景點間移動，優先提供大眾運輸、步行與計程車三種選項；若問行程，依抵達時間、住宿位置、景點地區、開放時段與每日合理強度提出順序與備案。

旅行資料：${JSON.stringify(trip).slice(0, 8000)}

目前編輯的景點：${JSON.stringify(focus).slice(0, 3000)}`;
      const result = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
        messages: [
          { role: "system", content: system },
          { role: "user", content: question }
        ],
        max_tokens: 850
      });
      const answer = String(result?.response || result?.result?.response || "目前沒有取得回覆，請再試一次。");
      return new Response(JSON.stringify({ answer }), { headers: headersFor(origin) });
    } catch (error) {
      return new Response(JSON.stringify({ error: "豆遊小助手暫時無法回覆，請稍後再試。" }), { status: 500, headers: headersFor(origin) });
    }
  }
};
