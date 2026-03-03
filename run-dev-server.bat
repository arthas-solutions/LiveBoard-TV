@echo off
setlocal
cd /d "%~dp0"

npm run dev -- --hostname 127.0.0.1 --port 3000
