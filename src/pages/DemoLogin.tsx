import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Stethoscope, Crown, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';

interface DemoAccount {
  id: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  redirect: string;
}

const DemoLogin = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const demoAccounts: DemoAccount[] = [
    {
      id: 'patient',
      email: 'patient@demo.ironledgermedmap.co.za',
      password: 'demo123',
      role: 'patient',
      name: 'Sarah Johnson',
      description: 'Experience the platform as a patient looking for healthcare providers',
      features: [
        'Search and book appointments',
        'View doctor profiles and reviews',
        'Manage booking history',
        'Access membership benefits'
      ],
      icon: <User className="h-6 w-6" />,
      redirect: '/search'
    },
    {
      id: 'doctor',
      email: 'doctor@demo.ironledgermedmap.co.za',
      password: 'demo123',
      role: 'doctor',
      name: 'Dr. Michael Chen',
      description: 'See how healthcare providers manage their practice and patients',
      features: [
        'Manage appointment bookings',
        'Update practice information',
        'View patient notes and history',
        'Track practice analytics'
      ],
      icon: <Stethoscope className="h-6 w-6" />,
      redirect: '/doctor'
    },
    {
      id: 'admin',
      email: 'admin@demo.ironledgermedmap.co.za',
      password: 'demo123',
      role: 'admin',
      name: 'Admin User',
      description: 'Explore platform administration and oversight capabilities',
      features: [
        'Approve doctor applications',
        'Monitor platform activity',
        'Manage user accounts',
        'View system analytics'
      ],
      icon: <Shield className="h-6 w-6" />,
      redirect: '/admin'
    }
  ];

  const handleDemoLogin = async (account: DemoAccount) => {
    setIsLoading(account.id);
    
    try {
      // First, try to sign in with the demo account
      const { error } = await signIn(account.email, account.password);
      
      if (error) {
        // If login fails, create the demo account
        console.log('Demo account not found, creating...', error.message);
        
        // Sign up the demo user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: account.email,
          password: account.password,
          options: {
            data: {
              first_name: account.name.split(' ')[0],
              last_name: account.name.split(' ').slice(1).join(' '),
              role: account.role
            }
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Verify the user immediately for demo purposes
          await supabase.auth.admin.updateUserById(signUpData.user.id, {
            email_confirm: true
          });

          // Create profile with correct role
          await supabase
            .from('profiles')
            .upsert({
              id: signUpData.user.id,
              email: account.email,
              first_name: account.name.split(' ')[0],
              last_name: account.name.split(' ').slice(1).join(' '),
              role: account.role
            });

          // If it's a doctor, create a doctor record
          if (account.role === 'doctor') {
            // Create doctor profile
            await supabase
              .from('doctors')
              .insert({
                user_id: signUpData.user.id,
                practice_name: 'Demo Medical Practice',
                speciality: 'General Practitioner',
                qualification: 'MBChB, University of Cape Town',
                license_number: 'MP123456',
                years_experience: 10,
                consultation_fee: 45000,
                address: '123 Demo Street',
                city: 'Cape Town',
                province: 'Western Cape',
                postal_code: '8001',
                bio: 'Experienced general practitioner dedicated to providing quality healthcare.',
                rating: 4.8,
                total_bookings: 150,
                is_available: true
              });

            // Seed default weekly schedule (Mon-Fri 09:00-17:00)
            const { data: doctorRow } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', signUpData.user.id)
              .single();

            if (doctorRow?.id) {
              const days = [1, 2, 3, 4, 5];
              const scheduleRows = days.map((d) => ({
                doctor_id: doctorRow.id,
                day_of_week: d,
                start_time: '09:00',
                end_time: '17:00',
                is_available: true
              }));
              // Insert schedules; ignore errors if they already exist
              await supabase.from('doctor_schedules').insert(scheduleRows).select('*');
            }
          }

          // Now sign in with the created account
          const { error: loginError } = await signIn(account.email, account.password);
          if (loginError) throw loginError;
        }
      }

      toast({
        title: "Demo Login Successful",
        description: `Logged in as ${account.name} (${account.role})`,
      });

      // Redirect to appropriate dashboard
      setTimeout(() => {
        navigate(account.redirect);
      }, 1000);

    } catch (error: any) {
      console.error('Demo login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Failed to login with demo account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-medical-gradient mb-4">Demo Accounts</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience IronLedgerMedMap from different perspectives. Choose a demo account to explore the platform's features.
          </p>
        </div>

        {/* Demo Account Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {demoAccounts.map((account) => (
            <Card key={account.id} className="medical-card hover:scale-105 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    {account.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {account.role.charAt(0).toUpperCase() + account.role.slice(1)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{account.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Features you can explore:</h4>
                  <ul className="space-y-1">
                    {account.features.map((feature, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-3">
                    <p><strong>Email:</strong> {account.email}</p>
                    <p><strong>Password:</strong> demo123</p>
                  </div>
                  
                  <Button
                    onClick={() => handleDemoLogin(account)}
                    disabled={isLoading !== null}
                    className="w-full btn-medical-primary"
                  >
                    {isLoading === account.id ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Login as {account.role}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Demo Information */}
        <Card className="medical-hero-card max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Demo Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">What are demo accounts?</h3>
                <p className="text-sm text-muted-foreground">
                  Demo accounts are pre-configured user accounts that showcase different aspects of the IronLedgerMedMap platform. 
                  They contain sample data and demonstrate the full functionality available to each user type.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Safe to use</h3>
                <p className="text-sm text-muted-foreground">
                  Demo accounts are completely separate from production data. Feel free to explore, create test bookings, 
                  and experiment with features. All demo data is reset periodically.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Ready to get started for real?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                When you're ready to use IronLedgerMedMap with your own account, create a new account with your real email address.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="btn-medical-secondary" onClick={() => navigate('/')}>
                  Back to Home
                </Button>
                <Button className="btn-medical-primary" onClick={() => navigate('/doctor-enrollment')}>
                  Join as a Doctor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DemoLogin;
