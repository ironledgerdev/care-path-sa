import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { FloatingButtons } from "./components/FloatingButtons";
import VoiceInterface from "./components/VoiceInterface";
import LiveChatWidget from "./components/LiveChatWidget";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Memberships = lazy(() => import("./pages/Memberships"));
const About = lazy(() => import("./pages/About"));
const Team = lazy(() => import("./pages/Team"));
const Legal = lazy(() => import("./pages/Legal"));
const DoctorEnrollment = lazy(() => import("./pages/DoctorEnrollment"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorSearch = lazy(() => import("./pages/DoctorSearch"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const DemoLogin = lazy(() => import("./pages/DemoLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAccess = lazy(() => import("./components/AdminAccess").then(module => ({ default: module.AdminAccess })));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));

// Lazy load notification center
const NotificationCenter = lazy(() => 
  import("@/components/notifications/NotificationCenter").then(module => ({
    default: module.NotificationCenter
  }))
);

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  const [showLiveChat, setShowLiveChat] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ErrorBoundary>
              <SidebarProvider defaultOpen={false}>
                <div className="flex min-h-screen w-full">
                  <AppSidebar />
                  
                  <main className="flex-1 relative">
                    {/* Mobile hamburger menu */}
                    <SidebarTrigger className="fixed top-4 left-4 z-50 md:hidden bg-background border shadow-md rounded-md" />
                    
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/memberships" element={<Memberships />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/legal" element={<Legal />} />
                        <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/search" element={<DoctorSearch />} />
                        <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
                        <Route path="/book/:doctorId" element={<BookAppointment />} />
                        <Route path="/booking-success" element={<BookingSuccess />} />
                        <Route path="/demo" element={<DemoLogin />} />
                        <Route path="/doctor" element={<DoctorDashboard />} />
                        <Route path="/admin-access" element={<AdminAccess />} />
                        <Route path="/bookings" element={<BookingHistory />} />
                        <Route path="/dashboard" element={<PatientDashboard />} />
                        <Route path="/verify-email" element={<EmailVerification />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                </div>
                
                <FloatingButtons />
                
                {/* Real-time Enhancements */}
                <VoiceInterface 
                  onSpeakingChange={setIsSpeaking}
                />
                
                <Suspense fallback={null}>
                  <NotificationCenter />
                </Suspense>
                
                <LiveChatWidget 
                  isOpen={showLiveChat}
                  onClose={() => setShowLiveChat(false)}
                />
              </SidebarProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;