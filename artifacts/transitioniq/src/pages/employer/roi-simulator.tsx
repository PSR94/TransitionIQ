import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Calculator, TrendingDown, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface RoiResult {
  scenarios: { name: string; totalCost: number; monthlyCost: number; savings: number; description: string }[];
  monthlyTrend: { month: number; cobraOnly: number; withTransitionIQ: number; withStipend: number }[];
  breakEvenMonths: number;
  netAnnualSavings: number;
  totalCobraExposure: number;
}

const COLORS = ["hsl(0 70% 50%)", "hsl(35 90% 50%)", "hsl(173 80% 35%)", "hsl(142 70% 45%)"];

export default function RoiSimulator() {
  const [form, setForm] = useState({
    numDepartingEmployees: 20, avgCobraPremium: 850, cobraElectionRate: 0.40,
    highCostClaimantRate: 0.15, avgMonthlyClaimExposure: 3000, stipendAmount: 400,
    stipendDurationMonths: 6, platformCostPerCase: 150,
  });

  const { data, mutate, isPending } = useMutation<RoiResult, Error, typeof form>({
    mutationFn: body => api.post("/employer/roi-simulation", body),
  });

  const field = (key: keyof typeof form, label: string, suffix = "", min = 0, max = 100000) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</label>
      <div className="relative flex items-center">
        {suffix && <span className="absolute left-4 text-muted-foreground font-medium">{suffix}</span>}
        <input
          type="number" min={min} max={max} value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
          className={`w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl py-2.5 text-sm font-medium transition-all outline-none ${suffix ? "pl-8 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">ROI Simulator</h1>
            <p className="text-sm text-muted-foreground mt-1">Model cost savings and break-even timelines based on your workforce data.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 xl:gap-8">
            {/* Inputs */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-6 space-y-5 lg:sticky lg:top-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg text-card-foreground">Parameters</h3>
              </div>
              
              <div className="space-y-4">
                {field("numDepartingEmployees", "Departing Employees (Annual)", "", 1, 10000)}
                {field("avgCobraPremium", "Avg COBRA Premium/Month", "$")}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Expected COBRA Election</label>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{Math.round(form.cobraElectionRate * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={form.cobraElectionRate}
                    onChange={e => setForm(f => ({ ...f, cobraElectionRate: parseFloat(e.target.value) }))}
                    className="w-full accent-primary h-2 bg-secondary/20 rounded-full appearance-none" />
                </div>
                
                {field("avgMonthlyClaimExposure", "High-Cost Claim Exposure/Mo", "$")}
                
                <div className="pt-4 border-t border-border/50 space-y-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Program Costs</div>
                  {field("stipendAmount", "Monthly Stipend Offer", "$")}
                  {field("stipendDurationMonths", "Stipend Duration (months)", "", 1, 36)}
                  {field("platformCostPerCase", "Platform Fee per Case", "$")}
                </div>
              </div>

              <button onClick={() => mutate(form)} disabled={isPending}
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 disabled:shadow-none">
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isPending ? "Calculating ROI..." : "Run Simulation"}
              </button>
            </motion.div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {!data ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-16 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-20 h-20 bg-secondary/5 border border-secondary/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <TrendingDown className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-foreground mb-2">Ready to calculate</h3>
                  <p className="text-muted-foreground max-w-sm">Adjust your parameters on the left and run the simulation to project your potential healthcare transition savings.</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Summary stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-500/10 rounded-full blur-xl" />
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Net Annual Savings</div>
                      <div className="font-display text-3xl font-bold text-green-700">{formatCurrency(data.netAnnualSavings)}</div>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
                      <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Break-Even Timeline</div>
                      <div className="font-display text-3xl font-bold text-primary">{data.breakEvenMonths} <span className="text-xl font-medium">mos</span></div>
                    </div>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-destructive/10 rounded-full blur-xl" />
                      <div className="text-xs font-bold text-destructive uppercase tracking-wider mb-1">Annual COBRA Exposure</div>
                      <div className="font-display text-3xl font-bold text-destructive">{formatCurrency(data.totalCobraExposure)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.scenarios.slice(0, 2).map((s, i) => (
                      <div key={s.name} className={`rounded-2xl border p-5 ${i === 1 ? "bg-card border-primary/30 shadow-md shadow-primary/5" : "bg-secondary/5 border-border/50"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-display font-bold text-foreground">{s.name}</h4>
                          {s.savings > 0 && <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border border-green-200">Saves {formatCurrency(s.savings)}</span>}
                        </div>
                        <div className="text-2xl font-bold text-foreground mb-1">{formatCurrency(s.totalCost)} <span className="text-sm font-medium text-muted-foreground">/ yr</span></div>
                        <div className="text-sm text-muted-foreground">{s.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Monthly trend */}
                  <div className="bg-card rounded-3xl border border-card-border shadow-sm p-6 lg:p-8">
                    <h3 className="font-display font-bold text-xl text-card-foreground mb-6">Cumulative Cost Over 12 Months</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `Mo ${v}`} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            formatter={(v: number) => formatCurrency(v)} 
                            contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={v => `Month ${v}`}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px", fontWeight: 600 }} iconType="circle" />
                          <Line dataKey="cobraOnly" name="COBRA Only" stroke="hsl(0 70% 50%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          <Line dataKey="withTransitionIQ" name="With TransitionIQ" stroke="hsl(173 80% 35%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                          <Line dataKey="withStipend" name="With Stipend" stroke="hsl(142 70% 45%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, strokeDasharray: "0" }} strokeDasharray="5 5" activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
