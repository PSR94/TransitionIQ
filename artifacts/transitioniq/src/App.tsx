import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";

import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

import EmployerDashboard from "@/pages/employer/dashboard";
import EmployerCases from "@/pages/employer/cases";
import EmployerAnalytics from "@/pages/employer/analytics";
import EmployerStipends from "@/pages/employer/stipends";
import RoiSimulator from "@/pages/employer/roi-simulator";

import EmployeeDashboard from "@/pages/employee/dashboard";
import IntakePage from "@/pages/employee/intake";
import RecommendationsPage from "@/pages/employee/recommendations";
import AssistantPage from "@/pages/employee/assistant";
import ChecklistPage from "@/pages/employee/checklist";
import StipendPage from "@/pages/employee/stipend";

import ConsultantDashboard from "@/pages/consultant/dashboard";
import ConsultantReviews from "@/pages/consultant/reviews";
import ReviewDetail from "@/pages/consultant/review-detail";

import AdminDashboard from "@/pages/admin/dashboard";
import AuditLogs from "@/pages/admin/audit-logs";
import EvaluationsPage from "@/pages/admin/evaluations";
import KnowledgeBase from "@/pages/admin/knowledge-base";
import AdminSettings from "@/pages/admin/settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function RoleRouter() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/login") {
      setLocation("/login");
    }
    if (!isLoading && user && location === "/") {
      const roleHome: Record<string, string> = {
        employer: "/employer/dashboard",
        employee: "/employee/dashboard",
        consultant: "/consultant/dashboard",
        admin: "/admin/dashboard",
      };
      setLocation(roleHome[user.role] ?? "/login");
    }
  }, [isLoading, user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <div className="text-sm text-gray-400">Loading TransitionIQ Health...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      {/* Employer routes */}
      <Route path="/employer/dashboard" component={EmployerDashboard} />
      <Route path="/employer/cases/:caseId" component={EmployerCases} />
      <Route path="/employer/cases" component={EmployerCases} />
      <Route path="/employer/analytics" component={EmployerAnalytics} />
      <Route path="/employer/stipends" component={EmployerStipends} />
      <Route path="/employer/roi-simulator" component={RoiSimulator} />

      {/* Employee routes */}
      <Route path="/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/employee/intake" component={IntakePage} />
      <Route path="/employee/recommendations" component={RecommendationsPage} />
      <Route path="/employee/assistant" component={AssistantPage} />
      <Route path="/employee/checklist" component={ChecklistPage} />
      <Route path="/employee/stipend" component={StipendPage} />

      {/* Consultant routes */}
      <Route path="/consultant/dashboard" component={ConsultantDashboard} />
      <Route path="/consultant/reviews/:caseId" component={ReviewDetail} />
      <Route path="/consultant/reviews" component={ConsultantReviews} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/audit-logs" component={AuditLogs} />
      <Route path="/admin/evaluations" component={EvaluationsPage} />
      <Route path="/admin/knowledge-base" component={KnowledgeBase} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route path="/" component={() => null} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <RoleRouter />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
