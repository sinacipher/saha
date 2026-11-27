$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
$Extensions = @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".css", ".md", ".txt", ".html", ".json", ".svg")
$ExcludedDirectories = @("node_modules", ".next", ".git", "dist", "build", "coverage")
$ChangedFiles = 0

# Traverse without entering dependency, build-output or Git metadata folders.
$Directories = New-Object System.Collections.Generic.Stack[string]
$Directories.Push($Root)

while ($Directories.Count -gt 0) {
    $CurrentDirectory = $Directories.Pop()

    foreach ($Entry in Get-ChildItem -LiteralPath $CurrentDirectory -Force) {
        if ($Entry.PSIsContainer) {
            if ($ExcludedDirectories -notcontains $Entry.Name) {
                $Directories.Push($Entry.FullName)
            }
            continue
        }

        if ($Extensions -notcontains $Entry.Extension.ToLowerInvariant()) { continue }

        $Original = [System.IO.File]::ReadAllText($Entry.FullName)
        $Updated = $Original
        $Updated = $Updated.Replace("سحا", "ریمو")
        $Updated = $Updated.Replace("SAHA", "REMO")
        $Updated = $Updated.Replace("saha-drawer", "remo-drawer")
        $Updated = $Updated.Replace("saha-backdrop", "remo-backdrop")

        if ($Updated -cne $Original) {
            [System.IO.File]::WriteAllText($Entry.FullName, $Updated, $Utf8NoBom)
            $ChangedFiles++
        }
    }
}

# Parents must not receive unpublished exam percentages/results.
$ParentDashboard = Join-Path $Root "src\app\parent\page.tsx"
if (-not (Test-Path $ParentDashboard)) {
    throw "Parent dashboard file was not found: $ParentDashboard"
}
$Content = [System.IO.File]::ReadAllText($ParentDashboard)
$Old = 'getSimpleExamAttemptsByStudent([child.id])'
$New = 'getSimpleExamAttemptsByStudent([child.id], { onlyPublished: true })'
if ($Content.Contains($Old)) {
    $Content = $Content.Replace($Old, $New)
    [System.IO.File]::WriteAllText($ParentDashboard, $Content, $Utf8NoBom)
    $ChangedFiles++
} elseif (-not $Content.Contains($New)) {
    throw "Could not safely update parent dashboard result visibility. Review $ParentDashboard manually."
}

$ParentPerformance = Join-Path $Root "src\app\parent\performance\page.tsx"
if (-not (Test-Path $ParentPerformance)) {
    throw "Parent performance file was not found: $ParentPerformance"
}
$Content = [System.IO.File]::ReadAllText($ParentPerformance)
if ($Content.Contains($Old)) {
    $Content = $Content.Replace($Old, $New)
    [System.IO.File]::WriteAllText($ParentPerformance, $Content, $Utf8NoBom)
    $ChangedFiles++
} elseif (-not $Content.Contains($New)) {
    throw "Could not safely update parent performance visibility. Review $ParentPerformance manually."
}

# Use the explicit ESM config to avoid Vite loading TypeScript ESM as CommonJS.
$OldVitestConfig = Join-Path $Root "vitest.config.ts"
$NewVitestConfig = Join-Path $Root "vitest.config.mjs"
if (-not (Test-Path $NewVitestConfig)) {
    throw "vitest.config.mjs is missing. Extract the full upgrade ZIP into the project root first."
}
if (Test-Path $OldVitestConfig) {
    Remove-Item -LiteralPath $OldVitestConfig -Force
}

Write-Host "Rimo upgrade script completed. Updated $ChangedFiles text files." -ForegroundColor Green
Write-Host "Parent dashboards now filter unpublished results; Vitest config uses .mjs." -ForegroundColor Green
