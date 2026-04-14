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

export interface SalesVoucherData {
  orderNumber: string;
  dealerName: string;
  totalAmount: number;
  advancePaid: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    hsnCode?: string;
  }>;
  date?: Date;
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

    if (hasError && !created) {
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

      return { success: false, message: errorMsg, rawXml: responseText };
    }

    return {
      success: true,
      message: created ? "Voucher created successfully" : "Request processed",
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
 *  - Debits the dealer's ledger (Sundry Debtor)
 *  - Credits the Sales Account
 *  - Auto-calculates GST based on HSN codes
 */
export async function pushSalesVoucher(data: SalesVoucherData): Promise<TallyResponse> {
  const date = tallyDate(data.date);
  const dealerName = escapeXml(data.dealerName);
  const narration = escapeXml(
    `Sales Invoice for ERP Order ${data.orderNumber} — ${data.items.length} item(s)`
  );

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
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
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
              <AMOUNT>-${data.totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account - Building Materials</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${data.totalAmount}</AMOUNT>
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
