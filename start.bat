@echo off
REM Music Bingo Quick Start Script for Windows
REM This script builds the React app and starts the production server

echo.
echo Music Bingo - Quick Start
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  cd client
  call npm install
  cd ..
)

REM Check if build exists
if not exist "client\build\" (
  echo Building React app...
  call npm run build
)

echo.
echo Starting Music Bingo server...
echo.
echo Players can now connect at:
echo   Local:   http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
