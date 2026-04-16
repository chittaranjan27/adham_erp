import { useParams, Link } from "wouter";
import { useGetOrder, useUpdateOrder, useListDealers, useListProducts } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Receipt, 
  Package, Truck, Calendar, ShoppingCart, IndianRupee, Edit, X, Plus, Trash2
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

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

export default function OrderDetails() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading, refetch } = useGetOrder(orderId);
  const { data: dealersData } = useListDealers({ limit: 200 });
  const { data: productsData } = useListProducts({ limit: 200 });
  const { can } = useRole();
  const [syncing, setSyncing] = useState<"sales" | "advance" | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    dealerId: "",
    advancePaid: "",
    notes: "",
    items: [] as any[]
  });

  useEffect(() => {
    if (order && isEditOpen) {
      setEditForm({
        dealerId: String(order.dealerId),
        advancePaid: String(order.advancePaid || 0),
        notes: (order as any).notes || "",
        items: (order.items || []).map((i: any) => ({
          productId: String(i.productId),
          productName: i.productName,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice)
        }))
      });
    }
  }, [order, isEditOpen]);

  const updateOrder = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Order updated successfully." });
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to update order." });
        setTimeout(() => setToast(null), 4000);
      }
    }
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  const handleTallySync = async (type: "sales" | "advance") => {
    setSyncing(type);
    try {
      const endpoint = type === "sales" 
        ? `/api/tally/sync-order/${orderId}` 
        : `/api/tally/sync-advance/${orderId}`;
        
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        setToast({ type: "success", msg: data.message || `Successfully synced ${type} to Tally!` });
      } else {
        setToast({ type: "error", msg: data.error || data.message || "Failed to sync with Tally" });
      }
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Network error syncing with Tally" });
    } finally {
      setSyncing(null);
    }
  };

  const handleEditSubmit = () => {
    if (!editForm.dealerId) {
      setToast({ type: "error", msg: "Please select a dealer." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const validItems = editForm.items.filter((item: any) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return item.productId && qty > 0 && price > 0;
    });
    if (validItems.length === 0) {
      setToast({ type: "error", msg: "Add at least one product with valid quantity and price." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    updateOrder.mutate({
      id: orderId,
      data: {
        dealerId: parseInt(editForm.dealerId),
        advancePaid: parseFloat(editForm.advancePaid) || 0,
        notes: editForm.notes,
        items: validItems.map((item: any) => ({
          productId: parseInt(item.productId),
          productName: item.productName,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        }))
      } as any
    });
    setIsEditOpen(false);
  };

  const markDelivered = () => {
    if (!confirm("Are you sure you want to mark this order as Delivered? This will officially close the order.")) return;
    updateOrder.mutate({
      id: orderId,
      data: { status: "delivered", deliveredAt: new Date().toISOString() } as any
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-2xl font-bold font-display text-foreground mb-2">Order Not Found</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          The order you are attempting to view might have been deleted, or the ID is incorrect.
        </p>
        <Link href="/orders">
          <button className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors">
            Return to Orders
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">
                {order.orderNumber}
              </h1>
              <span className={`px-3 py-1 text-xs uppercase tracking-wider font-bold rounded-md border ${getStatusStyle(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {can("orders") && order.status !== "delivered" && order.status !== "cancelled" && (
            <button 
              onClick={markDelivered}
              disabled={updateOrder.isPending}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Truck className="w-4 h-4" /> Mark Delivered
            </button>
          )}
          {can("orders") && (
            <button 
              onClick={() => setIsEditOpen(true)}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-xl border border-border hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 overflow-hidden">
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Order Items
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Product</th>
                    <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                    <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3.5 font-medium">{item.productName || `Product #${item.productId}`}</td>
                      <td className="px-4 py-3.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3.5 text-right font-medium">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-1/2 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advance Paid</span>
                  <span className="font-medium text-emerald-600">-{formatCurrency(order.advancePaid)}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between">
                  <span className="font-bold text-lg">Balance Due</span>
                  <span className={`font-bold text-lg ${order.balanceAmount > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                    {formatCurrency(order.balanceAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Dealer Info & Tally Sync */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="text-lg font-bold font-display mb-4">Customer Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dealer</p>
                <p className="font-medium text-foreground text-base">{order.dealerName}</p>
              </div>
              {(order as any).notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Internal Notes</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg border border-border">{(order as any).notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-500" /> TallyPrime Sync
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Sync financial records related to this order directly with your TallyPrime database. Make sure Tally is running locally.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleTallySync("advance")}
                disabled={syncing !== null || order.advancePaid <= 0}
                className="w-full relative overflow-hidden group px-4 py-3 bg-white dark:bg-zinc-900 border border-border hover:border-indigo-500 hover:shadow-md transition-all rounded-xl flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="text-left flex flex-col">
                    <span className="font-bold text-sm text-foreground">Sync Advance Receipt</span>
                  </div>
                </div>
                {syncing === "advance" ? (
                  <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-md tracking-wide">₹{order.advancePaid}</span>
                )}
              </button>

              <button
                onClick={() => handleTallySync("sales")}
                disabled={syncing !== null || order.status !== "delivered"}
                className="w-full relative overflow-hidden group px-4 py-3 bg-white dark:bg-zinc-900 border border-border hover:border-emerald-500 hover:shadow-md transition-all rounded-xl flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="text-left flex flex-col">
                    <span className="font-bold text-sm text-foreground">Sync Sales Invoice</span>
                  </div>
                </div>
                {syncing === "sales" && (
                  <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                )}
                {order.status !== "delivered" && syncing !== "sales" && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground w-max text-right">Requires<br/>Delivered Status</span>
                )}
              </button>
            </div>
            
            {order.status !== "delivered" && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Sales invoices can only be synced once the final shipment is delivered to the dealer.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">Edit Order</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Modify order details</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Dealer <span className="text-red-500">*</span></label>
                  <select
                    value={editForm.dealerId}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dealerId: e.target.value }))}
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
                    value={editForm.advancePaid}
                    onChange={(e) => setEditForm(prev => ({ ...prev, advancePaid: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Internal Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary text-sm min-h-[80px] resize-none"
                    placeholder="Enter any notes..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Order Items <span className="text-red-500">*</span></label>
                  <button onClick={() => setEditForm(prev => ({ ...prev, items: [...prev.items, { productId: "", productName: "", quantity: "1", unitPrice: "" }] }))} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {editForm.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-xl border border-border">
                      <div className="col-span-5">
                        <label className="text-xs text-muted-foreground mb-1 block">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const product = productsData?.items?.find((p: any) => String(p.id) === val);
                            setEditForm(prev => {
                              const newItems = [...prev.items];
                              newItems[i] = { ...newItems[i], productId: val, productName: product?.name || "", unitPrice: product?.basePrice ? String(product.basePrice) : newItems[i].unitPrice };
                              return { ...prev, items: newItems };
                            });
                          }}
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
                          onChange={(e) => setEditForm(prev => { const newItems = [...prev.items]; newItems[i].quantity = e.target.value; return { ...prev, items: newItems }; })}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                          min="1"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-xs text-muted-foreground mb-1 block">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => setEditForm(prev => { const newItems = [...prev.items]; newItems[i].unitPrice = e.target.value; return { ...prev, items: newItems }; })}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1 flex items-end pb-0.5">
                        <button
                          onClick={() => setEditForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))}
                          disabled={editForm.items.length === 1}
                          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 text-right">
                  <p className="text-xs text-muted-foreground mb-1">New Total</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(editForm.items.reduce((sum, item) => sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0))}</p>
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
              <button
                onClick={handleEditSubmit}
                disabled={updateOrder.isPending}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {updateOrder.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
