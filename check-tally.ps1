try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/tally/health" -Headers @{ "X-Role" = "admin" } -TimeoutSec 25
    Write-Host "TALLY HEALTH CHECK RESULT:" -ForegroundColor Cyan
    $result | ConvertTo-Json
} catch {
    Write-Host "Tally health check failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
