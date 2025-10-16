import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthForm } from "@/components/AuthForm";
import { AppLayout } from "@/components/layout/AppLayout";
import React, { Suspense, lazy } from "react";
import NotFound from "./pages/NotFound";
import { initSupabaseDebugging } from "@/lib/debug-supabase";

// Lazy load pages to reduce initial bundle size
const ImprovedTradingDashboard = lazy(() => import("@/components/ImprovedTradingDashboard"));
const DashboardWithSidebar = lazy(() => import("@/components/DashboardWithSidebar").then(module => ({ default: module.default })));
const TradesPage = lazy(() => import("@/pages/Trades"));
const AnalyticsPage = lazy(() => import("@/pages/Analytics"));
const ChallengesPage = lazy(() => import("@/pages/Challenges"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const HelpPage = lazy(() => import("@/pages/Help"));
const ChallengePage = lazy(() => import("@/pages/Challenge"));

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-on-surface-variant">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-pulse">
              <div className="text-on-surface-variant">Loading dashboard...</div>
            </div>
          </div>
        }>
          <DashboardWithSidebar />
        </Suspense>
      } />
      <Route path="/trades" element={
        <AppLayout activeTab="trades">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading trades...</div>
              </div>
            </div>
          }>
            <TradesPage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="/analytics" element={
        <AppLayout activeTab="analytics">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading analytics...</div>
              </div>
            </div>
          }>
            <AnalyticsPage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="/challenges" element={
        <AppLayout activeTab="challenge">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading challenges...</div>
              </div>
            </div>
          }>
            <ChallengesPage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="/settings" element={
        <AppLayout activeTab="settings">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading settings...</div>
              </div>
            </div>
          }>
            <SettingsPage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="/help" element={
        <AppLayout activeTab="help">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading help...</div>
              </div>
            </div>
          }>
            <HelpPage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="/challenge" element={
        <AppLayout activeTab="challenge">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-pulse">
                <div className="text-on-surface-variant">Loading challenge...</div>
              </div>
            </div>
          }>
            <ChallengePage />
          </Suspense>
        </AppLayout>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  // Initialize debugging in development
  React.useEffect(() => {
    initSupabaseDebugging();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              basename={import.meta.env.PROD ? "/bias-to-profit" : ""}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
