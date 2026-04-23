# Adham's ERP — Feature Testing Guide

This document provides test scenarios to verify that all implemented features work correctly.

---

## 🔰 Scenario 0: Full End-to-End Walkthrough (Start Here!)

> **This single scenario walks you through the entire system from scratch — one connected story.**
> Follow this first before running the individual tests below.
>
> 🕐 Estimated time: 15–20 minutes

---

### Chapter 1: Set Up a Warehouse with Bin Locations

**Goal:** Define where stock will physically live before receiving any goods.

**Step 1.1 — Open Warehouses**
- In the sidebar, click **Warehouses**.
- You should see your warehouse cards. If none exist, ask the admin to add one first.

**Step 1.2 — Add a Bin Location**
- On any warehouse card, click the **"Locations & Bins ▼"** toggle at the bottom.
- If the warehouse has no locations, click **"+ Add first location"**.
- Otherwise, click the global **"Add Location"** button at the top-right.
- Fill in the form exactly like this:
  ```
  Warehouse:       [Select your warehouse]
  Location Name:   Shelf A-1
  Floor:           G
  Section:         A
  Shelf #:         01
  Location Type:   Shelf
  Capacity:        500
  Notes:           Main receiving shelf
  ```
- Click **Create Location**.

✅ **What to check:** The "Shelf A-1" location appears inside the warehouse card with a `SHELF` badge and `0/500` (0%) utilization.

---

### Chapter 2: Create a Product with Landing Cost

**Goal:** Add a product and verify the backend auto-calculates its landing cost and selling price.

**Step 2.1 — Open Products**
- In the sidebar, click **Products** (or Catalogue).
- Click **Add Product** / **New Product**.

**Step 2.2 — Fill in product details**
```
Name:               Steel Flat Bar 40x5
Category:           Raw Material
Subcategory:        Steel
HSN Code:           7216
Base Price:         150
Unit:               pcs
Origin:             import
Purchase Cost:      100
Logistics Cost:     20
Additional Charges: 5
Margin (%):         20
```

- Click **Save Product**.

✅ **What to check:** The product is saved. On the product list or detail view, verify:
```
Landing Cost  = ₹125  (100 + 20 + 5)
Selling Price = ₹150  (125 × 1.20)
```
> ⚠️ If the costs show as 0, the backend calculation wasn't triggered. Re-open the product and check the fields are filled before saving.

---

### Chapter 3: Raise a Purchase Order with Photo Attachment

**Goal:** Create a PO for the product you just created, and attach a document photo/link.

**Step 3.1 — Navigate to Purchase Orders**
- Click **Purchase Orders** in the sidebar, then click **New Purchase Order**.

**Step 3.2 — Fill the PO form**
```
Supplier Name:      ABC Steel Traders
Supplier Country:   India
PO Type:            Local
Currency:           INR
Expected Delivery:  [pick a date 2 weeks from today]
Warehouse:          [Select your warehouse]
```

**Step 3.3 — Add a line item**
- Click **+ Add Item** in the line items section.
- Select `Steel Flat Bar 40x5` as the product.
- Set Quantity: `50`, Unit Price: `150`.

**Step 3.4 — Attach a document**
- Scroll down to the **📎 Photo Attachments** section.
- In the first URL input, paste:
  ```
  https://drive.google.com/file/d/example-pi-document
  ```
- Click **+ Add Another Photo URL** and paste a second link:
  ```
  https://example.com/quality-certificate.jpg
  ```

**Step 3.5 — Submit**
- Click **Submit PO**.

✅ **What to check:**
- A success toast appears confirming the PO was created.
- The PO list shows your new PO with status `pending`.
- The attachment count reads: `📎 2 attachment(s) will be saved with this PO`.

---

### Chapter 4: Receive Stock (Inward / GRN)

**Goal:** Receive inventory against the PO you just raised.

**Step 4.1 — Navigate to Inventory**
- Click **Inventory** in the sidebar.
- Click **Receive Inward** (the primary + button).

