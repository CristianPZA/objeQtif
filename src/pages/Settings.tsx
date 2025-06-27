import React, { useState } from 'react';
import { Lock, User, Bell, Shield, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

const Settings = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error(t('auth.passwordMismatch'));
      }

      if (newPassword.length < 6) {
        throw new Error(t('auth.passwordRequirements'));
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('settings.passwordChanged'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    changeLanguage(newLang);
    setSuccess(t('settings.languageChanged'));
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Language Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.language')}</h2>
                <p className="text-sm text-gray-600">{t('settings.selectLanguage')}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-md">
              {success && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
                  {success}
                </div>
              )}

              <select
                value={language}
                onChange={handleLanguageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="fr">{t('settings.french')}</option>
                <option value="en">{t('settings.english')}</option>
                <option value="es">{t('settings.spanish')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.security')}</h2>
                <p className="text-sm text-gray-600">{t('settings.changePassword')}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  minLength={6}
                  placeholder={t('settings.newPassword')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  minLength={6}
                  placeholder={t('settings.confirmPassword')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? t('common.loading') : t('settings.changePasswordButton')}
              </button>
            </form>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.profile')}</h2>
                <p className="text-sm text-gray-600">{t('settings.personalInfo')}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600">
              {t('settings.contactAdminForChanges')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;