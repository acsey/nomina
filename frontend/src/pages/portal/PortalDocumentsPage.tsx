import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { portalApi, employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Document {
  id: string;
  name: string;
  type: string;
  path: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  expiresAt?: string;
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validationNotes?: string;
  createdAt: string;
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

const documentTypes = [
  { value: 'ACTA_NACIMIENTO', label: 'Acta de Nacimiento', category: 'personal' },
  { value: 'CURP', label: 'CURP', category: 'personal' },
  { value: 'INE', label: 'INE/IFE', category: 'personal' },
  { value: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de Domicilio', category: 'personal' },
  { value: 'RFC', label: 'RFC con Homoclave', category: 'personal' },
  { value: 'NSS', label: 'Numero de Seguro Social (NSS)', category: 'personal' },
  { value: 'CUENTA_BANCARIA', label: 'Comprobante de Cuenta Bancaria', category: 'personal' },
  { value: 'CONTRATO', label: 'Contrato Laboral', category: 'contract' },
  { value: 'CONSTANCIA_ESTUDIOS', label: 'Constancia de Estudios', category: 'hr_request' },
  { value: 'CERTIFICADO_MEDICO', label: 'Certificado Medico', category: 'hr_request' },
  { value: 'OTHER', label: 'Otro Documento', category: 'other' },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircleIcon }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ClockIcon },
  APPROVED: { label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  REJECTED: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircleIcon },
};

const categoryLabels: Record<string, string> = {
  personal: 'Documentos Personales',
  contract: 'Contratos',
  hr_request: 'Solicitados por RH',
  other: 'Otros',
};

const requiredDocuments = [
  'ACTA_NACIMIENTO',
  'CURP',
  'INE',
  'COMPROBANTE_DOMICILIO',
  'RFC',
  'NSS',
  'CUENTA_BANCARIA',
];

export default function PortalDocumentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [uploadData, setUploadData] = useState({
    name: '',
    type: 'OTHER',
    description: '',
    expiresAt: '',
    file: null as File | null,
  });

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

  // Get documents
  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['my-documents', employeeId],
    queryFn: async () => {
      const response = await portalApi.getMyDocuments(employeeId!);
      return response.data as Document[];
    },
    enabled: !!employeeId,
  });

  const documents = documentsData || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadData.file || !employeeId) throw new Error('Datos incompletos');
      return portalApi.uploadDocument(employeeId, uploadData.file, {
        type: uploadData.type,
        name: uploadData.name || uploadData.file.name,
        description: uploadData.description || undefined,
        expiresAt: uploadData.expiresAt || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('documents.uploadSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-documents', employeeId] });
      setShowUploadModal(false);
      setUploadData({ name: '', type: 'OTHER', description: '', expiresAt: '', file: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('documents.uploadError'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!employeeId) throw new Error('No employee ID');
      return portalApi.deleteDocument(employeeId, documentId);
    },
    onSuccess: () => {
      toast.success(t('documents.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['my-documents', employeeId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('documents.deleteError'));
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file) {
      toast.error(t('documents.selectFile'));
      return;
    }
    uploadMutation.mutate();
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
      toast.success(t('documents.downloading', { name: doc.name }));
    } catch (error) {
      toast.error(t('documents.downloadError'));
    }
  };

  const handlePreview = async (doc: Document) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
  };

  // Filter and categorize documents
  const getDocumentCategory = (type: string) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.category || 'other';
  };

  const filteredDocuments = selectedCategory === 'all'
    ? documents
    : documents.filter(doc => getDocumentCategory(doc.type) === selectedCategory);

  const documentsByCategory = documents.reduce((acc, doc) => {
    const category = getDocumentCategory(doc.type);
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Calculate completion stats
  const uploadedRequired = requiredDocuments.filter(reqType =>
    documents.some(doc => doc.type === reqType && doc.validationStatus === 'APPROVED')
  ).length;
  const completionPercent = Math.round((uploadedRequired / requiredDocuments.length) * 100);

  const isLoading = isLoadingEmployee || isLoadingDocuments;

  if (isLoading) {
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('documents.noEmployee')}</h2>
        <p className="text-gray-500">{t('documents.noEmployeeDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('documents.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('documents.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          {t('documents.upload')}
        </button>
      </div>

      {/* Progress Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('documents.digitalFile')}
          </h2>
          <span className={`text-lg font-bold ${completionPercent === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
            {completionPercent}% {t('documents.complete')}
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
            <p className="text-gray-500">{t('documents.total')}</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{documents.filter(d => d.validationStatus === 'APPROVED').length}</p>
            <p className="text-gray-500">{t('documents.approved')}</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{documents.filter(d => d.validationStatus === 'PENDING').length}</p>
            <p className="text-gray-500">{t('documents.pending')}</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{documents.filter(d => d.validationStatus === 'REJECTED').length}</p>
            <p className="text-gray-500">{t('documents.rejected')}</p>
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
          {t('documents.all')} ({documents.length})
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
            <p className="text-gray-500">{t('documents.noDocuments')}</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const StatusIcon = statusConfig[doc.validationStatus].icon;
            return (
              <div
                key={doc.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{doc.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{documentTypeLabels[doc.type] || doc.type}</span>
                        <span>-</span>
                        <span>{t('documents.uploaded')}: {dayjs(doc.createdAt).format('DD/MM/YYYY')}</span>
                        {doc.expiresAt && (
                          <>
                            <span>-</span>
                            <span>{t('documents.validUntil')}: {dayjs(doc.expiresAt).format('DD/MM/YYYY')}</span>
                          </>
                        )}
                      </div>
                      {doc.validationNotes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {doc.validationNotes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[doc.validationStatus].bgColor} ${statusConfig[doc.validationStatus].color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {statusConfig[doc.validationStatus].label}
                    </span>
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('documents.view')}
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('documents.download')}
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
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
          {t('documents.requiredDocuments')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredDocuments.map((reqType) => {
            const uploaded = documents.find(d => d.type === reqType && d.validationStatus === 'APPROVED');
            const pending = documents.find(d => d.type === reqType && d.validationStatus === 'PENDING');
            return (
              <div
                key={reqType}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  uploaded
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : pending
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                {uploaded ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : pending ? (
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className={
                  uploaded
                    ? 'text-green-700 dark:text-green-400'
                    : pending
                    ? 'text-yellow-700 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-300'
                }>
                  {documentTypeLabels[reqType]}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('documents.uploadDocument')}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="label">{t('documents.documentType')}</label>
                <select
                  className="input"
                  value={uploadData.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const label = documentTypes.find(dt => dt.value === type)?.label || '';
                    setUploadData({ ...uploadData, type, name: label });
                  }}
                >
                  {documentTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('documents.documentName')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('documents.namePlaceholder')}
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('documents.validUntilOptional')}</label>
                <input
                  type="date"
                  className="input"
                  value={uploadData.expiresAt}
                  onChange={(e) => setUploadData({ ...uploadData, expiresAt: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('documents.file')} (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="input"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                />
                {uploadData.file && (
                  <p className="text-sm text-green-600 mt-1">
                    {uploadData.file.name} ({(uploadData.file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || !uploadData.file}
                  className="flex-1 btn btn-primary"
                >
                  {uploadMutation.isPending ? t('documents.uploading') : t('documents.upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewDocument.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDocument)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  {t('documents.download')}
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
              {previewDocument.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDocument.path}
                  alt={previewDocument.name}
                  className="max-w-full mx-auto rounded-lg shadow-lg"
                />
              ) : previewDocument.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDocument.path}
                  className="w-full h-[70vh] rounded-lg"
                  title={previewDocument.name}
                />
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('documents.previewNotAvailable')}</p>
                  <button
                    onClick={() => handleDownload(previewDocument)}
                    className="mt-4 btn btn-primary"
                  >
                    {t('documents.downloadToView')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
