import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .limit(1);

        // Vérifier si le profil est complet
        const isProfileComplete = profile && 
                                 profile.length > 0 && 
                                 profile[0]?.full_name && 
                                 profile[0]?.role && 
                                 profile[0].full_name !== session.user.email;

        if (!isProfileComplete) {
          navigate('/complete-profile');
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Messages d'erreur plus conviviaux
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(t('auth.loginError'));
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error(t('auth.emailNotConfirmed'));
        } else if (error.message.includes('Too many requests')) {
          throw new Error(t('auth.tooManyRequests'));
        } else {
          throw error;
        }
      }

      if (!data.user) {
        throw new Error(t('auth.unexpectedError'));
      }

      // Vérifier le profil utilisateur
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', data.user.id)
        .limit(1);

      // Déterminer si le profil est complet
      const isProfileComplete = profile && 
                               profile.length > 0 && 
                               profile[0]?.full_name && 
                               profile[0]?.role && 
                               profile[0].full_name !== data.user.email;

      if (!isProfileComplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {t('auth.login')} objeQtifs
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.loginToWorkspace')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="votre.email@entreprise.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('auth.password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.loading')}
              </div>
            ) : (
              t('auth.loginButton')
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            {t('auth.firstLoginNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;