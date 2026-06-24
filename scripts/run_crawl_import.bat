@echo off
chcp 65001 >nul
title AUTO REVIEW IMPORT

cd /d "%~dp0"

echo =====================================
echo AUTO GOOGLE REVIEW IMPORT
echo =====================================
echo.
echo Chon loai dich vu:
echo [1] Nha xe
echo [2] Khach san
echo.

set /p SERVICE_TYPE=Nhap lua chon 1 hoac 2: 

if "%SERVICE_TYPE%"=="" (
    echo Thieu loai dich vu
    pause
    exit /b
)

if "%SERVICE_TYPE%"=="1" (
    set SERVICE_LABEL=nha xe
    set SERVICE_NAME=Nha xe
)

if "%SERVICE_TYPE%"=="2" (
    set SERVICE_LABEL=khach san
    set SERVICE_NAME=Khach san
)

if "%SERVICE_LABEL%"=="" (
    echo Lua chon khong hop le. Chi nhap 1 hoac 2.
    pause
    exit /b
)

echo.
set /p ACCOUNT_EMAIL=Nhap email partner: 

if "%ACCOUNT_EMAIL%"=="" (
    echo Thieu email partner
    pause
    exit /b
)

echo.
set /p OPERATOR_NAME=Nhap ten %SERVICE_NAME% dung trong seed-operators.js: 

if "%OPERATOR_NAME%"=="" (
    echo Thieu ten %SERVICE_NAME%
    pause
    exit /b
)

echo.
echo =====================================
echo SELECTED
echo =====================================
echo Email       : %ACCOUNT_EMAIL%
echo Loai dich vu: %SERVICE_NAME%
echo Ten         : %OPERATOR_NAME%
echo Search Maps : %SERVICE_LABEL% %OPERATOR_NAME%
echo =====================================
echo.

echo [1/3] Crawl Google Maps
python crawl_google_maps_reviews_to_txt.py "%SERVICE_LABEL% %OPERATOR_NAME%"

if errorlevel 1 (
    echo.
    echo Loi khi crawl Google Maps
    pause
    exit /b
)

echo.
echo [2/3] Import Database
node import_reviews_from_txt.js

if errorlevel 1 (
    echo.
    echo Loi khi import database
    pause
    exit /b
)

echo.
echo [3/3] Auto Fix Partner Account
node fix_account.js "%ACCOUNT_EMAIL%" "%OPERATOR_NAME%"

if errorlevel 1 (
    echo.
    echo Loi khi fix account partner
    pause
    exit /b
)

echo.
echo =====================================
echo DONE
echo =====================================
echo.
echo Reviews da import vao moderation queue.
echo moderation_status = pending_review
echo.
echo Account partner da duoc gan:
echo partner_code = ma dich vu
echo assigned_operator_code = ma dich vu
echo org_name = ten dich vu
echo.
echo Admin vao AdminModerationPage de duyet review.
echo Sau khi approved, partner/public moi thay review.
echo.
echo Logout/login lai frontend neu partner chua thay du lieu.
echo Ctrl + Shift + R
echo.
echo =====================================
echo.

pause