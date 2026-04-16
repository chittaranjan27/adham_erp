# Full end-to-end test: Create Order -> Check Tally Auto-Sync
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " FULL TALLY SYNC TEST" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Tally is connected
Write-Host "[STEP 1] Checking TallyPrime connection..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/tally/health" -Headers @{ "X-Role" = "admin" } -TimeoutSec 20
    if ($health.connected) {
        Write-Host "  -> TallyPrime is CONNECTED at $($health.tallyUrl)" -ForegroundColor Green
    } else {
        Write-Host "  -> TallyPrime is NOT connected: $($health.message)" -ForegroundColor Red
        Write-Host "  -> Please open TallyPrime, enable Server Mode (F12), and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  -> API Server not responding. Start it first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Create a new order
Write-Host "[STEP 2] Creating a new order..." -ForegroundColor Yellow
$orderJson = '{"dealerId":1,"advancePaid":8000,"items":[{"productId":1,"productName":"PVC Ceiling Panel 8ft","quantity":20,"unitPrice":950},{"productId":2,"productName":"WPC Wall Panel Premium","quantity":10,"unitPrice":1850}]}'

try {
    $order = Invoke-RestMethod -Uri "http://localhost:5000/api/orders" -Method POST -Body $orderJson -ContentType "application/json" -Headers @{ "X-Role" = "admin" } -TimeoutSec 15
    Write-Host "  -> Order CREATED: $($order.orderNumber)" -ForegroundColor Green
    Write-Host "  -> Dealer: $($order.dealerName)" -ForegroundColor White
    Write-Host "  -> Total: Rs $($order.totalAmount)" -ForegroundColor White
    Write-Host "  -> Advance: Rs $($order.advancePaid)" -ForegroundColor White
    Write-Host "  -> Status: $($order.status)" -ForegroundColor White
    $orderId = $order.id
    $orderNumber = $order.orderNumber
} catch {
    Write-Host "  -> Failed to create order!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""

# Step 3: Wait for Tally auto-sync to complete (it fires in background)
Write-Host "[STEP 3] Waiting 5 seconds for Tally auto-sync to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 4: Check what the auto-sync logged
Write-Host "[STEP 4] Checking Tally sync activity log..." -ForegroundColor Yellow
try {
    $activities = Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/recent-activities" -Headers @{ "X-Role" = "admin" } -TimeoutSec 10
    $tallyLogs = $activities | Where-Object { $_.type -eq "tally_sync" -and $_.description -like "*$orderNumber*" }
    if ($tallyLogs) {
        foreach ($log in $tallyLogs) {
            $color = if ($log.status -eq "completed") { "Green" } else { "Red" }
            Write-Host "  -> [$($log.status)] $($log.description)" -ForegroundColor $color
        }
    } else {
        Write-Host "  -> No Tally sync log found yet for $orderNumber" -ForegroundColor DarkYellow
        Write-Host "  -> The sync may still be processing, or Tally may have an issue." -ForegroundColor DarkYellow
        Write-Host "  -> Checking ALL recent tally_sync entries..." -ForegroundColor DarkYellow
        $allTally = $activities | Where-Object { $_.type -eq "tally_sync" }
        if ($allTally) {
            foreach ($log in $allTally) {
                $color = if ($log.status -eq "completed") { "Green" } else { "Red" }
                Write-Host "    [$($log.status)] $($log.description)" -ForegroundColor $color
            }
        } else {
            Write-Host "    No tally_sync entries found in activity log at all." -ForegroundColor DarkYellow
        }
    }
} catch {
    Write-Host "  -> Could not read activity log: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 5: Manually sync advance receipt
Write-Host "[STEP 5] Manually syncing Advance Receipt (Rs 8000) to Tally..." -ForegroundColor Yellow
try {
    $syncResult = Invoke-RestMethod -Uri "http://localhost:5000/api/tally/sync-advance/$orderId" -Method POST -Headers @{ "X-Role" = "admin" } -TimeoutSec 20
    if ($syncResult.success) {
        Write-Host "  -> RECEIPT VOUCHER CREATED in Tally!" -ForegroundColor Green
        Write-Host "  -> Order: $($syncResult.orderNumber)" -ForegroundColor White
        Write-Host "  -> Amount: Rs $($syncResult.amount)" -ForegroundColor White
        Write-Host "  -> Message: $($syncResult.message)" -ForegroundColor White
    } else {
        Write-Host "  -> Sync failed: $($syncResult.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "  -> Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETE - Go check TallyPrime Day Book!" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "In TallyPrime:" -ForegroundColor White
Write-Host "  1. Gateway of Tally -> Day Book" -ForegroundColor White
Write-Host "  2. Look for Receipt voucher: Rs 8,000" -ForegroundColor White
Write-Host "  3. It should show: Cash -> Malabar Interiors" -ForegroundColor White
Write-Host ""
