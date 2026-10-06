param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('backend', 'frontend')]
    [string]$Service,
    [string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
if ($Service -eq 'frontend') {
    $apiUri = $null
    if (-not [Uri]::TryCreate($ApiUrl, [UriKind]::Absolute, [ref]$apiUri) -or
        $apiUri.Scheme -notin @('http', 'https') -or $apiUri.Query -or $apiUri.Fragment) {
        throw 'Frontend requires -ApiUrl with the public backend HTTP(S) URL, without query or fragment.'
    }
    $ApiUrl = $apiUri.AbsoluteUri.TrimEnd('/')
}

# A new directory avoids stale payloads and does not overwrite earlier CLI roots.
$packageId = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$targetRoot = Join-Path $workspaceRoot "artifacts/runflare/$Service-$packageId"
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
$trackedPaths = & git -C $workspaceRoot ls-files
if ($LASTEXITCODE -ne 0) { throw 'Cannot read tracked source files.' }
$rootFiles = @('package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json', '.dockerignore')
$otherService = if ($Service -eq 'backend') { 'frontend' } else { 'backend' }
$selectedPaths = $trackedPaths | Where-Object {
    ($_ -in $rootFiles -or $_ -eq "$otherService/package.json" -or $_.StartsWith("$Service/")) -and
    $_ -notmatch '(^|/)(\.env[^/]*|node_modules|dist|coverage|storage|\.next[^/]*|\.swc|\.visual-check|test-results|design-reference)(/|$)' -and
    $_ -notmatch '\.(log|tsbuildinfo)$'
}
foreach ($relativePath in $selectedPaths) {
    $destination = Join-Path $targetRoot $relativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $workspaceRoot $relativePath) -Destination $destination
}

$dockerfile = [IO.File]::ReadAllText((Join-Path $workspaceRoot "$Service/Dockerfile"))
if ($Service -eq 'frontend') {
    $dockerfile = $dockerfile.Replace('ARG NEXT_PUBLIC_API_URL=http://localhost:3000', "ARG NEXT_PUBLIC_API_URL=$ApiUrl")
}
[IO.File]::WriteAllText((Join-Path $targetRoot 'Dockerfile'), $dockerfile, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $targetRoot '.gitignore'), ".env`n.env.*`nnode_modules/`n.git/`n", [Text.UTF8Encoding]::new($false))
Write-Output $targetRoot
