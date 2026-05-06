import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, statusColor, statusLabel, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, Clock, CheckCircle2, Plus, Send, ArrowRight, AlertTriangle, ClipboardList, DollarSign, BarChart2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";

interface Dashboard {
  totalCases: number;
  activeCases: number;
  pendingIntake: number;
  pendingReview: number;
  closedCases: number;
  estimatedTotalSavings: number;
  cobraExposure: number;
  recentCases: Case[];
  statusBreakdown: { status: string; count: number }[];
}

interface Case {
  id: number;
  employeeName: string;
  employeeEmail: string;
  departureType: string;
  status: string;
  coverageEndDate: string | null;
  cobraPremiumEstimate: number | null;
  estimatedSavingsMin: number | null;
  estimatedSavingsMax: number | null;
  inviteSentAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(215 16% 47%)",
  pending: "hsl(215 16% 47%)",
  invited: "hsl(217 91% 60%)",
  invite_opened: "hsl(217 91% 60%)",
  intake_started: "hsl(38 92% 50%)",
  intake_completed: "hsl(38 92% 50%)",
  recommendations_generated: "hsl(263 70% 60%)",
  consultant_review_needed: "hsl(25 95% 55%)",
  recommendations_released: "hsl(173 80% 35%)",
  plan_selected: "hsl(142 70% 45%)",
  closed: "hsl(215 16% 70%)",
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const LABEL_MAP: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  invited: "Invited",
  invite_opened: "Opened",
  intake_started: "Intake",
  intake_completed: "Intake",
  recommendations_generated: "AI Gen",
  consultant_review_needed: "Review",
  recommendations_released: "Released",
  plan_selected: "Selected",
  closed: "Closed",
};

