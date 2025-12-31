import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentMagnifyingGlassIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { payrollApi } from '../../services/api';

interface FiscalAuditPanelProps {
  periodId?: string;
  detailId?: string;
  mode: 'period' | 'receipt';
}

export default function FiscalAuditPanel({
  periodId,
  detailId,
  mode,
}: FiscalAuditPanelProps) {
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());

  // Query para auditoria de periodo
  const { data: periodAudit, isLoading: loadingPeriod } = useQuery({
    queryKey: ['fiscal-audit-period', periodId],
    queryFn: () => payrollApi.getPeriodFiscalAudit(periodId!),
    enabled: mode === 'period' && !!periodId,
  });

  // Query para auditoria de recibo
  const { data: receiptAudit, isLoading: loadingReceipt } = useQuery({
    queryKey: ['fiscal-audit-receipt', detailId],
    queryFn: () => payrollApi.getReceiptFiscalAudit(detailId!),
    enabled: mode === 'receipt' && !!detailId,
  });

  // Query para resumen por concepto
  const { data: auditSummary } = useQuery({
    queryKey: ['fiscal-audit-summary', periodId],
    queryFn: () => payrollApi.getPeriodFiscalAuditSummary(periodId!),
    enabled: mode === 'period' && !!periodId,
  });

  // Query para snapshot de reglas
  const { data: rulesetSnapshot } = useQuery({
    queryKey: ['ruleset-snapshot', detailId],
    queryFn: () => payrollApi.getRulesetSnapshot(detailId!),
    enabled: mode === 'receipt' && !!detailId,
  });

  const isLoading = loadingPeriod || loadingReceipt;
  const auditData = mode === 'period' ? periodAudit?.data : receiptAudit?.data;
  const summary = auditSummary?.data;
  const snapshot = rulesetSnapshot?.data;

  const toggleConcept = (conceptId: string) => {
    const newSet = new Set(expandedConcepts);
    if (newSet.has(conceptId)) {
      newSet.delete(conceptId);
    } else {
      newSet.add(conceptId);
    }
    setExpandedConcepts(newSet);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-48">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <DocumentMagnifyingGlassIcon className="h-8 w-8 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold">Auditoria Fiscal</h3>
            <p className="text-sm text-gray-500">
              {mode === 'period'
                ? 'Detalle de calculos fiscales del periodo'
                : 'Detalle de calculos fiscales del recibo'}
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot de reglas (solo para recibos) */}
      {mode === 'receipt' && snapshot && (
        <div className="px-6 py-4 border-b bg-blue-50">
          <div className="flex items-start gap-3">
            <CalculatorIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Contexto de Calculo (Snapshot v{snapshot.version})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">UMA Diaria</p>
                  <p className="font-medium">{formatCurrency(parseFloat(snapshot.umaDaily))}</p>
                </div>
                <div>
                  <p className="text-blue-600">SMG Diario</p>
                  <p className="font-medium">{formatCurrency(parseFloat(snapshot.smgDaily))}</p>
                </div>
                <div>
                  <p className="text-blue-600">Ano Fiscal</p>
                  <p className="font-medium">{snapshot.fiscalYear}</p>
                </div>
                <div>
                  <p className="text-blue-600">Tabla ISR</p>
                  <p className="font-medium">{snapshot.isrTableVersion || 'Por defecto'}</p>
                </div>
              </div>
              {snapshot.formulasUsed && snapshot.formulasUsed.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-blue-600 mb-1">
                    Formulas aplicadas: {snapshot.formulasUsed.length}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {snapshot.formulasUsed.slice(0, 5).map((f: any, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {f.conceptCode}
                      </span>
                    ))}
                    {snapshot.formulasUsed.length > 5 && (
                      <span className="text-xs text-blue-600">
                        +{snapshot.formulasUsed.length - 5} mas
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumen (solo para periodos) */}
      {mode === 'period' && summary && (
        <div className="px-6 py-4 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Resumen por Tipo de Concepto
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600">Percepciones</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(summary.totalPerceptions || 0)}
              </p>
              <p className="text-xs text-green-600">
                {summary.perceptionCount || 0} conceptos
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-red-600">Deducciones</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(summary.totalDeductions || 0)}
              </p>
              <p className="text-xs text-red-600">
                {summary.deductionCount || 0} conceptos
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600">ISR Retenido</p>
              <p className="text-xl font-bold text-purple-700">
                {formatCurrency(summary.totalIsr || 0)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Cuotas IMSS</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(summary.totalImss || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de conceptos */}
      {auditData?.conceptDetails && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Detalle por Concepto
          </h4>
          <div className="space-y-2">
            {auditData.conceptDetails.map((concept: any) => (
              <div key={concept.id} className="border rounded-lg">
                <button
                  onClick={() => toggleConcept(concept.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {expandedConcepts.has(concept.id) ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        concept.type === 'PERCEPTION'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {concept.code}
                    </span>
                    <span className="text-sm font-medium">{concept.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-medium ${
                        concept.type === 'PERCEPTION'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(concept.totalAmount)}
                    </span>
                    {concept.hasExceptions && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                    )}
                    {concept.auditPassed && (
                      <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </button>

                {expandedConcepts.has(concept.id) && (
                  <div className="border-t p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Base Gravable</p>
                        <p className="font-medium">
                          {formatCurrency(concept.taxableAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Base Exenta</p>
                        <p className="font-medium">
                          {formatCurrency(concept.exemptAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Empleados</p>
                        <p className="font-medium">{concept.employeeCount}</p>
                      </div>
                    </div>

                    {concept.formula && (
                      <div className="bg-white p-3 rounded border mb-3">
                        <p className="text-xs text-gray-500 mb-1">Formula Aplicada</p>
                        <code className="text-sm text-indigo-600 font-mono">
                          {concept.formula}
                        </code>
                      </div>
                    )}

                    {concept.calculations && concept.calculations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          Calculos individuales ({concept.calculations.length})
                        </p>
                        <div className="max-h-48 overflow-y-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-1 text-left">Empleado</th>
                                <th className="px-2 py-1 text-right">Base</th>
                                <th className="px-2 py-1 text-right">Gravable</th>
                                <th className="px-2 py-1 text-right">Exento</th>
                                <th className="px-2 py-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {concept.calculations.slice(0, 10).map((calc: any) => (
                                <tr key={calc.employeeId} className="hover:bg-white">
                                  <td className="px-2 py-1">
                                    {calc.employeeName}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {formatCurrency(calc.baseAmount)}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {formatCurrency(calc.taxableAmount)}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {formatCurrency(calc.exemptAmount)}
                                  </td>
                                  <td className="px-2 py-1 text-right font-medium">
                                    {formatCurrency(calc.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {concept.calculations.length > 10 && (
                            <p className="text-xs text-gray-500 text-center py-2">
                              + {concept.calculations.length - 10} calculos mas
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {concept.exceptions && concept.exceptions.length > 0 && (
                      <div className="mt-3 bg-yellow-50 p-3 rounded">
                        <p className="text-xs font-medium text-yellow-800 mb-2">
                          Excepciones detectadas
                        </p>
                        <ul className="space-y-1">
                          {concept.exceptions.map((exc: any, i: number) => (
                            <li
                              key={i}
                              className="text-xs text-yellow-700 flex items-start gap-2"
                            >
                              <ExclamationTriangleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {exc.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer con metadatos */}
      <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>
            Generado: {dayjs(auditData?.generatedAt).format('DD/MM/YYYY HH:mm')}
          </span>
          {auditData?.version && <span>Version: {auditData.version}</span>}
        </div>
      </div>
    </div>
  );
}
