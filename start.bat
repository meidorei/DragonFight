@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请先按 README 检查已有运行环境。本脚本不会安装软件。
  pause
  exit /b 1
)
node tools/server.mjs --open
pause
