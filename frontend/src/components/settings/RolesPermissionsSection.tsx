import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  ArrowPathIcon,
  UserGroupIcon,
  LockClosedIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface RoleInfo {
  name: string;
  description: string;
  color: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  usersCount: number;
  roleInfo: RoleInfo | null;
  isSystemAdmin: boolean;
  isEditable: boolean;
  defaultPermissions?: string[];
}

interface PermissionItem {
  code: string;
  name: string;
  description: string;
}

interface PermissionCategory {
  name: string;
  permissions: PermissionItem[];
}

type PermissionsCatalog = Record<string, PermissionCategory>;

export default function RolesPermissionsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await rolesApi.getAll();
      return response.data as Role[];
    },
  });

  // Fetch permissions catalog
  const { data: catalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const response = await rolesApi.getPermissionsCatalog();
      return response.data as PermissionsCatalog;
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      rolesApi.updatePermissions(roleId, permissions),
    onSuccess: () => {
      toast.success(t('settings.roles.permissionsUpdated'));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error(t('settings.roles.updateError'));
    },
  });

  // Reset permissions mutation
  const resetPermissionsMutation = useMutation({
    mutationFn: (roleId: string) => rolesApi.resetPermissions(roleId),
    onSuccess: () => {
      toast.success(t('settings.roles.permissionsReset'));
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      if (selectedRole) {
        // Refresh selected role
        const updatedRole = roles?.find((r) => r.id === selectedRole.id);
        if (updatedRole) {
          setSelectedRole(updatedRole);
          setPendingPermissions(updatedRole.permissions);
        }
      }
      setHasChanges(false);
    },
    onError: () => {
      toast.error(t('settings.roles.resetError'));
    },
  });

  // Sync roles mutation
  const syncRolesMutation = useMutation({
    mutationFn: () => rolesApi.sync(),
    onSuccess: (response) => {
      const data = response.data;
      toast.success(
        t('settings.roles.syncSuccess', {
          created: data.created?.length || 0,
          updated: data.updated?.length || 0,
        })
      );
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => {
      toast.error(t('settings.roles.syncError'));
    },
  });

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setPendingPermissions(role.permissions);
    setHasChanges(false);
    // Expand all categories by default when selecting a role
    if (catalog) {
      setExpandedCategories(new Set(Object.keys(catalog)));
    }
  };

  const handlePermissionToggle = (permissionCode: string) => {
    if (!selectedRole || selectedRole.isSystemAdmin) return;

    const newPermissions = pendingPermissions.includes(permissionCode)
      ? pendingPermissions.filter((p) => p !== permissionCode)
      : [...pendingPermissions, permissionCode];

    setPendingPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissions: pendingPermissions,
    });
  };

  const handleResetToDefault = () => {
    if (!selectedRole) return;
    resetPermissionsMutation.mutate(selectedRole.id);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getRoleColor = (role: Role) => {
    const colors: Record<string, string> = {
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return colors[role.roleInfo?.color || 'gray'] || colors.gray;
  };

  const getCategoryPermissionCount = (categoryKey: string): { selected: number; total: number } => {
    const category = catalog?.[categoryKey];
    if (!category) return { selected: 0, total: 0 };

    const total = category.permissions.length;
    const selected = category.permissions.filter((p) =>
      pendingPermissions.includes(p.code)
    ).length;

    return { selected, total };
  };

  const isLoading = loadingRoles || loadingCatalog;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.roles.title')}
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('settings.roles.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.roles.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => syncRolesMutation.mutate()}
          disabled={syncRolesMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${syncRolesMutation.isPending ? 'animate-spin' : ''}`}
          />
          {t('settings.roles.syncRoles')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Roles List */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {t('settings.roles.selectRole')}
            </h3>
            <div className="space-y-2">
              {roles?.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    selectedRole?.id === role.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(role)}`}>
                      {role.roleInfo?.name || role.name}
                    </div>
                    {role.isSystemAdmin && (
                      <LockClosedIcon className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <UserGroupIcon className="h-3 w-3" />
                      {role.usersCount}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {role.permissions.length} {t('settings.roles.permissionsCount')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Editor */}
        <div className="lg:w-2/3 p-4">
          {selectedRole ? (
            <>
              {/* Role Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedRole.roleInfo?.name || selectedRole.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedRole.roleInfo?.description || selectedRole.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <button
                      onClick={handleSavePermissions}
                      disabled={updatePermissionsMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckIcon className="h-4 w-4" />
                      {updatePermissionsMutation.isPending
                        ? t('settings.roles.saving')
                        : t('settings.roles.saveChanges')}
                    </button>
                  )}
                  {!selectedRole.isSystemAdmin && (
                    <button
                      onClick={handleResetToDefault}
                      disabled={resetPermissionsMutation.isPending}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`h-4 w-4 ${resetPermissionsMutation.isPending ? 'animate-spin' : ''}`}
                      />
                      {t('settings.roles.resetToDefault')}
                    </button>
                  )}
                </div>
              </div>

              {/* System Admin Warning */}
              {selectedRole.isSystemAdmin && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <LockClosedIcon className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {t('settings.roles.systemAdminWarning')}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {t('settings.roles.systemAdminDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p>{t('settings.roles.info.permissionFormat')}</p>
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs mt-1 inline-block">
                      resource:action:scope
                    </code>
                  </div>
                </div>
              </div>

              {/* Permissions Categories */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {catalog &&
                  Object.entries(catalog).map(([categoryKey, category]) => {
                    const { selected, total } = getCategoryPermissionCount(categoryKey);
                    const isExpanded = expandedCategories.has(categoryKey);

                    return (
                      <div
                        key={categoryKey}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleCategory(categoryKey)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {t(`settings.roles.categories.${categoryKey}`, category.name)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selected}/{total}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
                            {category.permissions.map((permission) => {
                              const isChecked = pendingPermissions.includes(permission.code);
                              const isDisabled = selectedRole.isSystemAdmin;

                              return (
                                <label
                                  key={permission.code}
                                  className={`flex items-start gap-3 p-2 rounded-lg ${
                                    isDisabled
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handlePermissionToggle(permission.code)}
                                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {permission.name}
                                      </span>
                                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                        {permission.code}
                                      </code>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {permission.description}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <ShieldCheckIcon className="h-12 w-12 mb-4" />
              <p>{t('settings.roles.selectRolePrompt')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
