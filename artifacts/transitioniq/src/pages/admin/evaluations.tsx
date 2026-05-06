import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { CheckCircle2, XCircle, PlayCircle, Loader2, Shield, MessageSquare, Star, Lock, Activity } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface EvalResult {
  id: number;
  testName: string;
  category: string;
  passed: boolean;
  score: number | null;
  details: string | null;
  input: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
}

interface EvalRun {
  id: number;
  runAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  results: EvalResult[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  recommendation: Star,
  assistant: MessageSquare,
  privacy: Lock,
  safety: Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  recommendation: "bg-primary/10 text-primary border-primary/20",
  assistant: "bg-violet-100 text-violet-700 border-violet-200",
  privacy: "bg-teal-100 text-teal-700 border-teal-200",
  safety: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function EvaluationsPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);

  const { data, isLoading } = useQuery<{ runs: EvalRun[]; total: number }>({
    queryKey: ["/admin/evaluations"],
    queryFn: () => api.get("/admin/evaluations"),
  });

  const runEval = async () => {
    setRunning(true);
    try {
      const r = await api.post<{ run: EvalRun }>("/admin/evaluations/run", {});
      setSelectedRun(r.run);
      await qc.invalidateQueries({ queryKey: ["/admin/evaluations"] });
    } catch (err) { console.error(err); }
    setRunning(false);
  };

  const displayRun = selectedRun ?? data?.runs[0];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">AI Evaluation Framework</h1>
              <p className="text-sm text-muted-foreground mt-1">Automated testing for recommendation quality and safety guardrails.</p>
            </div>
            <button onClick={runEval} disabled={running}
              className="flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-70 transition-all shadow-md">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {running ? "Executing Suite..." : "Run Evaluation Suite"}
            </button>
          </div>

          {isLoading ? (
             <div className="flex items-center justify-center min-h-[50vh]">
               <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
             </div>
          ) : !displayRun ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-16 text-center mt-8 max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-2">No Evaluations Found</h3>
              <p className="text-base text-muted-foreground mb-8">Execute the test suite to establish a baseline for AI model performance.</p>
              <button onClick={runEval} className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl text-sm font-bold">
                <PlayCircle className="w-4 h-4" /> Run First Evaluation
              </button>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6 pt-4">
              <div className="lg:col-span-3 space-y-6">
                {/* Latest run summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tests</div>
                    <div className="text-3xl font-display font-bold text-foreground">{displayRun.totalTests}</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-16 h-16 bg-green-500/20 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Passed</div>
                    <div className="text-3xl font-display font-bold text-green-700">{displayRun.passed}</div>
                  </div>
                  <div className={`${displayRun.failed > 0 ? "bg-accent/10 border-accent/20" : "bg-green-500/10 border-green-500/20"} border rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
                    {displayRun.failed > 0 && <div className="absolute right-0 top-0 w-16 h-16 bg-accent/20 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />}
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${displayRun.failed > 0 ? "text-amber-800" : "text-green-700"}`}>Failed</div>
                    <div className={`text-3xl font-display font-bold ${displayRun.failed > 0 ? "text-amber-800" : "text-green-700"}`}>{displayRun.failed}</div>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-16 h-16 bg-primary/20 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Pass Rate</div>
                    <div className="text-3xl font-display font-bold text-primary">{displayRun.passRate.toFixed(0)}%</div>
                  </div>
                </div>

                {/* Results table */}
                <div className="bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-secondary/5">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Detailed Test Results</h3>
                    <span className="text-xs font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-border/50">Run at {new Date(displayRun.runAt).toLocaleString()}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {displayRun.results.map((result, i) => {
                      const Icon = CATEGORY_ICONS[result.category] ?? Shield;
                      return (
                        <motion.div 
                          key={result.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.5) }}
                          className="p-6 hover:bg-secondary/5 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1 shrink-0">
                              {result.passed
                                ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                                : <XCircle className="w-6 h-6 text-accent" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-base font-bold text-foreground">{result.testName}</span>
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${CATEGORY_COLORS[result.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                  <Icon className="w-3 h-3" />{result.category}
                                </span>
                                {result.score !== null && (
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Score: {(result.score * 100).toFixed(0)}%</span>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 font-medium mb-3">{result.details}</p>
                              {result.actualOutput && (
                                <div className="bg-background border border-border/50 rounded-xl p-3 text-xs font-mono text-muted-foreground/80 break-words">
                                  {result.actualOutput}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Previous runs */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-3xl border border-card-border shadow-sm p-6 sticky top-6">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-3">Execution History</h3>
                  {data?.runs.length === 1 ? (
                     <div className="text-sm text-muted-foreground text-center py-4 bg-secondary/5 rounded-xl border border-dashed border-border/50">No previous runs</div>
                  ) : (
                    <div className="space-y-3">
                      {data?.runs.map((run, i) => (
                        <button 
                          key={run.id} 
                          onClick={() => setSelectedRun(run)}
                          className={`w-full p-3.5 rounded-xl text-left transition-all border ${run.id === displayRun.id ? "bg-primary/5 border-primary shadow-sm" : "bg-background border-border/50 hover:border-primary/40"}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-bold ${run.id === displayRun.id ? "text-primary" : "text-foreground"}`}>
                              {run.passRate.toFixed(0)}% Pass
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">{run.passed}/{run.totalTests}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{new Date(run.runAt).toLocaleDateString()} {new Date(run.runAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
