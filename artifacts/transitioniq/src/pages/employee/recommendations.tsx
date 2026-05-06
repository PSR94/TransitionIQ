import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, capitalize, metalColor } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Loader2, Star, TrendingDown, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, FileText, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RecItem {
  id: number;
  rank: number;
  planName: string;
  issuerName: string;
  planType: string;
  metalLevel: string;
  monthlyPremium: number;
  deductible: number;
  outOfPocketMax: number;
  matchScore: number;
  confidenceScore: number;
  estimatedAnnualCost: number;
  estimatedMonthlySavingsVsCobra: number;
  estimatedAnnualSavingsVsCobra: number;
  explanation: string;
  pros: string[];
  cons: string[];
  assumptions: string[];
  warningFlags: string[];
  recommendedNextSteps: string[];
}

interface Recommendation {
  id: number;
  caseId: number;
  status: string;
  generatedAt: string | null;
  releasedAt: string | null;
  consultantNotes: string | null;
  items: RecItem[];
}

export default function RecommendationsPage() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery<Recommendation>({
    queryKey: ["/employee/recommendations"],
    queryFn: () => api.get("/employee/recommendations"),
  });

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post("/employee/recommendations/generate", {});
      await qc.invalidateQueries({ queryKey: ["/employee/recommendations"] });
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["employee", "admin"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const showGenerate = !data?.items?.length || data.status === "pending";

  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout>
        <div className="space-y-8 pb-12 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Your Plan Options</h1>
              <p className="text-sm text-muted-foreground mt-1">Rule-assisted demo coverage estimates based on your intake.</p>
            </div>
            {!showGenerate && (
              <button onClick={generate} disabled={generating} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Re-analyzing..." : "Regenerate Plans"}
              </button>
            )}
          </div>

          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground">Educational purposes only.</strong> These are rule-assisted demo estimates. They are not insurance advice. Always verify plan details, network coverage, and subsidy eligibility through official sources before making a final enrollment decision.
            </p>
          </div>

          {data?.consultantNotes && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Consultant Review Notes
              </div>
              <p className="text-sm text-foreground leading-relaxed font-medium">{data.consultantNotes}</p>
            </div>
          )}

          {showGenerate ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-12 md:p-16 text-center max-w-2xl mx-auto mt-8">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">Ready for analysis</h3>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto text-base">We'll cross-reference your intake profile against hundreds of available health plans to find the optimal balance of coverage and cost.</p>
              <button onClick={generate} disabled={generating} className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-base font-bold disabled:opacity-50 transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none">
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {generating ? "Analyzing the market..." : "Generate Recommendations"}
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {data?.items.map((item, idx) => {
                const expanded = expandedId === item.id;
                const isTopPick = idx === 0;
                
                return (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-card rounded-3xl border shadow-sm overflow-hidden transition-all ${isTopPick ? "border-primary shadow-lg shadow-primary/5" : "border-card-border hover:border-primary/30"}`}
                  >
                    {isTopPick && (
                      <div className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1.5 px-6 flex items-center gap-2">
                        <Star className="w-3.5 h-3.5" /> TransitionIQ Top Recommendation
                      </div>
                    )}
                    
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display text-2xl font-bold shrink-0 ${isTopPick ? "bg-primary/10 text-primary" : "bg-secondary/10 text-muted-foreground"}`}>
                          #{item.rank}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                            <div>
                              <h2 className="text-xl md:text-2xl font-display font-bold text-foreground leading-tight mb-1">
                                {item.planName}
                              </h2>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-muted-foreground">{item.issuerName}</span>
                                <span className="text-muted-foreground/30">•</span>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${metalColor(item.metalLevel)}`}>
                                  {capitalize(item.metalLevel)}
                                </span>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                  {item.planType.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="sm:text-right shrink-0 bg-secondary/5 sm:bg-transparent p-4 sm:p-0 rounded-xl">
                              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Est. Premium</div>
                              <div className="text-3xl font-display font-bold text-foreground leading-none">
                                {formatCurrency(item.monthlyPremium)}<span className="text-base font-medium text-muted-foreground">/mo</span>
                              </div>
                              {item.estimatedMonthlySavingsVsCobra > 0 && (
                                <div className="inline-flex items-center gap-1.5 text-green-600 bg-green-500/10 px-2.5 py-1 rounded-md text-xs font-bold mt-2">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  Save {formatCurrency(item.estimatedMonthlySavingsVsCobra)} vs COBRA
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-secondary/5 rounded-xl p-3 border border-border/50">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deductible</div>
                              <div className="text-base font-bold text-foreground">{formatCurrency(item.deductible)}</div>
                            </div>
                            <div className="bg-secondary/5 rounded-xl p-3 border border-border/50">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">OOP Max</div>
                              <div className="text-base font-bold text-foreground">{formatCurrency(item.outOfPocketMax)}</div>
                            </div>
                            <div className="bg-secondary/5 rounded-xl p-3 border border-border/50 md:col-span-2">
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Match Score</div>
                                <div className="text-xs font-bold text-primary">{Math.round(item.matchScore)}%</div>
                              </div>
                              <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${item.matchScore}%` }} />
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-foreground/80 leading-relaxed font-medium mb-4">
                            {item.explanation}
                          </p>

                          {item.warningFlags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6">
                              {item.warningFlags.map((flag, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> {flag}
                                </div>
                              ))}
                            </div>
                          )}

                          <button 
                            onClick={() => setExpandedId(expanded ? null : item.id)} 
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/5 hover:bg-secondary/10 border border-border/50 text-sm font-bold text-foreground transition-colors"
                          >
                            <span>{expanded ? "Hide deep analysis" : "View deep analysis & next steps"}</span>
                            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>

                          <AnimatePresence>
                            {expanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid md:grid-cols-2 gap-8 pt-8 mt-2 border-t border-border/50">
                                  <div>
                                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Key Benefits
                                    </div>
                                    <ul className="space-y-3">
                                      {item.pros.map((p, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" /> {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Considerations
                                    </div>
                                    <ul className="space-y-3">
                                      {item.cons.map((c, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 shrink-0" /> {c}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="md:col-span-2 pt-6 border-t border-border/50">
                                    <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Recommended Next Steps</div>
                                    <div className="space-y-3">
                                      {item.recommendedNextSteps.map((step, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-secondary/5 rounded-xl p-3 border border-border/50">
                                          <div className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</div>
                                          <div className="text-sm font-medium text-foreground">{step}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
