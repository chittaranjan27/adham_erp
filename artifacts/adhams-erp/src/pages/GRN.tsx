import { useState } from "react";
import { useListGrn, useUpdateGrn } from "@/hooks/useApiQuery";
import { ClipboardList, CheckCircle2, Clock, XCircle, AlertCircle, Package, Truck, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  verified: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  verified: AlertCircle,
  accepted: CheckCircle2,
  rejected: XCircle,
};

export default function GRN() {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const { can } = useRole();

  const { data, isLoading, refetch } = useListGrn({ page: 1 });
  const updateGrn = useUpdateGrn();

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRelease = async (id: number, grnNumber: string) => {
    try {
      await updateGrn.mutateAsync({ id, data: { status: "accepted", isReleased: true, verifiedBy: "Warehouse Manager" } });
      showToast("success", `GRN ${grnNumber} released — stock is now available for sale`);
      refetch();
    } catch (e: any) {
      showToast("error", e.message || "Failed to release GRN");
    }
  };

  const items = data?.items ?? [];
  const pending = items.filter((g: any) => !g.isReleased).length;
  const released = items.filter((g: any) => g.isReleased).length;
  const totalReceived = items.reduce((s: number, g: any) => s + g.totalItemsReceived, 0);
  const totalShortage = items.reduce((s: number, g: any) => s + (g.shortageQty ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-sm ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Goods Received Notes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Auto-generated on every inward receipt</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {can("create") && (
            <Link href="/grn/partial">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium text-sm shadow-lg shadow-primary/20 transition-all hover:scale-105 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                New Partial GRN
              </button>
            </Link>
          )}
          <button onClick={() => refetch()} className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors w-full sm:w-auto">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total GRNs", value: data?.total ?? 0, sub: "All time", color: "bg-primary/10 text-primary", icon: ClipboardList },
          { label: "Pending Release", value: pending, sub: "Awaiting release", color: "bg-amber-50 text-amber-700", icon: Clock },
          { label: "Released", value: released, sub: "Stock available", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
          { label: "Total Shortage", value: totalShortage, sub: "Units reported short", color: "bg-red-50 text-red-700", icon: AlertCircle },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{kpi.label}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5 hidden sm:block">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 flex items-start gap-3">
        <Package className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs sm:text-sm text-blue-700">
          <strong>GRN Auto-generation:</strong> Every inventory receipt automatically creates a GRN. Stock only becomes saleable once a GRN is released by the warehouse manager.
        </p>
      </div>

      {/* GRN table */}
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            Loading GRNs...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No GRNs yet</p>
            <p className="text-sm mt-1">GRNs are auto-generated when inventory is received</p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {["GRN Number", "PO / Supplier", "Warehouse", "Received", "Shortage", "Damage", "Status", "Stock Release", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((grn: any) => {
                const Icon = STATUS_ICONS[grn.status] ?? Clock;
                return (
                  <tr key={grn.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-mono font-semibold text-foreground text-xs">{grn.grnNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(grn.receivedDate).toLocaleDateString("en-IN")}</div>
                    </td>
                    <td className="px-5 py-4">
                      {grn.poNumber ? (
                        <div>
                          <div className="text-xs font-medium text-primary">{grn.poNumber}</div>
                          <div className="text-xs text-muted-foreground">{grn.supplierName}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Direct Inward</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">{grn.warehouseName ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{grn.totalItemsReceived.toLocaleString("en-IN")}</div>
                      <div className="text-xs text-muted-foreground">units</div>
                    </td>
                    <td className="px-5 py-4">
                      {grn.shortageQty > 0 ? (
                        <span className="text-amber-700 font-semibold">{grn.shortageQty}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {grn.damageQty > 0 ? (
                        <span className="text-red-700 font-semibold">{grn.damageQty}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium capitalize ${STATUS_COLORS[grn.status] ?? "bg-gray-100 text-gray-700"}`}>
                        <Icon className="w-3 h-3" />
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {grn.isReleased ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Released
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {!grn.isReleased && can("approve") && (
                          <button onClick={() => handleRelease(grn.id, grn.grnNumber)}
                            disabled={updateGrn.isPending}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                            <Truck className="w-3 h-3" />
                            Release Stock
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  );
}
