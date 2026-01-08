import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { payrollApi, employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

function TooltipIcon({ text }: { text: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <InformationCircleIcon className="h-4 w-4" />
      </button>
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50">
          <div className="absolute left-3 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          {text}
        </div>
      )}
    </div>
  );
}

function PaystubCard({ receipt, isExpanded, onToggle, onDownloadPdf, onDownloadXml }: {
  receipt: any;
  isExpanded: boolean;
  onToggle: () => void;
  onDownloadPdf: () => void;
  onDownloadXml: () => void;
}) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('DD MMM YYYY');
  };

  const periodName = receipt.payrollPeriod
    ? `${receipt.payrollPeriod.periodType === 'MONTHLY' ? 'Mes' : 'Quincena'} ${receipt.payrollPeriod.periodNumber}/${receipt.payrollPeriod.year}`
    : 'Periodo desconocido';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <BanknotesIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">{periodName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {receipt.payrollPeriod && formatDate(receipt.payrollPeriod.startDate)} - {receipt.payrollPeriod && formatDate(receipt.payrollPeriod.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.myPayroll.netPay')}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(Number(receipt.netPay))}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t dark:border-gray-700">
          {/* Net Pay Highlight */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-b dark:border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                {t('payroll.myPayroll.netPay')}
                <TooltipIcon text="El monto que recibes despues de deducciones" />
              </p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(Number(receipt.netPay))}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <CheckCircleIcon className="inline h-4 w-4 text-green-500 mr-1" />
                {receipt.payrollPeriod?.status === 'PAID' ? 'Pagado' : 'Procesado'} - {receipt.payrollPeriod && formatDate(receipt.payrollPeriod.paymentDate || receipt.payrollPeriod.endDate)}
              </p>
            </div>
          </div>

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 dark:bg-gray-700/30 border-b dark:border-gray-700">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                {t('payroll.myPayroll.grossPay')}
                <TooltipIcon text="Total de percepciones antes de deducciones" />
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(Number(receipt.totalPerceptions))}
              </p>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                {t('payroll.myPayroll.deductions')}
                <TooltipIcon text="Total de descuentos aplicados" />
              </p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(Number(receipt.totalDeductions))}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="p-5 border-b dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Salario base:</span>
                <span className="ml-2 font-medium">{formatCurrency(Number(receipt.baseSalary))}</span>
              </div>
              <div>
                <span className="text-gray-500">Dias trabajados:</span>
                <span className="ml-2 font-medium">{receipt.workedDays || 15}</span>
              </div>
              {receipt.overtimeHours > 0 && (
                <div>
                  <span className="text-gray-500">Horas extra:</span>
                  <span className="ml-2 font-medium">{receipt.overtimeHours}h ({formatCurrency(Number(receipt.overtimePay))})</span>
                </div>
              )}
              {receipt.imss > 0 && (
                <div>
                  <span className="text-gray-500">IMSS:</span>
                  <span className="ml-2 font-medium text-red-600">-{formatCurrency(Number(receipt.imss))}</span>
                </div>
              )}
              {receipt.isr > 0 && (
                <div>
                  <span className="text-gray-500">ISR:</span>
                  <span className="ml-2 font-medium text-red-600">-{formatCurrency(Number(receipt.isr))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 flex flex-wrap gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onDownloadPdf(); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Descargar PDF
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDownloadXml(); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Descargar XML
            </button>
          </div>

          {/* Fiscal Info */}
          {receipt.uuid && (
            <div className="p-5 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">UUID CFDI:</span> {receipt.uuid}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyPayrollPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get employee data
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: async () => {
      const response = await employeesApi.getByEmail(user?.email || '');
      return response.data;
    },
    enabled: !!user?.email,
  });

  const employeeId = employeeData?.id;

  // Get receipts
  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['my-receipts', employeeId, selectedYear],
    queryFn: () => payrollApi.getEmployeeReceipts(employeeId || '', selectedYear),
    enabled: !!employeeId,
  });

  const receipts = receiptsData?.data || [];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownloadPdf = async (receiptId: string, periodName: string) => {
    try {
      const response = await payrollApi.downloadReceipt(receiptId, 'pdf');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo_${periodName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Recibo descargado');
    } catch (error) {
      toast.error('Error al descargar el recibo');
    }
  };

  const handleDownloadXml = async (receiptId: string, periodName: string) => {
    try {
      const response = await payrollApi.downloadReceipt(receiptId, 'xml');
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cfdi_${periodName.replace(/\s+/g, '_')}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar el XML');
    }
  };

  // Set first receipt as expanded by default
  if (receipts.length > 0 && expandedId === null) {
    setExpandedId(receipts[0].id);
  }

  if (isLoadingEmployee) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="card text-center py-12">
        <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay empleado vinculado
        </h2>
        <p className="text-gray-500">
          Tu cuenta no esta vinculada a un registro de empleado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('payroll.myPayroll.title')}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t('payroll.myPayroll.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm"
          >
            {[2026, 2025, 2024, 2023].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingReceipts ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="card text-center py-12">
          <BanknotesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No hay recibos disponibles
          </h3>
          <p className="text-gray-500 mt-2">
            No tienes recibos de nomina para el ano {selectedYear}
          </p>
        </div>
      ) : (
        <>
          {/* Current/Latest Receipt */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('payroll.myPayroll.currentPaystub')}
            </h2>
            {receipts.length > 0 && (
              <PaystubCard
                receipt={receipts[0]}
                isExpanded={expandedId === receipts[0].id}
                onToggle={() => toggleExpand(receipts[0].id)}
                onDownloadPdf={() => handleDownloadPdf(receipts[0].id, `P${receipts[0].payrollPeriod?.periodNumber || ''}_${selectedYear}`)}
                onDownloadXml={() => handleDownloadXml(receipts[0].id, `P${receipts[0].payrollPeriod?.periodNumber || ''}_${selectedYear}`)}
              />
            )}
          </div>

          {/* Payment History */}
          {receipts.length > 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('payroll.myPayroll.payHistory')}
              </h2>
              <div className="space-y-4">
                {receipts.slice(1).map((receipt: any) => (
                  <PaystubCard
                    key={receipt.id}
                    receipt={receipt}
                    isExpanded={expandedId === receipt.id}
                    onToggle={() => toggleExpand(receipt.id)}
                    onDownloadPdf={() => handleDownloadPdf(receipt.id, `P${receipt.payrollPeriod?.periodNumber || ''}_${selectedYear}`)}
                    onDownloadXml={() => handleDownloadXml(receipt.id, `P${receipt.payrollPeriod?.periodNumber || ''}_${selectedYear}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
