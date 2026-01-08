import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Document {
  id: string;
  name: string;
  type: string;
  category: 'personal' | 'contract' | 'hr_request' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  uploadDate: string;
  validUntil?: string;
  fileUrl?: string;
  comments?: string;
}

const categoryLabels: Record<string, string> = {
  personal: 'Documentos Personales',
  contract: 'Contratos',
  hr_request: 'Solicitados por RH',
  other: 'Otros',
};

const categoryIcons: Record<string, typeof DocumentTextIcon> = {
  personal: DocumentTextIcon,
  contract: FolderIcon,
  hr_request: DocumentArrowUpIcon,
  other: FolderIcon,
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircleIcon }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ClockIcon },
  approved: { label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  rejected: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircleIcon },
};

// Mock data - replace with real API
const mockDocuments: Document[] = [
  { id: '1', name: 'Acta de Nacimiento', type: 'PDF', category: 'personal', status: 'approved', uploadDate: '2024-01-15' },
  { id: '2', name: 'CURP', type: 'PDF', category: 'personal', status: 'approved', uploadDate: '2024-01-15' },
  { id: '3', name: 'INE/IFE', type: 'PDF', category: 'personal', status: 'approved', uploadDate: '2024-01-15', validUntil: '2028-06-15' },
  { id: '4', name: 'Comprobante de Domicilio', type: 'PDF', category: 'personal', status: 'pending', uploadDate: '2025-12-01' },
  { id: '5', name: 'Contrato Laboral 2024', type: 'PDF', category: 'contract', status: 'approved', uploadDate: '2024-01-10' },
  { id: '6', name: 'Contrato Confidencialidad', type: 'PDF', category: 'contract', status: 'approved', uploadDate: '2024-01-10' },
  { id: '7', name: 'Constancia de Estudios', type: 'PDF', category: 'hr_request', status: 'pending', uploadDate: '2025-12-20', comments: 'Solicitado por RH para actualizacion de expediente' },
  { id: '8', name: 'Certificado Medico', type: 'PDF', category: 'hr_request', status: 'rejected', uploadDate: '2025-11-15', comments: 'El documento esta ilegible, favor de subir nuevamente' },
];

const requiredDocuments = [
  { name: 'Acta de Nacimiento', category: 'personal' },
  { name: 'CURP', category: 'personal' },
  { name: 'INE/IFE', category: 'personal' },
  { name: 'Comprobante de Domicilio', category: 'personal' },
  { name: 'RFC con Homoclave', category: 'personal' },
  { name: 'Numero de Seguro Social (NSS)', category: 'personal' },
  { name: 'Comprobante de Cuenta Bancaria', category: 'personal' },
];

export default function PortalDocumentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ name: '', category: 'personal', file: null as File | null });

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

  // For now, use mock data - replace with real API call
  const documents = mockDocuments;
  const isLoading = false;

  const filteredDocuments = selectedCategory === 'all'
    ? documents
    : documents.filter(doc => doc.category === selectedCategory);

  const documentsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.name) {
      toast.error('Selecciona un archivo y nombre');
      return;
    }
    // TODO: Implement actual upload
    toast.success('Documento subido exitosamente');
    setShowUploadModal(false);
    setUploadData({ name: '', category: 'personal', file: null });
  };

  const handleDownload = (doc: Document) => {
    // TODO: Implement actual download
    toast.success(`Descargando ${doc.name}...`);
  };

  // Calculate completion stats
  const uploadedRequired = requiredDocuments.filter(req =>
    documents.some(doc => doc.name === req.name && doc.status === 'approved')
  ).length;
  const completionPercent = Math.round((uploadedRequired / requiredDocuments.length) * 100);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Documentos</h1>
          <p className="text-gray-500 dark:text-gray-400">Gestiona tus documentos personales y contratos</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Subir Documento
        </button>
      </div>

      {/* Progress Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Expediente Digital
          </h2>
          <span className={`text-lg font-bold ${completionPercent === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
            {completionPercent}% Completo
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all ${completionPercent === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
            <p className="text-gray-500">Total</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{documents.filter(d => d.status === 'approved').length}</p>
            <p className="text-gray-500">Aprobados</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{documents.filter(d => d.status === 'pending').length}</p>
            <p className="text-gray-500">Pendientes</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{documents.filter(d => d.status === 'rejected').length}</p>
            <p className="text-gray-500">Rechazados</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Todos ({documents.length})
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => {
          const count = documentsByCategory[key]?.length || 0;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="card text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay documentos en esta categoria</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const StatusIcon = statusConfig[doc.status].icon;
            const CategoryIcon = categoryIcons[doc.category];
            return (
              <div
                key={doc.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <CategoryIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{categoryLabels[doc.category]}</span>
                        <span>-</span>
                        <span>Subido: {dayjs(doc.uploadDate).format('DD/MM/YYYY')}</span>
                        {doc.validUntil && (
                          <>
                            <span>-</span>
                            <span>Vigencia: {dayjs(doc.validUntil).format('DD/MM/YYYY')}</span>
                          </>
                        )}
                      </div>
                      {doc.comments && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {doc.comments}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[doc.status].bgColor} ${statusConfig[doc.status].color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {statusConfig[doc.status].label}
                    </span>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Descargar"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Ver"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Required Documents Checklist */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Documentos Requeridos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredDocuments.map((req, idx) => {
            const uploaded = documents.find(d => d.name === req.name && d.status === 'approved');
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  uploaded ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                {uploaded ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className={uploaded ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}>
                  {req.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Subir Documento
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre del documento</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Acta de Nacimiento"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select
                  className="input"
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                >
                  <option value="personal">Documento Personal</option>
                  <option value="hr_request">Solicitado por RH</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Archivo (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="input"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 btn btn-primary"
              >
                Subir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
