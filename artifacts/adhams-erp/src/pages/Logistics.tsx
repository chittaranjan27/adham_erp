import { useListDispatches } from "@workspace/api-client-react";
import { Truck, Map, PackageCheck, AlertTriangle, Route, Edit, Trash2 } from "lucide-react";

export default function Logistics() {
  const { data, isLoading } = useListDispatches({ limit: 50 });

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'planned': return { icon: Map, color: 'text-blue-600 bg-blue-100', label: 'Planned' };
      case 'loading': return { icon: PackageCheck, color: 'text-amber-600 bg-amber-100', label: 'Loading' };
      case 'in_transit': return { icon: Truck, color: 'text-primary bg-primary/10', label: 'In Transit' };
      case 'delivered': return { icon: PackageCheck, color: 'text-emerald-600 bg-emerald-100', label: 'Delivered' };
      case 'failed': return { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Failed' };
      default: return { icon: Truck, color: 'text-gray-600 bg-gray-100', label: status };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Logistics & Dispatch</h1>
        <p className="text-muted-foreground mt-1 text-sm">Real-time tracking of outbound shipments and fleet management.</p>
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border">
            <tr>
              <th className="px-6 py-4">Dispatch Info</th>
              <th className="px-6 py-4">Route Plan</th>
              <th className="px-6 py-4">Fleet & Driver</th>
              <th className="px-6 py-4">e-Way Bill</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-10 bg-muted rounded w-32"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-40"></div></td>
                  <td className="px-6 py-4"><div className="h-8 bg-muted rounded w-32"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                  <td className="px-6 py-4"><div className="h-8 bg-muted rounded-full w-24 mx-auto"></div></td>
                </tr>
              ))
            ) : (
              data?.items?.map((dispatch: any) => {
                const statusInfo = getStatusDisplay(dispatch.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <tr key={dispatch.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{dispatch.dispatchNumber}</div>
                      <div className="text-xs text-muted-foreground mt-1">Order #{dispatch.orderId}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(dispatch.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium max-w-[200px] truncate">{dispatch.routePlan || 'Route not assigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shrink-0 border border-border">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{dispatch.vehicleNumber || 'Unassigned'}</div>
                          <div className="text-xs text-muted-foreground">{dispatch.driverName} • {dispatch.driverPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                      {dispatch.eWayBillNumber || 'Pending Generation'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border border-transparent shadow-sm ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </div>
                      </div>
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
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
