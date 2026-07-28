@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
echo 正在啟動「旅伴」iPhone 預覽...
echo 請讓電腦與 iPhone 連上同一個 Wi-Fi。
echo 手機安裝 Expo Go 後，掃描畫面中的 QR Code。
pnpm exec expo start
pause
