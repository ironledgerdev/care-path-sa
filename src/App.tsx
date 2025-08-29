import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { FloatingButtons } from "./components/FloatingButtons";
import VoiceInterface from "./components/VoiceInterface";
import EnhancedNotificationCenter from "./components/EnhancedNotificationCenter";
import LiveChatWidget from "./components/LiveChatWidget";
import Index from "./pages/Index";
import Memberships from "./pages/Memberships";
import About from "./pages/About";
import Team from "./pages/Team";
import Legal from "./pages/Legal";
import DoctorEnrollment from "./pages/DoctorEnrollment";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorSearch from "./pages/DoctorSearch";
import DoctorProfile from "./pages/DoctorProfile";
import BookAppointment from "./pages/BookAppointment";
import BookingSuccess from "./pages/BookingSuccess";
import DemoLogin from "./pages/DemoLogin";
import NotFound from "./pages/NotFound";
import { AdminAccess } from "./components/AdminAccess";
import BookingHistory from "./pages/BookingHistory";
import PatientDashboard from "./pages/PatientDashboard";
import EmailVerification from "./pages/EmailVerification";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  const [showNotifications, setShowNotifications] = React.useState(false);
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
              <FloatingButtons />
              
              {/* Real-time Enhancements */}
              <VoiceInterface 
                onSpeakingChange={setIsSpeaking}
              />
              
              <EnhancedNotificationCenter 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
              
              <LiveChatWidget 
                isOpen={showLiveChat}
                onClose={() => setShowLiveChat(false)}
              />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;