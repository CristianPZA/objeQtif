import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, CheckCircle, AlertTriangle, Users, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  full_name: string | null;
  role: string | null;
}

interface Reminder {
  id: string;
  title: string;
  message: string;
  target_role: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  completed: boolean;
}

interface Stats {
  validatedCount: number;
  pendingCount: number;
  vivierCount: number;
}

const DashboardContent = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First verify the Supabase client is working
        const { data: testData, error: testError } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1);

        if (testError) {
          throw new Error(`Database connection test failed: ${testError.message}`);
        }

        // Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication error: ${userError.message}`);
        }

        if (!user) {
          throw new Error('No authenticated user found');
        }

        // Query for the user's profile with better error handling
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(`Profile fetch error: ${profileError.message}`);
        }

        // If no profile exists, redirect to complete profile page
        if (!profileData) {
          navigate('/complete-profile');
          return;
        }

        setProfile(profileData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Error in Dashboard:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue, {profile?.full_name || 'Utilisateur'}
          </h1>
          <p className="text-lg text-gray-600">
            Rôle : <span className="font-semibold">{profile?.role || 'Non défini'}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return <DashboardContent />;
};

export default Dashboard;