@echo off
title Nano Banana Ultra lite Workspace Extractor

:: Check if a file was dragged onto the bat file
if "%~1" == "" (
    echo ================================================================
    echo   Nano Banana Workspace Extractor
    echo ================================================================
    echo   Please drag and drop your workspace .json file onto this bat!
    echo.
    echo   Example:
    echo     [Drag workspace.json] -^> [drag_and_drop_extract.bat]
    echo ================================================================
    echo.
    pause
    exit /b
)

:: Run the node extractor script, passing the dragged file
node "%~dp0extractor.js" "%~1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Extraction failed! Please check the error messages above.
    echo.
    pause
    exit /b
)

:: Auto-close terminal on success
exit
