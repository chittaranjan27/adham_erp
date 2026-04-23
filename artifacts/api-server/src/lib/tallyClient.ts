/**
 * Tally Prime XML API Client
 * 
 * Sends XML payloads to Tally Prime's built-in HTTP server to sync
 * financial data between Adham ERP and Tally.
 * 
 * Prerequisites:
 *   1. Tally Prime must be running with Server mode enabled (F12 → Advanced)
 *   2. Port must match TALLY_PORT (default 9000)
 *   3. Company "Adhams Building Solutions" must be open in Tally
 */

// ─── Configuration ─────────────────────────────────────────────────────────────

const TALLY_HOST = process.env.TALLY_HOST ?? "localhost";
const TALLY_PORT = process.env.TALLY_PORT ?? "9000";
const TALLY_COMPANY = process.env.TALLY_COMPANY ?? "Adhams Building Solutions";
const TALLY_URL = `http://${TALLY_HOST}:${TALLY_PORT}`;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TallyResponse {
  success: boolean;
  message: string;
  rawXml?: string;
}

export interface OrderPricingData {
  subtotal: number;        // sum of item line totals (before discount/tax)
  discountAmount: number;  // order-level discount
  taxRate: number;         // GST rate % (e.g. 18)
  taxType: "intra" | "inter";  // intra = CGST+SGST, inter = IGST
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  shippingAmount: number;
  grandTotal: number;      // final billable amount
}

export interface SalesVoucherData {
  orderNumber: string;
  dealerName: string;
  totalAmount: number;
  advancePaid: number;
  pricing?: OrderPricingData;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    hsnCode?: string;
  }>;
  date?: Date;
  action?: "Create" | "Alter";
}

export interface PurchaseVoucherData {
  poNumber: string;
  supplierName: string;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    hsnCode?: string;
  }>;
  date?: Date;
}

export interface ReceiptVoucherData {
  orderNumber: string;
  dealerName: string;
  amount: number;
  paymentReference?: string;
  date?: Date;
}

export interface SalesOrderData {
  orderNumber: string;
  dealerName: string;
  totalAmount: number;
  advancePaid: number;
  pricing?: OrderPricingData;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  date?: Date;
  action?: "Create" | "Alter";
}

export interface CancelVoucherData {
  voucherNumber: string;
  voucherType: "Sales" | "Sales Order" | "Receipt" | "Purchase";
  dealerName: string;
  totalAmount: number;
  reason?: string;
  date?: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Format date for Tally XML (YYYYMMDD) */
function tallyDate(date?: Date): string {
  const d = date ?? new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Send raw XML payload to Tally and return the response */
async function sendToTally(xmlPayload: string): Promise<TallyResponse> {
  try {
    console.log(`[Tally] Sending request to ${TALLY_URL}...`);
    const response = await fetch(TALLY_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xmlPayload,
      signal: AbortSignal.timeout(15_000), // 15s timeout
    });

    const responseText = await response.text();

    // Tally returns XML — check for common success/error patterns
    const hasError =
      responseText.includes("<LINEERROR>") ||
      responseText.includes("<ERRORS>") ||
      responseText.includes("Cannot");
    const created =
      responseText.includes("Created") ||
      responseText.includes("<CREATED>1</CREATED>");
    const altered =
      responseText.includes("Altered") ||
      responseText.includes("<ALTERED>1</ALTERED>");
    const cancelled =
      responseText.includes("Cancelled") ||
      responseText.includes("<CANCELLED>1</CANCELLED>");
    const deleted =
      responseText.includes("Deleted") ||
      responseText.includes("<DELETED>1</DELETED>");

    const isSuccess = created || altered || cancelled || deleted;

    if (hasError && !isSuccess) {
      // Extract error message from XML
      const errorMatch = responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
      const errorsMatch = responseText.match(/<ERRORS>(.*?)<\/ERRORS>/);
      let errorMsg =
        errorMatch?.[1] ?? errorsMatch?.[1] ?? "Unknown Tally error";

      // Unescape XML entities Tally might have used in the error message
      errorMsg = errorMsg
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      console.log(`[Tally] Error: ${errorMsg}`);
      return { success: false, message: errorMsg, rawXml: responseText };
    }

    let message = "Request processed";
    if (created) message = "Voucher created successfully";
    else if (altered) message = "Voucher altered successfully";
    else if (cancelled) message = "Voucher cancelled successfully";
    else if (deleted) message = "Voucher deleted successfully";

    console.log(`[Tally] Success: ${message}`);
    return {
      success: true,
      message,
      rawXml: responseText,
    };
  } catch (err: any) {
    // Connection refused = Tally not running
    if (err.code === "ECONNREFUSED" || err.cause?.code === "ECONNREFUSED") {
      return {
        success: false,
        message: `Cannot connect to Tally Prime at ${TALLY_URL}. Is Tally running with Server mode enabled?`,
      };
    }
    // Timeout
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return {
        success: false,
        message: `Tally request timed out after 15 seconds`,
      };
    }
    return {
      success: false,
      message: `Tally connection error: ${err.message ?? err}`,
    };
  }
}

