$ErrorActionPreference = 'Stop'
$skillpathSdk = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $skillpathSdk)) {
    $skillpathSdk = (Get-Command dotnet -ErrorAction Stop).Source
}
$skillpathProject = Join-Path $PSScriptRoot '..\backend\SkillPath.Api\SkillPath.Api.csproj'
$skillpathSecureKey = Read-Host 'Claude API key (input is hidden)' -AsSecureString
if ($skillpathSecureKey.Length -eq 0) { throw 'No key entered.' }
try {
    $skillpathPlainKey = [System.Net.NetworkCredential]::new('', $skillpathSecureKey).Password
    @{ 'Anthropic:ApiKey' = $skillpathPlainKey.Trim() } | ConvertTo-Json -Compress |
        & $skillpathSdk user-secrets set --project $skillpathProject
    if ($LASTEXITCODE -ne 0) { throw 'Could not save the key.' }
    Write-Host 'Key saved outside the project. Restart the API to enable AI feedback.'
} finally {
    $skillpathPlainKey = $null
    $skillpathSecureKey.Dispose()
}
