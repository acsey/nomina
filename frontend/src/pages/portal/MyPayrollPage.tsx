import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  DocumentArrowDownIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface PaystubItem {
  code: string;
  nameKey: string;
  tooltipKey: string;
  amount: number;
  type: 'earning' | 'deduction';
}

interface Paystub {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  earnings: PaystubItem[];
  deductions: PaystubItem[];
  uuid: string;
  status: 'paid' | 'pending';
}

// Mock data - In real app, this comes from API
const mockPaystubs: Paystub[] = [
  {
    id: '1',
    period: 'Enero 2da Quincena 2026',
    periodStart: '2026-01-16',
    periodEnd: '2026-01-31',
    paymentDate: '2026-01-31',
    grossPay: 25000,
    totalDeductions: 5250,
    netPay: 19750,
    earnings: [
      { code: 'P001', nameKey: 'payroll.earnings.baseSalary', tooltipKey: 'payroll.earnings.baseSalaryTooltip', amount: 22500, type: 'earning' },
      { code: 'P002', nameKey: 'payroll.earnings.foodVouchers', tooltipKey: 'payroll.earnings.foodVouchersTooltip', amount: 1500, type: 'earning' },
      { code: 'P003', nameKey: 'payroll.earnings.transportAllowance', tooltipKey: 'payroll.earnings.transportTooltip', amount: 1000, type: 'earning' },
    ],
    deductions: [
      { code: 'D001', nameKey: 'payroll.deductions.isr', tooltipKey: 'payroll.deductions.isrTooltip', amount: 3500, type: 'deduction' },
      { code: 'D002', nameKey: 'payroll.deductions.imss', tooltipKey: 'payroll.deductions.imssTooltip', amount: 1250, type: 'deduction' },
      { code: 'D003', nameKey: 'payroll.deductions.retirementSavings', tooltipKey: 'payroll.deductions.retirementTooltip', amount: 500, type: 'deduction' },
    ],
    uuid: 'ABC12345-1234-5678-90AB-CDEF12345678',
    status: 'paid',
  },
  {
    id: '2',
    period: 'Enero 1ra Quincena 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-15',
    paymentDate: '2026-01-15',
    grossPay: 25000,
    totalDeductions: 5250,
    netPay: 19750,
    earnings: [
      { code: 'P001', nameKey: 'payroll.earnings.baseSalary', tooltipKey: 'payroll.earnings.baseSalaryTooltip', amount: 22500, type: 'earning' },
      { code: 'P002', nameKey: 'payroll.earnings.foodVouchers', tooltipKey: 'payroll.earnings.foodVouchersTooltip', amount: 1500, type: 'earning' },
      { code: 'P003', nameKey: 'payroll.earnings.transportAllowance', tooltipKey: 'payroll.earnings.transportTooltip', amount: 1000, type: 'earning' },
    ],
    deductions: [
      { code: 'D001', nameKey: 'payroll.deductions.isr', tooltipKey: 'payroll.deductions.isrTooltip', amount: 3500, type: 'deduction' },
      { code: 'D002', nameKey: 'payroll.deductions.imss', tooltipKey: 'payroll.deductions.imssTooltip', amount: 1250, type: 'deduction' },
      { code: 'D003', nameKey: 'payroll.deductions.retirementSavings', tooltipKey: 'payroll.deductions.retirementTooltip', amount: 500, type: 'deduction' },
    ],
    uuid: 'DEF67890-1234-5678-90AB-CDEF12345678',
    status: 'paid',
  },
];

function TooltipIcon({ tooltipKey }: { tooltipKey: string }) {
  const { t } = useTranslation();
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
          {t(tooltipKey)}
        </div>
      )}
    </div>
  );
}

function PaystubCard({ paystub, isExpanded, onToggle }: { paystub: Paystub; isExpanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
            <h3 className="font-semibold text-gray-900 dark:text-white">{paystub.period}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(paystub.periodStart)} - {formatDate(paystub.periodEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.myPayroll.netPay')}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(paystub.netPay)}
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
                <TooltipIcon tooltipKey="payroll.myPayroll.netPayTooltip" />
              </p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(paystub.netPay)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <CheckCircleIcon className="inline h-4 w-4 text-green-500 mr-1" />
                {t('payroll.period.paid')} - {formatDate(paystub.paymentDate)}
              </p>
            </div>
          </div>

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 dark:bg-gray-700/30 border-b dark:border-gray-700">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                {t('payroll.myPayroll.grossPay')}
                <TooltipIcon tooltipKey="payroll.myPayroll.grossPayTooltip" />
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(paystub.grossPay)}
              </p>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                {t('payroll.myPayroll.deductions')}
                <TooltipIcon tooltipKey="payroll.myPayroll.deductionsTooltip" />
              </p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(paystub.totalDeductions)}
              </p>
            </div>
          </div>

          {/* Earnings Section */}
          <div className="p-5 border-b dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('payroll.earnings.title')}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({t('payroll.earnings.subtitle')})
              </span>
            </h4>
            <div className="space-y-2">
              {paystub.earnings.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/10 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {t(item.nameKey)}
                    </span>
                    <TooltipIcon tooltipKey={item.tooltipKey} />
                  </div>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions Section */}
          <div className="p-5 border-b dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('payroll.deductions.title')}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({t('payroll.deductions.subtitle')})
              </span>
            </h4>
            <div className="space-y-2">
              {paystub.deductions.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between py-2 px-3 bg-red-50 dark:bg-red-900/10 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {t(item.nameKey)}
                    </span>
                    <TooltipIcon tooltipKey={item.tooltipKey} />
                  </div>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <DocumentArrowDownIcon className="h-5 w-5" />
              {t('payroll.myPayroll.downloadPaystub')}
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <DocumentArrowDownIcon className="h-5 w-5" />
              {t('payroll.myPayroll.downloadXml')}
            </button>
          </div>

          {/* Fiscal Info */}
          <div className="p-5 bg-gray-50 dark:bg-gray-700/30 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">{t('payroll.details.uuid')}:</span> {paystub.uuid}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyPayrollPage() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(mockPaystubs[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* Current/Latest Paystub */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('payroll.myPayroll.currentPaystub')}
        </h2>
        {mockPaystubs.length > 0 && (
          <PaystubCard
            paystub={mockPaystubs[0]}
            isExpanded={expandedId === mockPaystubs[0].id}
            onToggle={() => toggleExpand(mockPaystubs[0].id)}
          />
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('payroll.myPayroll.payHistory')}
        </h2>
        <div className="space-y-4">
          {mockPaystubs.slice(1).map((paystub) => (
            <PaystubCard
              key={paystub.id}
              paystub={paystub}
              isExpanded={expandedId === paystub.id}
              onToggle={() => toggleExpand(paystub.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