// ─── Auto-create GST & Pricing Ledgers ──────────────────────────────────────────

/**
 * Required ledgers for tax-aware vouchers.
 * Each entry: [ledgerName, parentGroup, taxType]
 */
const REQUIRED_LEDGERS: Array<{ name: string; parent: string; taxType?: string; taxRate?: number }> = [
  { name: "Output CGST",           parent: "Duties & Taxes", taxType: "GST", taxRate: 0 },
  { name: "Output SGST",           parent: "Duties & Taxes", taxType: "GST", taxRate: 0 },
  { name: "Output IGST",           parent: "Duties & Taxes", taxType: "GST", taxRate: 0 },
  { name: "Discount Allowed",      parent: "Indirect Expenses" },
  { name: "Freight & Shipping",    parent: "Direct Expenses" },
];

let _ledgersEnsured = false;

/**
 * Ensure all required GST and pricing ledgers exist in Tally.
 * This runs once per server lifecycle (cached after first success).
 */
export async function ensureTallyLedgers(): Promise<void> {
  if (_ledgersEnsured) return;

  console.log("[Tally] Ensuring required ledgers exist...");

  for (const ledger of REQUIRED_LEDGERS) {
    const isTax = ledger.taxType === "GST";
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">
            <NAME>${escapeXml(ledger.name)}</NAME>
            <PARENT>${escapeXml(ledger.parent)}</PARENT>
            ${isTax ? `<TAXTYPE>GST</TAXTYPE>
            <GSTDUTYHEAD>${escapeXml(ledger.name)}</GSTDUTYHEAD>` : ""}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    const result = await sendToTally(xml);
    if (result.success) {
      console.log(`[Tally] ✓ Ledger created: ${ledger.name}`);
    } else if (result.message.includes("already exists") || result.message.includes("Duplicate")) {
      console.log(`[Tally] ✓ Ledger already exists: ${ledger.name}`);
    } else {
      // Non-fatal — log and continue
      console.log(`[Tally] ⚠ Could not create ledger ${ledger.name}: ${result.message}`);
    }
  }

  _ledgersEnsured = true;
  console.log("[Tally] Ledger setup complete.");
}

// ─── Tax Ledger Entry Builder ───────────────────────────────────────────────────

/**
 * Build the XML ledger entries for taxes, discount, and shipping.
 * Returns a string of ALLLEDGERENTRIES.LIST blocks to splice into the voucher.
 */
