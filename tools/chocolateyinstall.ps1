$ErrorActionPreference = 'Stop';
$toolsDir   = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

$extensionName = "vd@vd.io.xpi"

$extensionsFolder = "$env:LOCALAPPDATA\Mozilla\Extensions\{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"

$isrunning = Get-Process -Name "firefox" -ErrorAction SilentlyContinue
if ($isrunning) {
    echo "Firefox needs to be restarted for changes to take place"
}

Get-ChocolateyUnzip -File  "$toolsDir\vd.7z" -Destination "$extensionsFolder"
