import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ReviewItem {
  caseId: number;
  employeeName: string;
  employerName: string;
  departureType: string;
  status: string;
  recommendationGeneratedAt: string | null;
  flagCount: number;
}

export default function ConsultantReviews() {
  const { data, isLoading } = useQuery<{ items: ReviewItem[]; total: number }>({
    queryKey: ["/consultant/reviews"],
    queryFn: () => api.get("/consultant/reviews"),
  });

  return (
    <ProtectedRoute allowedRoles={["consultant", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">{data?.total ?? 0} cases awaiting consultant approval</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (data?.items ?? []).length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-2">Inbox Zero</h3>
              <p className="text-base text-muted-foreground max-w-sm mx-auto">All coverage estimates have been reviewed and approved.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {data!.items.map((item, i) => (
                <motion.div 
                  key={item.caseId} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-2xl border shadow-sm p-5 sm:p-6 transition-all hover:shadow-md ${item.flagCount > 0 ? "border-accent/40 bg-accent/5" : "border-card-border hover:border-primary/30"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-display font-bold text-foreground">{item.employeeName}</h3>
                        {item.flagCount > 0 && (
                          <span className="flex items-center gap-1.5 text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5" />{item.flagCount} Risk Flag{item.flagCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground flex-wrap">
                        <span className="text-foreground">{item.employerName}</span>
                        <span>•</span>
                        <span className="bg-secondary/10 px-2 py-0.5 rounded text-xs uppercase tracking-wider">{capitalize(item.departureType.replace(/_/g, ' '))}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3 font-medium">Generated: {formatDate(item.recommendationGeneratedAt)}</div>
                    </div>
                    <Link href={`/consultant/reviews/${item.caseId}`} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/20 shrink-0 w-full sm:w-auto">
                      Review Case <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
