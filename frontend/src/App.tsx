import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import React, { useEffect, Suspense, lazy } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import MainCanvas from "@/components/3d/MainCanvas";
import { useUIStore } from "@/store/useUIStore";
import { useAppStore } from "@/store/useAppStore";

import Navbar from "@/components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded pages to split the massive Javascript bundle
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminScansPage = lazy(() => import("./pages/admin/AdminScansPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const ScientistDashboard = lazy(() => import("./pages/scientist/ScientistDashboard"));
const ResearchAnalyticsPage = lazy(() => import("./pages/scientist/ResearchAnalyticsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));


// The scene synchronizer connects React Router to the 3D Camera System
const RouteSceneSync = () => {
  const location = useLocation();
  const setScene = useUIStore((state) => state.setScene);

  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setScene('hero');
        break;
      case '/dashboard':
        setScene('dashboard');
        break;
      case '/upload':
        setScene('lab');
        break;
      case '/chat':
        setScene('insights');
        break;
      default:
        setScene('dashboard');
    }
  }, [location, setScene]);

  return null;
};

const queryClient = new QueryClient();

const App = () => {
  const isDark = useAppStore((state) => state.isDark);
  const syncOfflineQueue = useAppStore((state) => state.syncOfflineQueue);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [isDark]);

  useEffect(() => {
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    const handleOnline = () => {
      syncOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncOfflineQueue]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      {/* 3D Global Environment Background */}
      <MainCanvas />

      {/* 2D UI Overlay Grid */}
      <div className="relative z-10 w-full h-screen flex flex-col overflow-hidden pointer-events-none">
        <BrowserRouter>
          <RouteSceneSync />
          
          {/* Fixed Navbar - always pinned at top */}
          <div className="pointer-events-auto shrink-0">
            <Navbar />
            {/* Spacer to offset content below the fixed navbar */}
            <div className="h-16" />
          </div>

          {/* Scrollable Content Area - only this part scrolls/resizes */}
          <div className="pointer-events-auto flex-1 overflow-y-auto overflow-x-hidden">
            <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                
                {/* Protected User Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

                
                {/* Protected Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/scans" element={<ProtectedRoute requireAdmin><AdminScansPage /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalyticsPage /></ProtectedRoute>} />

                {/* Protected Scientist Routes */}
                <Route path="/scientist" element={<Navigate to="/dashboard" replace />} />
                <Route path="/scientist/research" element={<ProtectedRoute><ResearchAnalyticsPage /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
