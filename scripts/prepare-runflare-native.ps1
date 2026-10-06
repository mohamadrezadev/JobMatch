param([Parameter(Mandatory=$true)][ValidateSet('backend','frontend')][string]$Service)
$ErrorActionPreference='Stop'
$workspaceRoot=Split-Path -Parent $PSScriptRoot
$packageId=[Guid]::NewGuid().ToString('N').Substring(0,12)
$targetRoot=Join-Path $workspaceRoot "artifacts/runflare/native-$Service-$packageId"
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
$utf8=[Text.UTF8Encoding]::new($false)
if($Service -eq 'backend'){
    if(-not (Test-Path -LiteralPath (Join-Path $workspaceRoot 'backend/dist/main.js'))){throw 'Build backend first with pnpm exec nest build.'}
    foreach($folder in @('dist','assets')){Copy-Item -LiteralPath (Join-Path $workspaceRoot "backend/$folder") -Destination $targetRoot -Recurse}
    Copy-Item -LiteralPath (Join-Path $workspaceRoot 'backend/src/prisma') -Destination (Join-Path $targetRoot 'prisma') -Recurse
    $package=Get-Content -LiteralPath (Join-Path $workspaceRoot 'backend/package.json') -Raw | ConvertFrom-Json
    $package.dependencies | Add-Member -NotePropertyName prisma -NotePropertyValue $package.devDependencies.prisma -Force
    $package.PSObject.Properties.Remove('devDependencies')
    $package.prisma.schema='prisma/schema.prisma'
    $package.scripts=[pscustomobject]@{
        # Runflare's dependency layer copies the prisma directory contents into /app.
        # The complete source layer restores /app/prisma for runtime migrations.
        postinstall='node -e "const fs=require(''fs'');const schema=fs.existsSync(''prisma/schema.prisma'')?''prisma/schema.prisma'':''schema.prisma'';require(''child_process'').execFileSync(process.execPath,[''node_modules/prisma/build/index.js'',''generate'',''--schema'',schema],{stdio:''inherit''});"'
        build='node -e "console.log(''Backend was compiled before upload'')"'
        start='node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && node dist/main.js'
    }
}else{
    $trackedPaths=& git -C $workspaceRoot ls-files frontend
    foreach($relativePath in $trackedPaths){
        if($relativePath -match '(^|/)(\.env[^/]*|Dockerfile|design-reference)(/|$)' -or $relativePath -match '\.tsbuildinfo$'){continue}
        $destination=Join-Path $targetRoot $relativePath.Substring('frontend/'.Length)
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $workspaceRoot $relativePath) -Destination $destination
    }
    Copy-Item -LiteralPath (Join-Path $workspaceRoot 'tsconfig.base.json') -Destination $targetRoot
    $tsconfig=[IO.File]::ReadAllText((Join-Path $targetRoot 'tsconfig.json')).Replace('../tsconfig.base.json','./tsconfig.base.json')
    [IO.File]::WriteAllText((Join-Path $targetRoot 'tsconfig.json'),$tsconfig,$utf8)
    $nextconfig=[IO.File]::ReadAllText((Join-Path $targetRoot 'next.config.js')).Replace('path.join(__dirname, "..")','__dirname')
    [IO.File]::WriteAllText((Join-Path $targetRoot 'next.config.js'),$nextconfig,$utf8)
    $package=Get-Content -LiteralPath (Join-Path $workspaceRoot 'frontend/package.json') -Raw | ConvertFrom-Json
    $package.scripts.start='next start -H 0.0.0.0 -p 3000'
}
foreach($section in @('dependencies','devDependencies')){
    if($package.$section){foreach($entry in $package.$section.PSObject.Properties){
        $installedManifest=Join-Path $workspaceRoot "$Service/node_modules/$($entry.Name)/package.json"
        if(Test-Path -LiteralPath $installedManifest){$entry.Value=(Get-Content -LiteralPath $installedManifest -Raw | ConvertFrom-Json).version}
    }}
}
if($Service -eq 'frontend'){
    [IO.File]::WriteAllText((Join-Path $targetRoot '.npmrc'),"legacy-peer-deps=true`n",$utf8)
}
[IO.File]::WriteAllText((Join-Path $targetRoot 'package.json'),($package | ConvertTo-Json -Depth 30),$utf8)
[IO.File]::WriteAllText((Join-Path $targetRoot '.gitignore'),".env`n.env.*`nnode_modules/`n.git/`n*.log`n",$utf8)
Write-Output $targetRoot
