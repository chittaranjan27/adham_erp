import { 
  useGetDashboardSummary, 
  useGetRevenueTrends, 
  useGetWarehouseStock, 
  useGetRecentActivities 
} from "@workspace/api-client-react";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from "recharts";
import { ShoppingCart, Truck, IndianRupee, Users, ArrowUpRight, ArrowDownRight, Activity, Package, AlertTriangle, BarChart2, LucideIcon } from "lucide-react";
import heroImg from "@assets/Cloud_&_on-prem_access_1774437524990.png";
import { useRole } from "@/context/RoleContext";

interface KPIStat {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  trend: string | null;
  badge?: string | null;
}

export default function Dashboard() {
  const { role } = useRole();
  const isSalesManager = role === "sales_manager";

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: revTrends } = useGetRevenueTrends();
  const { data: stockDist } = useGetWarehouseStock();
  const { data: activities } = useGetRecentActivities();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  if (isSummaryLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );

  // ── KPI definitions ────────────────────────────────────────────────────────
  const salesManagerKPIs: KPIStat[] = [
    {
      title: "Total Orders",
      value: summary?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: "+24",
    },
    {
      title: "Pending Dispatches",
      value: summary?.pendingDispatches ?? 0,
      icon: Truck,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      trend: "-5",
    },
    {
      title: "Active Dealers",
      value: summary?.totalDealers ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      trend: "+2",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(summary?.monthlyRevenue ?? 0),
      icon: IndianRupee,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "+8.5%",
    },
    {
      title: "Saleable Stock",
      value: ((summary as any)?.totalSaleableQuantity ?? 0).toLocaleString("en-IN") + " units",
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: null,
      badge:
        ((summary as any)?.lowStockProductCount ?? 0) > 0
          ? `${(summary as any)!.lowStockProductCount} low stock`
          : null,
    },
  ];

  const allRolesKPIs: KPIStat[] = [
    {
      title: "Total Inventory Value",
      value: formatCurrency(summary?.totalInventoryValue ?? 0),
      icon: Package,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: "+12%",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(summary?.monthlyRevenue ?? 0),
      icon: IndianRupee,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "+8.5%",
    },
    {
      title: "Total Orders",
      value: summary?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: "+24",
    },
    {
      title: "Pending Dispatches",
      value: summary?.pendingDispatches ?? 0,
      icon: Truck,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      trend: "-5",
    },
    {
      title: "Active Dealers",
      value: summary?.totalDealers ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      trend: "+2",
    },
  ];

  const kpis = isSalesManager ? salesManagerKPIs : allRolesKPIs;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-4 sm:pb-8">
      {/* Hero Banner */}
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 text-white shadow-xl shadow-primary/10 border border-primary/20">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        <div className="relative p-5 sm:p-8 md:p-10 z-10 max-w-3xl">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 font-display">
            Adhams - The Royal Definition
          </h1>
          <p className="text-slate-300 text-sm sm:text-base lg:text-xl font-light mb-4 sm:mb-6">
            Welcome back to the unified ERP & Logistics command center.
          </p>
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary-foreground backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary" />
            </span>
            <span className="text-xs sm:text-sm font-medium">System Status: Optimal</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((stat, i) => (
          <div
            key={i}
            className={`bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-sm border border-border/60 hover:shadow-md hover:border-border transition-all group stat-card-gradient ${i === kpis.length - 1 && kpis.length % 2 !== 0 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {stat.trend ? (
                <span
                  className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 ${
                    String(stat.trend).startsWith("+") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {String(stat.trend).startsWith("+") ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.trend}
                </span>
              ) : stat.badge ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {stat.badge}
                </span>
              ) : null}
            </div>
            <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">{stat.title}</h3>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 tracking-tight truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Charts column */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 lg:col-span-2">
          {/* Revenue Trends — shown to all roles */}
          <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
            <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 font-display flex items-center gap-2">
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Revenue Trends
            </h3>
            <div className="h-48 sm:h-64 lg:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revTrends ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `₹${v / 100000}L`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Warehouse Stock Distribution — hidden for Sales Manager */}
          {!isSalesManager && (
            <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
              <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 font-display">Warehouse Stock Distribution</h3>
              <div className="h-48 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockDist ?? []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="warehouse" type="category" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500 }} width={80} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted)/0.5)" }} formatter={(value: number) => [value, "Items in Stock"]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed — shown to all roles */}
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-border flex flex-col max-h-[400px] lg:max-h-none lg:h-[calc(100vh-22rem)] lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Recent Activity
            </h3>
            <button className="text-xs sm:text-sm text-primary hover:underline font-medium">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 sm:space-y-6">
            {activities?.map((activity: any) => (
              <div
                key={activity.id}
                className="relative pl-6 pb-4 sm:pb-6 last:pb-0 before:absolute before:left-[11px] before:top-2 before:bottom-[-8px] last:before:hidden before:w-px before:bg-border"
              >
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{activity.user}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">•</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-1.5 sm:mt-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium uppercase tracking-wider bg-secondary text-secondary-foreground">
                    {activity.type.replace("_", " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
