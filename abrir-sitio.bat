@echo off
title Design Promo - sitio local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
	echo No se encontro Node.js. Puedes abrir index.html con doble clic.
	pause
	exit /b
)
node servidor.js --abrir
pause
