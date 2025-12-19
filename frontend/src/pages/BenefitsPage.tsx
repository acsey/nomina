import { useQuery } from '@tanstack/react-query';
import { PlusIcon, GiftIcon } from '@heroicons/react/24/outline';
import { benefitsApi } from '../services/api';

const typeLabels: Record<string, string> = {
  FOOD_VOUCHERS: 'Vales de despensa',
  SAVINGS_FUND: 'Fondo de ahorro',
  BONUS: 'Bonos',
  LIFE_INSURANCE: 'Seguro de vida',
  MAJOR_MEDICAL: 'Gastos médicos mayores',
  PRODUCTIVITY_BONUS: 'Bono de productividad',
  ATTENDANCE_BONUS: 'Bono de asistencia',
  PUNCTUALITY_BONUS: 'Bono de puntualidad',
  TRANSPORTATION: 'Ayuda de transporte',
  OTHER: 'Otro',
};

const valueTypeLabels: Record<string, string> = {
  FIXED_AMOUNT: 'Monto fijo',
  PERCENTAGE_SALARY: '% del salario',
  DAYS_SALARY: 'Días de salario',
};

export default function BenefitsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['benefits'],
    queryFn: () => benefitsApi.getAll(),
  });

  const benefits = data?.data || [];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prestaciones</h1>
        <button className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Prestación
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : benefits.length === 0 ? (
        <div className="card text-center py-12">
          <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay prestaciones registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit: any) => (
            <div key={benefit.id} className="card">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-primary-100">
                  <GiftIcon className="h-6 w-6 text-primary-600" />
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Activo
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {benefit.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {benefit.description || 'Sin descripción'}
              </p>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-medium">{typeLabels[benefit.type]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor</span>
                  <span className="font-medium">
                    {benefit.valueType === 'FIXED_AMOUNT'
                      ? `$${Number(benefit.value || 0).toLocaleString()}`
                      : benefit.valueType === 'PERCENTAGE_SALARY'
                      ? `${benefit.value}%`
                      : `${benefit.value} días`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tipo de valor</span>
                  <span className="font-medium">
                    {valueTypeLabels[benefit.valueType]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
