@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
echo 正在建立並發布「豆遊」網站...
call pnpm run deploy
if errorlevel 1 (
  echo.
  echo 發布失敗，請保留此視窗並查看上方訊息。
) else (
  echo.
  echo 發布完成：https://past795.github.io/bean/
)
pause
