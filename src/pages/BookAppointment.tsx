import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CreditCard, MapPin, Shield, Star, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface Doctor {
  id: string;
  user_id: string;
  practice_name: string;
  speciality: string;
  consultation_fee: number;
  address: string;
  city: string;
  province: string;
  bio: string;
  rating: number;
  total_bookings: number;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookAppointment = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId]);

  // Load availability when date changes
  useEffect(() => {
    const loadAvailability = async () => {
      if (!doctorId || !selectedDate) {
        setTimeSlots([]);
        return;
      }
      try {
        const dateObj = new Date(selectedDate);
        const jsDay = dateObj.getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon ... 7=Sun

        const { data: schedules, error: scheduleError } = await supabase
          .from('doctor_schedules')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true);
        if (scheduleError) throw scheduleError;

        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('appointment_time, status')
          .eq('doctor_id', doctorId)
          .eq('appointment_date', selectedDate)
          .neq('status', 'cancelled');
        if (bookingsError) throw bookingsError;

        const takenTimes = new Set((bookings || []).map(b => b.appointment_time));

        const slots: TimeSlot[] = [];
        (schedules || []).forEach((s: any) => {
          const start = s.start_time as string; // "HH:MM"
          const end = s.end_time as string; // "HH:MM"
          const toMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          };
          const toHHMM = (mins: number) => {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
          };
          for (let m = toMinutes(start); m < toMinutes(end); m += 30) {
            const t = toHHMM(m);
            slots.push({ time: t, available: !takenTimes.has(t) });
          }
        });

        const unique = new Map<string, TimeSlot>();
        slots.sort((a,b) => a.time.localeCompare(b.time)).forEach(s => unique.set(s.time, s));
        setTimeSlots(Array.from(unique.values()));
      } catch (err) {
        console.error('Failed to load availability', err);
        setTimeSlots([]);
      }
    };
    loadAvailability();
  }, [doctorId, selectedDate]);

  const fetchDoctor = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      setDoctor(data as any);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load doctor information",
        variant: "destructive",
      });
      navigate('/search');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount / 100);
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const handleBooking = async () => {
    if (!user || !doctor || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      // Create booking record
      const bookingFee = 1000; // R10 booking fee
      const totalAmount = doctor.consultation_fee + bookingFee;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          doctor_id: doctor.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          patient_notes: patientNotes,
          consultation_fee: doctor.consultation_fee,
          booking_fee: bookingFee,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Initialize PayFast payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          booking_id: booking.id,
          amount: totalAmount,
          description: `Consultation with Dr. ${doctor.profiles?.first_name} ${doctor.profiles?.last_name}`,
          doctor_name: `${doctor.profiles?.first_name} ${doctor.profiles?.last_name}`,
          appointment_date: selectedDate,
          appointment_time: selectedTime
        }
      });

      if (paymentError) throw paymentError;

      // Redirect to PayFast
      if (paymentData.payment_url) {
        window.location.href = paymentData.payment_url;
      }

    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Doctor not found</h2>
            <Button onClick={() => navigate('/search')} className="btn-medical-primary">
              Back to Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/search')} 
            className="mb-4"
          >
            ← Back to Search
          </Button>
          <h1 className="text-4xl font-bold text-medical-gradient mb-2">Book Appointment</h1>
          <p className="text-muted-foreground">Schedule your consultation with verified healthcare professionals</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Doctor Information */}
          <div className="lg:col-span-1">
            <Card className="medical-hero-card sticky top-4">
              <CardContent className="p-6">
                {/* Doctor Header */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-soft rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">
                      Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                    </h3>
                    <Shield className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-primary font-semibold mb-1">{doctor.speciality}</p>
                  <p className="text-sm text-muted-foreground">{doctor.practice_name}</p>
                </div>

                <Separator className="my-4" />

                {/* Doctor Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doctor.city}, {doctor.province}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{doctor.rating.toFixed(1)} ({doctor.total_bookings} reviews)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(doctor.consultation_fee)}
                    </span>
                  </div>
                </div>

                {doctor.bio && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold mb-2">About</h4>
                      <p className="text-sm text-muted-foreground">{doctor.bio}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Your Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!user && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-amber-800 text-sm">
                      Please <Button variant="link" className="p-0" onClick={() => navigate('/auth')}>sign in</Button> to book an appointment.
                    </p>
                  </div>
                )}

                {/* Patient Information */}
                {user && profile && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Patient Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Selection */}
                <div>
                  <Label htmlFor="date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    Appointment Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={getMinDate()}
                    max={getMaxDate()}
                    className="h-12"
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`h-12 ${selectedTime === slot.time ? 'btn-medical-primary' : 'btn-medical-secondary'}`}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Patient Notes */}
                <div>
                  <Label htmlFor="notes" className="mb-2 block">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Describe your symptoms or reason for consultation..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Booking Summary */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Consultation Fee</span>
                        <span>{formatCurrency(doctor.consultation_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Booking Fee</span>
                        <span>R10.00</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount</span>
                        <span className="text-primary">{formatCurrency(doctor.consultation_fee + 1000)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Book Button */}
                <Button
                  onClick={handleBooking}
                  disabled={!user || !selectedDate || !selectedTime || isBooking}
                  className="w-full btn-medical-primary h-12 text-lg"
                >
                  {isBooking ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Book & Pay with PayFast
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By booking this appointment, you agree to our terms of service and privacy policy.
                  Payment is processed securely through PayFast.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
