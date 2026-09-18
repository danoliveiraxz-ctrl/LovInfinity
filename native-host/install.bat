@echo off
setlocal
set "DEST=%LOCALAPPDATA%\LovInfinity"
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%~dp0LovInfinityHost.exe" "%DEST%\LovInfinityHost.exe" >nul
> "%DEST%\com.lovinfinity.oauth.json" echo {"name":"com.lovinfinity.oauth","description":"LovInfinity local OAuth helper","path":"LovInfinityHost.exe","type":"stdio","allowed_origins":["chrome-extension://jinndnfkecgpmefehdbcjcjponabkhlc/"]}
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.lovinfinity.oauth" /ve /t REG_SZ /d "%DEST%\com.lovinfinity.oauth.json" /f >nul
echo LovInfinity: componente local instalado.
echo Feche e abra o Chrome novamente antes de testar.
pause