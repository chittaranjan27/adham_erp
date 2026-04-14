import { useListProducts, useCreateProduct, customFetch } from "@workspace/api-client-react";
import { Search, Plus, Filter, LayoutGrid, List as ListIcon, ArrowUpRight, X, Upload, CheckCircle2, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { useRole } from "@/context/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["Wall Panels", "Ceiling Panels", "Flooring", "Cladding", "Acoustic Panels", "Decorative Hardware", "Structural Components"];
const UNITS = ["Sqft", "Sqm", "Piece", "Box", "Set", "Running Meter"];
const HSN_CODES = ["6802", "6803", "6907", "6908", "3925", "7308", "7610", "9406"];

interface ProductForm {
  name: string;
  category: string;
  subcategory: string;
  hsnCode: string;
  basePrice: string;
  unit: string;
  origin: "domestic" | "imported";
  description: string;
  dimensions: string;
  weight: string;
}

const defaultForm: ProductForm = {
  name: "", category: CATEGORIES[0], subcategory: "", hsnCode: HSN_CODES[0],
  basePrice: "", unit: UNITS[0], origin: "domestic", description: "", dimensions: "", weight: "",
};

export default function Products() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListProducts({ limit: 50 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = useRole();

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Product added successfully!" });
        setIsOpen(false);
        setForm(defaultForm);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to add product." });
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category || CATEGORIES[0],
      subcategory: product.subcategory || "",
      hsnCode: product.hsnCode || HSN_CODES[0],
      basePrice: String(product.basePrice),
      unit: product.unit || UNITS[0],
      origin: product.origin || "domestic",
      description: product.description || "",
      dimensions: product.dimensions || "",
      weight: product.weight ? String(product.weight) : "",
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.hsnCode || !form.basePrice) {
      setToast({ type: "error", msg: "Name, HSN code and Base Price are required." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    if (editingProduct) {
      // UPDATE existing product
      setSaving(true);
      try {
        await customFetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            subcategory: form.subcategory || undefined,
            hsnCode: form.hsnCode,
            basePrice: parseFloat(form.basePrice),
            unit: form.unit,
            origin: form.origin,
            description: form.description || undefined,
            dimensions: form.dimensions || undefined,
            weight: form.weight ? parseFloat(form.weight) : undefined,
          }),
        });
        setToast({ type: "success", msg: "Product updated successfully!" });
        setIsOpen(false);
        setEditingProduct(null);
        setForm(defaultForm);
        queryClient.invalidateQueries();
        setTimeout(() => setToast(null), 4000);
      } catch (e: any) {
        setToast({ type: "error", msg: e?.message || "Failed to update product." });
        setTimeout(() => setToast(null), 4000);
      } finally {
        setSaving(false);
      }
    } else {
      createProduct.mutate({
        data: {
          name: form.name.trim(),
          category: form.category,
          subcategory: form.subcategory || undefined,
          hsnCode: form.hsnCode,
          basePrice: parseFloat(form.basePrice),
          unit: form.unit,
          origin: form.origin as any,
          description: form.description || undefined,
          dimensions: form.dimensions || undefined,
          weight: form.weight ? parseFloat(form.weight) : undefined,
        },
      });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await customFetch(`/api/products/${id}`, { method: "DELETE" });
      setToast({ type: "success", msg: `"${name}" deleted.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to delete product." });
      setTimeout(() => setToast(null), 4000);
    }
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
        const [name, category, hsnCode, basePrice, unit, origin] = cols;
        if (!name || !hsnCode || !basePrice) continue;
        try {
          await createProduct.mutateAsync({
            data: {
              name, category: category || CATEGORIES[0], hsnCode,
              basePrice: parseFloat(basePrice), unit: unit || "Sqft",
              origin: (origin === "imported" ? "imported" : "domestic") as any,
            },
          });
          ok++;
        } catch {}
      }
      setToast({ type: "success", msg: `${ok} products imported from CSV.` });
      refetch();
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = data?.items?.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.hsnCode.includes(search) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createProduct.isPending || saving;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm transition-all animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Product Master Catalog</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage wall panels, ceilings, and architectural hardware.</p>
        </div>
        {can("products") && (
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button
              onClick={() => { setEditingProduct(null); setForm(defaultForm); setIsOpen(true); }}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add Product
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card p-2 rounded-xl sm:rounded-2xl shadow-sm border border-border gap-2">
        <div className="flex-1 flex items-center px-3 sm:px-4 max-w-xl">
          <Search className="w-4 h-4 text-muted-foreground mr-2 sm:mr-3 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, HSN code or category..."
            className="w-full py-2 bg-transparent border-none focus:outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pr-2 sm:border-l sm:border-border sm:pl-4">
          <div className="h-6 w-px bg-border mx-1"></div>
          <div className="flex bg-muted rounded-lg p-1">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-card rounded-2xl h-72 animate-pulse border border-border"></div>)}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filtered?.map((product: any) => (
            <div key={product.id} className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-secondary text-secondary-foreground">{product.category}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${product.origin === "imported" ? "text-blue-600" : "text-emerald-600"}`}>{product.origin}</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold font-display leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
              <div className="text-xs text-muted-foreground mb-4 space-y-1">
                <p>HSN: <span className="font-mono text-foreground">{product.hsnCode}</span></p>
                <p>Unit: {product.unit}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-border flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Base Price</p>
                  <p className="text-xl sm:text-xl font-bold text-foreground">{formatCurrency(product.basePrice)}</p>
                </div>
                {can("products") && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <button onClick={() => openEditModal(product)} className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id, product.name)} className="w-8 h-8 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">HSN Code</th>
                <th className="px-6 py-4">Origin</th>
                <th className="px-6 py-4 text-right">Base Price</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered?.map((product: any) => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{product.category}</td>
                  <td className="px-6 py-4 font-mono text-xs">{product.hsnCode}</td>
                  <td className="px-6 py-4"><span className="capitalize text-xs font-medium">{product.origin}</span></td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(product.basePrice)}</td>
                  <td className="px-6 py-4 text-center">
                    {can("products") && (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{editingProduct ? "Update product details" : "Register a product in the master catalog"}</p>
              </div>
              <button onClick={() => { setIsOpen(false); setEditingProduct(null); setForm(defaultForm); }} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Product Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Adhams Royal Gypsum Board 12mm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sub-Category</label>
                <input type="text" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Moisture Resistant" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">HSN Code <span className="text-red-500">*</span></label>
                <select value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {HSN_CODES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Base Price (₹) <span className="text-red-500">*</span></label>
                <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Origin</label>
                <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as "domestic" | "imported" })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  <option value="domestic">Domestic</option>
                  <option value="imported">Imported</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Dimensions</label>
                <input type="text" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. 2400 x 1200 x 12mm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0.0" min="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2} placeholder="Brief product description..." />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setIsOpen(false); setEditingProduct(null); setForm(defaultForm); }} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5" /> {editingProduct ? "Update Product" : "Save Product"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
