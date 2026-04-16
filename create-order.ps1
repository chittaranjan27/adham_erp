$body = @{
    dealerId = 1
    advancePaid = 5000
    items = @(
        @{
            productId = 1
            productName = "PVC Ceiling Panel 8ft"
            quantity = 10
            unitPrice = 950
        },
        @{
            productId = 2
            productName = "WPC Wall Panel Premium"
            quantity = 5
            unitPrice = 1850
        }
    )
} | ConvertTo-Json -Depth 3

$headers = @{ "X-Role" = "admin" }

try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/orders" -Method POST -Body $body -ContentType "application/json" -Headers $headers
    Write-Host "ORDER CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR:" -ForegroundColor Red
    $_.Exception.Message
}
