import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { catalogsApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ScheduleDetail {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  isWorkDay: boolean;
}

interface WorkSchedule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  scheduleDetails: ScheduleDetail[];
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
];

const DEFAULT_SCHEDULE_DETAILS: ScheduleDetail[] = DAYS_OF_WEEK.map((_, index) => ({
  dayOfWeek: index,
  startTime: index >= 1 && index <= 5 ? '09:00' : '',
  endTime: index >= 1 && index <= 5 ? '18:00' : '',
  breakStart: index >= 1 && index <= 5 ? '14:00' : '',
  breakEnd: index >= 1 && index <= 5 ? '15:00' : '',
  isWorkDay: index >= 1 && index <= 5,
}));

export default function WorkSchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    scheduleDetails: DEFAULT_SCHEDULE_DETAILS,
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await catalogsApi.getWorkSchedules();
      setSchedules(response.data);
    } catch (error) {
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        name: schedule.name,
        description: schedule.description || '',
        isActive: schedule.isActive,
        scheduleDetails: schedule.scheduleDetails.length > 0
          ? schedule.scheduleDetails
          : DEFAULT_SCHEDULE_DETAILS,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        name: '',
        description: '',
        isActive: true,
        scheduleDetails: DEFAULT_SCHEDULE_DETAILS,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
  };

  const handleDetailChange = (
    dayIndex: number,
    field: keyof ScheduleDetail,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      scheduleDetails: prev.scheduleDetails.map((detail, index) =>
        index === dayIndex ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      if (editingSchedule) {
        await catalogsApi.updateWorkSchedule(editingSchedule.id, formData);
        toast.success('Horario actualizado');
      } else {
        await catalogsApi.createWorkSchedule(formData);
        toast.success('Horario creado');
      }
      handleCloseModal();
      loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar horario');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;

    try {
      await catalogsApi.deleteWorkSchedule(id);
      toast.success('Horario eliminado');
      loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar horario');
    }
  };

  const getWorkDaysSummary = (details: ScheduleDetail[]) => {
    const workDays = details.filter((d) => d.isWorkDay);
    if (workDays.length === 0) return 'Sin dias laborales';

    const days = workDays.map((d) => DAYS_OF_WEEK[d.dayOfWeek].substring(0, 3));
    return days.join(', ');
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    return time;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Horarios de Trabajo
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestiona los horarios laborales de los empleados
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Horario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-6 w-6 text-primary-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {schedule.name}
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenModal(schedule)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 rounded"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {schedule.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {schedule.description}
              </p>
            )}

            <div className="text-sm">
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Dias:</strong> {getWorkDaysSummary(schedule.scheduleDetails)}
              </p>
              {schedule.scheduleDetails.filter((d) => d.isWorkDay).length > 0 && (
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Horario:</strong>{' '}
                  {formatTime(
                    schedule.scheduleDetails.find((d) => d.isWorkDay)?.startTime || ''
                  )}{' '}
                  -{' '}
                  {formatTime(
                    schedule.scheduleDetails.find((d) => d.isWorkDay)?.endTime || ''
                  )}
                </p>
              )}
            </div>

            <div className="mt-3">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  schedule.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {schedule.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No hay horarios configurados
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Crear primer horario
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Ej: Horario de oficina"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripcion
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Descripcion opcional"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Horario activo
                  </span>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Dia
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Laboral
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Entrada
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Salida
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Inicio Descanso
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Fin Descanso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {formData.scheduleDetails.map((detail, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                          {DAYS_OF_WEEK[detail.dayOfWeek]}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={detail.isWorkDay}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                'isWorkDay',
                                e.target.checked
                              )
                            }
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={detail.startTime}
                            onChange={(e) =>
                              handleDetailChange(index, 'startTime', e.target.value)
                            }
                            disabled={!detail.isWorkDay}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={detail.endTime}
                            onChange={(e) =>
                              handleDetailChange(index, 'endTime', e.target.value)
                            }
                            disabled={!detail.isWorkDay}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={detail.breakStart}
                            onChange={(e) =>
                              handleDetailChange(index, 'breakStart', e.target.value)
                            }
                            disabled={!detail.isWorkDay}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="time"
                            value={detail.breakEnd}
                            onChange={(e) =>
                              handleDetailChange(index, 'breakEnd', e.target.value)
                            }
                            disabled={!detail.isWorkDay}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingSchedule ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
