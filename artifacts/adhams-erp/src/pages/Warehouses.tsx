import { useListWarehouses } from "@workspace/api-client-react";
import { Warehouse as WarehouseIcon, MapPin, Box, Plus, Activity, Edit, Trash2 } from "lucide-react";

export default function Warehouses() {
  const { data: warehouses, isLoading } = useListWarehouses();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Warehouse Network</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage locations, capacity, and stock distribution.</p>
        </div>
        <button className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2">
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
            
            return (
              <div key={wh.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
