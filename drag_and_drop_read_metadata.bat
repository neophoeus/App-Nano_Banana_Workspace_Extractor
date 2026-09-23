@echo off
chcp 65001 >nul
title Nano Banana Ultra - 圖片中繼資料讀取器 (PNG Metadata Reader)

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ================================================================
    echo   [錯誤] 找不到 Node.js 執行環境！
    echo ================================================================
    echo   本工具需要 Node.js 才能運行。
    echo   請至官方網站下載並安裝 Node.js: https://nodejs.org/
    echo ================================================================
    echo.
    pause
    exit /b 1
)

:: Check if a file was dragged onto the bat file
if "%~1" == "" (
    echo ================================================================
    echo   Nano Banana Ultra - 圖片中繼資料讀取器
    echo ================================================================
    echo   使用方法：
    echo     直接將一張或多張 .png 圖片拖曳到這個批次檔上！
    echo.
    echo   範例：
    echo     [拖曳 banana_yellow.png] -^> [drag_and_drop_read_metadata.bat]
    echo ================================================================
    echo.
    pause
    exit /b
)

:: Process all dragged image files
for %%f in (%*) do (
    node "%~dp0reader.js" "%%~f"
)

echo.
echo ----------------------------------------------------------------
echo   已檢視完畢，按任意鍵關閉視窗...
echo ----------------------------------------------------------------
pause >nul
exit
