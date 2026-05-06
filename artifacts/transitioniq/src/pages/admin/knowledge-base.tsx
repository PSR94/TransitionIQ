import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { FileText, BookOpen, Database } from "lucide-react";
import { motion } from "framer-motion";

interface KnowledgeDoc {
  id: number;
  title: string;
  category: string;
  chunkCount: number;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  cobra: "bg-red-100 text-red-700 border-red-200",
  aca: "bg-blue-100 text-blue-700 border-blue-200",
  medicare: "bg-indigo-100 text-indigo-700 border-indigo-200",
  plan_basics: "bg-teal-100 text-teal-700 border-teal-200",
  stipends: "bg-green-100 text-green-700 border-green-200",
};

export default function KnowledgeBase() {
  const { data, isLoading } = useQuery<{ documents: KnowledgeDoc[]; total: number }>({
    queryKey: ["/admin/knowledge-base"],
    queryFn: () => api.get("/admin/knowledge-base"),
  });

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
          <div className="text-center sm:text-left mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground mt-1">Source documents powering the Coverage Guide RAG architecture.</p>
          </div>

          {isLoading ? (
             <div className="flex items-center justify-center min-h-[40vh]">
               <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
             </div>
          ) : (
            <>
              <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm flex items-center gap-6 mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Index Status</div>
                  <div className="text-2xl font-display font-bold text-foreground">
                    {data?.total ?? 0} Documents Active
                  </div>
                  <div className="text-sm font-medium text-primary mt-1 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Embeddings up to date
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {(data?.documents ?? []).map((doc, i) => (
                  <motion.div 
                    key={doc.id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl border border-card-border shadow-sm p-5 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{doc.title}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${CATEGORY_COLORS[doc.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {doc.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5 bg-secondary/10 px-2 py-1 rounded">
                            <BookOpen className="w-3.5 h-3.5" />
                            {doc.chunkCount} vector chunks
                          </span>
                          <span>Indexed: {formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {(data?.documents ?? []).length === 0 && (
                  <div className="text-center py-16 bg-card border border-card-border rounded-3xl">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-foreground">No documents found</h3>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
