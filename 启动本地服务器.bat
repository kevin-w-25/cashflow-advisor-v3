@echo off
cd /d "%~dp0"
echo ======================================
echo   现金流规划助手 - 本地服务器
echo ======================================
echo.
echo 启动中，请稍候...
echo 启动成功后，浏览器会自动打开
echo 按 Ctrl+C 停止服务器
echo.
python -m http.server 8080
