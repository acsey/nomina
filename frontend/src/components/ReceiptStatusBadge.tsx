import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, ClockIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

/**
 * Configuración de estilos y labels por estado
 */
const STATUS_CONFIG: Record<string, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: typeof CheckCircleIcon;
  animate?: boolean;
}> = {
  PENDING: {
    label: 'Pendiente',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: ClockIcon,
  },
  CALCULATED: {
    label: 'Calculado',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: DocumentCheckIcon,
  },
  CALCULATING: {
    label: 'Calculando...',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: ArrowPathIcon,
    animate: true,
  },
  APPROVED: {
    label: 'Aprobado',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    icon: DocumentCheckIcon,
  },
  STAMPING: {
    label: 'Timbrando...',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: ArrowPathIcon,
    animate: true,
  },
  STAMP_OK: {
    label: 'Timbrado',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircleIcon,
  },
  STAMP_ERROR: {
    label: 'Error Timbrado',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircleIcon,
  },
  PAID: {
    label: 'Pagado',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: CheckCircleIcon,
  },
  CANCELLED: {
    label: 'Cancelado',
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-600',
    icon: XCircleIcon,
  },
  SUPERSEDED: {
    label: 'Reemplazado',
    bgColor: 'bg-gray-200',
    textColor: 'text-gray-500',
    icon: ArrowPathIcon,
  },
};

interface ReceiptStatusBadgeProps {
  status: string;
  version?: number;
  showVersion?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * HARDENING: Badge de estado de recibo con indicador de versión
 *
 * Muestra:
 * - Estado visual con color e icono
 * - Animación para estados en proceso (CALCULATING, STAMPING)
 * - Número de versión si showVersion=true
 */
export default function ReceiptStatusBadge({
  status,
  version,
  showVersion = false,
  size = 'md',
  className = '',
}: ReceiptStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: ClockIcon,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Icon
        className={`
          ${iconSizes[size]}
          ${config.animate ? 'animate-spin' : ''}
        `}
      />
      <span>{config.label}</span>
      {showVersion && version && version > 1 && (
        <span className="ml-1 opacity-75">(v{version})</span>
      )}
    </span>
  );
}

/**
 * HARDENING: Componente de versión de recibo
 *
 * Muestra la versión actual del recibo con indicador visual
 * si no es la versión original (v1)
 */
export function ReceiptVersionIndicator({
  version,
  isActive = true,
  className = '',
}: {
  version: number;
  isActive?: boolean;
  className?: string;
}) {
  if (version === 1) {
    return null; // No mostrar para versión original
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 text-xs font-medium rounded px-1.5 py-0.5
        ${isActive
          ? 'bg-blue-50 text-blue-600 border border-blue-200'
          : 'bg-gray-50 text-gray-500 border border-gray-200'
        }
        ${className}
      `}
      title={`Versión ${version} del recibo${!isActive ? ' (reemplazada)' : ' - Actual'}`}
    >
      <span>v{version}</span>
      {isActive && <span className="text-green-500">●</span>}
    </span>
  );
}

/**
 * HARDENING: Indicador de proceso en curso
 *
 * Muestra feedback visual durante operaciones largas
 */
export function ProcessingIndicator({
  message = 'Procesando...',
  size = 'md',
}: {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const spinnerSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]} text-gray-500`}>
      <div className={`${spinnerSizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-600`} />
      <span>{message}</span>
    </div>
  );
}
