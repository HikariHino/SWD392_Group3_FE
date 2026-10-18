param([string]$BackendPath = 'E:\SWDBE')

$ErrorActionPreference = 'Stop'
$projectPath = Join-Path $BackendPath 'WebApi\WebApi.csproj'
if (-not (Test-Path -LiteralPath $projectPath)) {
    throw "Khong tim thay WebApi.csproj trong $BackendPath"
}

# Only this process receives temporary JWT settings; database configuration is unchanged.
$demoJwtDefaults = @{
    Jwt__Issuer = 'AIVES'
    Jwt__Audience = 'AIVES-Client'
    Jwt__SigningKey = ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
    Jwt__ExpiryMinutes = '120'
}
$demoAddedVariables = @()
try {
    foreach ($entry in $demoJwtDefaults.GetEnumerator()) {
        if (-not [Environment]::GetEnvironmentVariable($entry.Key, 'Process')) {
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
            $demoAddedVariables += $entry.Key
        }
    }
    Write-Host 'Starting BE on http://localhost:5110 with its configured Development database.'
    Write-Host 'The existing seed creates lecturer/password123 only if lecturer does not exist.'
    Write-Host 'Check for DatabaseSeeder errors. A running API does not prove database access.'
    & dotnet run --project $projectPath --launch-profile http
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
} finally {
    foreach ($variable in $demoAddedVariables) {
        [Environment]::SetEnvironmentVariable($variable, $null, 'Process')
    }
}
