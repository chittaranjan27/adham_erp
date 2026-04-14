import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft, Save, FileText, Send, ClipboardList,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, X, Plus, Trash2
} from "lucide-react";
import { useCreateGrn, useListWarehouses, useListPurchaseOrders } from "../hooks/useApiQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GRNLineItem {
  id: string;
  category: string;
  description: string;
  size: string;
  thickness: string;
  poQty: number | string;
  receivedQty: number | string;
  acceptedQty: number | string;
  expectedDelivery: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SURFACE_QUALITY   = ["Excellent", "Good", "Acceptable", "Minor Scratches", "Poor"];
const EDGE_CONDITION    = ["Clean Cut", "Minor Chips", "Chipped Edges", "Damaged"];
const WARPING_OPTIONS   = ["Flat / No Warp", "Slight Bow", "Moderate Warp", "Severely Warped"];
const SHADE_MATCH       = ["Exact Match", "Close Match", "Slight Variation", "Mismatch"];
const LABEL_VERIFY      = ["Verified", "Partially Verified", "Missing Labels", "Mismatch"];
const PACKING_COND      = ["Intact", "Minor Damage", "Moderate Damage", "Severely Damaged"];
const CATEGORY_OPTIONS  = ["Louver PVC", "Laminate Sheet", "HPL Sheet", "PVC Panel", "Other"];