**Step 4.2 — Fill the Receive Inward form**
```
Product:         Steel Flat Bar 40x5
Warehouse:       [your warehouse]
Location:        Shelf A-1  (the bin you created in Chapter 1)
Quantity:        50
Unit Price:      150
HSN Code:        7216
Link to PO:      [select the PO from Chapter 3]
```
- Click **Confirm Receipt**.

✅ **What to check:**
- A new inventory row appears with:
  - Status: `available`
  - Quantity: `50`
  - A GRN number auto-generated (e.g., `GRN-12345678`)
- Warehouse bin "Shelf A-1" utilization should now show `50/500` (10%).

---

### Chapter 5: Create a Sales Order (Stock Reservation)

**Goal:** Place a sales order and confirm that stock gets reserved automatically.

**Step 5.1 — Navigate to Sales Orders**
- Click **Sales Orders** in the sidebar.
- Click **+ New Order**.

**Step 5.2 — Fill the order form**
```
Dealer:       [Select any dealer]
Advance Paid: ₹2000
GST Rate:     18%
Supply Type:  Intra-State
Discount:     ₹500
Shipping:     ₹200
```

**Step 5.3 — Add an order item**
- Select `Steel Flat Bar 40x5`.
- Quantity: `10`, Unit Price: `150`.

**Step 5.4 — Review the live price breakdown**
```
Subtotal:     ₹1,500
Discount:     -₹500
Taxable:      ₹1,000
CGST (9%):    ₹90
SGST (9%):    ₹90
Shipping:     ₹200
Grand Total:  ₹1,380
Balance:      ₹1,380 - ₹2,000 → (advance overpaid, expect validation error)
```
> Adjust Advance Paid to `₹500` to stay under the Grand Total.

- Click **Create Order**.

✅ **What to check:**
- Order is created with status `pending`.
- Go back to Inventory — the `Steel Flat Bar 40x5` item now shows `Reserved Qty: 10`.

---

### Chapter 6: Export Data to CSV

**Goal:** Download each dataset as a CSV file for Google Sheets / Tally.

**Step 6.1 — Export Inventory**
- Go to the **Inventory** page.
- Click **Export CSV** (top right, next to Import CSV).
- **Expected:** `inventory_export_2026-04-22.csv` downloads with all 15 columns including the new GRN row.

**Step 6.2 — Export Orders**
- Go to the **Sales Orders** page.
- Click **Export CSV**.
- **Expected:** `orders_export_2026-04-22.csv` downloads, including the order from Chapter 5.

**Step 6.3 — Export Purchase Orders**
- Go to the **Purchase Orders** page.
- Click **Export CSV**.
- **Expected:** `purchase_orders_export_2026-04-22.csv` downloads, including the PO from Chapter 3.

> ✅ **Key check:** None of these should open a blank error page. If they do, the Express route ordering fix has a problem.

---

### Chapter 7: Delete an Inventory Item (Safety Check)

**Goal:** Verify that the delete route works and correctly blocks deletion of reserved stock.

**Step 7.1 — Try to delete the reserved item**
- On the **Inventory** page, find `Steel Flat Bar 40x5` (which has `Reserved Qty: 10`).
- Click the **🗑 Trash** icon.
- **Expected:** The server rejects it with an error message like *"Cannot delete item with active reservations"*.

**Step 7.2 — Receive a new item to delete**
- Click **Receive Inward** and add a small dummy item:
  ```
  Product:    [any product]
  Quantity:   1
  ```
- Find this new item in the list (it will have `Reserved Qty: 0`).
- Click the **🗑 Trash** icon → confirm.

✅ **What to check:** The item disappears immediately with a success toast. Previously, this would throw a `404 Not Found` error in the browser console.

---

### ✅ End-to-End Summary

| Chapter | Feature Tested | Expected Outcome |
|---------|---------------|------------------|
| 1 | Warehouse Location Management UI | Bin created, shows in card with utilization |
| 2 | Landing Cost Auto-Calc (Backend) | Server computes ₹125 landing cost, ₹150 selling price |
| 3 | PO Photo Attachments | 2 URLs stored with PO as `url1 \| url2` |
| 4 | GRN + Inventory Inward | GRN auto-generated, stock shows as available |
| 5 | Sales Order + Reservation | Stock reserved, balance calculated correctly |
| 6 | CSV Exports (3 pages) | 3 CSV files download without errors |
| 7 | Inventory DELETE Safety | Reserved items blocked; unreserved items delete cleanly |

