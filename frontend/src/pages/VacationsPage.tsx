import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { vacationsApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const typeLabels: Record<string, string> = {
  VACATION: 'Vacaciones',
  SICK_LEAVE: 'Incapacidad',
  MATERNITY: 'Maternidad',
  PATERNITY: 'Paternidad',
  BEREAVEMENT: 'Duelo',
  PERSONAL: 'Personal',
  UNPAID: 'Sin goce de sueldo',
  OTHER: 'Otro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprobada', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
};

export default function VacationsPage() {
  const queryClient = useQueryClient();

  // TODO: Obtener companyId del contexto
  const companyId = 'demo-company-id';

  const { data, isLoading } = useQuery({
    queryKey: ['pending-vacations', companyId],
    queryFn: () => vacationsApi.getPendingRequests(companyId),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => vacationsApi.approveRequest(id),
    onSuccess: () => {
      toast.success('Solicitud aprobada');
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      vacationsApi.rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('Solicitud rechazada');
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
    },
  });

  const handleReject = (id: string) => {
    const reason = prompt('Ingrese el motivo del rechazo:');
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const requests = data?.data || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Vacaciones y Permisos
        </h1>
        <p className="text-gray-500 mt-1">
          Gestiona las solicitudes de vacaciones y permisos de los empleados
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No hay solicitudes pendientes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: any) => (
            <div key={request.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {request.employee.firstName} {request.employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {request.employee.employeeNumber} •{' '}
                    {request.employee.department?.name}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusLabels[request.status]?.color
                  }`}
                >
                  {statusLabels[request.status]?.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tipo</p>
                  <p className="font-medium">{typeLabels[request.type]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha inicio</p>
                  <p className="font-medium">
                    {dayjs(request.startDate).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha fin</p>
                  <p className="font-medium">
                    {dayjs(request.endDate).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total días</p>
                  <p className="font-medium">{request.totalDays}</p>
                </div>
              </div>

              {request.reason && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Motivo</p>
                  <p className="text-gray-700">{request.reason}</p>
                </div>
              )}

              {request.status === 'PENDING' && (
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveMutation.isPending}
                    className="btn btn-success"
                  >
                    <CheckIcon className="h-5 w-5 mr-1" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={rejectMutation.isPending}
                    className="btn btn-danger"
                  >
                    <XMarkIcon className="h-5 w-5 mr-1" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
