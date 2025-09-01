import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { FloatingButtons } from "./components/FloatingButtons";
import VoiceInterface from "./components/VoiceInterface";
import LiveChatWidget from "./components/LiveChatWidget";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
const BookAppointments = lazy(() => import("./pages/BookAppointments"));
const Telemedicine = lazy(() => import("./pages/Telemedicine"));
const DoctorPortal = lazy(() => import("./pages/DoctorPortal"));
const PracticeManagement = lazy(() => import("./pages/PracticeManagement"));
const Support = lazy(() => import("./pages/Support"));
const Careers = lazy(() => import("./pages/Careers"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAccess = lazy(() => import("./components/AdminAccess").then(module => ({ default: module.AdminAccess })));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const Profile = lazy(() => import("./pages/Profile"));
const DatabaseTest = lazy(() => import("./pages/DatabaseTest"));

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
                <div className="flex min-h-screen w-full">
                  <main className="flex-1 relative">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/memberships" element={<Memberships />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/team" element={<Team />} />
                        <Route path="/legal" element={<Legal />} />
                        <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
                        <Route path="/DoctorEnrollment" element={<Navigate to="/doctor-enrollment" replace />} />
                        <Route path="/doctorEnrollment" element={<Navigate to="/doctor-enrollment" replace />} />
                        <Route path="/book-appointments" element={<BookAppointments />} />
                        <Route path="/BookAppointment" element={<Navigate to="/book-appointments" replace />} />
                        <Route path="/book-appointment" element={<Navigate to="/book-appointments" replace />} />
                        <Route path="/telemedicine" element={<Telemedicine />} />
                        <Route path="/doctor-portal" element={<DoctorPortal />} />
                        <Route path="/practice-management" element={<PracticeManagement />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/careers" element={<Careers />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/search" element={<DoctorSearch />} />
                        <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
                        <Route path="/book/:doctorId" element={<BookAppointment />} />
                        <Route path="/booking-success" element={<BookingSuccess />} />
                        <Route path="/BookingSuccess" element={<Navigate to="/booking-success" replace />} />
                        <Route path="/bookingSuccess" element={<Navigate to="/booking-success" replace />} />
                        <Route path="/doctor" element={<DoctorDashboard />} />
                        <Route path="/admin-access" element={<AdminAccess />} />
                        <Route path="/bookings" element={<BookingHistory />} />
                        <Route path="/BookingHistory" element={<BookingHistory />} />
                        <Route path="/booking-history" element={<BookingHistory />} />
                        <Route path="/dashboard" element={<PatientDashboard />} />
                        <Route path="/verify-email" element={<EmailVerification />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/database-test" element={<DatabaseTest />} />
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
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
