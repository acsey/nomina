import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GiftIcon,
  TicketIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Benefit {
  id: string;
  name: string;
  description: string;
  type: 'health' | 'education' | 'savings' | 'food' | 'transport' | 'other';
  value?: string;
  icon: typeof GiftIcon;
  active: boolean;
}

interface Discount {
  id: string;
  company: string;
  logo?: string;
  description: string;
  discount: string;
  category: string;
  validUntil?: string;
  code?: string;
  url?: string;
}

interface Agreement {
  id: string;
  company: string;
  logo?: string;
  description: string;
  benefits: string[];
  contact?: string;
  url?: string;
}

// Mock data - replace with real API
const mockBenefits: Benefit[] = [
  { id: '1', name: 'Seguro de Gastos Medicos Mayores', description: 'Cobertura medica para ti y tu familia', type: 'health', value: 'Plan Familiar', icon: HeartIcon, active: true },
  { id: '2', name: 'Seguro de Vida', description: 'Proteccion para tus beneficiarios', type: 'health', value: '24 meses de salario', icon: HeartIcon, active: true },
  { id: '3', name: 'Vales de Despensa', description: 'Vales mensuales para compras', type: 'food', value: '$2,500/mes', icon: TicketIcon, active: true },
  { id: '4', name: 'Fondo de Ahorro', description: 'Ahorro con aportacion de la empresa', type: 'savings', value: '13% del salario', icon: CurrencyDollarIcon, active: true },
  { id: '5', name: 'Apoyo para Estudios', description: 'Reembolso de colegiaturas', type: 'education', value: 'Hasta $5,000/mes', icon: AcademicCapIcon, active: true },
  { id: '6', name: 'Aguinaldo', description: '30 dias de salario', type: 'other', value: '30 dias', icon: GiftIcon, active: true },
  { id: '7', name: 'Prima Vacacional', description: '25% sobre vacaciones', type: 'other', value: '25%', icon: GiftIcon, active: true },
  { id: '8', name: 'Dias de Vacaciones', description: 'Dias de descanso anuales', type: 'other', value: '16 dias', icon: GiftIcon, active: true },
];

const mockDiscounts: Discount[] = [
  { id: '1', company: 'Gimnasio FitLife', description: 'Descuento en membresia mensual', discount: '30%', category: 'Salud', validUntil: '2026-12-31', url: 'https://fitlife.com' },
  { id: '2', company: 'Optica Vision', description: 'Descuento en lentes y consultas', discount: '25%', category: 'Salud', code: 'EMP2026' },
  { id: '3', company: 'Universidad TecMilenio', description: 'Descuento en colegiaturas', discount: '20%', category: 'Educacion', url: 'https://tecmilenio.mx' },
  { id: '4', company: 'Cine Cinemex', description: 'Boletos a precio especial', discount: '2x1 Miercoles', category: 'Entretenimiento', code: 'CORP2026' },
  { id: '5', company: 'Restaurante La Casa', description: 'Descuento en consumo', discount: '15%', category: 'Alimentos', validUntil: '2026-06-30' },
  { id: '6', company: 'Agencia de Viajes Mundo', description: 'Descuento en paquetes vacacionales', discount: '10%', category: 'Viajes', url: 'https://agenciamundo.com' },
];

const mockAgreements: Agreement[] = [
  {
    id: '1',
    company: 'FONACOT',
    description: 'Creditos para trabajadores',
    benefits: ['Tasa preferencial', 'Descuento via nomina', 'Aprobacion rapida'],
    url: 'https://fonacot.gob.mx'
  },
  {
    id: '2',
    company: 'INFONAVIT',
    description: 'Credito para vivienda',
    benefits: ['Puntos acumulados', 'Subcuenta de vivienda', 'Asesoria gratuita'],
    contact: 'rh@empresa.com'
  },
  {
    id: '3',
    company: 'Caja de Ahorro Empresarial',
    description: 'Ahorro y prestamos internos',
    benefits: ['Prestamos al 1% mensual', 'Ahorro con rendimientos', 'Sin buro de credito'],
    contact: 'caja.ahorro@empresa.com'
  },
];

