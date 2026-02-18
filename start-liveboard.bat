@echo off
setlocal
cd /d "%~dp0"

for /f %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set LISTEN_PID=%%p

if defined LISTEN_PID (
  echo Serveur detecte sur le port 3000 (PID: %LISTEN_PID%).
) else (
  echo Demarrage du serveur Next.js...
  start "Liveboard Dev Server" cmd /k "cd /d \"%~dp0\" && npm run dev -- --hostname 127.0.0.1 --port 3000"
)

echo Attente du serveur...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(60); $ready=$false; while((Get-Date)-lt $deadline){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200){ $ready=$true; break } } catch {}; Start-Sleep -Milliseconds 700 }; if(-not $ready){ exit 1 }"

if errorlevel 1 (
  echo Le serveur n'a pas repondu a temps.
  exit /b 1
)

echo Ouverture de l'overlay...
start "" "http://127.0.0.1:3000/?layout=full&lang=fr"
exit /b 0
