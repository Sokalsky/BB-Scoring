@echo off
echo === Bugger Bridge — One-time network setup ===
echo This must be run as Administrator.
echo.
echo 1. Allowing non-admin server to listen on port 8080...
netsh http add urlacl url=http://+:8080/ user=Everyone
echo.
echo 2. Adding Windows Firewall rule for port 8080...
powershell.exe -Command "New-NetFirewallRule -DisplayName 'Bugger Bridge' -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue"
echo.
echo Done! Start serve.ps1 normally and connect from any device on your network.
pause
