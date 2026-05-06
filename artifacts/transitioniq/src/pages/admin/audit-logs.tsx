import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Search, ShieldAlert, FileCode2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface AuditLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/admin/audit-logs"],
    queryFn: () => api.get("/admin/audit-logs?limit=200"),
  });

  const logs = (data?.logs ?? []).filter(l =>
    !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.userEmail?.toLowerCase().includes(search.toLowerCase()) || false
  );

  const actionColor = (action: string) => {
    if (action.includes("login")) return "bg-blue-500/10 text-blue-700 border-blue-200";
    if (action.includes("create")) return "bg-green-500/10 text-green-700 border-green-200";
    if (action.includes("approve")) return "bg-primary/10 text-primary border-primary/20";
    if (action.includes("reject")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (action.includes("evaluation")) return "bg-violet-500/10 text-violet-700 border-violet-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Security Audit Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Immutable record of system activity • {data?.total ?? 0} events recorded</p>
          </div>

          <div className="bg-card border border-card-border p-4 rounded-2xl shadow-sm max-w-md">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/70" />
              <input type="text" placeholder="Filter by action or user email..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border-2 border-border/50 hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-sm font-medium transition-all outline-none" />
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                 <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                   <ShieldAlert className="w-8 h-8 text-secondary" />
                 </div>
                 <h3 className="text-lg font-display font-bold text-foreground">No logs match your search</h3>
               </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-secondary/5 border-b border-border/50">
                      <th className="text-left px-6 py-4">Event Time</th>
                      <th className="text-left px-6 py-4">Action</th>
                      <th className="text-left px-6 py-4 hidden md:table-cell">Actor</th>
                      <th className="text-left px-6 py-4 hidden lg:table-cell">Target Resource</th>
                      <th className="text-left px-6 py-4 hidden xl:table-cell w-1/3">Payload / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {logs.map((log, i) => (
                      <motion.tr 
                        key={log.id} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.1, delay: Math.min(i * 0.02, 0.2) }}
                        className="hover:bg-secondary/5 transition-colors font-medium text-foreground/80"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${actionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell text-xs">
                          {log.userEmail ?? <span className="text-muted-foreground italic">System Actor</span>}
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell text-xs">
                          {log.resourceType ? (
                            <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700 font-mono">
                              {log.resourceType}:{log.resourceId}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 hidden xl:table-cell text-xs text-muted-foreground">
                          {log.details ? (
                            <div className="flex items-start gap-2">
                              <FileCode2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-2 font-mono text-[10px]">{log.details}</span>
                            </div>
                          ) : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
