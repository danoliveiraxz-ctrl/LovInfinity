@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "DEST=%LOCALAPPDATA%\LovInfinity"
if not exist "%DEST%" mkdir "%DEST%"

if not exist "LovInfinityHost.exe" (
  where go >nul 2>&1
  if errorlevel 1 (
    echo Go nao encontrado. Tentando instalar Go automaticamente...
    where winget >nul 2>&1
    if errorlevel 1 (
      echo.
      echo Nao foi possivel instalar o Go automaticamente.
      echo Execute o LovInfinity-Setup.exe gerado pelo GitHub Actions.
      pause
      exit /b 1
    )
    winget install --id GoLang.Go --exact --accept-source-agreements --accept-package-agreements
    if errorlevel 1 (
      echo Falha ao instalar o Go.
      pause
      exit /b 1
    )
    set "PATH=%PATH%;%ProgramFiles%\Go\bin;%USERPROFILE%\go\bin"
  )

  echo Compilando o componente local LovInfinity...
  go build -ldflags="-s -w" -o LovInfinityHost.exe .
  if errorlevel 1 (
    echo Falha ao compilar o componente local.
    pause
    exit /b 1
  )
)

echo Encerrando qualquer componente LovInfinity em execucao...
taskkill /F /T /IM LovInfinityHost.exe >nul 2>&1

timeout /t 2 /nobreak >nul

set "COPY_OK=0"
for /L %%I in (1,1,5) do (
  if exist "%DEST%\LovInfinityHost.exe" taskkill /F /T /IM LovInfinityHost.exe >nul 2>&1
  copy /Y "LovInfinityHost.exe" "%DEST%\LovInfinityHost.exe" >nul 2>&1
  if not errorlevel 1 (
    set "COPY_OK=1"
    goto :copy_done
  )
  timeout /t 1 /nobreak >nul
)

:copy_done
if "%COPY_OK%"=="0" (
  echo.
  echo Nao foi possivel substituir o componente local porque ele continua em uso.
  echo Feche o Chrome completamente e execute este instalador novamente.
  pause
  exit /b 1
)

> "%DEST%\com.lovinfinity.oauth.json" echo {"name":"com.lovinfinity.oauth","description":"LovInfinity local OAuth helper","path":"%DEST:\=\\%\LovInfinityHost.exe","type":"stdio","allowed_origins":["chrome-extension://jinndnfkecgpmefehdbcjcjponabkhlc/"]}

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.lovinfinity.oauth" /ve /t REG_SZ /d "%DEST%\com.lovinfinity.oauth.json" /f >nul
if errorlevel 1 (
  echo Falha ao registrar o Native Messaging no Chrome.
  pause
  exit /b 1
)

echo.
echo LovInfinity: componente local instalado e registrado.
echo Feche e abra o Chrome novamente antes de testar.
pause
