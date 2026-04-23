import { useListOrders, useCreateOrder, useUpdateOrder, useListDealers, useListProducts } from "@workspace/api-client-react";
import { Calendar, Search, Filter, ArrowRight, DownloadCloud, Plus, X, Trash2, CheckCircle2, AlertCircle, Upload, Edit, IndianRupee } from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/context/RoleContext";

interface OrderItem { productId: string; productName: string; quantity: string; unitPrice: string; }

interface OrderForm {
  dealerId: string;
  advancePaid: string;
  items: OrderItem[];
  notes: string;
  // Pricing fields
  discountAmount: string;
  shippingAmount: string;
  taxRate: string;
  taxType: "intra" | "inter";
}

const GST_RATES = [0, 5, 12, 18, 28];

const defaultForm: OrderForm = {
  dealerId: "",
  advancePaid: "",
  items: [{ productId: "", productName: "", quantity: "1", unitPrice: "" }],
  notes: "",
  discountAmount: "0",
  shippingAmount: "0",
  taxRate: "0",
  taxType: "intra",
};

const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    reserved: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dispatched: "bg-purple-100 text-purple-700 border-purple-200",
    delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };
  return styles[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

const VALID_STATUSES = ["pending", "confirmed", "reserved", "dispatched", "delivered", "cancelled"];

export default function Orders() {
  const { data, isLoading, refetch } = useListOrders({ limit: 50 });
  const { data: dealersData } = useListDealers({ limit: 200 });
  const { data: productsData } = useListProducts({ limit: 200 });
  const [isOpen, setIsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [form, setForm] = useState<OrderForm>(defaultForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { can } = useRole();

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Order created successfully!" });
        setIsOpen(false);
        setForm(defaultForm);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        const data = e?.data;
        let msg = "Failed to create order.";
        if (data?.fields && Array.isArray(data.fields) && data.fields.length > 0) {
          msg = data.fields.slice(0, 3).join(" · ");
        } else if (data?.error) {
          msg = data.error;
        } else if (e?.message) {
          msg = e.message;
        }
        setToast({ type: "error", msg });
        setTimeout(() => setToast(null), 6000);
      },
    },
  });

  const updateOrder = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Order updated!" });
        setEditingOrder(null);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to update order." });
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  // ─── Compute pricing ───────────────────────────────────────────────────────
  const subtotal = form.items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountAmount = parseFloat(form.discountAmount) || 0;
  const taxRate = parseFloat(form.taxRate) || 0;
  const shippingAmount = parseFloat(form.shippingAmount) || 0;
  const taxableAmount = subtotal - discountAmount;
  const cgstAmount = form.taxType === "intra" ? Math.round(taxableAmount * taxRate / 200 * 100) / 100 : 0;
  const sgstAmount = form.taxType === "intra" ? Math.round(taxableAmount * taxRate / 200 * 100) / 100 : 0;
  const igstAmount = form.taxType === "inter" ? Math.round(taxableAmount * taxRate / 100 * 100) / 100 : 0;
  const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount + shippingAmount;

  const handleSubmit = () => {
    if (!form.dealerId) {
      setToast({ type: "error", msg: "Please select a dealer." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const validItems = form.items.filter((item) => {
      const qty = parseInt(item.quantity);
      const price = parseFloat(item.unitPrice);
      return item.productId && qty > 0 && price > 0;
    });

    if (validItems.length === 0) {
      setToast({ type: "error", msg: "Add at least one product with valid quantity and price." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const advance = form.advancePaid ? parseFloat(form.advancePaid) : 0;

    if (advance < 0) {
      setToast({ type: "error", msg: "Advance paid cannot be negative." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (advance > grandTotal) {
      setToast({ type: "error", msg: `Advance (₹${advance.toLocaleString("en-IN")}) cannot exceed grand total.` });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    createOrder.mutate({
      data: {
        dealerId: parseInt(form.dealerId),
        advancePaid: advance,
        notes: form.notes || undefined,
        items: validItems.map((item) => ({
          productId: parseInt(item.productId),
          productName: item.productName,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
        // Pricing fields
        discountAmount: discountAmount,
        shippingAmount: shippingAmount,
        taxRate: taxRate,
        taxType: form.taxType,
        cgstAmount: cgstAmount,
        sgstAmount: sgstAmount,
        igstAmount: igstAmount,
        grandTotal: grandTotal,
      } as any,
    });
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateOrder.mutate({
      id: orderId,
      data: { status: newStatus },
    });
  };

  const handleCancelOrder = (orderId: number) => {
    if (!confirm("Cancel this order? This action cannot be undone.")) return;
    updateOrder.mutate({
      id: orderId,
      data: { status: "cancelled" },
    });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: "", productName: "", quantity: "1", unitPrice: "" }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, key: keyof OrderItem, value: string) => {
    const items = [...form.items];
    items[i] = { ...items[i], [key]: value };
    if (key === "productId") {
      const product = productsData?.items?.find((p: any) => String(p.id) === value);
      if (product) {
        items[i].productName = product.name;
        items[i].unitPrice = String(product.basePrice);
      }
    }
    setForm({ ...form, items });
  };

  const handleCSVExport = () => {
    if (!data?.items?.length) return;
    const rows = [
      ["Order No", "Dealer", "Status", "Subtotal", "GST%", "Grand Total", "Balance", "Date"],
      ...data.items.map((o: any) => [o.orderNumber, o.dealerName, o.status, o.totalAmount, o.taxRate || 0, o.grandTotal || o.totalAmount, o.balanceAmount, new Date(o.createdAt).toLocaleDateString("en-IN")]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter orders by search and status
  const filtered = data?.items?.filter((o: any) => {
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.dealerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Sales Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage dealer orders, allocations, and fulfillment.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleCSVExport} className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2">
            <DownloadCloud className="w-4 h-4" /> Export CSV
          </button>
          {can("orders") && (
            <button onClick={() => setIsOpen(true)} className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Order
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-[calc(100dvh-14rem)] sm:h-[calc(100dvh-12rem)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between bg-muted/10 shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or dealer name..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            >
              <option value="">All Statuses</option>
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Dealer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-muted rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : (
                filtered?.map((order: any) => (
                  <tr
                    key={order.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select")) return;
                      navigate(`/orders/${order.id}`);
                    }}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground font-mono">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order.dealerName}</div>
                      <div className="text-xs text-muted-foreground mt-1">{order.items?.length || 0} items</div>
                    </td>
                    <td className="px-6 py-4">
                      {can("orders") && order.status !== "cancelled" && order.status !== "delivered" ? (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-2 py-1 text-[11px] uppercase tracking-wider font-bold rounded-md border cursor-pointer ${getStatusStyle(order.status)}`}
                        >
                          {VALID_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-md border ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold">{formatCurrency(order.grandTotal || order.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {order.taxRate > 0 ? `GST ${order.taxRate}%` : ""}
                        {order.taxRate > 0 ? " · " : ""}
                        Adv: {formatCurrency(order.advancePaid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${order.balanceAmount > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                        {formatCurrency(order.balanceAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {can("orders") && order.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Cancel Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && filtered?.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No orders found matching your criteria.</div>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">New Sales Order</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Create a new order for a dealer</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Dealer <span className="text-red-500">*</span></label>
                  <select
                    value={form.dealerId}
                    onChange={(e) => setForm({ ...form, dealerId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                  >
                    <option value="">Select dealer...</option>
                    {dealersData?.items?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.dealerCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={form.advancePaid}
                    onChange={(e) => setForm({ ...form, advancePaid: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Order Items <span className="text-red-500">*</span></label>
                  <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-xl border border-border">
                      <div className="col-span-5">
                        <label className="text-xs text-muted-foreground mb-1 block">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(i, "productId", e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="">Select...</option>
                          {productsData?.items?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                          min="1"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground mb-1 block">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1 flex items-end pb-0.5">
                        <button
                          onClick={() => removeItem(i)}
                          disabled={form.items.length === 1}
                          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Tax & Pricing Section ─────────────────────────────────── */}
              <div className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-600" /> Tax & Charges
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">GST Rate (%)</label>
                    <select
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                    >
                      {GST_RATES.map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Supply Type</label>
                    <select
                      value={form.taxType}
                      onChange={(e) => setForm({ ...form, taxType: e.target.value as "intra" | "inter" })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="intra">Intra-State</option>
                      <option value="inter">Inter-State</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Discount (₹)</label>
                    <input
                      type="number"
                      value={form.discountAmount}
                      onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Shipping (₹)</label>
                    <input
                      type="number"
                      value={form.shippingAmount}
                      onChange={(e) => setForm({ ...form, shippingAmount: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Live Pricing Preview ──────────────────────────────────── */}
              {subtotal > 0 && (
                <div className="flex justify-end">
                  <div className="w-full sm:w-2/3 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {taxRate > 0 && (
                      <>
                        {form.taxType === "inter" ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IGST ({taxRate}%)</span>
                            <span className="font-medium">+{formatCurrency(igstAmount)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">CGST ({taxRate / 2}%)</span>
                              <span className="font-medium">+{formatCurrency(cgstAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">SGST ({taxRate / 2}%)</span>
                              <span className="font-medium">+{formatCurrency(sgstAmount)}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {shippingAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">+{formatCurrency(shippingAmount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-primary/20 flex justify-between">
                      <span className="font-bold text-sm">Grand Total</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                    {form.advancePaid && parseFloat(form.advancePaid) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Balance after advance</span>
                        <span>{formatCurrency(grandTotal - parseFloat(form.advancePaid || "0"))}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex gap-3">
                <button onClick={() => setIsOpen(false)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={createOrder.isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {createOrder.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><CheckCircle2 className="w-5 h-5" /> Create Order</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
