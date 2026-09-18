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

copy /Y "LovInfinityHost.exe" "%DEST%\LovInfinityHost.exe" >nul
if errorlevel 1 (
  echo Falha ao copiar o componente local.
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
