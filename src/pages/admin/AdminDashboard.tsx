import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const hasAdminAccess = profile?.role === 'admin' || sessionStorage.getItem('admin_access') === 'granted';
    if (hasAdminAccess) {
      fetchPendingDoctors();
      fetchDashboardStats();
      fetchUserMemberships();
      setupRealtimeSubscriptions();
    }

    return () => {
      // Cleanup subscriptions when component unmounts
      supabase.removeAllChannels();
    };
  }, [profile]);

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

  return (
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