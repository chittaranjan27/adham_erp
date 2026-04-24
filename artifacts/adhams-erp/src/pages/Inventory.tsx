import { useState, useRef } from "react";
import { useListInventory, useListProducts, useListWarehouses, useCreateInventoryItem, ListInventoryStatus, customFetch } from "@workspace/api-client-react";
import { Search, Filter, Plus, ScanLine, MoreVertical, CheckCircle2, XCircle, Warehouse, Upload, AlertCircle, X, ClipboardList, Lock, Edit, Trash2, Download, ShieldCheck, ShieldX } from "lucide-react";
import barcodeImg from "@assets/Barcode_scanning_1774437524977.png";
import { useRole } from "@/context/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

interface InwardForm {
  productId: string;
  warehouseId: string;
  quantity: string;
  unitPrice: string;
  hsnCode: string;
  grossWeight: string;
  landingCost: string;
  margin: string;
}

const defaultForm: InwardForm = {
  productId: "", warehouseId: "", quantity: "", unitPrice: "", hsnCode: "", grossWeight: "",
  landingCost: "", margin: "",
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListInventoryStatus | undefined>();
  const { data, isLoading, refetch } = useListInventory({ status: statusFilter, limit: 50 });
  const { data: productsData } = useListProducts({ limit: 200 });
  const { data: warehousesData } = useListWarehouses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState<InwardForm>(defaultForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = useRole();

  // QC Decision modal state
  const [qcItem, setQcItem] = useState<any>(null);
  const [qcDecision, setQcDecision] = useState<"accept" | "reject" | null>(null);
  const [qcReason, setQcReason] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [qcSubmitting, setQcSubmitting] = useState(false);

  const handleQcSubmit = async () => {
    if (!qcItem || !qcDecision) return;
    if (qcDecision === "reject" && !qcReason.trim()) {
      setToast({ type: "error", msg: "Rejection reason is required when failing QC." });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setQcSubmitting(true);
    try {
      await customFetch(`/api/inventory/qc/${qcItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: qcDecision, rejectionReason: qcReason || undefined, notes: qcNotes || undefined }),
      });
      setToast({ type: "success", msg: qcDecision === "accept" ? `✅ QC Passed — ${qcItem.productName} is now available for sale.` : `⚠️ QC Failed — ${qcItem.productName} has been quarantined.` });
      setQcItem(null); setQcDecision(null); setQcReason(""); setQcNotes("");
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to submit QC decision." });
      setTimeout(() => setToast(null), 4000);
    }
    setQcSubmitting(false);
  };

  const handleDeleteItem = async (id: number, name: string) => {
    if (!confirm(`Delete inventory item "${name}"? This cannot be undone.`)) return;
    try {
      await customFetch(`/api/inventory/${id}`, { method: "DELETE" });
      setToast({ type: "success", msg: `"${name}" removed from inventory.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to delete item." });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await customFetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setToast({ type: "success", msg: `Status updated to ${newStatus}.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to update status." });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const createInventory = useCreateInventoryItem({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Inventory item received successfully!" });
        setIsAddModalOpen(false);
        setForm(defaultForm);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to add inventory item." });
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":   return "bg-green-100 text-green-700 border-green-200";
      case "reserved":    return "bg-blue-100 text-blue-700 border-blue-200";
      case "quarantined": return "bg-red-100 text-red-700 border-red-200";
      case "in_transit":  return "bg-orange-100 text-orange-700 border-orange-200";
      case "pending_qc":  return "bg-purple-100 text-purple-700 border-purple-200";
      default:            return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleSubmit = () => {
    if (!form.productId || !form.warehouseId || !form.quantity || !form.unitPrice) {
      setToast({ type: "error", msg: "Product, Warehouse, Quantity and Unit Price are required." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const selectedProduct = productsData?.items?.find((p: any) => String(p.id) === form.productId);

    const lc = form.landingCost ? parseFloat(form.landingCost) : undefined;
    const mg = form.margin ? parseFloat(form.margin) : undefined;
    const sp = lc != null && mg != null ? lc * (1 + mg / 100) : undefined;

    createInventory.mutate({
      data: {
        productId: parseInt(form.productId),
        warehouseId: parseInt(form.warehouseId),
        quantity: parseInt(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        hsnCode: form.hsnCode || selectedProduct?.hsnCode || undefined,
        grossWeight: form.grossWeight ? parseFloat(form.grossWeight) : undefined,
      },
    } as any);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split("\n").slice(1).filter(Boolean);
      let ok = 0;
      for (const row of rows) {
        const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const [productId, warehouseId, quantity, unitPrice, hsnCode, grossWeight] = cols;
        if (!productId || !warehouseId || !quantity || !unitPrice) continue;
        try {
          await createInventory.mutateAsync({
            data: {
              productId: parseInt(productId),
              warehouseId: parseInt(warehouseId),
              quantity: parseInt(quantity),
              unitPrice: parseFloat(unitPrice),
              hsnCode: hsnCode || undefined,
              grossWeight: grossWeight ? parseFloat(grossWeight) : undefined,
            },
          });
          ok++;
        } catch {}
      }
      setToast({ type: "success", msg: `${ok} inventory items imported from CSV.` });
      refetch();
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Inventory Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track and manage your products across all warehouses.</p>
        </div>
        {can("inventory") && (
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button
              onClick={() => window.open("/api/inventory/export/csv", "_blank")}
              className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2">
              <ScanLine className="w-4 h-4" /> Scan Barcode
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Receive Inward
            </button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by barcode, product, or category..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="bg-background border border-border text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter((e.target.value || undefined) as ListInventoryStatus)}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="quarantined">Quarantined</option>
              <option value="in_transit">In Transit</option>
              <option value="pending_qc">Pending QC</option>
            </select>
            <button className="p-2 border border-border bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Barcode / GRN</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4 text-right">Total Qty</th>
                <th className="px-6 py-4 text-right">Saleable</th>
                <th className="px-6 py-4 text-right">Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-48"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-muted rounded-full mx-auto"></div></td>
                  </tr>
                ))
              ) : (
                data?.items?.map((item: any) => {
                  const saleableQty = item.saleableQuantity ?? item.quantity;
                  const reservedQty = item.reservedQuantity ?? 0;
                  const grnNumber = item.grnNumber;
                  const reservedUntil = item.reservedUntil ? new Date(item.reservedUntil) : null;
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-medium text-slate-600">{item.barcode}</div>
                        {grnNumber && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <ClipboardList className="w-3 h-3" />
                            <span className="font-mono">{grnNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{item.productName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5 text-muted-foreground" /><span>{item.warehouseName}</span></div>
                        <div className="text-xs text-muted-foreground mt-0.5">Bin: {item.binLocation || "Unassigned"}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold">{item.quantity}</div>
                        {reservedQty > 0 && <div className="text-xs text-blue-600 flex items-center justify-end gap-0.5 mt-0.5"><Lock className="w-2.5 h-2.5" />{reservedQty} reserved</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`font-semibold ${saleableQty === 0 ? "text-red-600" : saleableQty < 10 ? "text-amber-600" : "text-emerald-700"}`}>
                          {saleableQty}
                        </div>
                        {reservedUntil && <div className="text-xs text-muted-foreground">until {reservedUntil.toLocaleDateString("en-IN")}</div>}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(item.totalValue)}</td>
                      <td className="px-6 py-4">
                        {can("inventory") ? (
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full border cursor-pointer ${getStatusColor(item.status)}`}
                          >
                            <option value="available">Available</option>
                            <option value="reserved">Reserved</option>
                            <option value="quarantined">Quarantined</option>
                            <option value="in_transit">In Transit</option>
                            <option value="pending_qc">Pending QC</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full border ${getStatusColor(item.status)}`}>
                            {item.status.replace("_", " ")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.status === "pending_qc" && can("inventory") && (
                            <button
                              onClick={() => { setQcItem(item); setQcDecision(null); setQcReason(""); setQcNotes(""); }}
                              className="px-2.5 py-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5" title="QC Decision"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> QC Decision
                            </button>
                          )}
                          {can("inventory") && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.productName)}
                              className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {!isLoading && data?.items?.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <p>No inventory items found matching the criteria.</p>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Showing {data?.items?.length || 0} of {data?.total || 0} entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50" disabled>Prev</button>
            <button className="px-3 py-1 border border-border rounded bg-primary text-primary-foreground">1</button>
            <button className="px-3 py-1 border border-border rounded hover:bg-muted">Next</button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">Receive Inward Inventory</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Log incoming stock into the warehouse</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <img src={barcodeImg} alt="Scan Barcode" className="w-full h-28 object-cover rounded-xl border border-border opacity-80" />
                <p className="text-xs text-center text-muted-foreground">Scan physical barcode to auto-fill details</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Product <span className="text-red-500">*</span></label>
                  <select
                    value={form.productId}
                    onChange={(e) => {
                      const p = productsData?.items?.find((x: any) => String(x.id) === e.target.value);
                      setForm({ ...form, productId: e.target.value, hsnCode: p?.hsnCode || form.hsnCode });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                  >
                    <option value="">Select product...</option>
                    {productsData?.items?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Warehouse <span className="text-red-500">*</span></label>
                  <select
                    value={form.warehouseId}
                    onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                  >
                    <option value="">Select warehouse...</option>
                    {warehousesData?.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name} — {w.city}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity Received <span className="text-red-500">*</span></label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0" min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Unit Price (₹) <span className="text-red-500">*</span></label>
                <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">HSN Code</label>
                <input type="text" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                  placeholder="Auto-filled from product" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Gross Weight (kg)</label>
                <input type="number" value={form.grossWeight} onChange={(e) => setForm({ ...form, grossWeight: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.0" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Landing Cost (₹)</label>
                <input type="number" value={form.landingCost} onChange={(e) => setForm({ ...form, landingCost: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00" min="0" step="0.01" />
                <p className="text-xs text-muted-foreground mt-1">Purchase + freight + duties</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Margin %</label>
                <input type="number" value={form.margin} onChange={(e) => setForm({ ...form, margin: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0" min="0" max="100" step="0.1" />
                {(() => {
                  const lc = parseFloat(form.landingCost);
                  const mg = parseFloat(form.margin);
                  if (!isNaN(lc) && lc > 0 && !isNaN(mg) && mg >= 0) {
                    const sp = lc * (1 + mg / 100);
                    return (
                      <p className="text-xs mt-1 font-medium text-green-700">
                        Selling price: ₹{sp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                    );
                  }
                  return <p className="text-xs text-muted-foreground mt-1">Enter landing cost to preview</p>;
                })()}
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex gap-3">
                <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={createInventory.isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {createInventory.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5" /> Save to Inventory</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ QC Decision Modal ══════ */}
      {qcItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold font-display">QC Decision</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{qcItem.productName} — {qcItem.barcode}</p>
              <p className="text-xs text-muted-foreground mt-1">Qty: {qcItem.quantity} · Warehouse: {qcItem.warehouseName}</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Decision buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setQcDecision("accept")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${qcDecision === "accept" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "border-border hover:border-emerald-300 hover:bg-emerald-50/50"}`}
                >
                  <ShieldCheck className={`w-8 h-8 ${qcDecision === "accept" ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold ${qcDecision === "accept" ? "text-emerald-700" : "text-foreground"}`}>Pass QC</span>
                  <span className="text-[10px] text-muted-foreground">Stock becomes available</span>
                </button>
                <button
                  onClick={() => setQcDecision("reject")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${qcDecision === "reject" ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-border hover:border-red-300 hover:bg-red-50/50"}`}
                >
                  <ShieldX className={`w-8 h-8 ${qcDecision === "reject" ? "text-red-600" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold ${qcDecision === "reject" ? "text-red-700" : "text-foreground"}`}>Fail QC</span>
                  <span className="text-[10px] text-muted-foreground">Stock gets quarantined</span>
                </button>
              </div>

              {/* Rejection reason (only when Fail) */}
              {qcDecision === "reject" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Rejection Reason <span className="text-red-500">*</span></label>
                  <input
                    value={qcReason}
                    onChange={(e) => setQcReason(e.target.value)}
                    placeholder="e.g. Surface damage, wrong dimensions..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {/* Optional notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                <textarea
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Additional QC observations..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button onClick={() => setQcItem(null)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={handleQcSubmit}
                disabled={!qcDecision || qcSubmitting}
                className={`px-6 py-2.5 font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 ${
                  qcDecision === "reject" ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {qcSubmitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  : qcDecision === "reject"
                    ? <><ShieldX className="w-5 h-5" /> Quarantine Stock</>
                    : <><ShieldCheck className="w-5 h-5" /> Approve & Release Stock</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
