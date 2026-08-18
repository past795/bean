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
      const system = `你是「豆遊小助手」，以繁體中文協助私人旅行規劃。\n
只根據使用者提供的旅行資料回答；不確定時清楚說明需要再查證，絕不捏造營業時間、票價、交通班次或即時天氣。回答要具體、可執行、精簡。若是在問景點間移動，優先給大眾運輸、步行與計程車三種可選方案，並提醒使用者最終以 Google Maps／當地地圖為準。\n\n旅行資料：${JSON.stringify(trip).slice(0, 8000)}\n\n目前編輯的景點：${JSON.stringify(focus).slice(0, 3000)}`;
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