function buildPricingLedgerEntries(pricing: OrderPricingData): string {
  const entries: string[] = [];

  // Discount (reduces the receivable — positive amount = credit)
  if (pricing.discountAmount > 0) {
    entries.push(`
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Discount Allowed</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${pricing.discountAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
  }

  // Tax entries
  if (pricing.taxType === "inter" && pricing.igstAmount > 0) {
    // Inter-state: IGST only
    entries.push(`
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output IGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${pricing.igstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
  } else {
    // Intra-state: CGST + SGST
    if (pricing.cgstAmount > 0) {
      entries.push(`
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${pricing.cgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
    }
    if (pricing.sgstAmount > 0) {
      entries.push(`
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${pricing.sgstAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
    }
  }

  // Shipping / Freight
  if (pricing.shippingAmount > 0) {
    entries.push(`
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Freight &amp; Shipping</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${pricing.shippingAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
  }

  return entries.join("\n");
}

// ─── Health Check ───────────────────────────────────────────────────────────────

/** Test connectivity to Tally and return company info */
export async function checkTallyConnection(): Promise<TallyResponse> {
  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  const result = await sendToTally(xml);
  if (result.success && result.rawXml) {
    result.message = "Connected to Tally Prime successfully";
  } else if (result.rawXml && (result.rawXml.includes("Could not find Report") || result.rawXml.includes("LINEERROR"))) {
    result.success = true;
    result.message = "Connected to Tally Prime successfully";
  }
  return result;
}

// ─── Sales Voucher (Order Delivered) ────────────────────────────────────────────

/**
 * Push a Sales Invoice to Tally when an order is marked as "delivered".
 * 
 * This creates a voucher in Tally that:
 *  - Debits the dealer's ledger (Sundry Debtor) with the grand total
 *  - Credits the Sales Account with the taxable amount (subtotal - discount)
 *  - Credits CGST/SGST or IGST ledgers for tax
 *  - Credits Freight & Shipping for shipping charges
 *  - Auto-calculates GST based on HSN codes
 */
export async function pushSalesVoucher(data: SalesVoucherData): Promise<TallyResponse> {
  // Ensure GST ledgers exist before creating the voucher
  await ensureTallyLedgers();

  const date = tallyDate(data.date);
  const dealerName = escapeXml(data.dealerName);
  const pricing = data.pricing;
  const narration = escapeXml(
    `Sales Invoice for ERP Order ${data.orderNumber} — ${data.items.length} item(s)${pricing ? ` · GST ${pricing.taxRate}%` : ""}`
  );

  // The amount the party (dealer) owes = grand total (or totalAmount if no pricing)
  const partyAmount = pricing?.grandTotal ?? data.totalAmount;
  // The sales account amount = taxable value (subtotal - discount), or totalAmount if no pricing
  const salesAmount = pricing
    ? (pricing.subtotal - pricing.discountAmount)
    : data.totalAmount;

  // Build inventory entries for each line item
  const inventoryEntries = data.items
    .map((item) => {
      const productName = escapeXml(item.productName);
      const totalPrice = item.quantity * item.unitPrice;
      return `
              <ALLINVENTORYENTRIES.LIST>
                <STOCKITEMNAME>${productName}</STOCKITEMNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <RATE>${item.unitPrice}/pcs</RATE>
                <AMOUNT>${totalPrice}</AMOUNT>
                <ACTUALQTY>${item.quantity} pcs</ACTUALQTY>
                <BILLEDQTY>${item.quantity} pcs</BILLEDQTY>
                <BATCHALLOCATIONS.LIST>
                  <GODOWNNAME>Malappuram Central (MPM)</GODOWNNAME>
                  <AMOUNT>${totalPrice}</AMOUNT>
                  <ACTUALQTY>${item.quantity} pcs</ACTUALQTY>
                  <BILLEDQTY>${item.quantity} pcs</BILLEDQTY>
                </BATCHALLOCATIONS.LIST>
              </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("\n");

  // Build pricing ledger entries (tax, discount, shipping)
  const pricingEntries = pricing ? buildPricingLedgerEntries(pricing) : "";

  const remoteId = `ADHAM-ERP-SALE-${escapeXml(data.orderNumber)}`;

  const buildXml = (action: string) => `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${remoteId}" VCHTYPE="Sales" ACTION="${action}" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.orderNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${dealerName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <NARRATION>${narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${dealerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${partyAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account - Building Materials</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${salesAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            ${pricingEntries}
            ${inventoryEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  if (data.action === "Alter") {
    // Strategy: Delete old voucher then re-create with fresh data.
    // This is the most reliable approach for Tally integrations because
    // Alter requires exact REMOTEID/GUID matching which can be fragile.
    console.log(`[Tally] Updating Sales Voucher ${data.orderNumber} — delete + re-create strategy`);
    const deleteXml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${remoteId}" VCHTYPE="Sales" ACTION="Delete">
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.orderNumber)}</VOUCHERNUMBER>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
    const delRes = await sendToTally(deleteXml);
    console.log(`[Tally] Delete result for ${data.orderNumber}: ${delRes.success ? 'OK' : delRes.message}`);
    // Whether delete succeeded or not (voucher may not exist yet), create fresh
    const createRes = await sendToTally(buildXml("Create"));
    return createRes;
  }

  return sendToTally(buildXml("Create"));
}

// ─── Purchase Voucher (GRN Accepted) ────────────────────────────────────────────

/**
 * Push a Purchase Invoice to Tally when a GRN is accepted and released.
 * 
 * This creates a voucher that:
 *  - Credits the supplier's ledger (Sundry Creditor)
 *  - Debits the Purchase Account
 */
export async function pushPurchaseVoucher(data: PurchaseVoucherData): Promise<TallyResponse> {
  const date = tallyDate(data.date);
  const supplierName = escapeXml(data.supplierName);
  const narration = escapeXml(
    `Purchase against PO ${data.poNumber} — ${data.items.length} item(s)`
  );

  const inventoryEntries = data.items
    .map((item) => {
      const productName = escapeXml(item.productName);
      const totalPrice = item.quantity * item.unitPrice;
      return `
              <ALLINVENTORYENTRIES.LIST>
                <STOCKITEMNAME>${productName}</STOCKITEMNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <RATE>${item.unitPrice}/pcs</RATE>
                <AMOUNT>-${totalPrice}</AMOUNT>
                <ACTUALQTY>${item.quantity} pcs</ACTUALQTY>
                <BILLEDQTY>${item.quantity} pcs</BILLEDQTY>
              </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("\n");

  const grandTotal = data.totalAmount + data.taxAmount + data.shippingAmount;

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.poNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${supplierName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            <NARRATION>${narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${supplierName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${grandTotal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Purchase Account - Local</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${data.totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            ${inventoryEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  return sendToTally(xml);
}

// ─── Receipt Voucher (Advance Payment) ──────────────────────────────────────────

/**
 * Push a Receipt Voucher to Tally when advance payment is recorded on an order.
 */
export async function pushReceiptVoucher(data: ReceiptVoucherData): Promise<TallyResponse> {
  const date = tallyDate(data.date);
  const dealerName = escapeXml(data.dealerName);
  const narration = escapeXml(
    `Advance payment received for order ${data.orderNumber}${data.paymentReference ? ` — Ref: ${data.paymentReference}` : ""}`
  );

  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
            <NARRATION>${narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Cash</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${data.amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${dealerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${data.amount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  return sendToTally(xml);
}

// ─── Fetch Outstanding Balance from Tally ───────────────────────────────────────

/**
 * Query Tally for a dealer's outstanding balance.
 * Useful for syncing credit limits back into the ERP.
 */
export async function getDealerOutstanding(dealerName: string): Promise<{
  success: boolean;
  balance?: number;
  message: string;
}> {
  const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
          <LEDGERNAME>${escapeXml(dealerName)}</LEDGERNAME>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  const result = await sendToTally(xml);
  if (!result.success) return { success: false, message: result.message };

  // Extract closing balance from response
  const balanceMatch = result.rawXml?.match(/<CLOSINGBALANCE>(.*?)<\/CLOSINGBALANCE>/);
  const balance = balanceMatch ? parseFloat(balanceMatch[1]) : undefined;

  return {
    success: true,
    balance,
    message: balance !== undefined
      ? `Outstanding: ₹${balance.toLocaleString("en-IN")}`
      : "Balance not found in response",
  };
}

// ─── Sales Order Voucher (Order Created) ────────────────────────────────────────

/**
 * Push a Sales Order to Tally when a new order is placed.
 *
 * Sales Orders in Tally are non-financial tracking vouchers — they don't
 * affect ledger balances but appear in the Order Book and pending orders
 * report. When the order is later delivered, a separate Sales Invoice
 * is pushed (via pushSalesVoucher) to record the actual financial impact.
 *
 * Now includes full pricing breakdown: taxes, discounts, and shipping.
 */
export async function pushSalesOrderVoucher(data: SalesOrderData): Promise<TallyResponse> {
  // Ensure GST ledgers exist before creating the voucher
  await ensureTallyLedgers();

  const date = tallyDate(data.date);
  const dealerName = escapeXml(data.dealerName);
  const pricing = data.pricing;

  const narration = escapeXml(
    `ERP Order ${data.orderNumber} — ${data.items.length} item(s) — Total: ${pricing?.grandTotal ?? data.totalAmount}${data.advancePaid > 0 ? ` (advance: ${data.advancePaid})` : ""}${pricing?.taxRate ? ` · GST ${pricing.taxRate}%` : ""}`
  );

  const remoteId = `ADHAM-ERP-ORD-${escapeXml(data.orderNumber)}`;

  // The amount the party (dealer) owes = grand total
  const partyAmount = pricing?.grandTotal ?? data.totalAmount;
  // The sales account amount = taxable value (subtotal - discount)
  const salesAmount = pricing
    ? (pricing.subtotal - pricing.discountAmount)
    : data.totalAmount;

  // Build pricing ledger entries (tax, discount, shipping)
  const pricingEntries = pricing ? buildPricingLedgerEntries(pricing) : "";

  const buildXml = (action: string) => `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${remoteId}" VCHTYPE="Sales" ACTION="${action}" OBJVIEW="Accounting Voucher View">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.orderNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${dealerName}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <NARRATION>${narration}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${dealerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${partyAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account - Building Materials</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${salesAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            ${pricingEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  if (data.action === "Alter") {
    // Strategy: Delete old voucher then re-create with fresh data.
    console.log(`[Tally] Updating Sales Order ${data.orderNumber} — delete + re-create strategy`);
    const deleteXml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${remoteId}" VCHTYPE="Sales" ACTION="Delete">
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.orderNumber)}</VOUCHERNUMBER>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
    const delRes = await sendToTally(deleteXml);
    console.log(`[Tally] Delete result for ${data.orderNumber}: ${delRes.success ? 'OK' : delRes.message}`);
    // Whether delete succeeded or not (voucher may not exist yet), create fresh
    const createRes = await sendToTally(buildXml("Create"));
    return createRes;
  }

  return sendToTally(buildXml("Create"));
}

// ─── Cancel / Reverse a Tally Voucher ───────────────────────────────────────────

/**
 * Cancel or reverse a voucher in Tally when an order is cancelled.
 *
 * Strategy:
 *   1. First attempts to DELETE the original voucher (works for Sales Orders
 *      and non-posted vouchers).
 *   2. If deletion fails (e.g. already posted), falls back to creating a
 *      Credit Note that zeroes out the financial impact.
 *
 * This two-step approach ensures cancellation works regardless of what
 * state the voucher is in inside Tally.
 */
export async function cancelTallyVoucher(data: CancelVoucherData): Promise<TallyResponse> {
  const date = tallyDate(data.date);
  const dealerName = escapeXml(data.dealerName);
  const reason = escapeXml(data.reason ?? `Cancelled from ERP — order ${data.voucherNumber}`);

  // ── Attempt 1: Delete the original voucher ──────────────────────────────────
  const deleteXml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${escapeXml(data.voucherType)}" ACTION="Delete">
            <VOUCHERTYPENAME>${escapeXml(data.voucherType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(data.voucherNumber)}</VOUCHERNUMBER>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  const deleteResult = await sendToTally(deleteXml);
  if (deleteResult.success) {
    return {
      success: true,
      message: `${data.voucherType} voucher ${data.voucherNumber} deleted from Tally`,
      rawXml: deleteResult.rawXml,
    };
  }

  // ── Attempt 2: Create a Credit Note to reverse the financial impact ─────────
  const creditNoteXml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(TALLY_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Credit Note" ACTION="Create">
            <DATE>${date}</DATE>
            <VOUCHERTYPENAME>Credit Note</VOUCHERTYPENAME>
            <VOUCHERNUMBER>CN-${escapeXml(data.voucherNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${dealerName}</PARTYLEDGERNAME>
            <NARRATION>${reason}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${dealerName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${data.totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account - Building Materials</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${data.totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  const creditResult = await sendToTally(creditNoteXml);
  if (creditResult.success) {
    return {
      success: true,
      message: `Credit Note CN-${data.voucherNumber} created in Tally (original could not be deleted: ${deleteResult.message})`,
      rawXml: creditResult.rawXml,
    };
  }

  // Both attempts failed
  return {
    success: false,
    message: `Could not cancel voucher in Tally. Delete: ${deleteResult.message}. Credit Note: ${creditResult.message}`,
    rawXml: creditResult.rawXml,
  };
}
