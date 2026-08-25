import { copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const path = new URL("../dist/index.html", import.meta.url);
const iconPath = new URL("../assets/douyou-icon.png", import.meta.url);
const homeMascotPath = new URL("../assets/home-travel-bean-transparent.png", import.meta.url);
const fontPath = new URL("../assets/NotoSerifTC-Variable.ttf", import.meta.url);
const isCloudflare = process.argv.includes("cloudflare");
const siteUrl = isCloudflare ? (process.env.CF_PAGES_URL || "https://douyou.pages.dev").replace(/\/$/, "") : "https://past795.github.io/bean";
const basePath = isCloudflare ? "" : "/bean";
let html = await readFile(path, "utf8");
const icon = await readFile(iconPath);
const iconVersion = createHash("sha256").update(icon).digest("hex").slice(0, 12);
const bundleMatch = html.match(/<script src="([^"]+\.js)" defer><\/script>/);
if (bundleMatch) {
  const bundlePath = new URL(`../dist${bundleMatch[1].replace("/bean", "")}`, import.meta.url);
  const bundle = await readFile(bundlePath);
  const bundleVersion = createHash("sha256").update(bundle).digest("hex").slice(0, 12);
  html = html.replace(bundleMatch[1], `${bundleMatch[1]}?v=${bundleVersion}`);
}
html = html.replace(
  "<head>",
  `<head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="豆遊" />
    <meta property="og:title" content="豆遊｜一起規劃旅行" />
    <meta property="og:description" content="行程、住宿、工具箱與旅伴記帳，都放在同一個地方。" />
    <meta property="og:url" content="${siteUrl}/" />
    <meta property="og:image" content="${siteUrl}/apple-touch-icon.png?v=${iconVersion}" />
    <meta property="og:image:secure_url" content="${siteUrl}/apple-touch-icon.png?v=${iconVersion}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1254" />
    <meta property="og:image:height" content="1254" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="豆遊｜一起規劃旅行" />
    <meta name="twitter:image" content="${siteUrl}/apple-touch-icon.png?v=${iconVersion}" />
    <style>
      /* Ship the selected Traditional Chinese typeface with the app instead of
         depending on a mobile browser being able to reach Google Fonts. */
      @font-face {
        font-family: "Douyou Noto Serif TC";
        src: url("${basePath}/NotoSerifTC-Variable.ttf") format("truetype");
        font-style: normal;
        font-weight: 200 900;
        font-display: block;
      }
      /* One typeface everywhere: Chinese, English and numbers use the same face. */
      html, body, #root, #root *, button, input, textarea, select, [role="button"] {
        font-family: "Douyou Noto Serif TC", "Noto Serif TC", "Songti TC", "PMingLiU", serif !important;
      }
    </style>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <link rel="icon" type="image/png" href="${basePath}/apple-touch-icon.png?v=${iconVersion}" />
    <link rel="shortcut icon" type="image/png" href="${basePath}/apple-touch-icon.png?v=${iconVersion}" />
    <link rel="apple-touch-icon" sizes="180x180" href="${basePath}/apple-touch-icon.png?v=${iconVersion}" />`
);
if (isCloudflare) html = html.replaceAll("/bean/", "/");
await writeFile(path, html);
await copyFile(iconPath, new URL("../dist/apple-touch-icon.png", import.meta.url));
await copyFile(homeMascotPath, new URL("../dist/home-travel-bean.png", import.meta.url));
await copyFile(fontPath, new URL("../dist/NotoSerifTC-Variable.ttf", import.meta.url));
