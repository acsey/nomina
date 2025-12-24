import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  ComputerDesktopIcon,
  WifiIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { devicesApi, catalogsApi } from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const deviceTypes = [
  { value: 'ZKTECO', label: 'ZKTeco', description: 'Dispositivos ZKTeco (puerto 4370)' },
  { value: 'ANVIZ', label: 'Anviz', description: 'Dispositivos Anviz' },
  { value: 'SUPREMA', label: 'Suprema', description: 'Dispositivos Suprema BioStar' },
  { value: 'GENERIC_HTTP', label: 'API HTTP', description: 'Dispositivo con API REST' },
  { value: 'MANUAL', label: 'Manual', description: 'Registro manual de asistencia' },
];

const connectionModes = [
  { value: 'PULL', label: 'Pull (Servidor consulta)', description: 'El servidor obtiene datos del dispositivo' },
  { value: 'PUSH', label: 'Push (Dispositivo envia)', description: 'El dispositivo envia datos al servidor' },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  ONLINE: { bg: 'bg-green-100', text: 'text-green-800', label: 'En linea' },
  OFFLINE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Desconectado' },
  ERROR: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
  SYNCING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sincronizando' },
};

interface DeviceFormData {
  name: string;
  deviceType: string;
  connectionMode: string;
  ip: string;
  port: number;
  serialNumber: string;
  location: string;
}

