import React, { useState, useEffect } from 'react';
import { AdminRoleManager } from '@/components/AdminRoleManager';
import { AdminGuard } from '@/components/AdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  UserPlus,
  Stethoscope,
  Search,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PendingDoctor {
  id: string;
  user_id: string;
  practice_name: string;
  speciality: string;
  qualification: string;
  license_number: string;
  years_experience: number;
  consultation_fee: number;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  bio: string;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DashboardStats {
  totalDoctors: number;
  pendingApplications: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  premiumMembers: number;
}

interface UserMembership {
  id: string;
  user_id: string;
  membership_type: 'basic' | 'premium';
  is_active: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  free_bookings_remaining: number;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
}

const AdminDashboard = () => {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
};

const AdminDashboardContent = () => {
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDoctors: 0,
    pendingApplications: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    premiumMembers: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'patient' as 'patient' | 'doctor' | 'admin'
  });
  const [newDoctor, setNewDoctor] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    practice_name: '',
    speciality: '',
    qualification: '',
    license_number: '',
    years_experience: '',
    consultation_fee: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    bio: '',
  });
  const [impersonateEmail, setImpersonateEmail] = useState('');
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only allow actual admin users, not sessionStorage bypass
    if (profile?.role === 'admin') {
      fetchPendingDoctors();
      fetchDashboardStats();
      fetchUserMemberships();
      setupRealtimeSubscriptions();
    } else if (profile && profile.role !== 'admin') {
      // User is logged in but not admin - redirect
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access this page.",
        variant: "destructive",
      });
      // Redirect to home after showing error
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }

    return () => {
      // Cleanup subscriptions when component unmounts
      supabase.removeAllChannels();
    };
  }, [profile, toast]);

  const setupRealtimeSubscriptions = () => {
    // Listen for new pending doctor applications
    const pendingDoctorsChannel = supabase
      .channel('pending_doctors_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_doctors'
        },
        () => {
          fetchPendingDoctors();
          fetchDashboardStats();
          toast({
            title: "New Application",
            description: "A new doctor application has been submitted.",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_doctors'
        },
        () => {
          fetchPendingDoctors();
          fetchDashboardStats();
        }
      )
      .subscribe();

    // Listen for new bookings
    const bookingsChannel = supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchDashboardStats();
          toast({
            title: "New Booking",
            description: "A new appointment has been booked.",
          });
        }
      )
      .subscribe();

    // Listen for new user registrations
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchDashboardStats();
          fetchUserMemberships();
          toast({
            title: "New User",
            description: "A new user has registered.",
          });
        }
      )
      .subscribe();

    // Listen for membership changes
    const membershipsChannel = supabase
      .channel('memberships_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'memberships'
        },
        () => {
          fetchDashboardStats();
          fetchUserMemberships();
        }
      )
      .subscribe();

    // Listen for doctor approvals/changes
    const doctorsChannel = supabase
      .channel('doctors_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'doctors'
        },
        () => {
          fetchDashboardStats();
          toast({
            title: "Doctor Approved",
            description: "A doctor has been approved and added to the platform.",
          });
        }
      )
      .subscribe();
  };

  const fetchPendingDoctors = async () => {
    try {
      // First get pending doctors
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_doctors')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Get profiles for these doctors
      const userIds = pendingData?.map(d => d.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const enrichedData = pendingData?.map(doctor => {
        const profile = profilesData?.find(p => p.id === doctor.user_id);
        return {
          ...doctor,
          profiles: profile || { first_name: '', last_name: '', email: '' }
        };
      }) || [];

      setPendingDoctors(enrichedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch pending applications",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [doctorsResult, pendingResult, bookingsResult, usersResult, premiumResult] = await Promise.all([
        supabase.from('doctors').select('id', { count: 'exact' }),
        supabase.from('pending_doctors').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('bookings').select('total_amount', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('memberships').select('id', { count: 'exact' }).eq('membership_type', 'premium').eq('is_active', true)
      ]);

      const totalRevenue = bookingsResult.data?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;

      setStats({
        totalDoctors: doctorsResult.count || 0,
        pendingApplications: pendingResult.count || 0,
        totalBookings: bookingsResult.count || 0,
        totalRevenue: totalRevenue / 100, // Convert from cents
        totalUsers: usersResult.count || 0,
        premiumMembers: premiumResult.count || 0
      });
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const specialties = [
    'General Practitioner',
    'Cardiologist',
    'Dermatologist',
    'Neurologist',
    'Pediatrician',
    'Psychiatrist',
    'Orthopedic Surgeon',
    'Gynecologist',
    'Urologist',
    'Radiologist',
    'Anesthesiologist',
    'Emergency Medicine',
    'Family Medicine',
    'Internal Medicine',
    'Other'
  ];

  const southAfricanProvinces = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape'
  ];

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use signUp instead of admin.createUser to trigger email verification
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: newUser.firstName,
            last_name: newUser.lastName,
            phone: newUser.phone,
            role: newUser.role,
          }
        }
      });

      if (error) throw error;

      // Send custom verification email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'user_verification',
            data: {
              user_name: `${newUser.firstName} ${newUser.lastName}`,
              user_email: newUser.email,
              verification_link: `${window.location.origin}/verify-email`
            }
          }
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      toast({
        title: "Success",
        description: `${newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)} account created! Verification email sent to ${newUser.email}.`,
      });

      // Reset form
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'patient'
      });

      // Refresh data
      fetchDashboardStats();
      fetchUserMemberships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDoctor = async () => {
    if (!newDoctor.email || !newDoctor.password || !newDoctor.firstName || !newDoctor.lastName || 
        !newDoctor.practice_name || !newDoctor.speciality || !newDoctor.license_number) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create user account with signUp (will require email verification)
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: newDoctor.firstName,
            last_name: newDoctor.lastName,
            phone: newDoctor.phone,
            role: 'doctor',
          }
        }
      });

      if (error) throw error;

      // Add to pending_doctors table (they need admin approval)
      const { error: pendingError } = await supabase
        .from('pending_doctors')
        .insert({
          user_id: data.user!.id,
          practice_name: newDoctor.practice_name,
          speciality: newDoctor.speciality,
          qualification: newDoctor.qualification,
          license_number: newDoctor.license_number,
          consultation_fee: parseInt(newDoctor.consultation_fee) * 100, // Convert to cents
          years_experience: parseInt(newDoctor.years_experience) || 0,
          address: newDoctor.address,
          city: newDoctor.city,
          province: newDoctor.province,
          postal_code: newDoctor.postal_code,
          bio: newDoctor.bio,
          status: 'pending'
        });

      if (pendingError) throw pendingError;

      // Send under review email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'doctor_under_review',
            data: {
              doctor_name: `${newDoctor.firstName} ${newDoctor.lastName}`,
              doctor_email: newDoctor.email,
              practice_name: newDoctor.practice_name,
              speciality: newDoctor.speciality,
              license_number: newDoctor.license_number
            }
          }
        });
      } catch (emailError) {
        console.error('Failed to send review email:', emailError);
      }

      toast({
        title: "Success",
        description: "Doctor account created and application submitted for review. They will receive an email notification.",
      });

      // Reset form
      setNewDoctor({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        practice_name: '',
        speciality: '',
        qualification: '',
        license_number: '',
        years_experience: '',
        consultation_fee: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        bio: '',
      });

      // Refresh data
      fetchDashboardStats();
      fetchPendingDoctors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', impersonateEmail)
        .single();

      if (profileError || !profileData) {
        throw new Error('User not found');
      }

      // Use admin.generateLink to create an impersonation session
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: impersonateEmail,
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      toast({
        title: "Impersonation Link Generated",
        description: "Opening impersonation session in new tab.",
      });

      // Open the magic link in a new window for impersonation
      window.open(data.properties.action_link, '_blank');
      
      setImpersonateEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserMemberships = async () => {
    try {
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          membership_type,
          is_active,
          current_period_start,
          current_period_end,
          free_bookings_remaining,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles separately to avoid relation issues
      const userIds = memberships?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const enrichedMemberships = memberships?.map(membership => {
        const profile = profilesData?.find(p => p.id === membership.user_id);
        return {
          ...membership,
          profiles: profile || null
        };
      }) as UserMembership[] || [];

      setUserMemberships(enrichedMemberships);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch user memberships",
        variant: "destructive",
      });
    }
  };

  const handleDoctorAction = async (doctorId: string, action: 'approve' | 'reject', doctorData: PendingDoctor) => {
    setIsLoading(true);
    try {
      if (action === 'approve') {
        // Move to doctors table
        const { error: insertError } = await supabase
          .from('doctors')
          .insert({
            user_id: doctorData.user_id,
            practice_name: doctorData.practice_name,
            speciality: doctorData.speciality,
            qualification: doctorData.qualification,
            license_number: doctorData.license_number,
            consultation_fee: doctorData.consultation_fee,
            address: doctorData.address,
            city: doctorData.city,
            province: doctorData.province,
            postal_code: doctorData.postal_code,
            bio: doctorData.bio,
            approved_by: profile?.id,
          });

        if (insertError) throw insertError;

        // Update user role to doctor
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: 'doctor' })
          .eq('id', doctorData.user_id);

        if (roleError) throw roleError;
      }

      // Update status in pending_doctors
      const { error: updateError } = await supabase
        .from('pending_doctors')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', doctorId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Doctor application ${action}d successfully`,
      });

      // Refresh data after action
      fetchPendingDoctors();
      fetchDashboardStats();
      fetchUserMemberships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  // Check admin access (either through auth or session)
  const hasAdminAccess = profile?.role === 'admin' || sessionStorage.getItem('admin_access') === 'granted';

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button 
              onClick={() => window.location.href = '/admin-access'}
              className="btn-medical-primary"
            >
              Go to Admin Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Security check - only allow actual admin users
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md medical-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold text-medical-gradient mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need administrator privileges to access this page.
            </p>
            <Button onClick={() => window.location.href = '/'} className="btn-medical-primary">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-medical-gradient mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage healthcare providers and platform operations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Premium Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-yellow-600">{stats.premiumMembers}</div>
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Doctors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">{stats.totalDoctors}</div>
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-amber-600">{stats.pendingApplications}</div>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">{stats.totalBookings}</div>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Applications ({stats.pendingApplications})
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Approved Doctors
            </TabsTrigger>
            <TabsTrigger value="memberships" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Memberships ({stats.totalUsers})
            </TabsTrigger>
            <TabsTrigger value="create-user" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </TabsTrigger>
            <TabsTrigger value="create-doctor" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Create Doctor
            </TabsTrigger>
            <TabsTrigger value="impersonate" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Impersonate
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Pending Doctor Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDoctors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending applications</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Practice</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDoctors.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doctor.profiles?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{doctor.practice_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doctor.speciality}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{doctor.license_number}</TableCell>
                          <TableCell>{doctor.city}, {doctor.province}</TableCell>
                          <TableCell>{formatCurrency(doctor.consultation_fee / 100)}</TableCell>
                          <TableCell>
                            {new Date(doctor.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleDoctorAction(doctor.id, 'approve', doctor)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDoctorAction(doctor.id, 'reject', doctor)}
                                disabled={isLoading}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doctors">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Approved Healthcare Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">View and manage approved healthcare providers.</p>
                {/* Add approved doctors table here */}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memberships">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>User Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                {userMemberships.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No memberships found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Free Bookings</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userMemberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div className="font-medium">
                              {membership.profiles?.first_name && membership.profiles?.last_name
                                ? `${membership.profiles.first_name} ${membership.profiles.last_name}`
                                : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {membership.profiles?.email || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {membership.profiles?.role || 'patient'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={membership.membership_type === 'premium' ? 'default' : 'secondary'}
                              className={membership.membership_type === 'premium' ? 'bg-yellow-500 text-white' : ''}
                            >
                              {membership.membership_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={membership.is_active ? 'default' : 'destructive'}>
                              {membership.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {membership.free_bookings_remaining}
                          </TableCell>
                          <TableCell>
                            {membership.current_period_end 
                              ? new Date(membership.current_period_end).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(membership.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-user">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-role">User Type</Label>
                      <Select value={newUser.role} onValueChange={(value: 'patient' | 'doctor' | 'admin') => setNewUser(prev => ({ ...prev, role: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-firstName">First Name *</Label>
                        <Input
                          id="user-firstName"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-lastName">Last Name *</Label>
                        <Input
                          id="user-lastName"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-password">Password *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-phone">Phone</Label>
                      <Input
                        id="user-phone"
                        type="tel"
                        value={newUser.phone}
                        onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>

                    <Button 
                      onClick={handleCreateUser}
                      className="w-full btn-medical-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create {newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-doctor">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Create New Doctor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor-firstName">First Name *</Label>
                        <Input
                          id="doctor-firstName"
                          value={newDoctor.firstName}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-lastName">Last Name *</Label>
                        <Input
                          id="doctor-lastName"
                          value={newDoctor.lastName}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-email">Email *</Label>
                        <Input
                          id="doctor-email"
                          type="email"
                          value={newDoctor.email}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-password">Password *</Label>
                        <Input
                          id="doctor-password"
                          type="password"
                          value={newDoctor.password}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-phone">Phone</Label>
                        <Input
                          id="doctor-phone"
                          type="tel"
                          value={newDoctor.phone}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Practice Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Practice Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor-practice">Practice Name *</Label>
                        <Input
                          id="doctor-practice"
                          value={newDoctor.practice_name}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, practice_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-specialty">Specialty *</Label>
                        <Select value={newDoctor.speciality} onValueChange={(value) => setNewDoctor(prev => ({ ...prev, speciality: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialty" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialties.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-qualification">Qualification *</Label>
                        <Input
                          id="doctor-qualification"
                          placeholder="e.g., MBChB, MD, DO"
                          value={newDoctor.qualification}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, qualification: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-license">HPCSA License Number *</Label>
                        <Input
                          id="doctor-license"
                          value={newDoctor.license_number}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, license_number: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-experience">Years of Experience</Label>
                        <Input
                          id="doctor-experience"
                          type="number"
                          min="0"
                          value={newDoctor.years_experience}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, years_experience: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doctor-fee">Consultation Fee (ZAR)</Label>
                        <Input
                          id="doctor-fee"
                          type="number"
                          min="0"
                          placeholder="e.g., 500"
                          value={newDoctor.consultation_fee}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, consultation_fee: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="doctor-address">Practice Address</Label>
                        <Input
                          id="doctor-address"
                          value={newDoctor.address}
                          onChange={(e) => setNewDoctor(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="doctor-city">City</Label>
                          <Input
                            id="doctor-city"
                            value={newDoctor.city}
                            onChange={(e) => setNewDoctor(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doctor-province">Province</Label>
                          <Select value={newDoctor.province} onValueChange={(value) => setNewDoctor(prev => ({ ...prev, province: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select province" />
                            </SelectTrigger>
                            <SelectContent>
                              {southAfricanProvinces.map((province) => (
                                <SelectItem key={province} value={province}>
                                  {province}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doctor-postal">Postal Code</Label>
                          <Input
                            id="doctor-postal"
                            value={newDoctor.postal_code}
                            onChange={(e) => setNewDoctor(prev => ({ ...prev, postal_code: e.target.value }))}
                          />
                        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="doctor-bio">Professional Bio</Label>
                    <Textarea
                      id="doctor-bio"
                      placeholder="Tell patients about your experience, approach to healthcare, and what makes you unique..."
                      value={newDoctor.bio}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleCreateDoctor}
                    className="w-full btn-medical-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Creating Doctor...
                      </>
                    ) : (
                      <>
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Create & Approve Doctor
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impersonate">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  User Impersonation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <h4 className="font-semibold text-amber-800">Admin Impersonation</h4>
                    </div>
                    <p className="text-sm text-amber-700">
                      This will generate a secure login link to access any user's account. 
                      Use responsibly for support and testing purposes only.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impersonate-email">User Email</Label>
                    <Input
                      id="impersonate-email"
                      type="email"
                      placeholder="user@example.com"
                      value={impersonateEmail}
                      onChange={(e) => setImpersonateEmail(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleImpersonate}
                    className="w-full btn-medical-primary"
                    disabled={isLoading || !impersonateEmail}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Generating Link...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Impersonate User
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    <p>• The impersonation link will open in a new tab</p>
                    <p>• You will be logged in as the specified user</p>
                    <p>• Close the tab to end the impersonation session</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="role-management">
            <AdminRoleManager />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure platform settings and booking fees.</p>
                {/* Add settings form here */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;