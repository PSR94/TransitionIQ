import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, capitalize, metalColor, statusColor, statusLabel } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle, Star, Loader2, ArrowLeft, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewDetail() {
  const params = useParams<{ caseId: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{
    case: Record<string, unknown>;
    recommendation: { id: number; status: string; items: Record<string, unknown>[]; consultantNotes: string | null };
    intakeSummary: Record<string, unknown>;
    riskFlags: string[];
    previousReviews: { id: number; action: string; notes: string | null; reviewedAt: string }[];
  }>({
    queryKey: [`/consultant/reviews/${params.caseId}`],
    queryFn: () => api.get(`/consultant/reviews/${params.caseId}`),
    enabled: !!params.caseId,
  });

  const performAction = async (action: string) => {
    if (!data?.recommendation?.id) return;
    setActing(action);
    try {
      await api.post(`/recommendations/${data.recommendation.id}/review`, { action, notes });
      await qc.invalidateQueries({ queryKey: ["/consultant/dashboard"] });
      setLocation("/consultant/reviews");
    } catch (err) { console.error(err); }
    setActing(null);
  };

  if (isLoading || !data) {
    return (
      <ProtectedRoute allowedRoles={["consultant", "admin"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const c = data.case as { employeeName: string; employeeEmail: string; departureType: string; status: string; cobraPremiumEstimate: number; coverageEndDate: string };
  const intake = data.intakeSummary as { completed: boolean; age: number; state: string; householdSize: number; incomeRange: string; medicareEligible: boolean };

  const summaryItem = (label: string, value: React.ReactNode) => (
    <div className="py-2.5 flex justify-between items-center border-b border-border/30 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-foreground text-right">{value}</span>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["consultant", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation("/consultant/reviews")} className="w-10 h-10 rounded-xl border-2 border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-background">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{c.employeeName}</h1>
              <p className="text-sm font-medium text-muted-foreground mt-1">{c.employeeEmail} • {capitalize(c.departureType.replace(/_/g, ' '))}</p>
            </div>
          </div>

          {data.riskFlags.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent text-accent-foreground rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm mb-3">
                <AlertTriangle className="w-5 h-5" /> Risk Flags Requiring Attention
              </div>
              <ul className="space-y-2 pl-2">
                {data.riskFlags.map((f, i) => (
                  <li key={i} className="text-sm font-medium flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground/50 mt-1.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Case Context</h3>
                <div>
                  {summaryItem("Status", <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>)}
                  {summaryItem("COBRA Premium", c.cobraPremiumEstimate ? formatCurrency(c.cobraPremiumEstimate) + "/mo" : "—")}
                  {summaryItem("Coverage End", formatDate(c.coverageEndDate))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-card-border shadow-sm p-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Intake Profile</h3>
                {!intake.completed ? (
                  <div className="text-sm text-destructive font-medium py-4 text-center bg-destructive/10 rounded-xl">Intake not yet completed</div>
                ) : (
                  <div>
                    {summaryItem("Age", intake.age)}
                    {summaryItem("State", intake.state)}
                    {summaryItem("Household", `${intake.householdSize} person${intake.householdSize > 1 ? 's' : ''}`)}
                    {summaryItem("Income Range", intake.incomeRange)}
                    {summaryItem("Medicare", intake.medicareEligible ? <span className="text-accent">Eligible soon</span> : "Not eligible")}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl border border-card-border shadow-sm p-6 sticky top-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Consultant Decision</h3>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Internal notes or employee feedback..."
                  rows={4}
                  className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none font-medium mb-4 custom-scrollbar"
                />
                <div className="flex flex-col gap-3">
                  <button onClick={() => performAction("approve")} disabled={!!acting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 text-sm font-bold disabled:opacity-50 transition-colors shadow-md shadow-green-600/20">
                    {acting === "approve" ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Approve & Release
                  </button>
                  <button onClick={() => performAction("request_regeneration")} disabled={!!acting}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors">
                    {acting === "request_regeneration" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate Options
                  </button>
                  <button onClick={() => performAction("reject")} disabled={!!acting}
                    className="w-full flex items-center justify-center gap-2 bg-background hover:bg-destructive/10 text-destructive rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors border-2 border-destructive/20 hover:border-destructive/50">
                    {acting === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject Case
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h3 className="font-display text-2xl font-bold text-foreground border-b border-border/50 pb-4">Proposed Recommendations</h3>
              {(data.recommendation.items as unknown as RecItem[]).map((item, idx) => (
                <div key={item.id} className={`bg-card rounded-3xl border shadow-sm p-6 sm:p-8 ${idx === 0 ? "border-primary shadow-lg shadow-primary/5 relative overflow-hidden" : "border-card-border"}`}>
                  {idx === 0 && <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />}
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {idx === 0 && <Star className="w-5 h-5 text-primary" />}
                        <h4 className="font-display text-2xl font-bold text-foreground leading-tight">{item.planName}</h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-muted-foreground">{item.issuerName}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${metalColor(item.metalLevel)}`}>{capitalize(item.metalLevel)}</span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Rank #{item.rank}</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Score {Math.round(item.matchScore)}</span>
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0 bg-secondary/5 sm:bg-transparent p-4 sm:p-0 rounded-xl">
                      <div className="text-3xl font-display font-bold text-foreground">{formatCurrency(item.monthlyPremium)}<span className="text-base font-medium text-muted-foreground">/mo</span></div>
                      {item.estimatedMonthlySavingsVsCobra > 0 && (
                        <div className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-md inline-flex items-center gap-1 mt-2">
                          <TrendingDown className="w-3 h-3" /> Save {formatCurrency(item.estimatedMonthlySavingsVsCobra)} vs COBRA
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-secondary/5 rounded-xl p-4 border border-border/50 mb-6">
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">{item.explanation}</p>
                  </div>
                  
                  {item.warningFlags.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-accent" /> Plan Warnings
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.warningFlags.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.recommendation.items.length === 0 && (
                <div className="bg-card rounded-3xl border border-card-border shadow-sm p-16 text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">No recommendations</h3>
                  <p className="text-sm text-muted-foreground mt-2">No plans have been generated for this case yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface RecItem {
  id: number;
  rank: number;
  planName: string;
  issuerName: string;
  planType: string;
  metalLevel: string;
  monthlyPremium: number;
  matchScore: number;
  estimatedMonthlySavingsVsCobra: number;
  explanation: string;
  warningFlags: string[];
}
