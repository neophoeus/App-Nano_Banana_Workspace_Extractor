@echo off
title Nano Banana Ultra - Metadata Viewer

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch_viewer.ps1" %*
exit /b %errorlevel%
