# Manually sync order ORD-19154524 (ID: 5) to Tally as a Sales Order
Write-Host "=== Step 1: Manually syncing Sales Order to Tally ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/tally/sync-order/5" -Method POST -Headers @{ "X-Role" = "admin" } -TimeoutSec 20
    Write-Host "Result:" -ForegroundColor Yellow
    $result | ConvertTo-Json
} catch {
    Write-Host "Sales sync response:" -ForegroundColor Yellow
    # Even 400 responses contain useful info - the order might not be delivered yet
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
    $reader.Close()
}

Write-Host ""
Write-Host "=== Step 2: Syncing Advance Receipt (Rs 5000) to Tally ===" -ForegroundColor Cyan
try {
    $result2 = Invoke-RestMethod -Uri "http://localhost:5000/api/tally/sync-advance/5" -Method POST -Headers @{ "X-Role" = "admin" } -TimeoutSec 20
    Write-Host "Result:" -ForegroundColor Yellow
    $result2 | ConvertTo-Json
} catch {
    Write-Host "Advance sync error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
