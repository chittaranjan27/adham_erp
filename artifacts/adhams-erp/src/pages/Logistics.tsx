import { useState } from "react";
import { useListDispatches, useCreateDispatch, useListOrders, customFetch } from "@workspace/api-client-react";
import { Truck, Map, PackageCheck, AlertTriangle, Route, Plus, X, CheckCircle2, AlertCircle, Shield, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const VALID_STATUSES = ["planned", "loading", "in_transit", "delivered", "failed"];

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "planned": return { icon: Map, color: "text-blue-600 bg-blue-100", label: "Planned" };
    case "loading": return { icon: PackageCheck, color: "text-amber-600 bg-amber-100", label: "Loading" };
    case "in_transit": return { icon: Truck, color: "text-primary bg-primary/10", label: "In Transit" };
    case "delivered": return { icon: PackageCheck, color: "text-emerald-600 bg-emerald-100", label: "Delivered" };
    case "failed": return { icon: AlertTriangle, color: "text-red-600 bg-red-100", label: "Failed" };
    default: return { icon: Truck, color: "text-gray-600 bg-gray-100", label: status };
  }
};

export default function Logistics() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useListDispatches({ limit: 50 });
  const { data: ordersData } = useListOrders({ limit: 200 });
  const createDispatch = useCreateDispatch({
    mutation: { onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["listOrders"] }); } },
  });

  // Create Dispatch Modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ orderId: "", vehicleNumber: "", driverName: "", driverPhone: "", routePlan: "", dispatchDate: "" });
  const [barcodeCheck, setBarcodeCheck] = useState<{ valid?: boolean; missingBarcodes?: string[]; loading?: boolean; totalItems?: number } | null>(null);

  // Deliver Modal
  const [deliverDispatch, setDeliverDispatch] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [delivering, setDelivering] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = (type: "success" | "error", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  // Dispatchable orders (not yet dispatched/delivered/cancelled)
  const dispatchableOrders = ordersData?.items?.filter((o: any) => !["dispatched", "delivered", "cancelled"].includes(o.status)) ?? [];

  // Barcode validation when order is selected
  const handleOrderSelect = async (orderId: string) => {
    setForm({ ...form, orderId });
    if (!orderId) { setBarcodeCheck(null); return; }
    setBarcodeCheck({ loading: true });
    try {
      const result = await customFetch<any>(`/api/logistics/dispatches/validate-order/${orderId}`);
      setBarcodeCheck(result);
    } catch { setBarcodeCheck({ valid: false, missingBarcodes: ["Validation failed"] }); }
  };

  const handleCreateDispatch = () => {
    if (!form.orderId || !form.vehicleNumber || !form.driverName) {
      showToast("error", "Order, Vehicle Number, and Driver Name are required.");
      return;
    }
    if (barcodeCheck && !barcodeCheck.valid) {
      showToast("error", "Cannot dispatch — some items are missing barcodes.");
      return;
    }
    createDispatch.mutate(
      { data: { orderId: Number(form.orderId), vehicleNumber: form.vehicleNumber, driverName: form.driverName, driverPhone: form.driverPhone, routePlan: form.routePlan, dispatchDate: form.dispatchDate || undefined } as any },
      {
        onSuccess: () => { showToast("success", "Dispatch created! Order status updated to dispatched."); setShowCreate(false); setForm({ orderId: "", vehicleNumber: "", driverName: "", driverPhone: "", routePlan: "", dispatchDate: "" }); setBarcodeCheck(null); },
        onError: (e: any) => showToast("error", e?.data?.error || e?.message || "Failed to create dispatch."),
      }
    );
  };

  // Status update helper
  const handleStatusChange = async (dispatchId: number, newStatus: string) => {
    if (newStatus === "delivered") return; // Use delivery modal instead
    setStatusUpdating(dispatchId);
    try {
      await customFetch(`/api/logistics/dispatches/${dispatchId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }), headers: { "Content-Type": "application/json" } });
      showToast("success", `Status updated to "${newStatus}"`);
      refetch();
    } catch { showToast("error", "Failed to update status."); }
    setStatusUpdating(null);
  };

  // Open delivery modal
  const openDeliverModal = (dispatch: any) => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(code);
    setOtp("");
    setProofUrl("");
    setDeliverDispatch(dispatch);
  };

  // Confirm delivery
  const handleConfirmDelivery = async () => {
    if (otp !== generatedOtp) { showToast("error", "Incorrect OTP. Please check and try again."); return; }
    setDelivering(true);
    try {
      await customFetch(`/api/logistics/dispatches/${deliverDispatch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "delivered", proofOfDelivery: proofUrl || undefined }),
        headers: { "Content-Type": "application/json" },
      });
      showToast("success", `Dispatch ${deliverDispatch.dispatchNumber} marked as DELIVERED! Tally sync triggered.`);
      setDeliverDispatch(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["listOrders"] });
    } catch { showToast("error", "Failed to mark as delivered."); }
    setDelivering(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Logistics & Dispatch</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create dispatches, track shipments, and confirm deliveries.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Dispatch
        </button>
      </div>

      {/* Dispatch Table */}
      <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Dispatch Info</th>
                <th className="px-6 py-4">Route Plan</th>
                <th className="px-6 py-4">Fleet & Driver</th>
                <th className="px-6 py-4">e-Way Bill</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-muted rounded-full w-24 mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No dispatches yet. Click "New Dispatch" to create one.</td></tr>
              ) : (
                data?.items?.map((d: any) => {
                  const si = getStatusDisplay(d.status);
                  const SI = si.icon;
                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{d.dispatchNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1">{d.orderNumber || `Order #${d.orderId}`}</div>
                        {d.dealerName && <div className="text-xs text-muted-foreground">{d.dealerName}</div>}
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Route className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium max-w-[200px] truncate">{d.routePlan || "Route not assigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm">{d.vehicleNumber || "Unassigned"}</div>
                            <div className="text-xs text-muted-foreground">{d.driverName} • {d.driverPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">{d.eWayBillNumber || "Pending"}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {d.status !== "delivered" && d.status !== "failed" ? (
                            <select
                              value={d.status}
                              onChange={(e) => e.target.value === "delivered" ? openDeliverModal(d) : handleStatusChange(d.id, e.target.value)}
                              disabled={statusUpdating === d.id}
                              className={`px-2 py-1 text-[11px] uppercase tracking-wider font-bold rounded-md border cursor-pointer ${si.color}`}
                            >
                              {VALID_STATUSES.filter(s => s !== "failed").map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                            </select>
                          ) : (
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${si.color}`}>
                              <SI className="w-3.5 h-3.5" /> {si.label}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {d.status === "in_transit" && (
                          <button onClick={() => openDeliverModal(d)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 mx-auto">
                            <Camera className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        )}
                        {d.status === "delivered" && d.proofOfDelivery && (
                          <a href={d.proofOfDelivery} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View POD</a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════ Create Dispatch Modal ══════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold font-display">New Dispatch</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Assign a vehicle and driver to an order</p>
              </div>
              <button onClick={() => { setShowCreate(false); setBarcodeCheck(null); }} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1.5">Order <span className="text-red-500">*</span></label>
                <select value={form.orderId} onChange={(e) => handleOrderSelect(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  <option value="">Select order to dispatch...</option>
                  {dispatchableOrders.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.orderNumber} — {o.dealerName} ({o.status})</option>
                  ))}
                </select>
              </div>

              {/* Barcode validation feedback */}
              {barcodeCheck && (
                <div className={`p-3 rounded-xl border text-sm ${barcodeCheck.loading ? "bg-blue-50 border-blue-200 text-blue-700" : barcodeCheck.valid ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                  {barcodeCheck.loading ? (
                    <div className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Validating barcodes...</div>
                  ) : barcodeCheck.valid ? (
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> ✅ All {barcodeCheck.totalItems} items have valid barcodes — ready to dispatch</div>
                  ) : (
                    <div><div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4" /> ⚠️ Barcode missing for:</div><ul className="mt-1 ml-6 list-disc">{barcodeCheck.missingBarcodes?.map((name, i) => <li key={i}>{name}</li>)}</ul></div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Vehicle Number <span className="text-red-500">*</span></label>
                  <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} placeholder="MH 12 AB 1234" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Dispatch Date</label>
                  <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Driver Name <span className="text-red-500">*</span></label>
                  <input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Ramesh Kumar" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Driver Phone</label>
                  <input value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} placeholder="+91 98765 43210" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Route Plan</label>
                <input value={form.routePlan} onChange={(e) => setForm({ ...form, routePlan: e.target.value })} placeholder="Warehouse → Site A → Site B" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button onClick={() => { setShowCreate(false); setBarcodeCheck(null); }} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={handleCreateDispatch}
                disabled={createDispatch.isPending || (barcodeCheck !== null && !barcodeCheck.valid)}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {createDispatch.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><Truck className="w-5 h-5" /> Create Dispatch</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Delivery Confirmation Modal ══════ */}
      {deliverDispatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold font-display">Confirm Delivery</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Dispatch {deliverDispatch.dispatchNumber}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Proof of Delivery URL</label>
                <input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://drive.google.com/photo-proof..." className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <p className="text-xs text-muted-foreground mt-1">Paste a link to the delivery photo, signed document, or GPS location.</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-bold text-amber-800 mb-1">📱 OTP Verification</p>
                <p className="text-xs text-amber-700">SMS sent to driver ({deliverDispatch.driverPhone || "N/A"})</p>
                <div className="mt-2 px-4 py-2.5 bg-white border border-amber-300 rounded-lg text-center">
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-900">{generatedOtp}</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-1 text-center">This is a simulated OTP for testing</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Enter OTP to confirm delivery <span className="text-red-500">*</span></label>
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter 4-digit OTP" maxLength={4} className="w-full px-3 py-3 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center text-xl font-mono tracking-[0.4em]" />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button onClick={() => setDeliverDispatch(null)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={handleConfirmDelivery}
                disabled={delivering || otp.length !== 4}
                className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {delivering ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Confirming...</> : <><CheckCircle2 className="w-5 h-5" /> Confirm Delivery</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