---

## Individual Feature Tests

> Use these quick tests if you want to verify a single feature in isolation.

---

### Test 1: Warehouse Location Management UI
**Objective:** Verify that users can create and view locations/bins within a warehouse.

1. Navigate to the **Warehouses** page from the sidebar.
2. Locate any active warehouse card and click the **Locations & Bins** dropdown at the bottom of the card.
3. Click the **+ Add Location** button (either in the empty state or the list).
4. Fill out the "Add Warehouse Location" form:
   - **Warehouse:** Select the warehouse.
   - **Location Name:** e.g., "Shelf A-1"
   - **Floor:** "1", **Section:** "A", **Shelf #:** "01"
   - **Location Type:** "Shelf"
   - **Capacity:** "500"
5. Click **Create Location**.
6. **Expected Result:** A success toast appears. The new location immediately shows up under the warehouse card with a "SHELF" badge, showing `0/500` used capacity (0% utilization).

---

### Test 2: Landing Cost Auto-Calculation (Backend)
**Objective:** Verify that the server automatically computes `landingCost` and `sellingPrice`.

1. Navigate to the **Products** page.
2. Click **Add Product** (or edit an existing one).
3. Fill in the basic mandatory details (Name, Category, Base Price, HSN, etc.).
4. In the **Cost & Pricing** section:
   - Enter **Purchase Cost:** `100`
   - Enter **Logistics Cost:** `20`
   - Enter **Additional Charges:** `5`
   - Enter **Margin (%):** `20`
5. Click **Save Product**.
6. **Expected Result:** The product saves successfully. If you edit the product again or check the database, the server should have correctly calculated:
   - `Landing Cost = 125` (100 + 20 + 5)
   - `Selling Price = 150` (125 + 20% margin)

---

### Test 3: PO Photo Attachments
**Objective:** Verify that multiple photo/document URLs can be attached to a Purchase Order.

1. Navigate to **Purchase Orders** and click **New Purchase Order**.
2. Fill in the required fields (Supplier, Product items).
3. Scroll down to the **Photo Attachments** section.
4. Paste a dummy image URL (e.g., `https://example.com/invoice1.jpg`).
5. Click **+ Add Another Photo URL** and add a second link.
6. Click **Save Draft** or **Submit PO**.
7. **Expected Result:** The PO is created successfully. The `attachmentUrl` field in the database should contain both URLs joined by a pipe ` | ` separator.

---

### Test 4: CSV Data Exports
**Objective:** Verify that the "Export CSV" buttons successfully download data from the backend.

1. **Inventory Export:**
   - Navigate to the **Inventory** page.
   - Click the **Export CSV** button in the top right.
   - **Expected Result:** A file named `inventory_export_YYYY-MM-DD.csv` downloads containing your inventory data.

2. **Orders Export:**
   - Navigate to the **Sales Orders** page.
   - Click the **Export CSV** button.
   - **Expected Result:** A file named `orders_export_YYYY-MM-DD.csv` downloads containing order records.

3. **Purchase Orders Export:**
   - Navigate to the **Purchase Orders** page.
   - Click the **Export CSV** button.
   - **Expected Result:** A file named `purchase_orders_export_YYYY-MM-DD.csv` downloads.

*(Note: Verify that downloading works without taking you to a "Cannot GET /api/.../:id" error page, which confirms our route ordering fix worked!)*

---

### Test 5: Inventory DELETE Route Fix
**Objective:** Verify that inventory items can be deleted without triggering a `404 Not Found` error.

1. Navigate to the **Inventory** page.
2. Find an item that has **0 Reserved Quantity**. (If needed, create a quick dummy inward receipt).
3. Click the **Trash (Delete)** icon on that inventory row.
4. Confirm the deletion prompt.
5. **Expected Result:** A success toast appears saying "Item deleted successfully", and the item disappears from the list. (Previously, this would throw a 404 error in the console).
6. **Bonus Check:** Try to delete an item that has an active `reservedQuantity` > 0. The server should reject it with an error stating it cannot delete reserved stock.
