import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "wouter";
import { CheckCircle2, Clock, Heart, TrendingDown, Star, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface EmployeeDashboard {
  caseStatus: string;
  employerName: string;
  departureType: string;
  coverageEndDate: string | null;
  cobraPremiumEstimate: number | null;
  intakeCompleted: boolean;
  recommendationsReady: boolean;
  recommendationsReleased: boolean;
  stipendEligible: boolean;
  stipendMonthlyAmount: number | null;
  checklistProgress: number;
  totalChecklistItems: number;
  daysUntilCoverageEnd: number | null;
  cobraElectionDeadline: string | null;
  estimatedSavings: number | null;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function EmployeeDashboard() {
  const { data, isLoading } = useQuery<EmployeeDashboard>({
    queryKey: ["/employee/dashboard"],
    queryFn: () => api.get("/employee/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <ProtectedRoute allowedRoles={["employee", "admin"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const progressPct = data.totalChecklistItems > 0 ? (data.checklistProgress / data.totalChecklistItems) * 100 : 0;
  const urgentDays = data.daysUntilCoverageEnd !== null && data.daysUntilCoverageEnd <= 30;

  const steps = [
    { label: "Complete health intake", done: data.intakeCompleted, href: "/employee/intake", sub: "Tell us about your doctors and needs" },
    { label: "Review recommendations", done: data.recommendationsReleased, href: "/employee/recommendations", sub: "Your AI-analyzed coverage options" },
    { label: "Make your decision", done: data.caseStatus === "plan_selected" || data.caseStatus === "closed", href: "/employee/checklist", sub: "Select and enroll in your new plan" },
  ];

  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-5xl">
          <motion.div initial="hidden" animate="visible" variants={cardVariants}>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome to TransitionIQ</h1>
            <p className="text-base text-muted-foreground mt-2">
              Provided by <span className="font-semibold text-foreground">{data.employerName}</span> to help you secure optimal health coverage.
            </p>
          </motion.div>

          {urgentDays && (
            <motion.div initial="hidden" animate="visible" variants={cardVariants} className="flex items-start gap-4 bg-accent/10 border border-accent/30 rounded-2xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {data.daysUntilCoverageEnd === 0 ? "Your current coverage ends today." : `Your current coverage ends in ${data.daysUntilCoverageEnd} days.`}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Avoid a gap in coverage. Your COBRA election deadline is <strong>{formatDate(data.cobraElectionDeadline)}</strong>. Complete your intake below to find cheaper alternatives before the deadline.
                </p>
              </div>
            </motion.div>
          )}

          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                {data.daysUntilCoverageEnd !== null ? `${data.daysUntilCoverageEnd}d` : "—"}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Until End</div>
            </motion.div>
            
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                {data.cobraPremiumEstimate ? formatCurrency(data.cobraPremiumEstimate) : "—"}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">COBRA Cost</div>
            </motion.div>
            
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border p-5 shadow-sm border-b-4 border-b-green-500">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-green-600 tracking-tight">
                {data.estimatedSavings ? formatCurrency(data.estimatedSavings) : "?"}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Est. Savings</div>
            </motion.div>
            
            <motion.div variants={cardVariants} className="bg-card rounded-2xl border border-card-border p-5 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                {data.checklistProgress}/{data.totalChecklistItems}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Tasks Done</div>
            </motion.div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="md:col-span-2 bg-card rounded-3xl border border-card-border shadow-sm p-6 sm:p-8">
              <h3 className="font-display text-xl font-bold text-foreground mb-6">Your Action Plan</h3>
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <Link key={step.href} href={step.href} className={`group flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${step.done ? "bg-secondary/5 border-transparent" : "bg-background border-border/50 hover:border-primary/40 hover:shadow-md"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 transition-colors ${step.done ? "bg-green-500 text-white" : "bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground"}`}>
                      {step.done ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className={`text-base font-bold ${step.done ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground group-hover:text-primary transition-colors"}`}>{step.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{step.sub}</div>
                    </div>
                    {!step.done && <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>}
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-6">
              {data.stipendEligible && (
                <div className="bg-primary text-primary-foreground rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-primary/20">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-accent" />
                    <span className="font-semibold tracking-wide uppercase text-xs">Stipend Available</span>
                  </div>
                  <div className="font-display text-4xl font-bold mb-1">{formatCurrency(data.stipendMonthlyAmount ?? 0)}<span className="text-lg font-medium opacity-80">/mo</span></div>
                  <div className="text-sm opacity-90 mb-6 leading-relaxed">Financial assistance provided by your employer for transition costs.</div>
                  <Link href="/employee/stipend" className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
                    View Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              <div className="bg-card rounded-3xl border border-card-border p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4 text-violet-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-lg text-foreground mb-2">Coverage Guide</h4>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">24/7 AI-powered answers to your questions about COBRA, ACA, and transition options.</p>
                <Link href="/employee/assistant" className="inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  Ask a question <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-card rounded-3xl border border-card-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-foreground">Task Progress</h4>
                  <span className="text-sm font-bold text-primary">{Math.round(progressPct)}%</span>
                </div>
                <div className="w-full bg-secondary/20 rounded-full h-2.5 mb-5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                </div>
                <Link href="/employee/checklist" className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                  View checklist <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