const INITIAL_ITEMS: GRNLineItem[] = [
  {
    id: "1",
    category: "",
    description: "",
    size: "",
    thickness: "",
    poQty: "",
    receivedQty: "",
    acceptedQty: "",
    expectedDelivery: "",
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusPill(item: GRNLineItem) {
  const received = Number(item.receivedQty) || 0;
  const poQty    = Number(item.poQty) || 0;
  if (!item.receivedQty || received === 0) return { label: "Pending",        cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (poQty > 0 && received >= poQty)      return { label: "Fully Received", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  return                                { label: "Partial",         cls: "bg-blue-100 text-blue-700 border-blue-200" };
}

function autoGRN() {
  const y  = new Date().getFullYear();
  const n  = String(Math.floor(Math.random() * 9000) + 1000);
  return `GRN-${y}-${n}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartialGRN() {
  const [, setLocation] = useLocation();

  // API hooks
  const createGrn = useCreateGrn();
  const { data: warehouses } = useListWarehouses();
  const { data: poData } = useListPurchaseOrders({ page: 1 });
  const poList = poData?.items ?? [];

  // Header
  const [grnNumber]        = useState(autoGRN);
  const [grnDate, setGrnDate]           = useState(new Date().toISOString().split("T")[0]);
  const [selectedPoId, setSelectedPoId] = useState<number | undefined>(undefined);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [challanNo, setChallanNo]        = useState("");
  const [vehicleNo, setVehicleNo]        = useState("");
  const [receivedBy, setReceivedBy]      = useState("");

  // Auto-fill supplier from selected PO
  const selectedPO = poList.find((po: any) => po.id === selectedPoId);
  const supplierName = selectedPO?.supplierName ?? "";
  const poNumber = selectedPO?.poNumber ?? "—";

  // Line items
  const [items, setItems] = useState<GRNLineItem[]>(INITIAL_ITEMS);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Math.random().toString(36).substr(2, 9), category: "", description: "", size: "", thickness: "", poQty: "", receivedQty: "", acceptedQty: "", expectedDelivery: "" }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  // Quality Inspection
  const [height, setHeight]           = useState("");
  const [width,  setWidth]            = useState("");
  const [thick,  setThick]            = useState("");
  const [surface, setSurface]         = useState("");
  const [edge,    setEdge]            = useState("");
  const [warp,    setWarp]            = useState("");
  const [shade,   setShade]           = useState("");
  const [label,   setLabel]           = useState("");
  const [packing, setPacking]         = useState("");
  const [remarks, setRemarks]         = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const { totalPOQty, totalReceived, totalAccepted, totalPending } = useMemo(() => {
    const totalPOQty    = items.reduce((s, i) => s + (Number(i.poQty) || 0), 0);
    const totalReceived = items.reduce((s, i) => s + (Number(i.receivedQty) || 0), 0);
    const totalAccepted = items.reduce((s, i) => s + (Number(i.acceptedQty) || 0), 0);
    const totalPending  = items.reduce((s, i) => s + Math.max(0, (Number(i.poQty) || 0) - (Number(i.receivedQty) || 0)), 0);
    return { totalPOQty, totalReceived, totalAccepted, totalPending };
  }, [items]);

  const progressPct = totalPOQty > 0 ? Math.round((totalReceived / totalPOQty) * 100) : 0;

  const updateItem = (id: string, field: keyof GRNLineItem, raw: string | number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: raw };
        // Auto-clamp acceptedQty ≤ receivedQty
        if (field === "receivedQty") {
          const rv = raw === "" ? "" : (Number(raw) || 0);
          updated.receivedQty = rv;
          if (rv !== "" && Number(updated.acceptedQty) > rv) updated.acceptedQty = rv;
        }
        if (field === "acceptedQty") {
          const av = raw === "" ? "" : (Number(raw) || 0);
          const rv = Number(updated.receivedQty) || 0;
          if (av !== "" && av > rv) updated.acceptedQty = rv;
          else updated.acceptedQty = av;
        }
        return updated;
      })
    );
  };

  const handleSave = async (action: "draft" | "report" | "submit") => {
    if (!selectedWarehouseId) {
      setSubmitError("Please select a warehouse before submitting.");
      return;
    }
    if (totalReceived === 0) {
      setSubmitError("Please enter at least one received quantity.");
      return;
    }
    setSubmitError(null);
    setIsSaving(true);

    try {
      const totalRejected = Math.max(0, totalReceived - totalAccepted);

      // Build quality/inspection notes
      const qualityNotes = [
        surface && `Surface: ${surface}`,
        edge && `Edge: ${edge}`,
        warp && `Flatness: ${warp}`,
        shade && `Shade: ${shade}`,
        label && `Labels: ${label}`,
        packing && `Packing: ${packing}`,
        height && `Height: ${height}mm`,
        width && `Width: ${width}mm`,
        thick && `Thickness: ${thick}mm`,
      ].filter(Boolean).join(", ");

      const itemsSummary = items
        .map((item, i) => `${i + 1}. ${item.category || "Item"} – ${item.description || "N/A"} | PO: ${item.poQty || 0}, Rcvd: ${item.receivedQty || 0}, Accepted: ${item.acceptedQty || 0}`)
        .join("\n");

      const shortageNotes = [
        remarks,
        challanNo && `Challan: ${challanNo}`,
        vehicleNo && `Vehicle: ${vehicleNo}`,
        receivedBy && `Received By: ${receivedBy}`,
        `Items:\n${itemsSummary}`,
        qualityNotes && `Quality: ${qualityNotes}`,
      ].filter(Boolean).join("\n\n");

      await createGrn.mutateAsync({
        poId: selectedPoId || undefined,
        warehouseId: selectedWarehouseId,
        totalItemsReceived: totalReceived,
        shortageQty: totalPending,
        damageQty: totalRejected,
        shortageNotes: shortageNotes || undefined,
        damageNotes: totalRejected > 0 ? `${totalRejected} items rejected during inspection` : undefined,
        createdBy: receivedBy || localStorage.getItem("adhams_role") || "Warehouse Team",
      });

      setLocation("/grn");
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create GRN. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Dropdown helper ──────────────────────────────────────────────────────
  const Dropdown = ({
    value, onChange, options, placeholder = "Select"
  }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const Field = ({
    label, children
  }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-28">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/grn">
            <button className="p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Partial Goods Receipt Note</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 rounded-lg uppercase tracking-wider">
                Partial Receipt
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Louver PVC &amp; Laminate Sheets — against {poNumber}
            </p>
          </div>
        </div>

        {/* Desktop action buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="px-4 py-2 bg-card border border-border text-sm font-medium rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            onClick={() => handleSave("report")}
            disabled={isSaving}
            className="px-4 py-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm font-medium rounded-xl hover:bg-amber-500/20 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Pending Report
          </button>
          <button
            onClick={() => handleSave("submit")}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Save &amp; Submit
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium">{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Summary metric cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total PO Qty",   value: totalPOQty,    icon: ClipboardList, color: "bg-primary/10 text-primary" },
          { label: "Received Now",   value: totalReceived,  icon: TrendingUp,    color: "bg-blue-50 text-blue-700"   },
          { label: "Accepted",       value: totalAccepted,  icon: CheckCircle2,  color: "bg-emerald-50 text-emerald-700" },
          { label: "Still Pending",  value: totalPending,   icon: AlertTriangle, color: "bg-amber-50 text-amber-700" },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── GRN Header Details ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> GRN Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Field label="GRN Number">
            <input value={grnNumber} readOnly className={`${inputCls} bg-muted/30 cursor-not-allowed font-mono`} />
          </Field>
          <Field label="GRN Date">
            <input type="date" value={grnDate} onChange={e => setGrnDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Against PO (optional)">
            <select
              value={selectedPoId ?? ""}
              onChange={e => setSelectedPoId(e.target.value ? Number(e.target.value) : undefined)}
              className={inputCls}
            >
              <option value="">Direct Inward (No PO)</option>
              {poList.map((po: any) => (
                <option key={po.id} value={po.id}>{po.poNumber} — {po.supplierName}</option>
              ))}
            </select>
          </Field>
          <Field label="Warehouse *">
            <select
              value={selectedWarehouseId ?? ""}
              onChange={e => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
              className={`${inputCls} ${!selectedWarehouseId ? 'border-amber-400' : ''}`}
            >
              <option value="">Select Warehouse</option>
              {(warehouses ?? []).map((w: any) => (
                <option key={w.id} value={w.id}>{w.name} — {w.location}</option>
              ))}
            </select>
          </Field>
          <Field label="Delivery Challan No.">
            <input placeholder="DC / Invoice No." value={challanNo} onChange={e => setChallanNo(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Supplier Name">
            <input value={supplierName} readOnly placeholder="Auto-filled from PO" className={`${inputCls} bg-muted/30 cursor-not-allowed`} />
          </Field>
          <Field label="Vehicle / LR Number">
            <input placeholder="e.g. KA01AB1234" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Received By">
            <input placeholder="Store incharge name" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* ── Items Received (Partial) ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4" /> Items Received (Partial)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
              <tr>
                {["#", "Category", "Description", "Size", "Thickness",
                  "PO Qty", "Received Qty", "Accepted Qty", "Rejected", "Pending", "Status", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item, idx) => {
                const poQtyNum  = Number(item.poQty) || 0;
                const rcvNum    = Number(item.receivedQty) || 0;
                const accNum    = Number(item.acceptedQty) || 0;
                const rejected  = Math.max(0, rcvNum - accNum);
                const pending   = Math.max(0, poQtyNum - rcvNum);
                const pill      = statusPill(item);
                return (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.category}
                        onChange={e => updateItem(item.id, "category", e.target.value)}
                        className="w-full min-w-[120px] px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="">Select Category</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">
                      <input
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItem(item.id, "description", e.target.value)}
                        className="w-full min-w-[150px] px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <input
                        placeholder="Size"
                        value={item.size}
                        onChange={e => updateItem(item.id, "size", e.target.value)}
                        className="w-20 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <input
                        placeholder="Thickness"
                        value={item.thickness}
                        onChange={e => updateItem(item.id, "thickness", e.target.value)}
                        className="w-20 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <input
                        type="number" min={0}
                        placeholder="PO Qty"
                        value={item.poQty}
                        onChange={e => updateItem(item.id, "poQty", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    {/* Received */}
                    <td className="px-4 py-3">
                      <input
                        type="number" min={0} max={poQtyNum > 0 ? poQtyNum : undefined}
                        placeholder="Rcvd"
                        value={item.receivedQty}
                        onChange={e => updateItem(item.id, "receivedQty", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    {/* Accepted */}
                    <td className="px-4 py-3">
                      <input
                        type="number" min={0} max={rcvNum > 0 ? rcvNum : undefined}
                        placeholder="Accptd"
                        value={item.acceptedQty}
                        onChange={e => updateItem(item.id, "acceptedQty", e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-20 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </td>
                    {/* Rejected (auto) */}
                    <td className="px-4 py-3 text-center">
                      {rejected > 0
                        ? <span className="font-semibold text-red-500">{rejected}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    {/* Pending (auto) */}
                    <td className="px-4 py-3 text-center">
                      {pending > 0
                        ? <span className="font-semibold text-amber-600">{pending}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    {/* Status pill */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap ${pill.cls}`}>
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center min-w-[50px]">
                      <button 
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border bg-muted/10">
          <button 
            onClick={handleAddItem}
            className="w-full py-2.5 border border-dashed border-primary/30 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-t border-border bg-muted/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall receipt progress</span>
            <span className="text-xs font-bold text-foreground">{totalReceived} / {totalPOQty} units</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">{progressPct}% received</span>
            {progressPct === 100 && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Fully Received
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dimension & Quality Inspection ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Dimension &amp; Quality Inspection
        </h2>

        {/* Dimension inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <Field label="Sheet Height / Length (mm)">
            <input placeholder="e.g. 2440" value={height} onChange={e => setHeight(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Sheet Width (mm)">
            <input placeholder="e.g. 1220" value={width}  onChange={e => setWidth(e.target.value)}  className={inputCls} />
          </Field>
          <Field label="Thickness (mm)">
            <input placeholder="e.g. 1.0"  value={thick}  onChange={e => setThick(e.target.value)}  className={inputCls} />
          </Field>
        </div>

        {/* Quality dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          <Field label="Surface Quality">
            <Dropdown value={surface} onChange={setSurface} options={SURFACE_QUALITY} />
          </Field>
          <Field label="Edge / Corner Condition">
            <Dropdown value={edge} onChange={setEdge} options={EDGE_CONDITION} />
          </Field>
          <Field label="Warping / Flatness">
            <Dropdown value={warp} onChange={setWarp} options={WARPING_OPTIONS} />
          </Field>
          <Field label="Shade / Color Match">
            <Dropdown value={shade} onChange={setShade} options={SHADE_MATCH} />
          </Field>
          <Field label="Label / Batch Verification">
            <Dropdown value={label} onChange={setLabel} options={LABEL_VERIFY} />
          </Field>
          <Field label="Packing Condition">
            <Dropdown value={packing} onChange={setPacking} options={PACKING_COND} />
          </Field>
        </div>

        {/* Remarks */}
        <Field label="Inspection Remarks">
          <textarea
            rows={3}
            placeholder="Note any discrepancy, damage, short supply, or pending items..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </Field>
      </div>

      {/* ── Pending Balance Summary ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Balance Summary
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
              <tr>
                {["Item", "PO Qty", "Total Received", "Total Accepted", "Balance Pending", "Expected Delivery"].map(h => (
                  <th key={h} className="px-5 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map(item => {
                const poQtyNum = Number(item.poQty) || 0;
                const rcvNum   = Number(item.receivedQty) || 0;
                const balance  = Math.max(0, poQtyNum - rcvNum);
                return (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground text-xs">{item.description || "—"}</div>
                      <div className="text-xs text-muted-foreground">{item.category || "No Category"}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">{item.poQty === "" ? "—" : item.poQty}</td>
                    <td className="px-5 py-3.5 text-blue-700 font-semibold">{item.receivedQty === "" ? "—" : item.receivedQty}</td>
                    <td className="px-5 py-3.5 text-emerald-700 font-semibold">{item.acceptedQty === "" ? "—" : item.acceptedQty}</td>
                    <td className="px-5 py-3.5">
                      {balance > 0
                        ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">{balance}</span>
                        : <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{poQtyNum === 0 && rcvNum === 0 ? "—" : "Complete"}</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="date"
                        value={item.expectedDelivery}
                        onChange={e => updateItem(item.id, "expectedDelivery", e.target.value)}
                        className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Sticky Footer ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex sm:hidden flex-col gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
        <button
          onClick={() => handleSave("submit")}
          disabled={isSaving}
          className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Save &amp; Submit
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave("report")}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm font-medium rounded-xl hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Pending Report
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-muted text-foreground text-sm font-medium rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Draft
          </button>
        </div>
      </div>
    </div>
  );
}