const typeIcons: Record<string, typeof GiftIcon> = {
  health: HeartIcon,
  education: AcademicCapIcon,
  savings: CurrencyDollarIcon,
  food: TicketIcon,
  transport: MapPinIcon,
  other: GiftIcon,
};

const typeLabels: Record<string, string> = {
  health: 'Salud',
  education: 'Educacion',
  savings: 'Ahorro',
  food: 'Alimentacion',
  transport: 'Transporte',
  other: 'Otros',
};

export default function PortalBenefitsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'benefits' | 'discounts' | 'agreements'>('benefits');

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

  // Use mock data for now
  const benefits = mockBenefits;
  const discounts = mockDiscounts;
  const agreements = mockAgreements;

  // Group benefits by type
  const benefitsByType = benefits.reduce((acc, benefit) => {
    if (!acc[benefit.type]) acc[benefit.type] = [];
    acc[benefit.type].push(benefit);
    return acc;
  }, {} as Record<string, Benefit[]>);

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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay empleado vinculado</h2>
        <p className="text-gray-500">Tu cuenta no esta vinculada a un registro de empleado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Prestaciones</h1>
        <p className="text-gray-500 dark:text-gray-400">Conoce todos los beneficios que tienes como empleado</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('benefits')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'benefits'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <GiftIcon className="h-5 w-5 inline-block mr-2" />
          Prestaciones ({benefits.length})
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'discounts'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TagIcon className="h-5 w-5 inline-block mr-2" />
          Descuentos ({discounts.length})
        </button>
        <button
          onClick={() => setActiveTab('agreements')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'agreements'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BuildingStorefrontIcon className="h-5 w-5 inline-block mr-2" />
          Convenios ({agreements.length})
        </button>
      </div>

      {/* Benefits Tab */}
      {activeTab === 'benefits' && (
        <div className="space-y-6">
          {Object.entries(benefitsByType).map(([type, typeBenefits]) => {
            const TypeIcon = typeIcons[type] || GiftIcon;
            return (
              <div key={type}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TypeIcon className="h-5 w-5 text-primary-600" />
                  {typeLabels[type] || type}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeBenefits.map((benefit) => {
                    const BenefitIcon = benefit.icon;
                    return (
                      <div
                        key={benefit.id}
                        className="card hover:shadow-md transition-shadow border-l-4 border-primary-500"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <BenefitIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">{benefit.name}</h3>
                              {benefit.active && (
                                <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{benefit.description}</p>
                            {benefit.value && (
                              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-2">
                                {benefit.value}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Discounts Tab */}
      {activeTab === 'discounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((discount) => (
            <div key={discount.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{discount.company}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      {discount.discount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{discount.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                    {discount.category}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
                {discount.code && (
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <span className="text-sm text-gray-500">Codigo:</span>
                    <span className="font-mono font-bold text-primary-600">{discount.code}</span>
                  </div>
                )}
                {discount.validUntil && (
                  <p className="text-xs text-gray-500">
                    Valido hasta: {discount.validUntil}
                  </p>
                )}
                {discount.url && (
                  <a
                    href={discount.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Visitar sitio
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agreements Tab */}
      {activeTab === 'agreements' && (
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <div key={agreement.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{agreement.company}</h3>
                  <p className="text-gray-500 mt-1">{agreement.description}</p>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Beneficios:</p>
                    <ul className="space-y-1">
                      {agreement.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckBadgeIcon className="h-4 w-4 text-green-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="text-right">
                  {agreement.url && (
                    <a
                      href={agreement.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      Mas informacion
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  )}
                  {agreement.contact && (
                    <p className="text-sm text-gray-500 mt-2">
                      Contacto: <a href={`mailto:${agreement.contact}`} className="text-primary-600">{agreement.contact}</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
