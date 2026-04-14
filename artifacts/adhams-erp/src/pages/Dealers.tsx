import { useListDealers, useCreateDealer, customFetch } from "@workspace/api-client-react";
import { Search, Building2, Phone, MapPinned, X, Plus, Upload, CheckCircle2, AlertCircle, Edit, Trash2 } from "lucide-react";
import crmImg from "@assets/CRM_on_phone_1774437524992.png";
import { useState, useRef } from "react";
import { useRole } from "@/context/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

const STATES = ["Kerala", "Karnataka", "Maharashtra", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Goa", "Gujarat", "Rajasthan", "Delhi"];
const COMMISSION_SLABS = ["Gold", "Silver", "Bronze", "Platinum"];

interface DealerForm {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  gstNumber: string;
  creditLimit: string;
  commissionSlab: string;
}

const defaultForm: DealerForm = {
  name: "", contactPerson: "", phone: "", email: "",
  city: "", state: STATES[0], gstNumber: "", creditLimit: "", commissionSlab: "Silver",
};

export default function Dealers() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useListDealers({ limit: 50 });
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [form, setForm] = useState<DealerForm>(defaultForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = useRole();

  const createDealer = useCreateDealer({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "Dealer added to network!" });
        setIsOpen(false);
        setForm(defaultForm);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to add dealer." });
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  const openEditModal = (dealer: any) => {
    setEditingDealer(dealer);
    setForm({
      name: dealer.name,
      contactPerson: dealer.contactPerson || "",
      phone: dealer.phone || "",
      email: dealer.email || "",
      city: dealer.city || "",
      state: dealer.state || STATES[0],
      gstNumber: dealer.gstNumber || "",
      creditLimit: dealer.creditLimit ? String(dealer.creditLimit) : "",
      commissionSlab: dealer.commissionSlab || "Silver",
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.contactPerson.trim() || !form.phone.trim()) {
      setToast({ type: "error", msg: "Name, Contact Person and Phone are required." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (editingDealer) {
      setSaving(true);
      try {
        await customFetch(`/api/dealers/${editingDealer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            contactPerson: form.contactPerson.trim(),
            phone: form.phone.trim(),
            email: form.email || undefined,
            city: form.city.trim(),
            state: form.state,
            gstNumber: form.gstNumber || undefined,
            creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
            commissionSlab: form.commissionSlab,
          }),
        });
        setToast({ type: "success", msg: "Dealer updated!" });
        setIsOpen(false); setEditingDealer(null); setForm(defaultForm);
        queryClient.invalidateQueries();
        setTimeout(() => setToast(null), 4000);
      } catch (e: any) {
        setToast({ type: "error", msg: e?.message || "Failed to update dealer." });
        setTimeout(() => setToast(null), 4000);
      } finally { setSaving(false); }
    } else {
      createDealer.mutate({
        data: {
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email || undefined,
          city: form.city.trim(),
          state: form.state,
          gstNumber: form.gstNumber || undefined,
          creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
          commissionSlab: form.commissionSlab,
        },
      });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete dealer "${name}"? This cannot be undone.`)) return;
    try {
      await customFetch(`/api/dealers/${id}`, { method: "DELETE" });
      setToast({ type: "success", msg: `"${name}" removed from the network.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to delete dealer." });
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
        const [name, contactPerson, phone, email, city, state, gstNumber, creditLimit, commissionSlab] = cols;
        if (!name || !contactPerson || !phone) continue;
        try {
          await createDealer.mutateAsync({
            data: { name, contactPerson, phone, email: email || undefined, city: city || "", state: state || STATES[0], gstNumber: gstNumber || undefined, creditLimit: creditLimit ? parseFloat(creditLimit) : 0, commissionSlab: commissionSlab || "Silver" },
          });
          ok++;
        } catch {}
      }
      setToast({ type: "success", msg: `${ok} dealers imported from CSV.` });
      refetch();
      setTimeout(() => setToast(null), 4000);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = data?.items?.filter((d: any) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.dealerCode.includes(search) || (d.gstNumber || "").includes(search)
  );

  const isPending = createDealer.isPending || saving;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 text-white shadow-lg h-28 sm:h-40 flex items-center">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${crmImg})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/90 to-transparent"></div>
        <div className="relative z-10 px-4 sm:px-8">
          <h1 className="text-xl sm:text-3xl font-bold font-display mb-1 sm:mb-2">Dealer Network (CRM)</h1>
          <p className="text-slate-300 max-w-xl text-xs sm:text-sm leading-relaxed">Manage your B2B relationships, credit limits, outstanding balances, and tier-based commission slabs.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-2 rounded-xl sm:rounded-2xl shadow-sm border border-border gap-2">
        <div className="flex-1 flex items-center px-4 max-w-xl">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dealers by name, GST or code..."
            className="w-full py-2.5 bg-transparent border-none focus:outline-none text-sm" />
        </div>
        {can("dealers") && (
          <div className="flex gap-2 pr-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button onClick={() => fileRef.current?.click()}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button onClick={() => { setEditingDealer(null); setForm(defaultForm); setIsOpen(true); }}
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Dealer
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => <div key={i} className="bg-card rounded-2xl h-56 animate-pulse border border-border"></div>)
        ) : (
          filtered?.map((dealer: any) => (
            <div key={dealer.id} className="group bg-card rounded-2xl p-6 shadow-sm border border-border/60 hover:shadow-xl hover:border-primary/50 transition-all duration-300 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-border flex items-center justify-center text-slate-600 font-bold text-lg shadow-inner">
                    {dealer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground font-display line-clamp-1">{dealer.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{dealer.dealerCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {can("dealers") && (
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5">
                      <button onClick={() => openEditModal(dealer)} className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(dealer.id, dealer.name)} className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wide">
                    {dealer.commissionSlab} Tier
                  </div>
                </div>
              </div>
              <div className="space-y-2 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPinned className="w-4 h-4 shrink-0" /> <span className="truncate">{dealer.city}, {dealer.state}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> {dealer.phone}</div>
                <div className="flex items-center gap-2"><Building2 className="w-4 h-4 shrink-0" /> <span className="font-mono text-xs">GST: {dealer.gstNumber || "—"}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Credit Limit</p>
                  <p className="font-semibold text-foreground text-sm">{formatCurrency(dealer.creditLimit || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Outstanding</p>
                  <p className={`font-semibold text-sm ${(dealer.outstandingBalance || 0) > (dealer.creditLimit || 0) * 0.8 ? "text-red-600" : "text-orange-600"}`}>
                    {formatCurrency(dealer.outstandingBalance || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">{editingDealer ? "Edit Dealer" : "Add New Dealer"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{editingDealer ? "Update dealer information" : "Register a dealer in your B2B network"}</p>
              </div>
              <button onClick={() => { setIsOpen(false); setEditingDealer(null); setForm(defaultForm); }} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Business Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Kerala Interiors Pvt Ltd" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Person <span className="text-red-500">*</span></label>
                <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="contact@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">GST Number</label>
                <input type="text" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                  placeholder="29AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">City</label>
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Kozhikode" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">State</label>
                <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Credit Limit (₹)</label>
                <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="500000" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Commission Tier</label>
                <select value={form.commissionSlab} onChange={(e) => setForm({ ...form, commissionSlab: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {COMMISSION_SLABS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex gap-3">
                <button onClick={() => { setIsOpen(false); setEditingDealer(null); setForm(defaultForm); }} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60">
                  {isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5" /> {editingDealer ? "Update Dealer" : "Save Dealer"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