export default function EmployerDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Dashboard>({ queryKey: ["/employer/dashboard"], queryFn: () => api.get("/employer/dashboard") });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCase, setNewCase] = useState({ employeeName: "", employeeEmail: "", departureType: "layoff", coverageEndDate: "", cobraPremiumEstimate: "" });
  const [creating, setCreating] = useState(false);

  const createCase = async () => {
    setCreating(true);
    try {
      await api.post("/employer/cases", newCase);
      await qc.invalidateQueries({ queryKey: ["/employer/dashboard"] });
      setShowCreateModal(false);
      setNewCase({ employeeName: "", employeeEmail: "", departureType: "layoff", coverageEndDate: "", cobraPremiumEstimate: "" });
    } catch (err) { console.error(err); }
    setCreating(false);
  };

  if (isLoading || !data) {
    return (
      <ProtectedRoute allowedRoles={["employer", "admin"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-sm font-medium text-muted-foreground">Loading dashboard data...</div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const annualSavings = data.estimatedTotalSavings * 12;
  const savingsRate = data.cobraExposure > 0 ? Math.round((annualSavings / data.cobraExposure) * 100) : 0;
  const savingsBarWidth = Math.min(100, (annualSavings / Math.max(data.cobraExposure, 1)) * 100);

  const stats = [
    { label: "Total Cases", value: data.totalCases, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Cases", value: data.activeCases, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Needs Review", value: data.pendingReview, icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-100" },
    { label: "Monthly Savings", value: formatCurrency(data.estimatedTotalSavings), icon: TrendingUp, color: "text-green-700", bg: "bg-green-100" },
  ];

  const chartData = data.statusBreakdown.map(d => ({
    ...d,
    label: LABEL_MAP[d.status] ?? d.status.slice(0, 7),
    fill: STATUS_COLORS[d.status] ?? "hsl(215 16% 60%)",
  }));

  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Employer Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage and track your workforce transition program</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/30">
              <Plus className="w-4 h-4" /> Create Case
            </button>
          </div>

          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            {stats.map(s => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} variants={cardVariants} className="bg-card rounded-2xl border border-card-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="text-3xl font-display font-bold text-card-foreground tracking-tight">{s.value}</div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</div>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cases by Status Chart */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-card-foreground mb-1 uppercase tracking-wider">Cases by Status</h3>
              <p className="text-xs text-muted-foreground mb-4">Hover bars to see full status names</p>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 45, left: -20 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={55}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(v) => [v, "Cases"]}
                      labelFormatter={(_label, payload) => {
                        if (payload && payload[0]) {
                          return capitalize((payload[0].payload as { status: string }).status.replace(/_/g, " "));
                        }
                        return _label;
                      }}
                      contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* COBRA Exposure */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wider">COBRA Exposure</h3>
              </div>
              <div className="space-y-4 flex-1">
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <div className="bg-red-50 border-b border-border/50 px-4 py-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annual COBRA Exposure</div>
                      <div className="text-xs text-muted-foreground mt-0.5">If all active employees elected COBRA</div>
                    </div>
                    <span className="text-lg font-display font-bold text-red-700">{formatCurrency(data.cobraExposure)}</span>
                  </div>
                  <div className="bg-green-50 px-4 py-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Annual Savings</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Based on current cases × 12 months</div>
                    </div>
                    <span className="text-lg font-display font-bold text-green-700">{formatCurrency(annualSavings)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-card-foreground mb-2">
                    <span>COBRA Cost Avoided</span>
                    <span className="text-primary">{savingsRate}% of exposure</span>
                  </div>
                  <div className="w-full bg-secondary/10 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${savingsBarWidth}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    Saving {formatCurrency(data.estimatedTotalSavings)}/mo avg per active case
                  </div>
                </div>
              </div>
              <Link href="/employer/roi-simulator" className="mt-5 flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-4 focus:ring-primary/20">
                Run ROI Simulation <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold text-card-foreground mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-3 flex-1">
                {[
                  { href: "/employer/cases", label: "View All Cases", sub: `${data.totalCases} total cases`, icon: ClipboardList },
                  { href: "/employer/analytics", label: "Analytics", sub: "Trends and outcomes", icon: BarChart2 },
                  { href: "/employer/stipends", label: "Manage Stipends", sub: "Configure policies", icon: DollarSign },
                ].map(l => (
                  <Link key={l.href} href={l.href} className="group flex items-center gap-4 p-3.5 rounded-xl border border-border/50 bg-background hover:border-primary/40 hover:bg-primary/5 transition-all focus:outline-none focus:ring-4 focus:ring-primary/20">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                      <l.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">{l.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.sub}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Cases Table */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between bg-secondary/5">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wider">Recent Cases</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Showing most recently updated cases</p>
              </div>
              <Link href="/employer/cases" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg px-2 py-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-card-border bg-background">
                    <th className="text-left px-6 py-4">Employee</th>
                    <th className="text-left px-6 py-4 hidden md:table-cell">Type</th>
                    <th className="text-left px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4 hidden lg:table-cell">Coverage End</th>
                    <th className="text-left px-6 py-4 hidden lg:table-cell">COBRA/mo</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {data.recentCases.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/5 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-card-foreground">{c.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{c.employeeEmail}</div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">{capitalize(c.departureType.replace(/_/g, " "))}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusColor(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm font-medium text-muted-foreground">{formatDate(c.coverageEndDate)}</td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm font-medium text-muted-foreground">{c.cobraPremiumEstimate ? formatCurrency(c.cobraPremiumEstimate) : "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/employer/cases/${c.id}`} className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-background border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data.recentCases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">No cases yet</div>
                          <div className="text-xs text-muted-foreground">Create your first case to start the transition program</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-lg border border-card-border"
            >
              <h3 className="font-display text-xl font-bold text-card-foreground mb-1">Create Transition Case</h3>
              <p className="text-sm text-muted-foreground mb-6">An invite email will be sent to the employee once the case is created.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Employee Name</label>
                    <input
                      type="text" placeholder="Jane Smith" value={newCase.employeeName}
                      onChange={e => setNewCase(prev => ({ ...prev, employeeName: e.target.value }))}
                      className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3 py-2.5 text-sm transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Email</label>
                    <input
                      type="email" placeholder="jane@company.com" value={newCase.employeeEmail}
                      onChange={e => setNewCase(prev => ({ ...prev, employeeEmail: e.target.value }))}
                      className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3 py-2.5 text-sm transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Coverage End Date</label>
                    <input
                      type="date" value={newCase.coverageEndDate}
                      onChange={e => setNewCase(prev => ({ ...prev, coverageEndDate: e.target.value }))}
                      className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3 py-2.5 text-sm transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">COBRA Premium/mo ($)</label>
                    <input
                      type="number" placeholder="850" value={newCase.cobraPremiumEstimate}
                      onChange={e => setNewCase(prev => ({ ...prev, cobraPremiumEstimate: e.target.value }))}
                      className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3 py-2.5 text-sm transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Departure Type</label>
                  <select 
                    value={newCase.departureType} onChange={e => setNewCase(prev => ({ ...prev, departureType: e.target.value }))}
                    className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-3 py-2.5 text-sm transition-all outline-none appearance-none"
                  >
                    {["layoff", "voluntary", "retirement", "reduction_in_hours", "family_coverage_loss", "life_event"].map(t => (
                      <option key={t} value={t}>{capitalize(t.replace(/_/g, ' '))}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold py-2.5 rounded-xl text-sm transition-colors focus:outline-none focus:ring-4 focus:ring-slate-300">
                  Cancel
                </button>
                <button onClick={createCase} disabled={creating || !newCase.employeeName || !newCase.employeeEmail} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-primary/30">
                  {creating ? "Creating..." : "Create Case"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
