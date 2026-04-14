import { useGetFinanceReport } from "@workspace/api-client-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { TrendingUp, ArrowDownRight, ArrowUpRight, DollarSign, Target } from "lucide-react";
import finImg from "@assets/CRM_reports_at_work_1774437524993.png";
import { useState } from "react";

export default function Finance() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const { data: report, isLoading } = useGetFinanceReport({ period });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  
  const COLORS = ['hsl(var(--primary))', 'hsl(20, 80%, 40%)', 'hsl(40, 80%, 40%)', 'hsl(60, 80%, 40%)'];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display">Financial Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Revenue analysis, margins, and performance metrics.</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
          className="bg-card border border-border text-sm font-medium rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="monthly">This Month</option>
          <option value="quarterly">This Quarter</option>
          <option value="yearly">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { title: "Gross Revenue", value: formatCurrency(report?.totalRevenue || 0), icon: TrendingUp, trend: "+14.5%", color: "text-primary", bg: "bg-primary/10" },
          { title: "Total Cost", value: formatCurrency(report?.totalCost || 0), icon: DollarSign, trend: "+5.2%", color: "text-red-500", bg: "bg-red-500/10" },
          { title: "Gross Margin", value: `${report?.grossMargin || 0}%`, icon: Target, trend: "+2.1%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Receivables", value: formatCurrency(report?.outstandingReceivables || 0), icon: ArrowDownRight, trend: "-1.5%", color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-border/60 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 rounded-bl-full -z-0"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-muted-foreground text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-foreground mt-1">{isLoading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold mb-6 font-display">Revenue by Channel</h3>
          <div className="flex-1 min-h-[300px] w-full relative">
            {isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report?.channelBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="channel"
                  >
                    {(report?.channelBreakdown || []).map((entry: any, index: any) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
            <h3 className="text-lg font-bold font-display">Top Performing Products</h3>
            <p className="text-sm text-muted-foreground">Highest revenue generators this period</p>
          </div>
          <div className="flex-1 p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 font-semibold border-b border-border">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-right">Units Sold</th>
                  <th className="px-6 py-4 text-right">Revenue Generated</th>
                  <th className="px-6 py-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : (
                  report?.topProducts?.map((prod: any, i: any) => {
                    const percentage = report.totalRevenue ? (prod.revenue / report.totalRevenue) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-muted/10">
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i+1}</span>
                          {prod.name}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{prod.units.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-semibold text-foreground">{formatCurrency(prod.revenue)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${percentage}%` }}></div>
                            </div>
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
      
      {/* Decorative Image Banner at bottom */}
      <div className="w-full h-32 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-lg mt-4 sm:mt-8 border border-border">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${finImg})`, backgroundPositionY: '20%' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-sidebar/20"></div>
        <div className="absolute bottom-6 left-8">
          <h2 className="text-2xl font-bold text-white font-display">Data-Driven Growth</h2>
          <p className="text-slate-300">Empowering Adhams executives with real-time financial clarity.</p>
        </div>
      </div>
    </div>
  );
}
