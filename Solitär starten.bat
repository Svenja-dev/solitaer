@echo off
REM Startet Solitär: lokaler Mini-Server + Browser.
REM ES-Module brauchen http:// (file:// wird vom Browser blockiert).
title Solitaer
cd /d "%~dp0"

echo Starte Solitaer-Server auf http://localhost:4178 ...
echo Dieses Fenster offen lassen, solange du spielst.
echo Zum Beenden: dieses Fenster schliessen.
echo.

REM Browser nach kurzer Verzoegerung oeffnen (Server-Start abwarten).
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4178/"

REM Server starten (blockiert dieses Fenster - das ist gewollt).
npx --yes http-server -p 4178 -c-1 --silent
