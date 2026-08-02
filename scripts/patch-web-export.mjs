import { copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const path = new URL("../dist/index.html", import.meta.url);
const iconPath = new URL("../assets/douyou-icon.png", import.meta.url);
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
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <link rel="icon" type="image/png" href="/bean/apple-touch-icon.png?v=${iconVersion}" />
    <link rel="shortcut icon" type="image/png" href="/bean/apple-touch-icon.png?v=${iconVersion}" />
    <link rel="apple-touch-icon" sizes="180x180" href="/bean/apple-touch-icon.png?v=${iconVersion}" />`
);
await writeFile(path, html);
await copyFile(iconPath, new URL("../dist/apple-touch-icon.png", import.meta.url));
