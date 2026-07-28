@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
echo 正在啟動「釜山同行」電腦預覽版...
echo 啟動後請保持這個視窗開啟。
pnpm exec expo start --web
pause
