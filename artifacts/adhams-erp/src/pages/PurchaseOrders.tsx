import { useState } from "react";
import { useListPurchaseOrders, useCreatePurchaseOrder, useDeletePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/useApiQuery";
import { useListWarehouses } from "@workspace/api-client-react";
import { Plus, FileText, Globe, MapPin, Clock, CheckCircle2, XCircle, AlertCircle, Package, ChevronRight, X, ExternalLink, Edit, Trash2 } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { Link } from "wouter";

type POType = "all" | "local" | "import";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  draft: Clock,
  sent: FileText,
  confirmed: CheckCircle2,
  partial: AlertCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

interface POForm {
  supplierName: string;
  supplierGstin: string;
  supplierCountry: string;
  poType: "local" | "import";
  currency: string;
  totalAmount: string;
  taxAmount: string;
  shippingAmount: string;
  attachmentUrl: string;
  notes: string;
  expectedDeliveryDate: string;
  warehouseId: string;
}

const defaultForm: POForm = {
  supplierName: "",
  supplierGstin: "",
  supplierCountry: "India",
  poType: "local",
  currency: "INR",
  totalAmount: "",
  taxAmount: "",
  shippingAmount: "",
  attachmentUrl: "",
  notes: "",
  expectedDeliveryDate: "",
  warehouseId: "",
};

export default function PurchaseOrders() {
  const [typeFilter, setTypeFilter] = useState<POType>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<POForm>(defaultForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const { can } = useRole();

  const { data, isLoading, refetch } = useListPurchaseOrders(typeFilter !== "all" ? { type: typeFilter } : {});
  const { data: warehousesData } = useListWarehouses();
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const deletePO = useDeletePurchaseOrder();

  const formatCurrency = (val: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: currency === "INR" ? "INR" : "USD", maximumFractionDigits: 0 }).format(val);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async () => {
    if (!form.supplierName) return showToast("error", "Supplier name is required.");
    try {
      if (editId) {
        await updatePO.mutateAsync({
          id: editId,
          data: {
            attachmentUrl: form.attachmentUrl || undefined,
            notes: form.notes || undefined,
            totalAmount: form.totalAmount ? parseFloat(form.totalAmount) : 0,
          }
        });
        showToast("success", "Purchase Order updated successfully");
      } else {
        await createPO.mutateAsync({
          supplierName: form.supplierName,
          supplierGstin: form.supplierGstin || undefined,
          supplierCountry: form.supplierCountry,
          poType: form.poType,
          currency: form.currency,
          totalAmount: form.totalAmount ? parseFloat(form.totalAmount) : 0,
          taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : 0,
          shippingAmount: form.shippingAmount ? parseFloat(form.shippingAmount) : 0,
          attachmentUrl: form.attachmentUrl || undefined,
          notes: form.notes || undefined,
          expectedDeliveryDate: form.expectedDeliveryDate || undefined,
          warehouseId: form.warehouseId ? parseInt(form.warehouseId) : undefined,
          createdBy: "Purchase Manager",
        });
        showToast("success", `Purchase Order created${form.poType === "import" ? " — 6 import workflow stages initialized" : ""}!`);
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
    } catch (e: any) {
      showToast("error", e.message || "Failed to create PO");
    }
  };

  const handleDelete = async (id: number, poNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${poNumber}? This will also delete its import stages and GRN history.`)) return;
    try {
      await deletePO.mutateAsync(id);
      showToast("success", `${poNumber} has been deleted.`);
    } catch (e: any) {
      showToast("error", e.message || "Failed to delete PO");
    }
  };

  const handleEdit = (po: any) => {
    setEditId(po.id);
    setForm({
      supplierName: po.supplierName || "",
      supplierGstin: po.supplierGstin || "",
      supplierCountry: po.supplierCountry || "India",
      poType: po.poType,
      currency: po.currency || "INR",
      totalAmount: po.totalAmount ? String(po.totalAmount) : "",
      taxAmount: po.taxAmount ? String(po.taxAmount) : "",
      shippingAmount: po.shippingAmount ? String(po.shippingAmount) : "",
      attachmentUrl: po.attachmentUrl || "",
      notes: po.notes || "",
      expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split("T")[0] : "",
      warehouseId: po.warehouseId ? String(po.warehouseId) : "",
    });
    setShowForm(true);
  };

  const items = data?.items ?? [];
  const totalPOs = data?.total ?? 0;
  const totalValue = items.reduce((s: number, p: any) => s + p.totalAmount, 0);
  const importPOs = items.filter((p: any) => p.poType === "import").length;
  const localPOs = items.filter((p: any) => p.poType === "local").length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-sm animate-in slide-in-from-right-5 ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage local and import procurement</p>
        </div>
        {can("create") && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.open("/api/purchase-orders/export/csv", "_blank")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 font-medium text-sm transition-colors w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4" /> Export CSV
            </button>
            <Link href="/purchase-orders/new">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium text-sm shadow-lg shadow-primary/20 transition-all hover:scale-105 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                New Purchase Order
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total POs", value: totalPOs, sub: "All purchase orders", color: "bg-primary/10 text-primary", icon: FileText },
          { label: "Total Value", value: formatCurrency(totalValue), sub: "Combined PO value", color: "bg-emerald-50 text-emerald-700", icon: Package },
          { label: "Import POs", value: importPOs, sub: "International orders", color: "bg-blue-50 text-blue-700", icon: Globe },
          { label: "Local POs", value: localPOs, sub: "Domestic orders", color: "bg-amber-50 text-amber-700", icon: MapPin },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground truncate">{kpi.value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{kpi.label}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5 hidden sm:block">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        {(["all", "local", "import"] as POType[]).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-all whitespace-nowrap ${typeFilter === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "all" ? "All Types" : t === "local" ? "🇮🇳 Local" : "🌏 Import"}
          </button>
        ))}
      </div>

      {/* PO List */}
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            Loading purchase orders...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No purchase orders yet</p>
            <p className="text-sm mt-1">Create your first PO to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {["PO Number", "Supplier", "Type", "Status", "Total Amount", "Expected Delivery", "Warehouse", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((po: any) => {
                const Icon = STATUS_ICONS[po.status] ?? Clock;
                return (
                  <tr key={po.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{po.poNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(po.createdAt).toLocaleDateString("en-IN")}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{po.supplierName}</div>
                      {po.supplierGstin && <div className="text-xs text-muted-foreground font-mono">GST: {po.supplierGstin}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${po.poType === "import" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {po.poType === "import" ? <><Globe className="w-3 h-3" />Import</> : <><MapPin className="w-3 h-3" />Local</>}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium capitalize ${STATUS_COLORS[po.status] ?? "bg-gray-100 text-gray-700"}`}>
                        <Icon className="w-3 h-3" />
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{formatCurrency(po.totalAmount, po.currency)}</div>
                      {po.taxAmount > 0 && <div className="text-xs text-muted-foreground">Tax: {formatCurrency(po.taxAmount, po.currency)}</div>}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{po.warehouseName ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {po.poType === "import" && (
                          <Link href={`/import-workflow/${po.id}`}>
                            <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Workflow <ChevronRight className="w-3 h-3" />
                            </button>
                          </Link>
                        )}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          <button onClick={() => handleEdit(po)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(po.id, po.poNumber)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Create PO Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editId ? "Edit Purchase Order" : "New Purchase Order"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Local or Import procurement</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(defaultForm); }} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* PO Type selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">PO Type *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["local", "import"] as const).map((t) => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, poType: t, currency: t === "import" ? "USD" : "INR", supplierCountry: t === "local" ? "India" : "" }))}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${form.poType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${form.poType === t ? "bg-primary text-white" : "bg-muted"}`}>
                        {t === "local" ? "🇮🇳" : "🌏"}
                      </div>
                      <div>
                        <div className="font-semibold capitalize text-foreground">{t}</div>
                        <div className="text-xs text-muted-foreground">{t === "local" ? "Domestic supplier" : "International import"}</div>
                        {t === "import" && <div className="text-xs text-primary mt-0.5 font-medium">Auto-creates 6-stage workflow</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Supplier Name *</label>
                  <input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                    placeholder="e.g. Kajaria Ceramics Ltd"
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {form.poType === "local" ? "GSTIN" : "Supplier Country"}
                  </label>
                  {form.poType === "local" ? (
                    <input value={form.supplierGstin} onChange={e => setForm(f => ({ ...f, supplierGstin: e.target.value }))}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  ) : (
                    <input value={form.supplierCountry} onChange={e => setForm(f => ({ ...f, supplierCountry: e.target.value }))}
                      placeholder="e.g. China, Vietnam"
                      className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="INR">₹ INR — Indian Rupee</option>
                    <option value="USD">$ USD — US Dollar</option>
                    <option value="EUR">€ EUR — Euro</option>
                    <option value="CNY">¥ CNY — Chinese Yuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Total Amount</label>
                  <input type="number" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tax Amount</label>
                  <input type="number" value={form.taxAmount} onChange={e => setForm(f => ({ ...f, taxAmount: e.target.value }))}
                    placeholder="GST / Customs duty"
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                {form.poType === "import" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Shipping / Freight</label>
                    <input type="number" value={form.shippingAmount} onChange={e => setForm(f => ({ ...f, shippingAmount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Expected Delivery</label>
                  <input type="date" value={form.expectedDeliveryDate} onChange={e => setForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Destination Warehouse</label>
                  <select value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="">Select warehouse</option>
                    {warehousesData?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Attachment URL (PI / Quote)</label>
                  <input value={form.attachmentUrl} onChange={e => setForm(f => ({ ...f, attachmentUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Payment terms, special instructions..."
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
              </div>

              {form.poType === "import" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-800">Import Workflow Auto-initialized</p>
                      <p className="text-blue-600 text-xs mt-1">Creating this PO will generate a 6-stage sequential import workflow: Proforma Invoice → Advance Payment → Container Loading → Remaining Payment → Unloading & QC → Stocking</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button 
                onClick={() => { setShowForm(false); setEditId(null); setForm(defaultForm); }} 
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={createPO.isPending || updatePO.isPending}
                className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2">
                {createPO.isPending || updatePO.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {editId ? "Update PO" : "Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
