import { useState } from "react";
import { useListWarehouses } from "@workspace/api-client-react";
import { useListWarehouseLocations, useCreateWarehouseLocation } from "@/hooks/useApiQuery";
import { Warehouse as WarehouseIcon, MapPin, Box, Plus, Edit, Trash2, Layers, X, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const LOCATION_TYPES = ["shelf", "zone", "rack", "cold_storage", "hazmat"];

interface LocationForm {
  warehouseId: string;
  name: string;
  floor: string;
  section: string;
  shelfNumber: string;
  capacity: string;
  locationType: string;
  notes: string;
}

const defaultLocationForm: LocationForm = {
  warehouseId: "", name: "", floor: "", section: "", shelfNumber: "", capacity: "", locationType: "shelf", notes: "",
};

export default function Warehouses() {
  const { data: warehouses, isLoading } = useListWarehouses();
  const [expandedWh, setExpandedWh] = useState<number | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locForm, setLocForm] = useState<LocationForm>(defaultLocationForm);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Fetch locations for the expanded warehouse
  const { data: locationsData, isLoading: locationsLoading } = useListWarehouseLocations(expandedWh ?? undefined);
  const createLocation = useCreateWarehouseLocation();

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateLocation = async () => {
    if (!locForm.warehouseId || !locForm.name) {
      showToast("error", "Warehouse and location name are required.");
      return;
    }
    try {
      await createLocation.mutateAsync({
        warehouseId: parseInt(locForm.warehouseId),
        name: locForm.name,
        floor: locForm.floor || undefined,
        section: locForm.section || undefined,
        shelfNumber: locForm.shelfNumber || undefined,
        capacity: locForm.capacity ? parseInt(locForm.capacity) : undefined,
        locationType: locForm.locationType,
        notes: locForm.notes || undefined,
      });
      showToast("success", `Location "${locForm.name}" created successfully!`);
      setLocForm(defaultLocationForm);
      setShowLocationForm(false);
    } catch (e: any) {
      showToast("error", e?.message || "Failed to create location.");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "shelf": return "bg-blue-100 text-blue-700 border-blue-200";
      case "zone": return "bg-purple-100 text-purple-700 border-purple-200";
      case "rack": return "bg-amber-100 text-amber-700 border-amber-200";
      case "cold_storage": return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "hazmat": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Warehouse Network</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage warehouses, locations, capacity, and stock distribution.</p>
        </div>
        <button
          onClick={() => {
            setShowLocationForm(true);
            setLocForm(defaultLocationForm);
          }}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Location
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl h-64 animate-pulse border border-border"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {warehouses?.map((wh: any) => {
            const utilization = wh.capacity && wh.usedCapacity ? (wh.usedCapacity / wh.capacity) * 100 : 0;
            const utilColor = utilization > 85 ? 'bg-red-500' : utilization > 60 ? 'bg-orange-500' : 'bg-emerald-500';
            const isExpanded = expandedWh === wh.id;
            
            return (
              <div key={wh.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-xl transition-all duration-300 relative group">
                {wh.isActive ? (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 text-[10px] uppercase font-bold rounded-full border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Active
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold rounded-full border border-slate-200">
                    Inactive
                  </div>
                )}
                
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <WarehouseIcon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                      <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold font-display text-foreground">{wh.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2 text-sm">
                    <MapPin className="w-4 h-4" /> {wh.location}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">Code: {wh.code}</span>
                  </div>
                </div>

                <div className="p-6 mt-4 border-t border-border bg-muted/10">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Box className="w-4 h-4 text-muted-foreground" /> Capacity Utilization
                    </div>
                    <span className="text-sm font-bold">{Math.round(utilization)}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${utilColor} transition-all duration-1000`} style={{ width: `${utilization}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                    <span>Used: <span className="font-semibold text-foreground">{wh.usedCapacity?.toLocaleString() || 0}</span></span>
                    <span>Total: <span className="font-semibold text-foreground">{wh.capacity?.toLocaleString() || 0}</span></span>
                  </div>
                </div>

                {/* Expandable Locations Section */}
                <button
                  onClick={() => setExpandedWh(isExpanded ? null : wh.id)}
                  className="w-full px-6 py-3 border-t border-border bg-muted/5 flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Locations & Bins</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="px-6 py-4 bg-muted/5 border-t border-border space-y-3">
                    {locationsLoading ? (
                      <div className="text-xs text-muted-foreground animate-pulse">Loading locations...</div>
                    ) : (locationsData?.items?.filter((l: any) => l.warehouseId === wh.id) ?? []).length === 0 ? (
                      <div className="text-center py-4">
                        <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No locations defined yet</p>
                        <button
                          onClick={() => {
                            setLocForm({ ...defaultLocationForm, warehouseId: String(wh.id) });
                            setShowLocationForm(true);
                          }}
                          className="mt-2 text-xs text-primary hover:underline font-medium"
                        >
                          + Add first location
                        </button>
                      </div>
                    ) : (
                      <>
                        {(locationsData?.items?.filter((l: any) => l.warehouseId === wh.id) ?? []).map((loc: any) => {
                          const locUtil = loc.capacity ? Math.round((loc.usedCapacity / loc.capacity) * 100) : 0;
                          return (
                            <div key={loc.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">{loc.name}</span>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${getTypeColor(loc.locationType)}`}>
                                    {loc.locationType?.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  <span className="font-mono">{loc.code}</span>
                                  {loc.floor && <span className="ml-2">Floor: {loc.floor}</span>}
                                  {loc.section && <span className="ml-2">Section: {loc.section}</span>}
                                </div>
                              </div>
                              <div className="text-right text-xs shrink-0">
                                <div className="font-semibold">{locUtil}%</div>
                                <div className="text-muted-foreground">{loc.usedCapacity ?? 0}/{loc.capacity}</div>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => {
                            setLocForm({ ...defaultLocationForm, warehouseId: String(wh.id) });
                            setShowLocationForm(true);
                          }}
                          className="w-full py-2 border border-dashed border-primary/30 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 font-medium text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Location
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Location Modal */}
      {showLocationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold font-display">Add Warehouse Location</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Define a shelf, zone, or rack within a warehouse</p>
              </div>
              <button onClick={() => setShowLocationForm(false)} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1.5">Warehouse <span className="text-red-500">*</span></label>
                <select
                  value={locForm.warehouseId}
                  onChange={(e) => setLocForm({ ...locForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                >
                  <option value="">Select warehouse...</option>
                  {warehouses?.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} — {w.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Location Name <span className="text-red-500">*</span></label>
                <input
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder="e.g. Shelf A-01, Cold Room 1, Zone B"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Floor</label>
                  <input
                    value={locForm.floor}
                    onChange={(e) => setLocForm({ ...locForm, floor: e.target.value })}
                    placeholder="e.g. G, 1, 2"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Section</label>
                  <input
                    value={locForm.section}
                    onChange={(e) => setLocForm({ ...locForm, section: e.target.value })}
                    placeholder="e.g. A, B, C"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Shelf #</label>
                  <input
                    value={locForm.shelfNumber}
                    onChange={(e) => setLocForm({ ...locForm, shelfNumber: e.target.value })}
                    placeholder="e.g. 01, 02"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Location Type</label>
                  <select
                    value={locForm.locationType}
                    onChange={(e) => setLocForm({ ...locForm, locationType: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                  >
                    {LOCATION_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Capacity (units)</label>
                  <input
                    type="number"
                    value={locForm.capacity}
                    onChange={(e) => setLocForm({ ...locForm, capacity: e.target.value })}
                    placeholder="1000"
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <textarea
                  value={locForm.notes}
                  onChange={(e) => setLocForm({ ...locForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Temperature requirements, restrictions, etc."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLocationForm(false)} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button
                  onClick={handleCreateLocation}
                  disabled={createLocation.isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {createLocation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Create Location</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
