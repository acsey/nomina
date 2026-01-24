import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { canAccessPortal } from '../components/guards';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Microsoft Logo SVG
const MicrosoftLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

interface AuthPolicies {
  ssoEnabled: boolean;
  ssoEnforced: boolean;
  classicLoginEnabled: boolean;
  mfaEnabled: boolean;
  mfaEnforced: boolean;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for error in URL params (from Microsoft callback)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Fetch auth policies
  const { data: authPolicies, isLoading: policiesLoading } = useQuery({
    queryKey: ['auth-policies'],
    queryFn: async () => {
      try {
        const response = await authApi.getAuthPolicies();
        return response.data as AuthPolicies;
      } catch {
        // Default policies if API fails
        return {
          ssoEnabled: false,
          ssoEnforced: false,
          classicLoginEnabled: true,
          mfaEnabled: false,
          mfaEnforced: false,
        };
      }
    },
  });

  // Check if Microsoft auth is enabled (legacy endpoint, kept for compatibility)
  const { data: microsoftStatus } = useQuery({
    queryKey: ['microsoft-auth-status'],
    queryFn: async () => {
      try {
        const response = await authApi.getMicrosoftStatus();
        return response.data;
      } catch {
        return { enabled: false };
      }
    },
  });

  // Computed values from policies
  const showClassicLogin = authPolicies?.classicLoginEnabled ?? true;
  const showSsoLogin = authPolicies?.ssoEnabled || microsoftStatus?.enabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password, mfaCode || undefined);
      toast.success('Bienvenido');

      // REGLA ÚNICA: Si puede acceder al portal, va al portal
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (canAccessPortal(userData)) {
          navigate('/portal/feed');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      // Check if MFA is required
      if (error.response?.status === 428 && error.response?.data?.mfaRequired) {
        setShowMfaInput(true);
        if (error.response?.data?.mfaSetupRequired) {
          toast.error('Debe configurar MFA antes de continuar');
          // In a full implementation, redirect to MFA setup
        } else {
          toast.error('Ingrese su codigo MFA');
        }
      }
      // Other errors are handled by the axios interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsMicrosoftLoading(true);
    try {
      const response = await authApi.getMicrosoftLoginUrl();
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Error al iniciar sesión con Microsoft');
      setIsMicrosoftLoading(false);
    }
  };

  // Show loading while fetching policies
  if (policiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8" role="main" aria-label="Inicio de sesion">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-primary-600">
            Sistema de Nomina
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            Iniciar sesion
          </h2>
        </div>

        {/* SSO Enforced Warning */}
        {authPolicies?.ssoEnforced && !showClassicLogin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Inicio de sesion con SSO</p>
                <p className="text-sm text-blue-700 mt-1">
                  Esta organizacion requiere inicio de sesion con Microsoft Azure AD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MFA Enforced Notice */}
        {authPolicies?.mfaEnforced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">MFA Requerido</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Esta organizacion requiere autenticacion de dos factores.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6 card">
          {/* Classic Login Form */}
          {showClassicLogin && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Correo electronico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={showMfaInput}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Contrasena
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={showMfaInput}
                  />
                </div>

                {/* MFA Code Input */}
                {showMfaInput && (
                  <div>
                    <label htmlFor="mfaCode" className="label">
                      Codigo MFA
                    </label>
                    <input
                      id="mfaCode"
                      name="mfaCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      className="input text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Ingrese el codigo de 6 digitos de su aplicacion de autenticacion
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary py-3"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {showMfaInput ? 'Verificando...' : 'Iniciando sesion...'}
                  </span>
                ) : showMfaInput ? (
                  'Verificar codigo'
                ) : (
                  'Iniciar sesion'
                )}
              </button>

              {showMfaInput && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaInput(false);
                    setMfaCode('');
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Volver a ingresar credenciales
                </button>
              )}
            </form>
          )}

          {/* Microsoft Login */}
          {showSsoLogin && (
            <>
              {showClassicLogin && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">O continuar con</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isMicrosoftLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isMicrosoftLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <MicrosoftLogo />
                )}
                Iniciar sesion con Microsoft
              </button>
            </>
          )}

          {/* No login methods available */}
          {!showClassicLogin && !showSsoLogin && (
            <div className="text-center py-8">
              <ShieldCheckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                No hay metodos de inicio de sesion disponibles.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Contacte al administrador del sistema.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          Sistema de Nomina Empresarial v1.0
        </p>
      </div>
    </main>
  );
}