export default function DevicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [selectedDeviceForLogs, setSelectedDeviceForLogs] = useState<any>(null);
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    deviceType: 'ZKTECO',
    connectionMode: 'PULL',
    ip: '',
    port: 4370,
    serialNumber: '',
    location: '',
  });
  const queryClient = useQueryClient();

  // Get company
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];
  const companyId = companies[0]?.id || '';

  // Get devices
  const { data, isLoading } = useQuery({
    queryKey: ['devices', companyId],
    queryFn: () => devicesApi.getAll(companyId),
    enabled: !!companyId,
  });
  const devices = data?.data || [];

  // Get device logs
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['device-logs', selectedDeviceForLogs?.id],
    queryFn: () => devicesApi.getLogs(selectedDeviceForLogs?.id, { limit: 50 }),
    enabled: !!selectedDeviceForLogs?.id,
  });
  const logs = logsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => devicesApi.create({ ...data, companyId }),
    onSuccess: () => {
      toast.success('Dispositivo registrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar dispositivo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => devicesApi.update(id, data),
    onSuccess: () => {
      toast.success('Dispositivo actualizado');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar dispositivo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => devicesApi.delete(id),
    onSuccess: () => {
      toast.success('Dispositivo eliminado');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar dispositivo');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => devicesApi.testConnection(id),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(`${response.data.message} (${response.data.latency}ms)`);
      } else {
        toast.error(response.data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al probar conexion');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => devicesApi.syncRecords(id),
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success(`${response.data.message} - ${response.data.newRecords || 0} nuevos registros`);
      } else {
        toast.error(response.data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al sincronizar');
    },
  });

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      deviceType: 'ZKTECO',
      connectionMode: 'PULL',
      ip: '',
      port: 4370,
      serialNumber: '',
      location: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (device: any) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      deviceType: device.deviceType,
      connectionMode: device.connectionMode,
      ip: device.ip || '',
      port: device.port || 4370,
      serialNumber: device.serialNumber || '',
      location: device.location || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  const openLogsModal = (device: any) => {
    setSelectedDeviceForLogs(device);
    setIsLogsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (device: any) => {
    if (window.confirm(`¿Eliminar el dispositivo "${device.name}"?`)) {
      deleteMutation.mutate(device.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) || 4370 : value,
    }));
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispositivos Biometricos</h1>
          <p className="text-gray-500 mt-1">Configura y administra los checadores de asistencia</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Dispositivo
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Integracion con Checadores</h3>
        <p className="text-sm text-blue-700">
          Conecta tus dispositivos biometricos (ZKTeco, Anviz, Suprema) para sincronizar automaticamente
          los registros de entrada y salida de los empleados. Soportamos conexion por red (TCP/IP) y
          webhooks para dispositivos con conectividad a internet.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : devices.length === 0 ? (
        <div className="card text-center py-12">
          <ComputerDesktopIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No hay dispositivos configurados</p>
          <button onClick={openCreateModal} className="btn btn-primary mt-4">
            Registrar primer dispositivo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device: any) => (
            <div key={device.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${device.status === 'ONLINE' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {device.status === 'ONLINE' ? (
                      <SignalIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <SignalSlashIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{device.name}</h3>
                    <p className="text-sm text-gray-500">
                      {deviceTypes.find((t) => t.value === device.deviceType)?.label || device.deviceType}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[device.status]?.bg} ${statusColors[device.status]?.text}`}>
                  {statusColors[device.status]?.label || device.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {device.ip && (
                  <div className="flex items-center text-gray-600">
                    <WifiIcon className="h-4 w-4 mr-2" />
                    {device.ip}:{device.port}
                  </div>
                )}
                {device.serialNumber && (
                  <div className="flex items-center text-gray-600">
                    <ComputerDesktopIcon className="h-4 w-4 mr-2" />
                    S/N: {device.serialNumber}
                  </div>
                )}
                {device.location && (
                  <div className="text-gray-500">
                    Ubicacion: {device.location}
                  </div>
                )}
                {device.lastSyncAt && (
                  <div className="flex items-center text-gray-500 text-xs">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Ultima sync: {dayjs(device.lastSyncAt).format('DD/MM/YYYY HH:mm')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <button
                  onClick={() => testConnectionMutation.mutate(device.id)}
                  disabled={testConnectionMutation.isPending}
                  className="btn btn-secondary btn-sm"
                  title="Probar conexion"
                >
                  <SignalIcon className="h-4 w-4 mr-1" />
                  Probar
                </button>
                <button
                  onClick={() => syncMutation.mutate(device.id)}
                  disabled={syncMutation.isPending || device.status === 'SYNCING'}
                  className="btn btn-secondary btn-sm"
                  title="Sincronizar registros"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sincronizar
                </button>
                <button
                  onClick={() => openLogsModal(device)}
                  className="btn btn-secondary btn-sm"
                  title="Ver logs"
                >
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Logs
                </button>
                <button
                  onClick={() => openEditModal(device)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Editar"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(device)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Eliminar"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                    </h3>
                    <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="label">Nombre del Dispositivo *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="input"
                        required
                        placeholder="Ej: Checador Entrada Principal"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Tipo de Dispositivo *</label>
                        <select
                          name="deviceType"
                          value={formData.deviceType}
                          onChange={handleChange}
                          className="input"
                          required
                        >
                          {deviceTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Modo de Conexion *</label>
                        <select
                          name="connectionMode"
                          value={formData.connectionMode}
                          onChange={handleChange}
                          className="input"
                          required
                        >
                          {connectionModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {formData.deviceType !== 'MANUAL' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Direccion IP</label>
                          <input
                            type="text"
                            name="ip"
                            value={formData.ip}
                            onChange={handleChange}
                            className="input"
                            placeholder="192.168.1.100"
                          />
                        </div>
                        <div>
                          <label className="label">Puerto</label>
                          <input
                            type="number"
                            name="port"
                            value={formData.port}
                            onChange={handleChange}
                            className="input"
                            min="1"
                            max="65535"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="label">Numero de Serie</label>
                      <input
                        type="text"
                        name="serialNumber"
                        value={formData.serialNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="Opcional"
                      />
                    </div>

                    <div>
                      <label className="label">Ubicacion</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="input"
                        placeholder="Ej: Oficina Principal, Planta Baja"
                      />
                    </div>

                    {formData.connectionMode === 'PUSH' && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          <strong>Modo Push:</strong> Configure el dispositivo para enviar datos al webhook:
                          <code className="block mt-1 bg-yellow-100 p-1 rounded text-xs">
                            POST /api/devices/webhook/attendance
                          </code>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingDevice
                        ? 'Actualizar'
                        : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogsModalOpen && selectedDeviceForLogs && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsLogsModalOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-4xl max-h-[80vh]">
              <div className="bg-white px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Logs del Dispositivo: {selectedDeviceForLogs.name}
                  </h3>
                  <button onClick={() => setIsLogsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay registros para este dispositivo
                  </div>
                ) : (
                  <div className="overflow-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Fecha/Hora</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Empleado</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Evento</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Verificacion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {logs.map((log: any) => (
                          <tr key={log.id}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {dayjs(log.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                            </td>
                            <td className="px-3 py-2">
                              {log.employee?.firstName} {log.employee?.lastName}
                              <span className="text-gray-400 text-xs ml-1">({log.employee?.employeeNumber})</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                log.eventType === 'CHECK_IN' ? 'bg-green-100 text-green-800' :
                                log.eventType === 'CHECK_OUT' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.eventType === 'CHECK_IN' ? 'Entrada' :
                                 log.eventType === 'CHECK_OUT' ? 'Salida' :
                                 log.eventType === 'BREAK_START' ? 'Inicio Comida' :
                                 log.eventType === 'BREAK_END' ? 'Fin Comida' : log.eventType}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {log.verifyMode || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={() => setIsLogsModalOpen(false)} className="btn btn-secondary">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
