import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Building2, Users, FileText, Settings, BarChart, 
  Home, Activity, Shield, ClipboardList, Database, 
  MessageSquare, FileCheck, CheckSquare, LifeBuoy,
  LogOut, Compass, type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface NavLink { href: string; label: string; icon: LucideIcon }

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const role = user.role;
  let links: NavLink[] = [];

  if (role === 'employer') {
    links = [
      { href: '/employer/dashboard', label: 'Dashboard', icon: Home },
      { href: '/employer/cases', label: 'Cases', icon: ClipboardList },
      { href: '/employer/analytics', label: 'Analytics', icon: BarChart },
      { href: '/employer/stipends', label: 'Stipends', icon: Database },
      { href: '/employer/roi-simulator', label: 'ROI Simulator', icon: Activity },
    ];
  } else if (role === 'employee') {
    links = [
      { href: '/employee/dashboard', label: 'Dashboard', icon: Home },
      { href: '/employee/intake', label: 'Intake Form', icon: FileText },
      { href: '/employee/recommendations', label: 'Recommendations', icon: Shield },
      { href: '/employee/assistant', label: 'Coverage Guide', icon: MessageSquare },
      { href: '/employee/checklist', label: 'Checklist', icon: CheckSquare },
      { href: '/employee/stipend', label: 'Stipend', icon: Database },
    ];
  } else if (role === 'consultant') {
    links = [
      { href: '/consultant/dashboard', label: 'Dashboard', icon: Home },
      { href: '/consultant/reviews', label: 'Case Reviews', icon: FileCheck },
    ];
  } else if (role === 'admin') {
    links = [
      { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { href: '/admin/evaluations', label: 'AI Evaluations', icon: Activity },
      { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: FileText },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ];
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <motion.aside 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col z-20"
      >
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <Link href="/" className="flex items-center gap-2.5 outline-none">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight text-sidebar-foreground">
              TransitionIQ
            </span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href || location.startsWith(`${link.href}/`);
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none ${
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'}`} />
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-indicator"
                      className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-2 py-3 bg-sidebar-accent/30 rounded-xl mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</div>
              <div className="text-xs text-sidebar-foreground/60 capitalize truncate">{user.role} Account</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2.5 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-6 lg:p-10 max-w-7xl mx-auto min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
