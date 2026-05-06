import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "wouter";
import { Users, Building2, Shield, FileText, ClipboardList, PlayCircle, Loader2, ArrowRight, CheckCircle2, XCircle, Settings, Activity } from "lucide-react";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";

interface AdminDash {
  totalEmployers: number;
  totalUsers: number;
  totalCases: number;
  totalPlans: number;
  activeAiEvals: number;
  recentAuditEvents: number;
  systemHealth: string;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<AdminDash>({ queryKey: ["/admin/dashboard"], queryFn: () => api.get("/admin/dashboard") });
  const [runningEval, setRunningEval] = useState(false);
  const [evalResult, setEvalResult] = useState<{ passed: number; total: number; passRate: number } | null>(null);

  const runEval = async () => {
    setRunningEval(true);
    setEvalResult(null);
    try {
      const r = await api.post<{ run: { passed: number; totalTests: number; passRate: number }; message: string }>("/admin/evaluations/run", {});
      setEvalResult({ passed: r.run.passed, total: r.run.totalTests, passRate: r.run.passRate });
    } catch (err) { console.error(err); }
    setRunningEval(false);
  };

  const stats = [
    { label: "Employers", value: data?.totalEmployers ?? "—", icon: Building2, href: "/admin/employers", color: "text-primary", bg: "bg-primary/10" },
    { label: "Users", value: data?.totalUsers ?? "—", icon: Users, href: "/admin/users", color: "text-slate-700", bg: "bg-slate-100" },
    { label: "Total Cases", value: data?.totalCases ?? "—", icon: ClipboardList, href: "/employer/cases", color: "text-accent", bg: "bg-accent/10" },
    { label: "Plan Records", value: data?.totalPlans ?? "—", icon: Shield, href: "/admin/plan-data", color: "text-green-600", bg: "bg-green-500/10" },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Platform Administration</h1>
              <p className="text-sm text-muted-foreground mt-1">System health, AI evaluation, and global settings</p>
            </div>
            <div className="inline-flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 self-start sm:self-auto">
              <div className="relative flex w-2.5 h-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-green-500"></span>
              </div>
              <span className="text-xs font-bold text-green-700 uppercase tracking-widest">System {data?.systemHealth ?? "Operational"}</span>
            </div>
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
                <motion.div key={s.label} variants={cardVariants}>
                  <Link href={s.href} className="block bg-card rounded-3xl border border-card-border p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                    <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${s.color}`} />
                    </div>
                    <div className="text-4xl font-display font-bold text-foreground tracking-tight mb-1">{isLoading ? "—" : s.value}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 pt-4">
            {/* AI Evaluation Runner */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">AI Evaluation Suite</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                Run the automated testing framework to verify recommendation quality, ensure conversational assistant safety, and validate privacy guardrails against baseline truth.
              </p>

              <div className="flex-1 flex flex-col justify-center min-h-[120px] mb-8">
                {evalResult ? (
                  <div className={`flex items-start gap-4 p-5 rounded-2xl border-2 ${evalResult.passed === evalResult.total ? "bg-green-500/5 border-green-500/20" : "bg-accent/5 border-accent/20"}`}>
                    {evalResult.passed === evalResult.total ? <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" /> : <XCircle className="w-6 h-6 text-accent shrink-0" />}
                    <div>
                      <div className={`font-display text-lg font-bold mb-1 ${evalResult.passed === evalResult.total ? "text-green-700" : "text-amber-800"}`}>
                        {evalResult.passed}/{evalResult.total} tests passed
                      </div>
                      <div className={`text-sm font-semibold ${evalResult.passed === evalResult.total ? "text-green-600" : "text-amber-700"}`}>
                        {evalResult.passRate.toFixed(1)}% pass rate achieved
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5">
                    <span className="text-sm font-semibold text-muted-foreground">Ready to execute test suite</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-auto">
                <button onClick={runEval} disabled={runningEval}
                  className="w-full flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background py-3.5 rounded-xl text-sm font-bold disabled:opacity-70 transition-all shadow-lg">
                  {runningEval ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  {runningEval ? "Executing Test Suite..." : "Run Evaluation Framework"}
                </button>
                <Link href="/admin/evaluations" className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-3 rounded-xl text-sm font-bold transition-colors">
                  View Detailed History <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* Quick links */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">System Configuration</h3>
              <div className="grid gap-3">
                {[
                  { href: "/admin/audit-logs", label: "Security Audit Logs", sub: "Immutable record of all platform activity", icon: ClipboardList, color: "text-blue-500" },
                  { href: "/admin/knowledge-base", label: "RAG Knowledge Base", sub: "Manage documents powering the Coverage Guide", icon: FileText, color: "text-violet-500" },
                  { href: "/admin/settings", label: "Algorithm Weights", sub: "Adjust the recommendation scoring engine", icon: Settings, color: "text-amber-500" },
                  { href: "/admin/users", label: "User Management", sub: "Global directory and role assignment", icon: Users, color: "text-teal-500" },
                ].map((l, i) => {
                  const Icon = l.icon;
                  return (
                    <Link key={l.href} href={l.href} className="group flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/30 bg-background hover:bg-primary/5 transition-all">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className={`w-5 h-5 ${l.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{l.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">{l.sub}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
