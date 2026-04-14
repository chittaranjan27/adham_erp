import { useParams, Link } from "wouter";
import { useGetOrder, useUpdateOrder } from "@workspace/api-client-react";
import { useState } from "react";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Receipt, 
  Package, Truck, Calendar, ShoppingCart, IndianRupee
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
  const { can } = useRole();
  const [syncing, setSyncing] = useState<"sales" | "advance" | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
    </div>
  );
}
