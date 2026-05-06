import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion, type Variants } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface Analytics {
  monthlyTrend: { month: string; cases: number; savings: number }[];
  departureTypeBreakdown: { status: string; count: number }[];
  planTypeAdoption: { status: string; count: number }[];
  averageSavingsPerCase: number;
  averageDaysToComplete: number;
  satisfactionScore: number | null;
}

const COLORS = [
  "hsl(173 80% 35%)",
  "hsl(35 90% 50%)",
  "hsl(217 91% 60%)",
  "hsl(142 70% 45%)",
  "hsl(263 70% 60%)",
  "hsl(215 16% 60%)",
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

function LoadingSkeleton() {
  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function EmployerAnalytics() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ["/employer/analytics"],
    queryFn: () => api.get("/employer/analytics"),
  });

  if (isLoading || !data) return <LoadingSkeleton />;

  const departureData = data.departureTypeBreakdown.map(d => ({
    name: capitalize(d.status.replace(/_/g, ' ')),
    value: d.count,
  }));

  const planData = data.planTypeAdoption.map(d => ({
    name: capitalize(d.status.replace(/_/g, ' ')),
    value: d.count,
  }));

  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Transition program outcomes and financial trends</p>
          </div>

          {/* KPI Row */}
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border shadow-sm p-6 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Avg Monthly Savings / Case</div>
              <div className="text-4xl font-display font-bold text-green-700 mb-1">{formatCurrency(data.averageSavingsPerCase)}</div>
              <div className="text-xs text-muted-foreground">vs. equivalent COBRA coverage cost</div>
            </motion.div>
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border shadow-sm p-6 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Avg Days to Plan Selection</div>
              <div className="text-4xl font-display font-bold text-primary mb-1">{data.averageDaysToComplete}<span className="text-2xl font-normal text-muted-foreground ml-1">days</span></div>
              <div className="text-xs text-muted-foreground">from case creation to plan selected</div>
            </motion.div>
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border shadow-sm p-6 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Employee Satisfaction Score</div>
              <div className="text-4xl font-display font-bold text-amber-600 mb-1">
                {data.satisfactionScore ? `${data.satisfactionScore.toFixed(1)}/5` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{data.satisfactionScore ? "Based on post-selection surveys" : "No survey data yet"}</div>
            </motion.div>
          </motion.div>

          {/* Monthly Trend + Departure Types */}
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-card-foreground mb-1 uppercase tracking-wider">Monthly Cases & Savings</h3>
              <p className="text-xs text-muted-foreground mb-5">Case volume (left axis) vs. average monthly savings (right axis)</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrend} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(v, n) => [n === "savings" ? formatCurrency(v as number) + "/mo avg" : v + " cases", n === "savings" ? "Avg Savings" : "Cases"]}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px", fontWeight: 500 }} />
                    <Line yAxisId="left" dataKey="cases" name="Cases" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" dataKey="savings" name="Avg Savings" stroke="hsl(142 70% 45%)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-card-foreground mb-1 uppercase tracking-wider">Departure Types</h3>
              <p className="text-xs text-muted-foreground mb-5">Distribution of cases by departure reason</p>
              {departureData.length === 0 || departureData.every(d => d.value === 0) ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-sm font-medium">No case data yet</div>
                    <div className="text-xs mt-1">Create cases to see departure type distribution</div>
                  </div>
                </div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departureData}
                        dataKey="value"
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {departureData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [`${v} cases`, n]}
                        contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px", fontWeight: 500, lineHeight: "1.8" }}
                        formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          </div>

          {/* Plan Type Adoption */}
          {planData.length > 0 && (
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
              <h3 className="text-sm font-semibold text-card-foreground mb-1 uppercase tracking-wider">Plan Type Adoption</h3>
              <p className="text-xs text-muted-foreground mb-5">Which plan types employees are selecting across all cases</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(v) => [`${v} plans selected`]}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {planData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
