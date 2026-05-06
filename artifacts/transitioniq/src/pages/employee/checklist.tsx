import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { CheckCircle2, Circle, Clock, AlertCircle, Compass } from "lucide-react";
import { motion, type Variants } from "framer-motion";

interface ChecklistItem {
  id: number;
  key: string;
  label: string;
  description: string;
  completed: boolean;
  dueDate: string | null;
  category: string;
}

interface ChecklistResponse {
  items: ChecklistItem[];
  deadlines: {
    cobraElectionDeadline: string | null;
    sepWindowEnd: string | null;
    medicareReminderDate: string | null;
    coverageEndDate: string | null;
  };
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function ChecklistPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ChecklistResponse>({
    queryKey: ["/employee/checklist"],
    queryFn: () => api.get("/employee/checklist"),
  });

  const toggle = async (itemId: number, completed: boolean) => {
    // Optimistic update
    qc.setQueryData<ChecklistResponse>(["/employee/checklist"], old => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(i => i.id === itemId ? { ...i, completed } : i)
      };
    });
    
    try {
      await api.patch("/employee/checklist", { itemId, completed });
      qc.invalidateQueries({ queryKey: ["/employee/dashboard"] });
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["/employee/checklist"] });
    }
  };

  if (isLoading || !data) {
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

  const total = data.items.length;
  const done = data.items.filter(i => i.completed).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const grouped = data.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categoryLabels: Record<string, string> = {
    documents: "Documents & Records",
    intake: "Health Intake",
    recommendations: "Coverage Recommendations",
    due_diligence: "Due Diligence",
    decision: "Make Your Decision",
  };

  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-3xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={cardVariants} className="text-center sm:text-left">
            <h1 className="text-3xl font-display font-bold text-foreground">Transition Checklist</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your progress and stay ahead of critical deadlines.</p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={cardVariants} className="bg-card border border-card-border rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Overall Progress</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Complete tasks to ensure continuous coverage.</p>
              </div>
              <div className="bg-secondary/10 px-4 py-2 rounded-xl text-center">
                <span className="text-xl font-display font-bold text-foreground">{done}</span>
                <span className="text-sm text-muted-foreground font-medium"> / {total} done</span>
              </div>
            </div>
            
            <div className="w-full bg-secondary/20 rounded-full h-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
            </div>
            
            {pct === 100 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> All tasks completed
              </div>
            )}
          </motion.div>

          {/* Key dates */}
          {(data.deadlines.cobraElectionDeadline || data.deadlines.coverageEndDate) && (
            <motion.div 
              initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {data.deadlines.coverageEndDate && (
                <motion.div variants={cardVariants} className="bg-card border border-card-border rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Coverage Ends</div>
                    <div className="text-lg font-display font-bold text-foreground">{formatDate(data.deadlines.coverageEndDate)}</div>
                  </div>
                </motion.div>
              )}
              {data.deadlines.cobraElectionDeadline && (
                <motion.div variants={cardVariants} className="bg-card border border-card-border rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">COBRA Deadline</div>
                    <div className="text-lg font-display font-bold text-foreground">{formatDate(data.deadlines.cobraElectionDeadline)}</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items], groupIndex) => (
              <motion.div 
                key={category} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
                className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 bg-secondary/5 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{categoryLabels[category] ?? capitalize(category)}</h3>
                </div>
                <div className="divide-y divide-border/50">
                  {items.map(item => (
                    <div key={item.id} className={`flex items-start gap-4 px-6 py-5 transition-colors hover:bg-secondary/5 group ${item.completed ? "opacity-60 bg-secondary/5" : ""}`}>
                      <button 
                        onClick={() => toggle(item.id, !item.completed)} 
                        className="mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-transform active:scale-95"
                      >
                        {item.completed
                          ? <CheckCircle2 className="w-6 h-6 text-primary" />
                          : <Circle className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-base font-semibold ${item.completed ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"}`}>{item.label}</div>
                        <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</div>
                        {item.dueDate && !item.completed && (
                          <div className="flex items-center gap-1.5 mt-3 inline-flex bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            Due: {formatDate(item.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
