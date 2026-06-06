@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Budget Analyzer - Deploy
echo ============================================
echo.

REM Show what changed
git status --short
echo.

REM Bail out early if there is nothing to deploy (catches new/untracked files too)
set "DIRTY="
for /f "delims=" %%i in ('git status --porcelain') do set "DIRTY=1"
if not defined DIRTY (
  echo Nothing to deploy - no changes found.
  echo.
  pause
  exit /b 0
)

REM Build first so a broken build is caught HERE instead of failing on GitHub
echo Building and checking the app compiles (this can take a moment)...
call npm run build
if errorlevel 1 goto :buildfail
echo Build OK.
echo.

REM Ask for a commit message; press Enter to use a timestamp
set "MSG="
set /p "MSG=Commit message (Enter for timestamp): "
if not defined MSG for /f "tokens=*" %%t in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm\""') do set "MSG=Update %%t"

echo.
echo Staging changes...
git add -A || goto :error

echo Committing...
git commit -m "%MSG%" || goto :error

echo Pushing to GitHub...
git push || goto :error

echo.
echo ============================================
echo   Done. Deploy is building on GitHub.
echo.
echo   Progress:
echo   https://github.com/Mosk0vich314/budgetAnalyzer/actions
echo.
echo   Live site (after ~1-2 min):
echo   https://mosk0vich314.github.io/budgetAnalyzer/
echo ============================================
echo.
pause
exit /b 0

:buildfail
echo.
echo *** Build FAILED - see the error above. Nothing was committed or pushed. ***
echo *** Fix the problem, then run deploy.bat again. ***
echo.
pause
exit /b 1

:error
echo.
echo *** Something went wrong (see the error above). ***
echo.
pause
exit /b 1
