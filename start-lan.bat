@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 局域网模式：同一 Wi-Fi 下的设备可以访问。关闭此窗口即可停止服务。
node tools/server.mjs --lan --open
pause
