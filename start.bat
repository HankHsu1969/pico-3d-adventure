@echo off
chcp 65001 >nul
cd /d %~dp0
echo 皮可 3D 大冒險 - 本機伺服器啟動中...
echo 電腦請開: http://localhost:8080
echo 手機(同一個 Wi-Fi)請開: http://[這台電腦的IP]:8080   (IP 可用 ipconfig 查詢)
start "" http://localhost:8080
python -m http.server 8080 --bind 0.0.0.0
