import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, capitalize } from "@/lib/utils";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Plus, DollarSign, Calendar, Target, Info } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface StipendPolicy {
  id: number;
  name: string;
  monthlyAmount: number;
  durationMonths: number;
  eligibleDepartureTypes: string[];
  maxTotalContribution: number | null;
  reimbursementCategories: string[];
  startDate: string | null;
  createdAt: string;
}

const REIMBURSEMENT_CATS = ["health_insurance_premium", "dental", "vision", "prescription_copay", "mental_health", "telehealth"];
const DEPARTURE_TYPES = ["layoff", "voluntary", "retirement", "reduction_in_hours", "family_coverage_loss", "life_event"];

export default function StipendManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ stipends: StipendPolicy[] }>({
    queryKey: ["/employer/stipends"],
    queryFn: () => api.get("/employer/stipends"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", monthlyAmount: "", durationMonths: "6",
    eligibleDepartureTypes: ["layoff"] as string[],
    reimbursementCategories: ["health_insurance_premium"] as string[],
    maxTotalContribution: "",
  });
  const [creating, setCreating] = useState(false);

  const toggleArr = (key: "eligibleDepartureTypes" | "reimbursementCategories", val: string) => {
    setForm(f => ({
      ...f,
      [key]: (f[key] as string[]).includes(val) ? (f[key] as string[]).filter(x => x !== val) : [...(f[key] as string[]), val],
    }));
  };

  const create = async () => {
    setCreating(true);
    try {
      await api.post("/employer/stipends", {
        ...form,
        monthlyAmount: parseFloat(form.monthlyAmount),
        durationMonths: parseInt(form.durationMonths),
        maxTotalContribution: form.maxTotalContribution ? parseFloat(form.maxTotalContribution) : null,
      });
      await qc.invalidateQueries({ queryKey: ["/employer/stipends"] });
      setShowCreate(false);
    } catch (err) { console.error(err); }
    setCreating(false);
  };

  return (
    <ProtectedRoute allowedRoles={["employer", "admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Stipend Policies</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure healthcare transition assistance for your departing employees</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" /> New Policy
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (data?.stipends ?? []).length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl border border-card-border shadow-sm p-12 text-center max-w-2xl mx-auto mt-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-2">No Stipend Policies Yet</h3>
              <p className="text-muted-foreground mb-8">Create a stipend policy to offer financial healthcare transition assistance to departing employees. This covers COBRA, ACA, or other verified healthcare costs.</p>
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" /> Create First Policy
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data!.stipends.map((s, i) => (
                <motion.div 
                  key={s.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-card-border shadow-sm p-6 relative overflow-hidden group"
                >
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-foreground">{s.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md">
                          <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(s.monthlyAmount)}/mo
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5" /> {s.durationMonths} mos
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Max Total</div>
                      <div className="text-2xl font-display font-bold text-primary">{formatCurrency(s.monthlyAmount * s.durationMonths)}</div>
                    </div>
                  </div>

                  <div className="space-y-5 pt-5 border-t border-border/50">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Eligible For</div>
                      <div className="flex flex-wrap gap-2">
                        {s.eligibleDepartureTypes.map(t => (
                          <span key={t} className="bg-background border border-border text-foreground text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">{capitalize(t.replace(/_/g, ' '))}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reimbursable Categories</div>
                      <div className="flex flex-wrap gap-2">
                        {s.reimbursementCategories.map(c => (
                          <span key={c} className="bg-teal-100 border border-teal-200 text-teal-800 text-xs px-2.5 py-1 rounded-full font-semibold capitalize">{c.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-card-border custom-scrollbar"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-card-foreground">Create Stipend Policy</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Policy Name</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Layoff Transition Support" className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Monthly Amount ($)</label>
                      <input type="number" value={form.monthlyAmount} onChange={e => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} placeholder="400" className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Duration (months)</label>
                      <input type="number" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} placeholder="6" className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none" />
                    </div>
                  </div>
                  
                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      This policy will provide up to <strong>${(parseFloat(form.monthlyAmount) || 0) * (parseInt(form.durationMonths) || 0)}</strong> per eligible employee over {form.durationMonths || 0} months. Funds are only disbursed against approved receipts.
                    </p>
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Eligible Departure Types</label>
                    <div className="flex flex-wrap gap-2">
                      {DEPARTURE_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => toggleArr("eligibleDepartureTypes", t)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.eligibleDepartureTypes.includes(t) ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-background border-border/50 text-foreground hover:border-primary/50"}`}>
                          {capitalize(t.replace(/_/g, ' '))}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Reimbursable Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {REIMBURSEMENT_CATS.map(c => (
                        <button key={c} type="button" onClick={() => toggleArr("reimbursementCategories", c)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.reimbursementCategories.includes(c) ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-background border-border/50 text-foreground hover:border-primary/50"}`}>
                          {c.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8 pt-6 border-t border-border/50">
                  <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold py-3 rounded-xl text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={create} disabled={creating || !form.name || !form.monthlyAmount} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl text-sm transition-colors shadow-md shadow-primary/20 disabled:opacity-50 disabled:shadow-none">
                    {creating ? "Creating Policy..." : "Create Policy"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
