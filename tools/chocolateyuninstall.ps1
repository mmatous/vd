$ErrorActionPreference = 'Stop';

$vdFolder = "$env:LOCALAPPDATA\Mozilla\Extensions\{ec8030f7-c20a-464f-9b0e-13a3a9e97384}\vd@vd.io.xpi"
Remove-Item "$vdFolder" -Force -Recurse
