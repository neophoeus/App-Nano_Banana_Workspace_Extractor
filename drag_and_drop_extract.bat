@echo off
title Nano Banana Ultra - Workspace Extractor

if not "%~1" == "" goto RUN_EXTRACT

echo ================================================================
echo   Nano Banana Ultra - Workspace Extractor
echo ================================================================
echo   Please drag and drop your workspace .json file(s) onto this bat!
echo.
echo   Example:
echo     Drag [workspace.json] onto [drag_and_drop_extract.bat]
echo ================================================================
echo.
pause
exit /b 0

:RUN_EXTRACT
node "%~dp0extractor.js" %*

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Extraction failed! Please check the error messages above.
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ================================================================
echo   Extraction complete!
echo   Press any key to open the output folder, or close this window.
echo ================================================================
pause >nul
if exist "%~dp0output" (
    start "" "%~dp0output"
)
exit /b 0
