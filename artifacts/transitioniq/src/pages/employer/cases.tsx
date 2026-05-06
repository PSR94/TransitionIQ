import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, statusColor, statusLabel, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Link } from "wouter";
import { Search, ArrowRight, ClipboardList, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface Case {
  id: number;
  employeeName: string;
  employeeEmail: string;
  departureType: string;
  status: string;
  coverageEndDate: string | null;
  cobraPremiumEstimate: number | null;
  estimatedSavingsMin: number | null;
  estimatedSavingsMax: number | null;
  familyCoverage: boolean;
  inviteSentAt: string | null;
  createdAt: string;
}

const STATUS_ORDER = [
  "draft", "invited", "invite_opened", "intake_started", "intake_completed",
  "recommendations_generated", "consultant_review_needed", "recommendations_released",
  "plan_selected", "closed"
];

export default function EmployerCases() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviting, setInviting] = useState<number | null>(null);
  const [invitedSet, setInvitedSet] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<{ cases: Case[]; total: number }>({
    queryKey: ["/employer/cases"],
    queryFn: () => api.get("/employer/cases"),
  });

  const cases = (data?.cases ?? []).filter(c =>
    (!search || c.employeeName.toLowerCase().includes(search.toLowerCase()) || c.employeeEmail.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || c.status === statusFilter)
  );

  const sendInvite = async (caseId: number) => {
    setInviting(caseId);
    try {
      await api.post(`/employer/cases/${caseId}/invite`, {});
      setInvitedSet(prev => new Set([...prev, caseId]));
      await qc.invalidateQueries({ queryKey: ["/employer/cases"] });
    } catch (err) { console.error(err); }
    setInviting(null);
  };

  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Transition Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">{data?.total ?? 0} total cases in your program</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-card border border-card-border p-4 rounded-2xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input
                type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border-2 border-border/50 hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-sm transition-all outline-none"
              />
            </div>
            <div className="sm:w-56">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border-2 border-border/50 hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl text-sm transition-all outline-none appearance-none font-medium cursor-pointer">
                <option value="">All Statuses</option>
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden min-h-[400px]">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-display font-bold text-foreground mb-1">No cases found</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {search || statusFilter ? "Try adjusting your search or filter criteria." : "Create your first transition case to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-card-border bg-secondary/5">
                      <th className="text-left px-6 py-4">Employee</th>
                      <th className="text-left px-6 py-4 hidden md:table-cell">Departure Type</th>
                      <th className="text-left px-6 py-4">Status</th>
                      <th className="text-left px-6 py-4 hidden lg:table-cell">Coverage End</th>
                      <th className="text-left px-6 py-4 hidden lg:table-cell">COBRA/mo</th>
                      <th className="text-left px-6 py-4 hidden xl:table-cell">Est. Savings</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {cases.map((c, i) => {
                      const avgSavings = c.estimatedSavingsMin && c.estimatedSavingsMax
                        ? (c.estimatedSavingsMin + c.estimatedSavingsMax) / 2 : null;
                      const canInvite = c.status === "draft" || c.status === "pending";
                      const justInvited = invitedSet.has(c.id);
                      return (
                        <motion.tr 
                          key={c.id} 
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
                          className="hover:bg-secondary/5 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-card-foreground group-hover:text-primary transition-colors">{c.employeeName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{c.employeeEmail}</div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                              {capitalize(c.departureType.replace(/_/g, ' '))}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${statusColor(c.status)}`}>
                              {statusLabel(c.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground font-medium">{formatDate(c.coverageEndDate)}</td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground font-medium">
                            {c.cobraPremiumEstimate ? formatCurrency(c.cobraPremiumEstimate) : "—"}
                          </td>
                          <td className="px-6 py-4 hidden xl:table-cell">
                            {avgSavings ? (
                              <span className="inline-flex items-center font-semibold text-green-800 bg-green-100 border border-green-200 px-2.5 py-1 rounded-md text-xs">
                                {formatCurrency(avgSavings)}/mo
                              </span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canInvite && (
                                <button
                                  onClick={() => sendInvite(c.id)}
                                  disabled={inviting === c.id || justInvited}
                                  title={justInvited ? "Invite sent" : "Send invite email to employee"}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 ${justInvited ? "bg-green-100 text-green-800 border border-green-200 cursor-default" : "bg-background border border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"}`}
                                >
                                  {justInvited ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                  {justInvited ? "Sent" : inviting === c.id ? "..." : "Invite"}
                                </button>
                              )}
                              <Link href={`/employer/cases/${c.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                                View <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
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
