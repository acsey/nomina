import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import {
  UserCircleIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  company?: {
    id: string;
    name: string;
    logo?: string;
  };
  employee?: {
    id: string;
    employeeNumber: string;
    department?: { id: string; name: string };
    jobPosition?: { id: string; name: string };
  };
  mfaEnabled: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Messages
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch full profile
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await authApi.getProfile();
      return response.data;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; email?: string }) => {
      const response = await authApi.updateProfile(data);
      return response.data;
    },
    onSuccess: (data) => {
      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Update auth context if available
      if (setUser && data.user) {
        setUser((prev: any) => prev ? { ...prev, ...data.user } : prev);
      }
      setTimeout(() => setProfileMessage(null), 3000);
    },
    onError: (error: any) => {
      setProfileMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al actualizar perfil',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await authApi.changePassword(data);
      return response.data;
    },
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 3000);
    },
    onError: (error: any) => {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al cambiar contraseña',
      });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    const updates: { firstName?: string; lastName?: string; email?: string } = {};
    if (firstName !== user?.firstName) updates.firstName = firstName;
    if (lastName !== user?.lastName) updates.lastName = lastName;
    if (email !== user?.email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      setProfileMessage({ type: 'error', text: 'No hay cambios que guardar' });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t('nav.user.profile')}
      </h1>

      {/* Profile Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            {profile?.company?.logo ? (
              <img
                src={profile.company.logo}
                alt="Logo"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {profile?.role}
              </span>
              {profile?.company && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {profile.company.name}
                </span>
              )}
              {profile?.mfaEnabled && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  MFA Activo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Employee info if linked */}
        {profile?.employee && (
          <div className="border-t dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Información de empleado
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">No. Empleado:</span>{' '}
                <span className="text-gray-900 dark:text-white">{profile.employee.employeeNumber}</span>
              </div>
              {profile.employee.department && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Departamento:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{profile.employee.department.name}</span>
                </div>
              )}
              {profile.employee.jobPosition && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Puesto:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{profile.employee.jobPosition.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Update Profile Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UserCircleIcon className="h-5 w-5" />
          Actualizar datos
        </h2>

        {profileMessage && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              profileMessage.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {profileMessage.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateProfileMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <KeyIcon className="h-5 w-5" />
          {t('nav.user.changePassword')}
        </h2>

        {passwordMessage && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {passwordMessage.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {changePasswordMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
