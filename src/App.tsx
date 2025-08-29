import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { FloatingButtons } from "./components/FloatingButtons";
import Index from "./pages/Index";
import Memberships from "./pages/Memberships";
import About from "./pages/About";
import Team from "./pages/Team";
import Legal from "./pages/Legal";
import DoctorEnrollment from "./pages/DoctorEnrollment";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorSearch from "./pages/DoctorSearch";
import BookAppointment from "./pages/BookAppointment";
import BookingSuccess from "./pages/BookingSuccess";
import MembershipManagement from "./pages/MembershipManagement";
import DemoLogin from "./pages/DemoLogin";
import NotFound from "./pages/NotFound";
import { AdminAccess } from "./components/AdminAccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/memberships" element={<Memberships />} />
            <Route path="/membership-management" element={<MembershipManagement />} />
            <Route path="/about" element={<About />} />
            <Route path="/team" element={<Team />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/doctor-enrollment" element={<DoctorEnrollment />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/search" element={<DoctorSearch />} />
            <Route path="/book/:doctorId" element={<BookAppointment />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/demo" element={<DemoLogin />} />
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/admin-access" element={<AdminAccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingButtons />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;