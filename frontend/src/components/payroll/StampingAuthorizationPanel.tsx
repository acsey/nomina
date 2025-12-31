import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { payrollApi } from '../../services/api';

interface StampingAuthorizationPanelProps {
  periodId: string;
  periodStatus: string;
  onAuthorizationChange?: () => void;
}

export default function StampingAuthorizationPanel({
  periodId,
  periodStatus,
  onAuthorizationChange,
}: StampingAuthorizationPanelProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [authNotes, setAuthNotes] = useState('');
  const [checkboxes, setCheckboxes] = useState({
    approvedCalculations: false,
    verifiedEmployeeData: false,
    reviewedExceptions: false,
  });
  const queryClient = useQueryClient();

  // Query para verificar eligibilidad de timbrado
  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: ['stamping-eligibility', periodId],
    queryFn: () => payrollApi.getStampingEligibility(periodId),
    enabled: !!periodId,
  });

  // Query para historial de autorizaciones
  const { data: authHistory } = useQuery({
    queryKey: ['authorization-history', periodId],
    queryFn: () => payrollApi.getAuthorizationHistory(periodId),
    enabled: !!periodId,
  });

  // Mutation para autorizar
  const authorizeMutation = useMutation({
    mutationFn: () =>
      payrollApi.authorizeStamping(periodId, {
        notes: authNotes,
        ...checkboxes,
      }),
    onSuccess: () => {
      toast.success('Periodo autorizado para timbrado');
      queryClient.invalidateQueries({ queryKey: ['stamping-eligibility', periodId] });
      queryClient.invalidateQueries({ queryKey: ['authorization-history', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setIsAuthorizing(false);
      onAuthorizationChange?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al autorizar');
    },
  });

  // Mutation para revocar
  const revokeMutation = useMutation({
    mutationFn: () => payrollApi.revokeStampingAuth(periodId, revokeReason),
    onSuccess: () => {
      toast.success('Autorizacion revocada');
      queryClient.invalidateQueries({ queryKey: ['stamping-eligibility', periodId] });
      queryClient.invalidateQueries({ queryKey: ['authorization-history', periodId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setIsRevoking(false);
      setRevokeReason('');
      onAuthorizationChange?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al revocar');
    },
  });

  const eligibilityData = eligibility?.data;
  const history = authHistory?.data || [];

  const canAuthorize =
    ['CALCULATED', 'APPROVED'].includes(periodStatus) &&
    !eligibilityData?.isAuthorized;

  const canRevoke =
    eligibilityData?.isAuthorized &&
    eligibilityData?.receiptsStatus?.stamped === 0;

  const allCheckboxesChecked =
    checkboxes.approvedCalculations &&
    checkboxes.verifiedEmployeeData &&
    checkboxes.reviewedExceptions;

  if (loadingEligibility) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {eligibilityData?.isAuthorized ? (
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
            ) : (
              <ShieldExclamationIcon className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold">Autorizacion de Timbrado</h3>
              <p className="text-sm text-gray-500">
                {eligibilityData?.isAuthorized
                  ? 'Este periodo esta autorizado para timbrado'
                  : 'Este periodo requiere autorizacion para timbrar'}
              </p>
            </div>
          </div>
          {eligibilityData?.isAuthorized && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Autorizado
            </span>
          )}
        </div>
      </div>

      {/* Status de recibos */}
      {eligibilityData?.receiptsStatus && (
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {eligibilityData.receiptsStatus.total}
              </p>
              <p className="text-xs text-gray-500">Total recibos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {eligibilityData.receiptsStatus.pending}
              </p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {eligibilityData.receiptsStatus.stamped}
              </p>
              <p className="text-xs text-gray-500">Timbrados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {eligibilityData.receiptsStatus.failed}
              </p>
              <p className="text-xs text-gray-500">Con error</p>
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {eligibilityData?.issues?.length > 0 && (
        <div className="px-6 py-4 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Problemas detectados
          </h4>
          <div className="space-y-2">
            {eligibilityData.issues.map((issue: any, index: number) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-red-50'
                    : issue.severity === 'WARNING'
                    ? 'bg-yellow-50'
                    : 'bg-blue-50'
                }`}
              >
                {issue.severity === 'CRITICAL' ? (
                  <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                ) : issue.severity === 'WARNING' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      issue.severity === 'CRITICAL'
                        ? 'text-red-800'
                        : issue.severity === 'WARNING'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}
                  >
                    {issue.message}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{issue.resolution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorization info */}
      {eligibilityData?.authorization && (
        <div className="px-6 py-4 border-b bg-green-50">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-green-800">
                Autorizado por: <strong>{eligibilityData.authorization.authorizedBy}</strong>
              </p>
              <p className="text-xs text-green-600">
                {dayjs(eligibilityData.authorization.authorizedAt).format(
                  'DD/MM/YYYY HH:mm'
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4">
        {canAuthorize && !isAuthorizing && (
          <button
            onClick={() => setIsAuthorizing(true)}
            className="w-full btn btn-primary"
          >
            <ShieldCheckIcon className="h-5 w-5 mr-2" />
            Autorizar Timbrado
          </button>
        )}

        {canRevoke && !isRevoking && (
          <button
            onClick={() => setIsRevoking(true)}
            className="w-full btn btn-danger"
          >
            <XCircleIcon className="h-5 w-5 mr-2" />
            Revocar Autorizacion
          </button>
        )}

        {/* Authorize form */}
        {isAuthorizing && (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Confirme que ha verificado:
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkboxes.approvedCalculations}
                    onChange={(e) =>
                      setCheckboxes({
                        ...checkboxes,
                        approvedCalculations: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  He revisado y aprobado los calculos de nomina
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkboxes.verifiedEmployeeData}
                    onChange={(e) =>
                      setCheckboxes({
                        ...checkboxes,
                        verifiedEmployeeData: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  He verificado los datos de los empleados (RFC, CURP, etc.)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkboxes.reviewedExceptions}
                    onChange={(e) =>
                      setCheckboxes({
                        ...checkboxes,
                        reviewedExceptions: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  He revisado las incidencias y excepciones
                </label>
              </div>
            </div>

            <div>
              <label className="label">Notas (opcional)</label>
              <textarea
                value={authNotes}
                onChange={(e) => setAuthNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="Comentarios adicionales..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsAuthorizing(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => authorizeMutation.mutate()}
                disabled={!allCheckboxesChecked || authorizeMutation.isPending}
                className="flex-1 btn btn-primary"
              >
                {authorizeMutation.isPending ? 'Autorizando...' : 'Confirmar Autorizacion'}
              </button>
            </div>
          </div>
        )}

        {/* Revoke form */}
        {isRevoking && (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                Al revocar la autorizacion, no se podra timbrar hasta que se vuelva a
                autorizar el periodo.
              </p>
            </div>

            <div>
              <label className="label">Motivo de revocacion *</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="input"
                rows={2}
                placeholder="Indique el motivo..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsRevoking(false);
                  setRevokeReason('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={!revokeReason.trim() || revokeMutation.isPending}
                className="flex-1 btn btn-danger"
              >
                {revokeMutation.isPending ? 'Revocando...' : 'Revocar Autorizacion'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="px-6 py-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Historial de autorizaciones
          </h4>
          <div className="space-y-2">
            {history.slice(0, 5).map((auth: any) => (
              <div
                key={auth.id}
                className={`flex items-center justify-between p-2 rounded ${
                  auth.isActive ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {auth.isActive ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">
                    {auth.isActive ? 'Autorizado' : 'Revocado'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {dayjs(auth.isActive ? auth.authorizedAt : auth.revokedAt).format(
                    'DD/MM/YY HH:mm'
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
