@echo off
title Nano Banana Ultra - PNG Metadata Reader

if not "%~1" == "" goto RUN_READER

echo ================================================================
echo   Nano Banana Ultra - PNG Metadata Reader
echo ================================================================
echo   Please drag and drop your .png image file(s) onto this bat!
echo.
echo   Example:
echo     Drag [image.png] onto [drag_and_drop_read_metadata.bat]
echo ================================================================
echo.
pause
exit /b 0

:RUN_READER
node "%~dp0reader.js" %*

echo.
echo ----------------------------------------------------------------
echo   Metadata inspection complete. Press any key to close...
echo ----------------------------------------------------------------
pause >nul
exit /b 0
