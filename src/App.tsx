import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthForm } from "@/components/AuthForm";
import React, { Suspense, lazy } from "react";
import NotFound from "./pages/NotFound";

// Lazy load the main dashboard to reduce initial bundle size
const ImprovedTradingDashboard = lazy(() => import("@/components/ImprovedTradingDashboard"));

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-trading-muted">Loading...</div>
      </div>
    );
  }

  return user ? (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-trading-muted">Loading dashboard...</div>
      </div>
    }>
      <ImprovedTradingDashboard />
    </Suspense>
  ) : <AuthForm />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            basename="/bias-to-profit"
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<AppContent />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
