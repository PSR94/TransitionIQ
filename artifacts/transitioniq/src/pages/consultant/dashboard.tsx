import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "wouter";
import { ClipboardList, CheckCircle2, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface ConsultantDashboard {
  pendingReviews: number;
  completedReviews: number;
  avgReviewTime: number;
  recentReviews: {
    caseId: number;
    employeeName: string;
    employerName: string;
    departureType: string;
    status: string;
    recommendationGeneratedAt: string | null;
    flagCount: number;
  }[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function ConsultantDashboard() {
  const { data, isLoading } = useQuery<ConsultantDashboard>({
    queryKey: ["/consultant/dashboard"],
    queryFn: () => api.get("/consultant/dashboard"),
  });

  return (
    <ProtectedRoute allowedRoles={["consultant", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Consultant Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Review rule-assisted demo coverage estimates before release</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6"
              >
                <motion.div variants={cardVariants} className="bg-card rounded-3xl border border-card-border p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-accent/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-4xl font-display font-bold text-foreground">{data?.pendingReviews}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Pending Reviews</div>
                </motion.div>
                
                <motion.div variants={cardVariants} className="bg-card rounded-3xl border border-card-border p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                  <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-4xl font-display font-bold text-foreground">{data?.completedReviews}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Completed This Period</div>
                </motion.div>
                
                <motion.div variants={cardVariants} className="bg-card rounded-3xl border border-card-border p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-4xl font-display font-bold text-foreground">{data?.avgReviewTime}<span className="text-2xl font-medium text-muted-foreground ml-1">hrs</span></div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Review Time</div>
                </motion.div>
              </motion.div>

              <motion.div variants={cardVariants} initial="hidden" animate="visible" className="bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden min-h-[300px]">
                <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-secondary/5">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Cases Pending Review</h3>
                  <Link href="/consultant/reviews" className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors">
                    View All Queue <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background border-b border-border/50">
                        <th className="text-left px-6 py-4">Employee</th>
                        <th className="text-left px-6 py-4 hidden md:table-cell">Employer</th>
                        <th className="text-left px-6 py-4 hidden md:table-cell">Type</th>
                        <th className="text-left px-6 py-4">Risk Flags</th>
                        <th className="text-left px-6 py-4 hidden lg:table-cell">Generated</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(data?.recentReviews ?? []).map(r => (
                        <tr key={r.caseId} className="hover:bg-secondary/5 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-foreground">{r.employeeName}</td>
                          <td className="px-6 py-4 hidden md:table-cell font-medium text-muted-foreground">{r.employerName}</td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">{capitalize(r.departureType.replace(/_/g, ' '))}</span>
                          </td>
                          <td className="px-6 py-4">
                            {r.flagCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />{r.flagCount} flag{r.flagCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-500/10 text-green-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />Clean
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell font-medium text-muted-foreground">{formatDate(r.recommendationGeneratedAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/consultant/reviews/${r.caseId}`} className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm shadow-primary/20">
                              Review <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {(data?.recentReviews ?? []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-16 px-4">
                            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="w-8 h-8 text-secondary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Queue is empty</h3>
                            <p className="text-sm text-muted-foreground mt-1">You've reviewed all pending recommendations.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
