import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import React, { useEffect } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import MainCanvas from "@/components/3d/MainCanvas";
import { useUIStore } from "@/store/useUIStore";
import { useAppStore } from "@/store/useAppStore";

import Navbar from "@/components/Navbar";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminScansPage from "./pages/admin/AdminScansPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

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
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [isDark]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      {/* 3D Global Environment Background */}
      <MainCanvas />

      {/* 2D UI Overlay Grid */}
      <div className="relative z-10 w-full h-full min-h-screen pointer-events-none">
        <BrowserRouter>
          <RouteSceneSync />
          
          <div className="pointer-events-auto">
            <Navbar />
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
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
