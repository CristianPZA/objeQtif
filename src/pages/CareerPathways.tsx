import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Target, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Lightbulb,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface CareerArea {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

const CareerPathways = () => {
  const { t } = useTranslation();
  const [careerAreas, setCareerAreas] = useState<CareerArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArea, setEditingArea] = useState<CareerArea | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'target',
    color: 'blue'
  });

  const iconOptions = [
    { value: 'target', label: 'Target', icon: Target },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'calculator', label: 'Calculator', icon: TrendingUp },
    { value: 'lightbulb', label: 'Lightbulb', icon: Lightbulb }
  ];

  const colorOptions = [
    { value: 'blue', label: t('common.colors.blue'), class: 'bg-blue-500' },
    { value: 'green', label: t('common.colors.green'), class: 'bg-green-500' },
    { value: 'purple', label: t('common.colors.purple'), class: 'bg-purple-500' },
    { value: 'indigo', label: t('common.colors.indigo'), class: 'bg-indigo-500' },
    { value: 'orange', label: t('common.colors.orange'), class: 'bg-orange-500' },
    { value: 'red', label: t('common.colors.red'), class: 'bg-red-500' },
    { value: 'gray', label: t('common.colors.gray'), class: 'bg-gray-500' }
  ];

  useEffect(() => {
    checkUserRole();
    fetchCareerAreas();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  };

  const canManagePathways = () => {
    return userRole && ['direction', 'admin'].includes(userRole);
  };

  const fetchCareerAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('career_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCareerAreas(data || []);
    } catch (err) {
      console.error('Error fetching career areas:', err);
      setError(err instanceof Error ? err.message : t('careerPathways.errorFetchingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePathways()) {
      setError(t('common.permissionDenied'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const maxSortOrder = Math.max(...careerAreas.map(area => area.sort_order), 0);
      
      const { error } = await supabase
        .from('career_areas')
        .insert([{
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          sort_order: maxSortOrder + 1
        }]);

      if (error) throw error;

      setSuccess(t('careerPathways.domainCreatedSuccess'));
      resetForm();
      setShowCreateForm(false);
      fetchCareerAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorCreatingDomain'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !canManagePathways()) {
      setError(t('common.permissionDenied'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('career_areas')
        .update({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color
        })
        .eq('id', editingArea.id);

      if (error) throw error;

      setSuccess(t('careerPathways.domainUpdatedSuccess'));
      setEditingArea(null);
      resetForm();
      fetchCareerAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorUpdatingDomain'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (area: CareerArea) => {
    if (!canManagePathways()) {
      setError(t('common.permissionDenied'));
      return;
    }

    if (!confirm(t('careerPathways.confirmDelete', { name: area.name }))) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('career_areas')
        .update({ is_active: false })
        .eq('id', area.id);

      if (error) throw error;

      setSuccess(t('careerPathways.domainDeletedSuccess'));
      fetchCareerAreas();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorDeletingDomain'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (area: CareerArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description,
      icon: area.icon,
      color: area.color
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'target',
      color: 'blue'
    });
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string; gradient: string }> = {
      green: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        border: 'border-green-200', 
        hover: 'hover:bg-green-200',
        gradient: 'from-green-500 to-emerald-600'
      },
      blue: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800', 
        border: 'border-blue-200', 
        hover: 'hover:bg-blue-200',
        gradient: 'from-blue-500 to-cyan-600'
      },
      purple: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-800', 
        border: 'border-purple-200', 
        hover: 'hover:bg-purple-200',
        gradient: 'from-purple-500 to-violet-600'
      },
      orange: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        border: 'border-orange-200', 
        hover: 'hover:bg-orange-200',
        gradient: 'from-orange-500 to-red-600'
      },
      red: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        border: 'border-red-200', 
        hover: 'hover:bg-red-200',
        gradient: 'from-red-500 to-pink-600'
      },
      indigo: { 
        bg: 'bg-indigo-100', 
        text: 'text-indigo-800', 
        border: 'border-indigo-200', 
        hover: 'hover:bg-indigo-200',
        gradient: 'from-indigo-500 to-purple-600'
      },
      gray: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        border: 'border-gray-200', 
        hover: 'hover:bg-gray-200',
        gradient: 'from-gray-500 to-slate-600'
      }
    };
    return colorMap[color] || colorMap.gray;
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      target: Target,
      calculator: TrendingUp,
      users: Users,
      lightbulb: Lightbulb
    };
    const IconComponent = iconMap[iconName] || Target;
    return <IconComponent className="w-8 h-8" />;
  };

  const handleAreaClick = (areaId: string) => {
    navigate(`/career-pathway/${areaId}`);
  };

  if (loading && !showCreateForm && !editingArea) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('careerPathways.title')}</h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {t('careerPathways.discover')}
          </p>
        </div>
        
        {canManagePathways() && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('careerPathways.newDomain')}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Admin Info */}
      {canManagePathways() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">{t('careerPathways.adminMode')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('careerPathways.adminModeMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Career Areas Grid */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {careerAreas.map((area) => {
            const colors = getColorClasses(area.color);
            
            return (
              <div
                key={area.id}
                className="group transform transition-all duration-300 hover:scale-105 h-full"
              >
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                  {/* Header with gradient - Fixed height */}
                  <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white flex-shrink-0`} style={{ minHeight: '160px' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        {getIconComponent(area.icon)}
                      </div>
                      <div className="flex gap-2">
                        {canManagePathways() && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(area);
                              }}
                              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(area);
                              }}
                              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleAreaClick(area.id)}
                          className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                          title={t('common.explore')}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 leading-tight line-clamp-2">
                      {area.name}
                    </h3>
                  </div>
                  
                  {/* Content - Flexible height with minimum */}
                  <div 
                    className="p-6 flex-1 flex flex-col cursor-pointer" 
                    style={{ minHeight: '180px' }}
                    onClick={() => handleAreaClick(area.id)}
                  >
                    <p className="text-gray-600 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {area.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                        {t('careerPathways.pathwayAvailable')}
                      </span>
                      <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700 transition-colors">
                        {t('careerPathways.explore')}
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {careerAreas.length === 0 && (
          <div className="text-center py-16">
            <Target className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-2xl font-medium text-gray-900 mb-4">{t('careerPathways.noDomains')}</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {canManagePathways() 
                ? t('careerPathways.createFirstDomain')
                : t('careerPathways.domainsComingSoon')
              }
            </p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium text-blue-900 mb-4">{t('careerPathways.howToUse')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">1</div>
                    <p><strong>{t('careerPathways.chooseYourDomain')}</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">2</div>
                    <p><strong>{t('careerPathways.exploreLevels')}</strong></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">3</div>
                    <p><strong>{t('careerPathways.consultThemes')}</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">4</div>
                    <p><strong>{t('careerPathways.planDevelopment')}</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingArea) && canManagePathways() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingArea ? t('careerPathways.editDomain') : t('careerPathways.newDomain')}
              </h2>
            </div>

            <form onSubmit={editingArea ? handleEdit : handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('careerPathways.domainName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.domainNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.description')} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.domainDescriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.icon')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {iconOptions.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: option.value }))}
                          className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-all ${
                            formData.icon === option.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common.color')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: option.value }))}
                        className={`p-3 border rounded-lg flex items-center gap-2 transition-all ${
                          formData.color === option.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${option.class}`}></div>
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('common.preview')}
                </label>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className={`bg-gradient-to-r ${getColorClasses(formData.color).gradient} p-4 text-white rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        {getIconComponent(formData.icon)}
                      </div>
                      <div>
                        <h3 className="font-bold">{formData.name || t('careerPathways.domainName')}</h3>
                        <p className="text-sm opacity-90">{formData.description || t('careerPathways.domainDescription')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (editingArea) {
                      setEditingArea(null);
                    } else {
                      setShowCreateForm(false);
                    }
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? (editingArea ? t('common.updating') : t('common.creating')) : (editingArea ? t('common.update') : t('common.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerPathways;