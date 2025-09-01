import { supabase } from '@/integrations/supabase/client';

export interface UserRegistrationTestResult {
  success: boolean;
  message: string;
  userId?: string;
  profileCreated?: boolean;
  data?: any;
  error?: any;
}

export const testUserRegistration = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string,
  role: 'patient' | 'doctor' | 'admin' = 'patient'
): Promise<UserRegistrationTestResult> => {
  try {
    console.log('🧪 Testing user registration for:', email);

    // Step 1: Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return {
        success: false,
        message: `User with email ${email} already exists`,
        data: existingProfile
      };
    }

    // Step 2: Attempt to register the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role,
        }
      }
    });

    if (authError) {
      return {
        success: false,
        message: `Registration failed: ${authError.message}`,
        error: authError
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Registration failed: No user data returned',
        data: authData
      };
    }

    console.log('✅ User registered successfully:', authData.user.id);

    // Step 3: Wait a bit for the profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Check if profile was created automatically
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.log('⚠️ Profile not found, attempting manual creation...');
      
      // Manually create profile if it doesn't exist
      const { data: createdProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          role,
        })
        .select()
        .single();

      if (createProfileError) {
        return {
          success: false,
          message: `Profile creation failed: ${createProfileError.message}`,
          userId: authData.user.id,
          profileCreated: false,
          error: createProfileError
        };
      }

      return {
        success: true,
        message: 'User registered successfully with manual profile creation',
        userId: authData.user.id,
        profileCreated: true,
        data: {
          user: authData.user,
          profile: createdProfile
        }
      };
    }

    return {
      success: true,
      message: 'User registered successfully with automatic profile creation',
      userId: authData.user.id,
      profileCreated: true,
      data: {
        user: authData.user,
        profile
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      error
    };
  }
};

export const testUserLogin = async (
  email: string,
  password: string
): Promise<UserRegistrationTestResult> => {
  try {
    console.log('🧪 Testing user login for:', email);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return {
        success: false,
        message: `Login failed: ${authError.message}`,
        error: authError
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Login failed: No user data returned',
        data: authData
      };
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return {
      success: true,
      message: 'User logged in successfully',
      userId: authData.user.id,
      profileCreated: !!profile,
      data: {
        user: authData.user,
        profile
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      error
    };
  }
};

export const verifyDatabaseState = async () => {
  try {
    console.log('🔍 Verifying database state...');

    // Check total counts
    const [profiles, pendingDoctors, doctors, memberships, bookings] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('pending_doctors').select('id', { count: 'exact' }),
      supabase.from('doctors').select('id', { count: 'exact' }),
      supabase.from('memberships').select('id', { count: 'exact' }),
      supabase.from('bookings').select('id', { count: 'exact' })
    ]);

    // Get recent data
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentDoctors } = await supabase
      .from('pending_doctors')
      .select('id, practice_name, speciality, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      success: true,
      message: 'Database state verification complete',
      data: {
        counts: {
          profiles: profiles.count || 0,
          pending_doctors: pendingDoctors.count || 0,
          doctors: doctors.count || 0,
          memberships: memberships.count || 0,
          bookings: bookings.count || 0
        },
        recent: {
          profiles: recentProfiles || [],
          doctors: recentDoctors || []
        }
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Database verification failed: ${error.message}`,
      error
    };
  }
};
