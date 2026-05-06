import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Save, Loader2, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface Settings {
  premiumWeight: number;
  deductibleWeight: number;
  outOfPocketMaxWeight: number;
  estimatedAnnualCostWeight: number;
  budgetMatchWeight: number;
  metalLevelWeight: number;
  prescriptionWeight: number;
  doctorNetworkWeight: number;
  qualityRatingWeight: number;
  updatedAt: string | null;
}

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["/admin/recommendation-settings"],
    queryFn: () => api.get("/admin/recommendation-settings"),
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/admin/recommendation-settings", form);
      await qc.invalidateQueries({ queryKey: ["/admin/recommendation-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const total = Object.entries(form)
    .filter(([k]) => k.endsWith("Weight"))
    .reduce((s, [, v]) => s + (parseFloat(v as string) || 0), 0);

  const isTotalValid = Math.abs(total - 1) <= 0.02;

  const weights: { key: keyof Settings; label: string; desc: string }[] = [
    { key: "estimatedAnnualCostWeight", label: "Estimated Annual Cost", desc: "Total expected annual healthcare spend" },
    { key: "premiumWeight", label: "Monthly Premium", desc: "Weight given to monthly cost of the plan" },
    { key: "budgetMatchWeight", label: "Budget Match", desc: "How well the premium fits stated monthly budget" },
    { key: "deductibleWeight", label: "Deductible", desc: "Annual deductible amount" },
    { key: "outOfPocketMaxWeight", label: "Out-of-Pocket Max", desc: "Maximum annual out-of-pocket exposure" },
    { key: "metalLevelWeight", label: "Metal Level Fit", desc: "Alignment with expected healthcare usage level" },
    { key: "prescriptionWeight", label: "Prescription Coverage", desc: "Quality of drug coverage for plan" },
    { key: "doctorNetworkWeight", label: "Doctor Network", desc: "Network breadth and provider accessibility" },
    { key: "qualityRatingWeight", label: "Quality Rating", desc: "Plan quality score from CMS ratings" },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Recommendation Engine</h1>
            <p className="text-sm text-muted-foreground mt-1">Tune the algorithmic weights that power the AI coverage recommendations.</p>
          </div>

          <div className="bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-border/50 bg-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-foreground">Scoring Algorithm Weights</h3>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Global Configuration</div>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-xl text-center border-2 ${isTotalValid ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-70">Sum to 100%</div>
                <div className={`text-xl font-display font-bold ${isTotalValid ? "text-green-700" : "text-destructive"}`}>{(total * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-8">
                  {weights.map((w, i) => {
                    const val = parseFloat(form[w.key] as unknown as string) || 0;
                    const pct = (val * 100).toFixed(0);
                    return (
                      <motion.div 
                        key={w.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-end justify-between mb-3">
                          <div>
                            <div className="text-sm font-bold text-foreground">{w.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{w.desc}</div>
                          </div>
                          <div className="bg-secondary/10 px-3 py-1 rounded-lg text-sm font-bold text-primary min-w-[3rem] text-center">
                            {pct}%
                          </div>
                        </div>
                        <input 
                          type="range" min="0" max="0.5" step="0.01" value={val}
                          onChange={e => setForm(f => ({ ...f, [w.key]: parseFloat(e.target.value) }))}
                          className="w-full accent-primary h-2.5 bg-secondary/20 rounded-full appearance-none outline-none focus:ring-4 focus:ring-primary/20 transition-shadow" 
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-5 sm:px-8 border-t border-border/50 bg-secondary/5 flex justify-end">
              <button 
                onClick={save} 
                disabled={saving || isLoading || !isTotalValid}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-md shadow-primary/20 disabled:shadow-none"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saved ? "Configuration Saved!" : saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
