$ErrorActionPreference = "Stop"

$schemaPath = Join-Path $PSScriptRoot "..\prisma\schema.prisma"
if (-not (Test-Path -LiteralPath $schemaPath)) {
    throw "prisma\schema.prisma was not found. Extract this package into the project root."
}

$content = [System.IO.File]::ReadAllText($schemaPath)

if (-not $content.Contains('deadlineAt      DateTime?')) {
    $startPattern = '(?m)^(  startedAt\s+DateTime @default\(now\(\)\) //.*)$'
    $startMatches = [regex]::Matches($content, $startPattern)
    if ($startMatches.Count -ne 1) {
        throw "Could not safely locate the SimpleExamAttempt.startedAt field. No schema changes were made."
    }
    $content = [regex]::Replace(
        $content,
        $startPattern,
        ('$1' + [Environment]::NewLine + '  deadlineAt      DateTime?')
    )
}

$oldSubmitted = 'submittedAt     DateTime @default(now())'
$newSubmitted = 'submittedAt     DateTime?'
if (-not $content.Contains($newSubmitted)) {
    $count = ([regex]::Matches($content, [regex]::Escape($oldSubmitted))).Count
    if ($count -ne 1) {
        throw "Expected exactly one SimpleExamAttempt submittedAt field, found $count. No schema changes were made."
    }
    $content = $content.Replace($oldSubmitted, $newSubmitted)
}

$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($schemaPath, $content, $encoding)
Write-Host "Prisma schema updated: deadlineAt snapshot + nullable submittedAt."
