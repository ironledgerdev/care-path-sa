import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Settings,
  TrendingUp,
  Eye,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DoctorStats {
  totalBookings: number;
  pendingBookings: number;
  monthlyRevenue: number;
  rating: number;
}

const DoctorDashboard = () => {
  const [stats, setStats] = useState<DoctorStats>({
    totalBookings: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
    rating: 0
  });
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState(() => (
    Array.from({ length: 7 }).map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '17:00', is_available: false }))
  ));
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile?.role === 'doctor') {
      fetchDoctorInfo();
      fetchDoctorStats();
    }
  }, [user, profile]);

  const fetchDoctorInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDoctorInfo(data);
      if (!data) {
        console.warn('No doctor record found for current user.');
      }
    } catch (error: any) {
      console.error('Error fetching doctor info:', error?.message || error);
    }
  };

  const fetchDoctorStats = async () => {
    if (!doctorInfo?.id) return;

    try {
      const [bookingsResult, revenueResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('status, total_amount, created_at')
          .eq('doctor_id', doctorInfo.id),
        
        supabase
          .from('bookings')
          .select('total_amount')
          .eq('doctor_id', doctorInfo.id)
          .eq('status', 'completed')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      const bookings = bookingsResult.data || [];
      const monthlyBookings = revenueResult.data || [];

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        monthlyRevenue: monthlyBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / 100,
        rating: doctorInfo?.rating || 0
      });
    } catch (error) {
      console.error('Error fetching doctor stats:', error);
    }
  };

  const loadSchedule = async () => {
    if (!doctorInfo?.id) return;
    try {
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, is_available')
        .eq('doctor_id', doctorInfo.id);
      if (error) throw error;
      const base = Array.from({ length: 7 }).map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '17:00', is_available: false }));
      (data || []).forEach((row: any) => {
        base[row.day_of_week] = {
          day_of_week: row.day_of_week,
          start_time: (row.start_time as string).slice(0,5),
          end_time: (row.end_time as string).slice(0,5),
          is_available: row.is_available !== false,
        };
      });
      setScheduleForm(base);
    } catch (e) {
      console.error('Failed to load schedule', e);
    }
  };

  const saveSchedule = async () => {
    if (!doctorInfo?.id) return;
    setSavingSchedule(true);
    try {
      await supabase.from('doctor_schedules').delete().eq('doctor_id', doctorInfo.id);
      const rows = scheduleForm
        .filter((d: any) => d.is_available && d.start_time && d.end_time)
        .map((d: any) => ({
          doctor_id: doctorInfo.id,
          day_of_week: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
          is_available: true,
        }));
      if (rows.length) {
        const { error } = await supabase.from('doctor_schedules').insert(rows);
        if (error) throw error;
      }
    } catch (e: any) {
      console.error('Failed to save schedule', e?.message || e);
    } finally {
      setSavingSchedule(false);
    }
  };

  const fetchPendingAppointments = async () => {
    if (!doctorInfo?.id) return;
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, appointment_date, appointment_time, status, patient_notes')
        .eq('doctor_id', doctorInfo.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPendingBookings(data || []);
    } catch (e: any) {
      console.error('Failed to fetch pending appointments', e?.message || e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const approveBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('doctor_id', doctorInfo.id)
        .eq('status', 'pending');
      if (error) throw error;
      fetchPendingAppointments();
      fetchDoctorStats();
    } catch (e: any) {
      console.error('Failed to approve booking', e?.message || e);
    }
  };

  const rejectBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('doctor_id', doctorInfo.id)
        .eq('status', 'pending');
      if (error) throw error;
      fetchPendingAppointments();
      fetchDoctorStats();
    } catch (e: any) {
      console.error('Failed to reject booking', e?.message || e);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  useEffect(() => {
    if (doctorInfo?.id) {
      loadSchedule();
      fetchPendingAppointments();
      const bookingsChannel = supabase
        .channel(`doctor-${doctorInfo.id}-bookings`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `doctor_id=eq.${doctorInfo.id}` }, () => {
          fetchPendingAppointments();
          fetchDoctorStats();
        })
        .subscribe();
      const schedulesChannel = supabase
        .channel(`doctor-${doctorInfo.id}-schedules`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_schedules', filter: `doctor_id=eq.${doctorInfo.id}` }, () => {
          loadSchedule();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(bookingsChannel);
        supabase.removeChannel(schedulesChannel);
      };
    }
  }, [doctorInfo]);

  if (profile?.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Doctor Dashboard</h2>
            <p className="text-muted-foreground">Only approved healthcare providers can access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-medical-gradient mb-2">
            Welcome back, Dr. {profile?.first_name} {profile?.last_name}
          </h1>
          <p className="text-muted-foreground">Manage your practice and patient appointments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{stats.totalBookings}</div>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-amber-600">{stats.pendingBookings}</div>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.monthlyRevenue)}
                </div>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">{stats.rating.toFixed(1)}</div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Pending Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : pendingBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending appointments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{b.appointment_date} at {b.appointment_time}</div>
                          {b.patient_notes && (<div className="text-sm text-muted-foreground">{b.patient_notes}</div>)}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveBooking(b.id)}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectBooking(b.id)}>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Manage Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduleForm.map((row: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-4 text-sm font-medium text-muted-foreground">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][row.day_of_week]}
                      </div>
                      <div className="col-span-2">
                        <input type="time" className="border rounded px-2 py-1 w-full" value={row.start_time}
                          onChange={(e) => setScheduleForm((prev: any) => prev.map((r: any, i: number) => i===idx ? { ...r, start_time: e.target.value } : r))} />
                      </div>
                      <div className="col-span-2">
                        <input type="time" className="border rounded px-2 py-1 w-full" value={row.end_time}
                          onChange={(e) => setScheduleForm((prev: any) => prev.map((r: any, i: number) => i===idx ? { ...r, end_time: e.target.value } : r))} />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input id={`avail-${idx}`} type="checkbox" checked={row.is_available}
                          onChange={(e) => setScheduleForm((prev: any) => prev.map((r: any, i: number) => i===idx ? { ...r, is_available: e.target.checked } : r))} />
                        <label htmlFor={`avail-${idx}`} className="text-sm">Available</label>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button onClick={saveSchedule} disabled={savingSchedule} className="btn-medical-primary">
                      {savingSchedule ? 'Saving...' : 'Save Schedule'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Practice Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {doctorInfo ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Practice Name</label>
                        <p className="text-lg font-semibold">{doctorInfo.practice_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                        <p className="text-lg font-semibold">
                          <Badge variant="outline" className="text-base">{doctorInfo.speciality}</Badge>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Consultation Fee</label>
                        <p className="text-lg font-semibold">{formatCurrency(doctorInfo.consultation_fee / 100)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <p className="text-lg font-semibold">{doctorInfo.city}, {doctorInfo.province}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bio</label>
                      <p className="mt-1">{doctorInfo.bio || 'No bio provided'}</p>
                    </div>

                    <Button className="btn-medical-primary">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading profile information...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Practice Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics coming soon</p>
                  <p className="text-sm">Track your practice performance and patient metrics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DoctorDashboard;
