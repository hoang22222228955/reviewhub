@echo off
chcp 65001 >nul
title Tool lay anh review Google Maps

echo ==================================================
echo        TOOL LAY ANH REVIEW GOOGLE MAPS
echo ==================================================
echo.
echo Chon loai dich vu:
echo.
echo   [1] Nha xe
echo   [2] Khach san
echo   [3] May bay
echo   [4] Tau hoa
echo   [5] Tour
echo   [6] Dich vu khac
echo.

set /p CHOICE=Nhap so 1-6: 

if "%CHOICE%"=="1" (
  set PREFIX=PT
  set CATEGORY=Nha xe
) else if "%CHOICE%"=="2" (
  set PREFIX=KS
  set CATEGORY=Khach san
) else if "%CHOICE%"=="3" (
  set PREFIX=MB
  set CATEGORY=May bay
) else if "%CHOICE%"=="4" (
  set PREFIX=TH
  set CATEGORY=Tau hoa
) else if "%CHOICE%"=="5" (
  set PREFIX=TO
  set CATEGORY=Tour
) else if "%CHOICE%"=="6" (
  set PREFIX=DV
  set CATEGORY=Dich vu khac
) else (
  echo.
  echo Lua chon khong hop le.
  pause
  exit /b
)

echo.
echo Ban da chon: %CATEGORY%
echo.
echo Co the nhap:
echo - Ma day du, vi du: PT-013 / KS-001
echo - So thu tu, vi du: 13 hoac 001, tool se tu thanh %PREFIX%-013
echo - Ten dia diem, vi du: Sao Viet / Muong Thanh
echo.
set /p PLACE=Nhap ma hoac ten dia diem: 

if "%PLACE%"=="" (
  echo Ban chua nhap dia diem.
  pause
  exit /b
)

set KEYWORD=%PLACE%

echo %PLACE%| findstr /R "^[0-9][0-9]*$" >nul
if not errorlevel 1 (
  set NUM=000%PLACE%
  call set NUM=%%NUM:~-3%%
  set KEYWORD=%PREFIX%-%NUM%
)

echo.
set /p MAX=Nhap so anh toi da muon lay, bo trong = 200: 
if "%MAX%"=="" set MAX=200

echo.
echo ==================================================
echo Dang chay:
echo Loai      : %CATEGORY%
echo Prefix    : %PREFIX%
echo Keyword   : %KEYWORD%
echo Max images: %MAX%
echo ==================================================
echo.

cd /d "%~dp0"

python dowanh.py "%KEYWORD%" %MAX% "%PREFIX%"

echo.
echo ==================================================
echo Da chay xong. Neu loi, xem thong bao ben tren.
echo ==================================================
pause
