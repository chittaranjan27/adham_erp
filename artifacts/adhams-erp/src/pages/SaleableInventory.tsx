import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/context/RoleContext";
import { customFetch } from "@workspace/api-client-react";
import { PackageCheck, Search, AlertTriangle, IndianRupee, ShoppingBag, TrendingUp, Edit, Trash2 } from "lucide-react";

interface SaleableItem {
  id: number;
  productName: string;
  saleableQuantity: number;
  sellingPrice: number | null;
}

export default function SaleableInventory() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  // Hook must be called unconditionally (Rules of Hooks).
  // `enabled` prevents unnecessary fetching when the role doesn't have access.
  const { data, isLoading } = useQuery({
    queryKey: ["saleable-inventory"],
    queryFn: () => customFetch("/api/inventory?saleable=true&limit=200"),
    staleTime: 2 * 60 * 1000,
    enabled: role === "sales_manager",
  });

  // Route guard — only sales_manager may access this page
  if (role !== "sales_manager") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          This view is restricted to the Sales Manager role only.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const formatPrice = (val: number | null) =>
    val != null && val > 0
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)
      : "—";

  const allItems: SaleableItem[] = ((data as any)?.items ?? []).map((item: any) => ({
    id: item.id,
    productName: item.productName ?? "Unknown Product",
    saleableQuantity: item.saleableQuantity ?? 0,
    sellingPrice: item.sellingPrice != null ? Number(item.sellingPrice) : null,
  }));

  const filtered = allItems.filter((item) =>
    item.productName.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = allItems.reduce((s, i) => s + i.saleableQuantity, 0);
  const totalProducts = allItems.length;
  const lowStockCount = allItems.filter((i) => i.saleableQuantity < 50).length;
  const pricedCount = allItems.filter((i) => i.sellingPrice != null && i.sellingPrice > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <PackageCheck className="w-6 h-6 text-primary" />
          Saleable Stock
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Live view of products available for sale — GRN-verified, ready to dispatch.
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
            <p className="text-sm text-muted-foreground">Products Available</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalUnits.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted-foreground">Total Saleable Units</p>
          </div>
        </div>

        <div className={`bg-card border rounded-2xl p-5 flex items-center gap-4 ${lowStockCount > 0 ? "border-amber-200 bg-amber-50/40" : "border-border"}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? "bg-amber-100" : "bg-muted"}`}>
            <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
            <p className="text-sm text-muted-foreground">Low Stock Products</p>
            <p className="text-xs text-muted-foreground/60">below 50 units</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            Loading saleable stock...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PackageCheck className="w-12 h-12 mb-3 opacity-25" />
            <p className="font-medium">
              {search ? "No products match your search." : "No saleable stock available."}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Product Name
                </th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Saleable Qty
                </th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Selling Price
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((item) => {
                const isLow = item.saleableQuantity < 50;
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{item.productName}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className={`text-lg font-bold ${isLow ? "text-amber-600" : "text-foreground"}`}>
                          {item.saleableQuantity.toLocaleString("en-IN")}
                        </span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.sellingPrice != null && item.sellingPrice > 0 ? (
                        <span className="font-semibold text-foreground flex items-center justify-end gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.sellingPrice.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Price not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
            <span>
              Showing {filtered.length} of {totalProducts} products
              {pricedCount < totalProducts && (
                <span className="ml-2 text-amber-600">
                  · {totalProducts - pricedCount} without selling price
                </span>
              )}
            </span>
            <span>Updated live · GRN-verified stock only</span>
          </div>
        )}
      </div>
    </div>
  );
}
