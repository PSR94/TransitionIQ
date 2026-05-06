import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Compass, ShieldCheck, ArrowRight, Loader2, Activity, Users, FileText, Database } from "lucide-react";
import { motion } from "framer-motion";

const demoRoles = [
  { role: "employer", label: "Employer (HR)", icon: Users, color: "bg-primary hover:bg-primary/90", description: "Manage transitions & ROI" },
  { role: "employee", label: "Employee", icon: Activity, color: "bg-secondary hover:bg-secondary/90", description: "Find health coverage" },
  { role: "consultant", label: "Consultant", icon: FileText, color: "bg-slate-700 hover:bg-slate-800", description: "Review & approve plans" },
  { role: "admin", label: "Platform Admin", icon: Database, color: "bg-stone-800 hover:bg-stone-900", description: "System oversight" },
];

export default function LoginPage() {
  const { login, demoLogin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async (role: string) => {
    setDemoLoading(role);
    setError("");
    try {
      await demoLogin(role);
      const roleHome: Record<string, string> = {
        employer: "/employer/dashboard",
        employee: "/employee/dashboard",
        consultant: "/consultant/dashboard",
        admin: "/admin/dashboard",
      };
      setLocation(roleHome[role] ?? "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background selection:bg-primary/20">
      {/* Left side - Branding & Value Prop */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] mix-blend-overlay opacity-10 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-lg">
              <Compass className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">TransitionIQ</span>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-lg"
          >
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border border-primary-foreground/20">
              <ShieldCheck className="w-4 h-4 text-accent" />
              Local Demo Workflow
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Navigate coverage transitions with clearer options.
            </h1>
            <p className="text-primary-foreground/80 text-lg leading-relaxed mb-10">
              A local-first demo that helps benefits teams compare COBRA estimates, Marketplace-style options, stipends, and consultant review steps.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 pt-10 border-t border-primary-foreground/10">
          <div>
            <div className="text-3xl font-display font-bold text-accent mb-1">Demo</div>
            <div className="text-sm text-primary-foreground/70 font-medium">Synthetic plan samples</div>
          </div>
          <div>
            <div className="text-3xl font-display font-bold text-white mb-1">4 roles</div>
            <div className="text-sm text-primary-foreground/70 font-medium">Review workflow</div>
          </div>
        </div>
      </div>

      {/* Right side - Forms */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-10">
          
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">TransitionIQ</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Work Email</label>
              <input
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                placeholder="name@company.com" 
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Password</label>
                <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Forgot password?</a>
              </div>
              <input
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-border/50 bg-background hover:border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                placeholder="••••••••" 
                required
              />
            </div>
            <button
              type="submit" 
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 disabled:opacity-70 disabled:shadow-none"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? "Authenticating..." : "Sign In"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground uppercase tracking-widest font-semibold">Demo Environments</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demoRoles.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.role}
                  onClick={() => handleDemo(r.role)}
                  disabled={!!demoLoading}
                  className={`group relative overflow-hidden ${r.color} text-white rounded-xl p-4 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Icon className="w-5 h-5 opacity-80" />
                    {demoLoading === r.role ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <div className="font-semibold text-sm mb-1">{r.label}</div>
                  <div className="text-xs opacity-75 line-clamp-1">{r.description}</div>
                </button>
              );
            })}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Demo password: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-foreground">demo1234</code></p>
          </div>

        </div>
      </div>
    </div>
  );
}
