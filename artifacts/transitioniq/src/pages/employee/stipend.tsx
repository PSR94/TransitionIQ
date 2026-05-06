import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Star, DollarSign, Calendar, Tag, Info } from "lucide-react";
import { motion } from "framer-motion";

interface StipendInfo {
  eligible: boolean;
  stipendName?: string;
  monthlyAmount?: number;
  durationMonths?: number;
  totalAmount?: number;
  remainingMonths?: number;
  reimbursementCategories?: string[];
}

export default function StipendPage() {
  const { data, isLoading } = useQuery<StipendInfo>({ queryKey: ["/employee/stipend"], queryFn: () => api.get("/employee/stipend") });

  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-3xl mx-auto pt-6">
          <div className="text-center sm:text-left mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">Employer Stipend</h1>
            <p className="text-sm text-muted-foreground mt-1">Financial assistance for your healthcare transition.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !data?.eligible ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">No Stipend Available</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your employer has not configured a healthcare stipend for your departure type, or your eligibility period has expired.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-10 relative overflow-hidden shadow-lg shadow-primary/20">
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mb-6">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase tracking-wider">Eligible for Transition Support</span>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div>
                    <div className="text-sm font-medium text-primary-foreground/80 mb-1 uppercase tracking-wider">Available Monthly Amount</div>
                    <div className="font-display text-5xl md:text-6xl font-bold tracking-tight">
                      {formatCurrency(data.monthlyAmount ?? 0)}
                      <span className="text-2xl md:text-3xl font-medium opacity-70">/mo</span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[140px]">
                    <div className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wider mb-1">Max Total Value</div>
                    <div className="text-2xl font-bold">{formatCurrency(data.totalAmount ?? 0)}</div>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-card-border p-6 shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
                    <div className="text-2xl font-display font-bold text-foreground">{data.durationMonths} <span className="text-base font-medium text-muted-foreground">months</span></div>
                    <div className="text-sm font-medium text-accent-foreground/80 bg-accent/10 px-2 py-0.5 rounded-md inline-block mt-2">
                      {data.remainingMonths} months remaining
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-card-border p-6 shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Funding Type</div>
                    <div className="text-lg font-display font-bold text-foreground">Reimbursement</div>
                    <div className="text-sm text-muted-foreground mt-1 leading-snug">Requires valid receipts for approved categories.</div>
                  </div>
                </motion.div>
              </div>

              {data.reimbursementCategories && data.reimbursementCategories.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-border/50 bg-secondary/5 flex items-center gap-3">
                    <Tag className="w-5 h-5 text-foreground" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Eligible Categories</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2.5 mb-6">
                      {data.reimbursementCategories.map(cat => (
                        <span key={cat} className="bg-background border border-border text-foreground text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
                          {capitalize(cat.replace(/_/g, " "))}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-start gap-3 bg-secondary/5 rounded-xl p-4 border border-border/50">
                      <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                        To claim your stipend, you must submit valid receipts for expenses in the categories above. Contact your former HR department or reference your offboarding packet for submission instructions.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
