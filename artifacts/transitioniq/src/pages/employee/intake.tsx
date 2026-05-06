import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { useLocation } from "wouter";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { capitalize } from "@/lib/utils";

const STEPS = [
  { title: "Basic Profile", desc: "Just the essentials to establish baseline eligibility." },
  { title: "Current Coverage", desc: "Information about what you're losing to compare accurately." },
  { title: "Health Profile", desc: "Understanding your usage helps find the right balance." },
  { title: "Preferences", desc: "Your priorities for cost, network, and coverage." },
];

const INCOME_RANGES = ["Under $25,000", "$25,000 - $50,000", "$50,000 - $75,000", "$75,000 - $100,000", "$100,000 - $150,000", "Over $150,000"];
const STATES = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI", "CO", "MN", "OR", "SC", "AL", "LA", "KY", "CT", "OK", "UT", "NV", "AR", "MS", "KS", "NM", "NE", "ID", "WV", "HA", "NH", "ME", "MT", "RI", "DE", "SD", "ND", "AK", "VT", "WY"];
const USAGE_OPTIONS = [
  { value: "low", label: "Low (Preventative)", desc: "Healthy, mostly just checkups" },
  { value: "medium", label: "Medium (Occasional)", desc: "A few unexpected visits per year" },
  { value: "high", label: "High (Frequent)", desc: "Regular care or chronic conditions" },
];
const DEDUCTIBLE_OPTIONS = ["Under $1,000", "$1,000–$2,000", "$2,000–$4,000", "$4,000–$6,000", "Over $6,000"];
const PRIORITY_OPTIONS = ["low_premium", "low_deductible", "network_access", "prescription", "telehealth", "mental_health", "family_coverage", "hsa_eligible"];

