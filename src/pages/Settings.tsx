import React, { useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { updateUserLanguage } from '../i18n';

const Settings = () => {
  const { t, i18n } = useTranslation('common');
  const [currentPassword, setCurrentPassword] = useState('');
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
        throw new Error(t('settings.passwordMismatch'));
      }

      if (newPassword.length < 6) {
        throw new Error(t('settings.passwordTooShort'));
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(t('settings.passwordUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await updateUserLanguage(lang);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">{t('settings.language')}</h2>
        </div>

        <select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="fr">{t('settings.languages.fr')}</option>
          <option value="en">{t('settings.languages.en')}</option>
          <option value="es">{t('settings.languages.es')}</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">{t('settings.newPassword')}</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-500 p-3 rounded-lg text-sm">
              {success}
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
              className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={6}
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
              className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('settings.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;