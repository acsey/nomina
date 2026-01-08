import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { portalApi, employeesApi, api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Document {
  id: string;
  employeeId: string;
  name: string;
  type: string;
  path: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  expiresAt?: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validationNotes?: string;
  validatedAt?: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    department?: { name: string };
  };
}

const documentTypeLabels: Record<string, string> = {
  ACTA_NACIMIENTO: 'Acta de Nacimiento',
  CURP: 'CURP',
  INE: 'INE/IFE',
  COMPROBANTE_DOMICILIO: 'Comprobante de Domicilio',
  RFC: 'RFC con Homoclave',
  NSS: 'Numero de Seguro Social',
  CUENTA_BANCARIA: 'Comprobante de Cuenta Bancaria',
  CONTRATO: 'Contrato Laboral',
  CONSTANCIA_ESTUDIOS: 'Constancia de Estudios',
  CERTIFICADO_MEDICO: 'Certificado Medico',
  OTHER: 'Otro Documento',
};

const statusConfig = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ClockIcon },
  APPROVED: { label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  REJECTED: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircleIcon },
};

export default function DocumentsManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

  // Fetch all documents for the company
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['hr-documents'],
    queryFn: async () => {
      // This would need a new backend endpoint to get all documents for a company
      const response = await api.get('/portal/documents/company');
      return response.data as Document[];
    },
  });

  const documents = documentsData || [];

  // Validate document mutation
  const validateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'APPROVED' | 'REJECTED'; notes?: string }) => {
      return portalApi.validateDocument(id, { status, notes });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'APPROVED' ? 'Documento aprobado' : 'Documento rechazado'
      );
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] });
      setShowValidateModal(false);
      setSelectedDocument(null);
      setValidationNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al validar documento');
    },
  });

  const handleValidate = (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedDocument) return;
    validateMutation.mutate({
      id: selectedDocument.id,
      status,
      notes: validationNotes || undefined,
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await portalApi.downloadDocument(doc.path);
      const blob = new Blob([response.data], { type: doc.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar el documento');
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee?.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || doc.validationStatus === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const pendingCount = documents.filter(d => d.validationStatus === 'PENDING').length;
  const approvedCount = documents.filter(d => d.validationStatus === 'APPROVED').length;
  const rejectedCount = documents.filter(d => d.validationStatus === 'REJECTED').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion de Documentos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Revisa y valida los documentos de los empleados
          </p>
        </div>
      </div>

      {/* Alert for pending documents */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {pendingCount} documento(s) pendiente(s) de validacion
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Por favor revisa los documentos pendientes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="card cursor-pointer hover:ring-2 hover:ring-yellow-400" onClick={() => setStatusFilter('PENDING')}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="card cursor-pointer hover:ring-2 hover:ring-green-400" onClick={() => setStatusFilter('APPROVED')}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aprobados</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="card cursor-pointer hover:ring-2 hover:ring-red-400" onClick={() => setStatusFilter('REJECTED')}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rechazados</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, empleado o numero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input w-40"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-52"
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Empleado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Documento</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    No hay documentos que mostrar
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const StatusIcon = statusConfig[doc.validationStatus].icon;
                  return (
                    <tr key={doc.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {doc.employee?.firstName} {doc.employee?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.employee?.employeeNumber || 'Sin numero'}
                              {doc.employee?.department && ` - ${doc.employee.department.name}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                        {doc.description && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{doc.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {documentTypeLabels[doc.type] || doc.type}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {dayjs(doc.createdAt).format('DD/MM/YYYY')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[doc.validationStatus].bgColor} ${statusConfig[doc.validationStatus].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[doc.validationStatus].label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowPreviewModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Ver documento"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Descargar"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          {doc.validationStatus === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowValidateModal(true);
                              }}
                              className="px-3 py-1 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg"
                            >
                              Validar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedDocument.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedDocument.employee?.firstName} {selectedDocument.employee?.lastName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Descargar
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
              {selectedDocument.mimeType?.startsWith('image/') ? (
                <img
                  src={selectedDocument.path}
                  alt={selectedDocument.name}
                  className="max-w-full mx-auto rounded-lg shadow-lg"
                />
              ) : selectedDocument.mimeType === 'application/pdf' ? (
                <iframe
                  src={selectedDocument.path}
                  className="w-full h-[70vh] rounded-lg"
                  title={selectedDocument.name}
                />
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Vista previa no disponible</p>
                  <button
                    onClick={() => handleDownload(selectedDocument)}
                    className="mt-4 btn btn-primary"
                  >
                    Descargar para ver
                  </button>
                </div>
              )}
            </div>
            {selectedDocument.validationStatus === 'PENDING' && (
              <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setShowValidateModal(true);
                  }}
                  className="btn btn-primary"
                >
                  Validar Documento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validate Modal */}
      {showValidateModal && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Validar Documento
            </h2>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white">{selectedDocument.name}</p>
              <p className="text-sm text-gray-500">
                {selectedDocument.employee?.firstName} {selectedDocument.employee?.lastName}
              </p>
              <p className="text-sm text-gray-500">
                Tipo: {documentTypeLabels[selectedDocument.type] || selectedDocument.type}
              </p>
            </div>
            <div className="mb-4">
              <label className="label">Notas (opcional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Agrega comentarios sobre la validacion..."
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setSelectedDocument(null);
                  setValidationNotes('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleValidate('REJECTED')}
                disabled={validateMutation.isPending}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
              >
                <XCircleIcon className="h-5 w-5 mr-1" />
                Rechazar
              </button>
              <button
                onClick={() => handleValidate('APPROVED')}
                disabled={validateMutation.isPending}
                className="flex-1 btn btn-primary"
              >
                <CheckCircleIcon className="h-5 w-5 mr-1" />
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