export default function IntakePage() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useQuery({ queryKey: ["/employee/intake"], queryFn: () => api.get<Record<string, unknown>>("/employee/intake") });

  const [form, setForm] = useState({
    age: "", zipCode: "", state: "CA", householdSize: "", expectedAnnualIncomeRange: INCOME_RANGES[2],
    coverageEndDate: "", cobraPremiumEstimate: "", monthlyHealthcareBudget: "", currentPlanType: "PPO",
    dependentCoverageNeeds: false, doctorPreference: false, prescriptionNeeds: false, spouseCoveragePossibility: false,
    expectedMedicalUsage: "low", preferredDeductibleRange: "$2,000–$4,000", medicareEligible: false,
    coveragePriorities: [] as string[],
  });

  const togglePriority = (p: string) => {
    setForm(f => ({
      ...f,
      coveragePriorities: f.coveragePriorities.includes(p) ? f.coveragePriorities.filter(x => x !== p) : [...f.coveragePriorities, p],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post("/employee/intake", { ...form, age: parseInt(form.age) || null, householdSize: parseInt(form.householdSize) || null, cobraPremiumEstimate: parseFloat(form.cobraPremiumEstimate) || null, monthlyHealthcareBudget: parseFloat(form.monthlyHealthcareBudget) || null });
      await qc.invalidateQueries({ queryKey: ["/employee/dashboard"] });
      setLocation("/employee/recommendations");
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const inputClass = "w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none font-medium";
  const labelClass = "block text-xs font-bold text-foreground uppercase tracking-wider mb-2";

  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto pb-12 pt-6">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">Health Profile Intake</h1>
            <p className="text-muted-foreground text-lg">We need a few details to generate your personalized coverage recommendations.</p>
          </div>

          {/* Stepper */}
          <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-secondary/20 -translate-y-1/2 z-0 rounded-full" />
            <div className="absolute left-0 top-1/2 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            
            {STEPS.map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 border-4 border-background ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-slate-200 text-slate-600"}`}>
                  {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <div className={`absolute top-12 text-xs font-semibold whitespace-nowrap hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.title}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden sm:mt-16">
            <div className="px-6 py-5 border-b border-border/50 bg-secondary/5">
              <h2 className="text-xl font-display font-bold text-foreground">{STEPS[step].title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{STEPS[step].desc}</p>
            </div>
            
            <div className="p-6 sm:p-8 min-h-[350px]">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 0 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>Your Age</label>
                          <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 38" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Household Size</label>
                          <input type="number" value={form.householdSize} onChange={e => setForm(f => ({ ...f, householdSize: e.target.value }))} placeholder="e.g. 1" className={inputClass} />
                          <p className="text-[11px] text-muted-foreground mt-1.5">Yourself + spouse + dependents</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>ZIP Code</label>
                          <input type="text" value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="e.g. 90210" maxLength={5} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>State</label>
                          <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={`${inputClass} appearance-none`}>
                            {STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border/50">
                        <label className={labelClass}>Expected Annual Income (2025)</label>
                        <select value={form.expectedAnnualIncomeRange} onChange={e => setForm(f => ({ ...f, expectedAnnualIncomeRange: e.target.value }))} className={`${inputClass} appearance-none`}>
                          {INCOME_RANGES.map(r => <option key={r}>{r}</option>)}
                        </select>
                        <div className="flex items-start gap-2 mt-3 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 leading-relaxed">This strictly estimates your ACA subsidy eligibility. It is heavily encrypted and <strong>never</strong> shared with your employer.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className={labelClass}>When does your current coverage end?</label>
                        <input type="date" value={form.coverageEndDate} onChange={e => setForm(f => ({ ...f, coverageEndDate: e.target.value }))} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>COBRA Monthly Premium ($)</label>
                          <input type="number" value={form.cobraPremiumEstimate} onChange={e => setForm(f => ({ ...f, cobraPremiumEstimate: e.target.value }))} placeholder="e.g. 847" className={inputClass} />
                          <p className="text-[11px] text-muted-foreground mt-1.5">Check your departure packet</p>
                        </div>
                        <div>
                          <label className={labelClass}>Your Monthly Health Budget ($)</label>
                          <input type="number" value={form.monthlyHealthcareBudget} onChange={e => setForm(f => ({ ...f, monthlyHealthcareBudget: e.target.value }))} placeholder="e.g. 500" className={inputClass} />
                        </div>
                      </div>
                      <div className="pt-2">
                        <label className={labelClass}>Current Plan Type</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {["PPO", "HMO", "EPO", "POS", "HDHP"].map(t => (
                            <button key={t} type="button" onClick={() => setForm(f => ({ ...f, currentPlanType: t }))} 
                              className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${form.currentPlanType === t ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-background border-border/50 text-foreground hover:border-primary/40"}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        {[
                          { key: "dependentCoverageNeeds", label: "Covering spouse or children?", icon: "👨‍👩‍👧‍👦" },
                          { key: "doctorPreference", label: "Need to keep current doctors?", icon: "🩺" },
                          { key: "prescriptionNeeds", label: "Take regular prescriptions?", icon: "💊" },
                          { key: "spouseCoveragePossibility", label: "Eligible for a spouse's plan?", icon: "🤝" },
                        ].map(item => (
                          <button 
                            key={item.key} 
                            type="button"
                            onClick={() => setForm(f => ({ ...f, [item.key]: !f[item.key as keyof typeof f] }))}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                              (form as Record<string, unknown>)[item.key] 
                                ? "bg-primary/5 border-primary" 
                                : "bg-background border-border/50 hover:border-primary/30"
                            }`}
                          >
                            <span className="text-sm font-semibold text-foreground flex items-center gap-3">
                              <span className="text-xl">{item.icon}</span> {item.label}
                            </span>
                            <div className={`relative w-12 h-6 rounded-full transition-colors ${(form as Record<string, unknown>)[item.key] ? "bg-primary" : "bg-secondary/30"}`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as Record<string, unknown>)[item.key] ? "translate-x-7" : "translate-x-1"}`} />
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="pt-2 border-t border-border/50">
                        <label className={labelClass}>Expected Medical Usage</label>
                        <div className="grid gap-3">
                          {USAGE_OPTIONS.map(o => (
                            <button key={o.value} type="button" onClick={() => setForm(f => ({ ...f, expectedMedicalUsage: o.value }))}
                              className={`p-4 rounded-xl text-left border-2 transition-all ${form.expectedMedicalUsage === o.value ? "bg-primary/5 border-primary shadow-sm" : "bg-background border-border/50 hover:border-primary/30"}`}>
                              <div className="text-sm font-bold text-foreground mb-1">{o.label}</div>
                              <div className="text-xs text-muted-foreground">{o.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <div>
                        <label className={labelClass}>Preferred Deductible Range</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {DEDUCTIBLE_OPTIONS.map(d => (
                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, preferredDeductibleRange: d }))}
                              className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${form.preferredDeductibleRange === d ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "bg-background border-border/50 text-foreground hover:border-primary/40"}`}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-border/50">
                        <button type="button" onClick={() => setForm(f => ({ ...f, medicareEligible: !f.medicareEligible }))}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${form.medicareEligible ? "bg-primary/5 border-primary" : "bg-background border-border/50 hover:border-primary/30"}`}>
                          <span className="text-sm font-semibold text-foreground">Approaching Medicare eligibility (age 64+)?</span>
                          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.medicareEligible ? "bg-primary" : "bg-secondary/30"}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.medicareEligible ? "translate-x-7" : "translate-x-1"}`} />
                          </div>
                        </button>
                      </div>

                      <div className="pt-4 border-t border-border/50">
                        <label className={labelClass}>Coverage Priorities <span className="normal-case text-muted-foreground font-medium ml-1">(select all that apply)</span></label>
                        <div className="flex flex-wrap gap-2.5">
                          {PRIORITY_OPTIONS.map(p => (
                            <button key={p} type="button" onClick={() => togglePriority(p)}
                              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${form.coveragePriorities.includes(p) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border/50 text-foreground hover:border-primary/40"}`}>
                              {capitalize(p.replace(/_/g, " "))}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 py-5 border-t border-border/50 bg-secondary/5 flex justify-between items-center">
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-semibold text-foreground bg-background hover:bg-secondary/10 hover:border-border disabled:opacity-40 disabled:hover:bg-background transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-md shadow-primary/20">
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:shadow-none">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Processing..." : "Generate My Plan"}
                </button>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
