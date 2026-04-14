import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetImportWorkflow, useAdvanceImportStage } from "@/hooks/useApiQuery";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, DollarSign, Container, CreditCard, ScanLine, Warehouse,
  CheckCircle2, Clock, AlertCircle, ArrowLeft, ChevronRight, X, Globe,
  Info, Package, ClipboardList
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

const STAGE_ICONS: Record<string, typeof FileText> = {
  proforma_invoice: FileText,
  advance_payment: DollarSign,
  container_loading: Container,
  remaining_payment: CreditCard,
  unloading_qc: ScanLine,
  stocking: Warehouse,
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  proforma_invoice: "Upload the Proforma Invoice from the supplier",
  advance_payment: "Record the advance payment (typically 30–50%)",
  container_loading: "Confirm container loading at origin port",
  remaining_payment: "Pay the remaining balance before or at port",
  unloading_qc: "Unload container & perform QC inspection",
  stocking: "Place goods in warehouse & generate GRN",
};

// Per-stage fields — must mirror server STAGE_VALIDATION
type FieldType = "text" | "number" | "textarea" | "select";
interface StageField {
  field: string;
  label: string;
  placeholder?: string;
  type: FieldType;
  required: boolean | ((form: any) => boolean);
  hint?: string;
}

const STAGE_FIELDS: Record<string, StageField[]> = {
  proforma_invoice: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "attachmentUrl", label: "PI Document URL", placeholder: "https://drive.google.com/...", type: "text", required: true, hint: "Attach the Proforma Invoice document" },
    { field: "notes", label: "Notes", placeholder: "Any comments about the PI...", type: "textarea", required: false },
  ],
  advance_payment: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "attachmentUrl", label: "Payment Receipt URL", placeholder: "https://drive.google.com/...", type: "text", required: true, hint: "Attach proof of advance payment" },
    { field: "notes", label: "Payment Reference / Amount", placeholder: "e.g. UTR 123456789 – ₹4,50,000", type: "text", required: true, hint: "Enter payment reference number and amount paid" },
  ],
  container_loading: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "attachmentUrl", label: "BL / Loading Confirmation URL", placeholder: "https://drive.google.com/...", type: "text", required: true, hint: "Attach Bill of Lading or container loading confirmation" },
    { field: "notes", label: "Container / BL Number", placeholder: "e.g. MSKU1234567 / BL-2024-0891", type: "text", required: true, hint: "Enter the container number or Bill of Lading number" },
  ],
  remaining_payment: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "attachmentUrl", label: "Payment Receipt URL", placeholder: "https://drive.google.com/...", type: "text", required: true, hint: "Attach proof of remaining payment" },
    { field: "notes", label: "Payment Reference / Amount", placeholder: "e.g. UTR 987654321 – ₹6,00,000", type: "text", required: true, hint: "Enter payment reference number and amount paid" },
  ],
  unloading_qc: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "shortageQty", label: "Shortage Qty", placeholder: "0", type: "number", required: true, hint: "Units missing from manifest (enter 0 if none)" },
    { field: "damageQty", label: "Damage Qty", placeholder: "0", type: "number", required: true, hint: "Units found damaged (enter 0 if none)" },
    // damageReport rendered conditionally below
    { field: "attachmentUrl", label: "QC Report URL (optional)", placeholder: "https://drive.google.com/...", type: "text", required: false },
    { field: "notes", label: "Additional Notes", placeholder: "Any other observations...", type: "textarea", required: false },
  ],
  stocking: [
    { field: "completedBy", label: "Completed By", placeholder: "Your name / team", type: "text", required: true },
    { field: "productId", label: "Product", type: "select", required: true, hint: "Select the product being stocked — a GRN and inventory entry will be auto-created" },
    { field: "quantity", label: "Quantity Received (units)", placeholder: "e.g. 500", type: "number", required: true, hint: "Total units placed into the warehouse" },
    { field: "binLocation", label: "Bin / Shelf Location (optional)", placeholder: "e.g. A-03-02", type: "text", required: false },
    { field: "notes", label: "Stocking Notes", placeholder: "e.g. GRN ref, location comments...", type: "text", required: true, hint: "Enter any stocking notes or location reference" },
    { field: "attachmentUrl", label: "Stocking Report URL (optional)", placeholder: "https://drive.google.com/...", type: "text", required: false },
  ],
};

