import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { payrollApi } from '../../services/api';

interface VersionHistoryPanelProps {
  detailId: string;
}

export default function VersionHistoryPanel({ detailId }: VersionHistoryPanelProps) {
  const [selectedVersions, setSelectedVersions] = useState<{
    versionA: number | null;
    versionB: number | null;
  }>({ versionA: null, versionB: null });
  const [showComparison, setShowComparison] = useState(false);

  // Query para historial de versiones
  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['receipt-versions', detailId],
    queryFn: () => payrollApi.getReceiptVersions(detailId),
    enabled: !!detailId,
  });

  // Query para comparacion de versiones
  const { data: comparisonData, isLoading: loadingComparison } = useQuery({
    queryKey: ['version-comparison', detailId, selectedVersions.versionA, selectedVersions.versionB],
    queryFn: () =>
      payrollApi.compareVersions(
        detailId,
        selectedVersions.versionA!,
        selectedVersions.versionB!
      ),
    enabled:
      !!detailId &&
      selectedVersions.versionA !== null &&
      selectedVersions.versionB !== null &&
      showComparison,
  });

  const versions = versionsData?.data || [];
  const comparison = comparisonData?.data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0);
  };

  const handleVersionSelect = (version: number) => {
    if (selectedVersions.versionA === null) {
      setSelectedVersions({ versionA: version, versionB: null });
    } else if (selectedVersions.versionB === null && version !== selectedVersions.versionA) {
      setSelectedVersions({ ...selectedVersions, versionB: version });
    } else {
      setSelectedVersions({ versionA: version, versionB: null });
    }
    setShowComparison(false);
  };

  const handleCompare = () => {
    if (selectedVersions.versionA && selectedVersions.versionB) {
      setShowComparison(true);
    }
  };

  const clearSelection = () => {
    setSelectedVersions({ versionA: null, versionB: null });
    setShowComparison(false);
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      INITIAL: { label: 'Version inicial', color: 'bg-blue-100 text-blue-700' },
      RECALCULATION: { label: 'Recalculo', color: 'bg-yellow-100 text-yellow-700' },
      CORRECTION: { label: 'Correccion', color: 'bg-orange-100 text-orange-700' },
      INCIDENT_UPDATE: { label: 'Cambio de incidencia', color: 'bg-purple-100 text-purple-700' },
      DATA_UPDATE: { label: 'Actualizacion de datos', color: 'bg-gray-100 text-gray-700' },
    };
    return labels[reason] || { label: reason, color: 'bg-gray-100 text-gray-700' };
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) return <ArrowUpIcon className="h-3 w-3 text-green-500" />;
    if (diff < 0) return <ArrowDownIcon className="h-3 w-3 text-red-500" />;
    return <MinusIcon className="h-3 w-3 text-gray-400" />;
  };

  if (loadingVersions) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
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
            <ClockIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold">Historial de Versiones</h3>
              <p className="text-sm text-gray-500">
                {versions.length} versiones registradas
              </p>
            </div>
          </div>
          {selectedVersions.versionA && selectedVersions.versionB && (
            <div className="flex items-center gap-2">
              <button onClick={clearSelection} className="btn btn-secondary btn-sm">
                Limpiar
              </button>
              <button onClick={handleCompare} className="btn btn-primary btn-sm">
                <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                Comparar v{selectedVersions.versionA} vs v{selectedVersions.versionB}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selection hint */}
      {!showComparison && (
        <div className="px-6 py-2 bg-blue-50 border-b text-sm text-blue-700">
          Selecciona dos versiones para comparar los cambios
        </div>
      )}

      {/* Versions list */}
      {!showComparison && (
        <div className="divide-y">
          {versions.map((version: any) => {
            const isSelected =
              selectedVersions.versionA === version.version ||
              selectedVersions.versionB === version.version;
            const reason = getReasonLabel(version.createdReason);

            return (
              <div
                key={version.version}
                onClick={() => handleVersionSelect(version.version)}
                className={`px-6 py-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 border-l-4 border-indigo-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-bold text-lg">v{version.version}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${reason.color}`}>
                      {reason.label}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dayjs(version.createdAt).format('DD/MM/YYYY HH:mm')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Neto</p>
                    <p className="font-medium">{formatCurrency(version.netPay)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Percepciones</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(version.totalPerceptions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deducciones</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(version.totalDeductions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dias trabajados</p>
                    <p className="font-medium">{version.workedDays}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison view */}
      {showComparison && (
        <div className="p-6">
          {loadingComparison ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : comparison ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-4">
                  Comparacion: Version {selectedVersions.versionA} vs Version{' '}
                  {selectedVersions.versionB}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Diferencia Neto</p>
                    <div className="flex items-center justify-center gap-1">
                      {getDiffIcon(comparison.netPayDifference)}
                      <span
                        className={`text-xl font-bold ${
                          comparison.netPayDifference > 0
                            ? 'text-green-600'
                            : comparison.netPayDifference < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(comparison.netPayDifference))}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Percepciones</p>
                    <div className="flex items-center justify-center gap-1">
                      {getDiffIcon(comparison.perceptionsDifference)}
                      <span className="text-xl font-bold">
                        {formatCurrency(Math.abs(comparison.perceptionsDifference || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Deducciones</p>
                    <div className="flex items-center justify-center gap-1">
                      {getDiffIcon(comparison.deductionsDifference)}
                      <span className="text-xl font-bold">
                        {formatCurrency(Math.abs(comparison.deductionsDifference || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perceptions diff */}
              {comparison.perceptionsDiff && comparison.perceptionsDiff.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2">
                    Cambios en Percepciones
                  </h4>
                  <div className="space-y-2">
                    {comparison.perceptionsDiff.map((diff: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          diff.type === 'ADDED'
                            ? 'bg-green-50 border-green-200'
                            : diff.type === 'REMOVED'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                diff.type === 'ADDED'
                                  ? 'bg-green-200 text-green-800'
                                  : diff.type === 'REMOVED'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              {diff.type === 'ADDED'
                                ? 'Agregado'
                                : diff.type === 'REMOVED'
                                ? 'Eliminado'
                                : 'Modificado'}
                            </span>
                            <span className="font-medium">{diff.conceptCode}</span>
                            <span className="text-gray-600">{diff.conceptName}</span>
                          </div>
                          <div className="text-right">
                            {diff.type === 'MODIFIED' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  {formatCurrency(diff.oldAmount)}
                                </span>
                                <span>&rarr;</span>
                                <span className="font-medium">
                                  {formatCurrency(diff.newAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium">
                                {formatCurrency(diff.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deductions diff */}
              {comparison.deductionsDiff && comparison.deductionsDiff.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">
                    Cambios en Deducciones
                  </h4>
                  <div className="space-y-2">
                    {comparison.deductionsDiff.map((diff: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          diff.type === 'ADDED'
                            ? 'bg-red-50 border-red-200'
                            : diff.type === 'REMOVED'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                diff.type === 'ADDED'
                                  ? 'bg-red-200 text-red-800'
                                  : diff.type === 'REMOVED'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              {diff.type === 'ADDED'
                                ? 'Agregado'
                                : diff.type === 'REMOVED'
                                ? 'Eliminado'
                                : 'Modificado'}
                            </span>
                            <span className="font-medium">{diff.conceptCode}</span>
                            <span className="text-gray-600">{diff.conceptName}</span>
                          </div>
                          <div className="text-right">
                            {diff.type === 'MODIFIED' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  {formatCurrency(diff.oldAmount)}
                                </span>
                                <span>&rarr;</span>
                                <span className="font-medium">
                                  {formatCurrency(diff.newAmount)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium">
                                {formatCurrency(diff.amount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No changes */}
              {(!comparison.perceptionsDiff || comparison.perceptionsDiff.length === 0) &&
                (!comparison.deductionsDiff || comparison.deductionsDiff.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No se detectaron cambios entre las versiones seleccionadas
                  </div>
                )}

              <button
                onClick={() => setShowComparison(false)}
                className="w-full btn btn-secondary"
              >
                Volver al historial
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudo cargar la comparacion
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {versions.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No hay versiones registradas para este recibo</p>
        </div>
      )}
    </div>
  );
}
