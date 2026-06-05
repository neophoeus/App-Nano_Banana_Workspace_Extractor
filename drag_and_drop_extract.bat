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

echo ----------------------------------------------------------------
echo   Starting workspace extraction...
echo   Source file: "%~1"
echo ----------------------------------------------------------------
echo.

:: Run the node extractor script, passing the dragged file
node "%~dp0extractor.js" "%~1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Extraction failed! Please check the error messages above.
    echo.
    pause
    exit /b
)

echo.
echo [SUCCESS] Files successfully extracted to the "./output" folder!
echo Opening output directory...
echo.

:: Automatically open the output folder in Windows Explorer
if exist "%~dp0output" (
    explorer.exe "%~dp0output"
) else (
    explorer.exe "%~dp0"
)

pause
