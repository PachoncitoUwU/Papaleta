@echo off
echo ========================================
echo   PAPALETA - Despliegue a Vercel
echo ========================================
echo.
echo Verificando instalacion de Vercel...
vercel --version
echo.
echo ========================================
echo   Iniciando despliegue...
echo ========================================
echo.
echo IMPORTANTE: 
echo - Responde "Y" a "Set up and deploy"
echo - Responde "N" a "Link to existing project"
echo - Nombre sugerido: papaleta
echo - Directorio: ./ (presiona Enter)
echo - Override settings: N
echo.
pause
echo.
vercel
echo.
echo ========================================
echo   Despliegue completado!
echo ========================================
echo.
echo Para desplegar a produccion, ejecuta:
echo   vercel --prod
echo.
pause