type FormState = Record<string, string>;

function getInitialForm(): FormState {
  return {
    completedBy: "", attachmentUrl: "", notes: "", binLocation: "",
    shortageQty: "", damageQty: "", damageReport: "",
    productId: "", quantity: "",
  };
}

function validateStage(stage: string, form: FormState): string[] {
  const fields = STAGE_FIELDS[stage] ?? [];
  const errors: string[] = [];
  for (const f of fields) {
    if (f.type === "select") continue; // handled separately below
    const isRequired = typeof f.required === "function" ? f.required(form) : f.required;
    if (!isRequired) continue;
    const val = form[f.field];
    const isNumeric = ["shortageQty", "damageQty", "quantity"].includes(f.field);
    const missing = isNumeric
      ? val === undefined || val === null || val === ""
      : !val || val.trim() === "";
    if (missing) errors.push(`"${f.label}" is required`);
  }
  // Stage-specific extra checks
  if (stage === "unloading_qc" && parseInt(form.damageQty || "0") > 0 && !form.damageReport?.trim()) {
    errors.push("Damage report is required when damage quantity > 0");
  }
  if (stage === "stocking" && !form.productId) {
    errors.push("Please select a product to stock");
  }
  return errors;
}

export default function ImportWorkflow() {
  const [, params] = useRoute("/import-workflow/:id");
  const poId = params?.id ? parseInt(params.id) : undefined;

  const { data, isLoading, refetch } = useGetImportWorkflow(poId);
  const advanceStage = useAdvanceImportStage();

  // Fetch products for the stocking dropdown
  const { data: productsData } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => fetch("/api/products?limit=100").then(r => r.json()),
  });
  const products: any[] = productsData?.items ?? productsData?.products ?? [];

  const [activeStageId, setActiveStageId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(getInitialForm());
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [successInfo, setSuccessInfo] = useState<{ msg: string; grn?: any } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const { can } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading workflow...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Globe className="w-12 h-12 mb-3 opacity-30" />
        <p>Purchase order not found.</p>
        <Link href="/purchase-orders"><a className="text-primary text-sm mt-2">← Back to Purchase Orders</a></Link>
      </div>
    );
  }

  const stages = data.stages ?? [];
  const activeStage = stages.find((s: any) => s.id === activeStageId);
  const activeFields = activeStage ? (STAGE_FIELDS[activeStage.stage] ?? []) : [];

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 6000);
  };

  const openModal = (stageId: number) => {
    setActiveStageId(stageId);
    setForm(getInitialForm());
    setFieldErrors([]);
  };

  const closeModal = () => {
    setActiveStageId(null);
    setFieldErrors([]);
  };

  const handleAdvance = async () => {
    if (!poId || !activeStageId || !activeStage) return;

    // Client-side validation
    const localErrors = validateStage(activeStage.stage, form);
    if (localErrors.length > 0) {
      setFieldErrors(localErrors);
      return;
    }
    setFieldErrors([]);

    try {
      const payload: any = {
        completedBy: form.completedBy.trim() || "Operations Team",
        notes: form.notes.trim() || undefined,
        attachmentUrl: form.attachmentUrl.trim() || undefined,
      };

      if (activeStage.stage === "unloading_qc") {
        payload.shortageQty = parseInt(form.shortageQty || "0");
        payload.damageQty = parseInt(form.damageQty || "0");
        if (form.damageReport.trim()) payload.damageReport = form.damageReport.trim();
      }

      if (activeStage.stage === "stocking") {
        payload.productId = parseInt(form.productId);
        payload.quantity = parseInt(form.quantity);
        if (form.binLocation.trim()) payload.binLocation = form.binLocation.trim();
      }

      const result = await advanceStage.mutateAsync({ poId, stageId: activeStageId, data: payload });
      closeModal();

      // If stocking stage auto-created a GRN, show richer success banner
      if (result?.autoGrn) {
        setSuccessInfo({
          msg: `"${activeStage.label}" completed! GRN ${result.autoGrn.grnNumber} created with ${result.autoGrn.totalItemsReceived} units — pending QC release.`,
          grn: result.autoGrn,
        });
        setTimeout(() => setSuccessInfo(null), 10000);
      } else {
        showToast("success", `"${activeStage.label}" marked as completed!`);
      }

      refetch();
    } catch (e: any) {
      const serverData = e?.data ?? e?.response?.data;
      if (serverData?.fields && Array.isArray(serverData.fields)) {
        setFieldErrors(serverData.fields);
      } else {
        const msg = serverData?.error ?? e?.message ?? "Failed to advance stage";
        showToast("error", msg);
      }
    }
  };

  const formatCurrency = (val: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: currency === "INR" ? "INR" : "USD" }).format(val);

  const isFieldRequired = (f: StageField) =>
    typeof f.required === "function" ? f.required(form) : f.required;

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${
      hasError
        ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
        : "bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
    }`;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-sm max-w-sm ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* GRN auto-created success banner */}
      {successInfo && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xl p-5 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">Import Complete!</p>
              <p className="text-xs text-emerald-700 mt-1">{successInfo.msg}</p>
              {successInfo.grn && (
                <div className="mt-2 pt-2 border-t border-emerald-200 space-y-0.5">
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>GRN Number</span>
                    <span className="font-mono font-semibold">{successInfo.grn.grnNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>Units received</span>
                    <span className="font-semibold">{successInfo.grn.totalItemsReceived}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>Status</span>
                    <span className="font-semibold capitalize">{successInfo.grn.status} (awaiting release)</span>
                  </div>
                </div>
              )}
              <Link href="/grn">
                <a className="text-xs text-emerald-700 font-semibold underline mt-2 inline-block">View in GRN →</a>
              </Link>
            </div>
            <button onClick={() => setSuccessInfo(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <button className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🌏</div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Import Workflow — {data.poNumber}</h1>
              <p className="text-sm text-muted-foreground">{data.supplierName} · {data.supplierCountry} · {formatCurrency(data.totalAmount, data.currency)}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{data.progressPercent}%</div>
          <div className="text-xs text-muted-foreground">{data.completedCount}/{data.totalStages} stages</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Overall Progress</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${data.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
            {data.status}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-700"
            style={{ width: `${data.progressPercent}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {stages.map((s: any) => (
            <div key={s.id} className="text-center">
              <div className="text-xs text-muted-foreground leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-1 gap-3">
        {stages.map((stage: any, index: number) => {
          const Icon = STAGE_ICONS[stage.stage] ?? Clock;
          const isCompleted = stage.status === "completed";
          const isActive = stage.status === "in_progress";
          const isPending = stage.status === "pending";
          const stageFields = STAGE_FIELDS[stage.stage] ?? [];
          const requiredLabels = stageFields
            .filter(f => f.required === true)
            .map(f => f.label);

          return (
            <div
              key={stage.id}
              className={`bg-card border rounded-2xl p-5 transition-all ${isActive ? "border-primary shadow-lg shadow-primary/10" : isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-border opacity-70"}`}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-100" : isActive ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${isCompleted ? "text-emerald-700" : isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-white" : "bg-muted-foreground/30 text-muted-foreground"}`}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-semibold text-foreground">{stage.label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${isCompleted ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isCompleted ? "✓ Completed" : isActive ? "● In Progress" : "Pending"}
                    </span>
                    {/* Stocking badge — will auto-create GRN */}
                    {stage.stage === "stocking" && isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Auto-creates GRN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{STAGE_DESCRIPTIONS[stage.stage]}</p>

                  {/* Required fields hint */}
                  {isActive && requiredLabels.length > 0 && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Required: <span className="font-semibold">{requiredLabels.join(", ")}</span></span>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {stage.completedAt && <span>Completed: {new Date(stage.completedAt).toLocaleDateString("en-IN")}</span>}
                      {stage.completedBy && <span>By: <span className="font-medium text-foreground/70">{stage.completedBy}</span></span>}
                      {stage.notes && <span className="italic">"{stage.notes}"</span>}
                      {stage.attachmentUrl && <a href={stage.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View attachment ↗</a>}
                      {stage.shortageQty > 0 && <span className="text-amber-600 font-semibold">⚠ Shortage: {stage.shortageQty} units</span>}
                      {stage.damageQty > 0 && <span className="text-red-600 font-semibold">🔴 Damage: {stage.damageQty} units</span>}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                  {isPending && <Clock className="w-6 h-6 text-muted-foreground/40" />}
                  {isActive && can("edit") && (
                    <button
                      onClick={() => openModal(stage.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Complete Stage <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {index < stages.length - 1 && (
                <div className={`ml-6 w-0.5 h-3 mt-3 ${isCompleted ? "bg-emerald-300" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage completion modal */}
      {activeStageId && activeStage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  {(() => { const Icon = STAGE_ICONS[activeStage.stage] ?? Clock; return <Icon className="w-4 h-4 text-primary" />; })()}
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Complete: {activeStage.label}</h2>
                  <p className="text-xs text-muted-foreground">Fields marked <span className="text-red-500">*</span> are required</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stocking stage info banner */}
            {activeStage.stage === "stocking" && (
              <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Completing this stage will <strong>automatically create a GRN</strong> and add the product to inventory in <strong>Pending QC</strong> state. Stock becomes saleable after the warehouse manager releases the GRN.
                </p>
              </div>
            )}

            {/* Validation error banner */}
            {fieldErrors.length > 0 && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Please fix the following:</p>
                    <ul className="space-y-0.5">
                      {fieldErrors.map((err, i) => <li key={i} className="text-xs text-red-600">• {err}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {activeFields.map((f) => {
                // Skip conditional fields that have a function-type required — we handle them below
                if (typeof f.required === "function") return null;
                const required = isFieldRequired(f);
                const hasError = fieldErrors.some(e => e.toLowerCase().includes(f.label.toLowerCase()));

                return (
                  <div key={f.field}>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${hasError ? "text-red-600" : "text-muted-foreground"}`}>
                      {f.label}{required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {f.hint && <p className="text-xs text-muted-foreground mb-1.5">{f.hint}</p>}

                    {f.type === "select" && f.field === "productId" ? (
                      <select
                        value={form.productId}
                        onChange={e => { setForm(p => ({ ...p, productId: e.target.value })); if (fieldErrors.length) setFieldErrors([]); }}
                        className={inputClass(hasError || (fieldErrors.some(e => e.toLowerCase().includes("product"))))}
                      >
                        <option value="">— Select a product —</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name} ({p.category}) — {p.hsnCode}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={form[f.field] ?? ""}
                        onChange={e => { setForm(p => ({ ...p, [f.field]: e.target.value })); if (fieldErrors.length) setFieldErrors([]); }}
                        rows={2}
                        placeholder={f.placeholder}
                        className={`${inputClass(hasError)} resize-none`}
                      />
                    ) : f.type === "number" ? (
                      <input
                        type="number"
                        min="0"
                        value={form[f.field] ?? ""}
                        onChange={e => { setForm(p => ({ ...p, [f.field]: e.target.value })); if (fieldErrors.length) setFieldErrors([]); }}
                        placeholder={f.placeholder}
                        className={inputClass(hasError)}
                      />
                    ) : (
                      <input
                        type="text"
                        value={form[f.field] ?? ""}
                        onChange={e => { setForm(p => ({ ...p, [f.field]: e.target.value })); if (fieldErrors.length) setFieldErrors([]); }}
                        placeholder={f.placeholder}
                        className={inputClass(hasError)}
                      />
                    )}
                  </div>
                );
              })}

              {/* Conditional: damage report for unloading_qc */}
              {activeStage.stage === "unloading_qc" && parseInt(form.damageQty || "0") > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-red-600">
                    Damage Report <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-1.5">Required when damage quantity &gt; 0</p>
                  <textarea
                    value={form.damageReport ?? ""}
                    onChange={e => { setForm(p => ({ ...p, damageReport: e.target.value })); if (fieldErrors.length) setFieldErrors([]); }}
                    rows={3}
                    placeholder="Describe the damage — type, quantity, affected batches..."
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none resize-none transition-colors ${fieldErrors.some(e => e.toLowerCase().includes("damage report")) ? "border-red-400 bg-red-50" : "border-red-200 bg-red-50/50 focus:border-red-400 focus:ring-2 focus:ring-red-100"}`}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdvance}
                disabled={advanceStage.isPending}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {advanceStage.isPending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                {activeStage.stage === "stocking" ? "Complete & Create GRN" : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
