import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Plus, X, Save, FileText, Package, Check, Trash2, Send, Paperclip, Image } from "lucide-react";
import { useCreatePurchaseOrder } from "../hooks/useApiQuery";

interface LineItem {
  id: string;
  category: string;
  description: string;
  size: string;
  thickness: string;
  shade: string;
  qty: number;
  unit: string;
  rate: number;
}

const CATEGORIES = ["Louver PVC", "Laminate Sheet", "HPL Sheet", "PVC Panel", "Other"];
const UNITS = ["Sheets", "Pcs", "Sqft", "Sqm", "Box"];
const QUALITY_OPTIONS = ["Excellent", "Good", "Acceptable", "Poor", "Reject"];
const EDGE_OPTIONS = ["Clean", "Minor Chips", "Damaged"];
const FLATNESS_OPTIONS = ["Flat", "Slight Bow", "Warped"];

export default function CreatePurchaseOrder() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createPO = useCreatePurchaseOrder();

  // Header State
  const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");

  // Line Items State
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", category: "Louver PVC", description: "", size: "", thickness: "", shade: "", qty: 1, unit: "Sheets", rate: 0 }
  ]);

  // GRN Quality State
  const [grnHeight, setGrnHeight] = useState("");
  const [grnWidth, setGrnWidth] = useState("");
  const [grnThickness, setGrnThickness] = useState("");
  const [surfaceQuality, setSurfaceQuality] = useState("");
  const [edgeCondition, setEdgeCondition] = useState("");
  const [warping, setWarping] = useState("");

  // Footer State
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [remarks, setRemarks] = useState("");

  // Photo Attachment State
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);

  const handleAddItem = () => {
    setItems([
      ...items, 
      { id: Math.random().toString(36).substr(2, 9), category: "Laminate Sheet", description: "", size: "", thickness: "", shade: "", qty: 1, unit: "Sheets", rate: 0 }
    ]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const { subtotal, gst, totalAmount } = useMemo(() => {
    const sub = items.reduce((acc, item) => acc + (item.qty || 0) * (item.rate || 0), 0);
    const tax = sub * 0.18;
    return { subtotal: sub, gst: tax, totalAmount: sub + tax };
  }, [items]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  const handleSubmit = async (action: 'draft' | 'submit' | 'grn') => {
    if (!supplierName.trim()) {
      setSubmitError("Supplier Name is required");
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Build the line items description for the notes field
      const itemsSummary = items
        .map((item, i) => `${i + 1}. ${item.category} – ${item.description || 'N/A'} (${item.qty} ${item.unit} @ ₹${item.rate})`)
        .join("\n");

      const qualityNotes = [
        surfaceQuality && `Surface: ${surfaceQuality}`,
        edgeCondition && `Edge: ${edgeCondition}`,
        warping && `Flatness: ${warping}`,
        grnHeight && `Height: ${grnHeight}mm`,
        grnWidth && `Width: ${grnWidth}mm`,
        grnThickness && `Thickness: ${grnThickness}mm`,
      ].filter(Boolean).join(", ");

      const fullNotes = [
        remarks,
        deliveryAddress && `Delivery: ${deliveryAddress}`,
        supplierContact && `Contact: ${supplierContact}`,
        itemsSummary && `Items:\n${itemsSummary}`,
        qualityNotes && `Quality: ${qualityNotes}`,
      ].filter(Boolean).join("\n\n");

      const status = action === 'submit' ? 'confirmed' : 'draft';

      await createPO.mutateAsync({
        supplierName: supplierName.trim(),
        supplierGstin: "",
        supplierCountry: "India",
        poType: "local",
        currency: "INR",
        totalAmount: totalAmount,
        taxAmount: gst,
        shippingAmount: 0,
        notes: fullNotes || undefined,
        expectedDeliveryDate: expectedDate || undefined,
        attachmentUrl: photoUrls.filter(u => u.trim()).join(" | ") || undefined,
        createdBy: localStorage.getItem("adhams_role") || "Purchase Team",
      });

      setLocation("/purchase-orders");
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <button className="p-2 bg-card border border-border rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Create Purchase Order</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 rounded-lg uppercase tracking-wider">
                Draft
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Louver PVC & Laminate Sheet Procurement</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button 
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-card border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button 
            onClick={() => handleSubmit('grn')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm font-medium rounded-xl hover:bg-amber-500/20 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate GRN
          </button>
          <button 
            onClick={() => handleSubmit('submit')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Submit PO
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between animate-in">
          <span className="text-sm font-medium">{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PO Details Section */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PO Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">PO Number</label>
            <input 
              value={poNumber} 
              onChange={e => setPoNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">PO Date</label>
            <input 
              type="date"
              value={poDate} 
              onChange={e => setPoDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Expected Delivery</label>
            <input 
              type="date"
              value={expectedDate} 
              onChange={e => setExpectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Supplier Name</label>
            <input 
              placeholder="e.g. ABC Laminates Pvt Ltd"
              value={supplierName} 
              onChange={e => setSupplierName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Supplier Contact</label>
            <input 
              placeholder="Phone / Email"
              value={supplierContact} 
              onChange={e => setSupplierContact(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Product Items Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product Items
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left min-w-[150px]">Category</th>
                <th className="px-4 py-3 text-left min-w-[200px]">Product / Description</th>
                <th className="px-4 py-3 text-left min-w-[120px]">Size (L×W)</th>
                <th className="px-4 py-3 text-left min-w-[100px]">Thickness</th>
                <th className="px-4 py-3 text-left min-w-[120px]">Shade / Color</th>
                <th className="px-4 py-3 text-left min-w-[100px]">Qty</th>
                <th className="px-4 py-3 text-left min-w-[120px]">Unit</th>
                <th className="px-4 py-3 text-left min-w-[120px]">Rate (₹)</th>
                <th className="px-4 py-3 text-right min-w-[120px]">Amount (₹)</th>
                <th className="px-4 py-3 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <select 
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      placeholder="Product name"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      placeholder="e.g. 8x4"
                      value={item.size}
                      onChange={(e) => updateItem(item.id, 'size', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      placeholder="e.g. 1mm"
                      value={item.thickness}
                      onChange={(e) => updateItem(item.id, 'thickness', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      placeholder="e.g. Teak"
                      value={item.shade}
                      onChange={(e) => updateItem(item.id, 'shade', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number"
                      min="0"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground bg-muted/10">
                    {formatCurrency((item.qty || 0) * (item.rate || 0))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

        {/* Totals Calculation */}
        <div className="p-6 border-t border-border bg-muted/5 flex justify-end">
          <div className="w-full sm:w-80 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="font-medium text-foreground">{formatCurrency(gst)}</span>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRN Quality pre-checks */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <Check className="w-4 h-4" />
          GRN / Quality Checks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Sheet Height Check (mm)</label>
            <input 
              placeholder="e.g. 2440"
              value={grnHeight}
              onChange={e => setGrnHeight(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Width Check (mm)</label>
            <input 
              placeholder="e.g. 1220"
              value={grnWidth}
              onChange={e => setGrnWidth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Thickness Check (mm)</label>
            <input 
              placeholder="e.g. 1.0"
              value={grnThickness}
              onChange={e => setGrnThickness(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Surface Quality</label>
            <select 
              value={surfaceQuality}
              onChange={e => setSurfaceQuality(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Select</option>
              {QUALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Edge Condition</label>
            <select 
              value={edgeCondition}
              onChange={e => setEdgeCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Select</option>
              {EDGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Warping / Flatness</label>
            <select 
              value={warping}
              onChange={e => setWarping(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Select</option>
              {FLATNESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Delivery & Remarks */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <TruckIcon className="w-4 h-4" />
          Delivery & Remarks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Delivery Address</label>
            <textarea 
              rows={3}
              placeholder="Site / Warehouse address"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Remarks / Special Instructions</label>
            <textarea 
              rows={3}
              placeholder="e.g. Handle carefully, stack flat, etc."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Photo Attachments */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Photo Attachments
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Attach product photos, quotation scans, or supplier documents. Paste Google Drive, Dropbox, or direct image URLs.
        </p>
        <div className="space-y-3">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center shrink-0">
                <Image className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                value={url}
                onChange={(e) => {
                  const updated = [...photoUrls];
                  updated[idx] = e.target.value;
                  setPhotoUrls(updated);
                }}
                placeholder="https://drive.google.com/... or paste image URL"
                className="flex-1 px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {url.trim() && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline whitespace-nowrap">
                  Preview
                </a>
              )}
              {photoUrls.length > 1 && (
                <button
                  onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setPhotoUrls([...photoUrls, ""])}
            className="w-full py-2.5 border border-dashed border-primary/30 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Another Photo URL
          </button>
        </div>
        {photoUrls.some(u => u.trim()) && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-xs text-emerald-700 font-medium">
              📎 {photoUrls.filter(u => u.trim()).length} attachment(s) will be saved with this PO
            </p>
          </div>
        )}
      </div>
      
      {/* Mobile Footer Actions (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex sm:hidden flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <button 
          onClick={() => handleSubmit('submit')}
          disabled={isSubmitting}
          className="w-full py-3 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Submit PO
        </button>
        <button 
          onClick={() => handleSubmit('grn')}
          disabled={isSubmitting}
          className="w-full py-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm font-medium rounded-xl hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Generate GRN
        </button>
        <button 
          onClick={() => handleSubmit('draft')}
          disabled={isSubmitting}
          className="w-full py-3 bg-muted text-foreground text-sm font-medium rounded-xl hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>
      </div>
    </div>
  );
}

// Inline Icon
function TruckIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-9h-5V5H10" />
      <path d="M15 6h4l3 3v5h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
