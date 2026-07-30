import { copyFile, readFile, writeFile } from "node:fs/promises";

const path = new URL("../dist/index.html", import.meta.url);
let html = await readFile(path, "utf8");
html = html.replace(
  "<head>",
  `<head>
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <link rel="icon" type="image/png" href="/bean/apple-touch-icon.png?v=20260730-4" />
    <link rel="shortcut icon" type="image/png" href="/bean/apple-touch-icon.png?v=20260730-4" />
    <link rel="apple-touch-icon" sizes="180x180" href="/bean/apple-touch-icon.png?v=20260730-3" />`
);
await writeFile(path, html);
await copyFile(new URL("../assets/douyou-icon.png", import.meta.url), new URL("../dist/apple-touch-icon.png", import.meta.url));
