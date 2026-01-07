import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { bulkUploadApi, catalogsApi } from '../services/api';
import toast from 'react-hot-toast';

interface UploadResult {
  success: number;
  errors: Array<{ row: number; field: string; message: string }>;
  total: number;
}

type UploadType = 'employees' | 'companies' | 'departments' | 'benefits' | 'job-positions';

const uploadTypeLabels: Record<UploadType, { label: string; description: string }> = {
  employees: {
    label: 'Empleados',
    description: 'Carga masiva de empleados con datos personales, laborales y bancarios',
  },
  companies: {
    label: 'Empresas',
    description: 'Carga de empresas con RFC y registro patronal',
  },
  departments: {
    label: 'Departamentos',
    description: 'Departamentos organizacionales asociados a empresas',
  },
  benefits: {
    label: 'Prestaciones',
    description: 'Beneficios y prestaciones laborales',
  },
  'job-positions': {
    label: 'Puestos',
    description: 'Catalogo de puestos de trabajo con rangos salariales',
  },
};

export default function BulkUploadPage() {
  const [selectedType, setSelectedType] = useState<UploadType>('employees');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get companies for employees upload
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => catalogsApi.getCompanies(),
  });
  const companies = companiesData?.data || [];
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Set default company when loaded
  if (companies.length > 0 && !selectedCompanyId) {
    setSelectedCompanyId(companies[0].id);
  }

  const downloadTemplate = async (type: UploadType) => {
    try {
      let response;
      let filename;

      switch (type) {
        case 'employees':
          response = await bulkUploadApi.downloadEmployeesTemplate();
          filename = 'plantilla_empleados.xlsx';
          break;
        case 'companies':
          response = await bulkUploadApi.downloadCompaniesTemplate();
          filename = 'plantilla_empresas.xlsx';
          break;
        case 'departments':
          response = await bulkUploadApi.downloadDepartmentsTemplate();
          filename = 'plantilla_departamentos.xlsx';
          break;
        case 'benefits':
          response = await bulkUploadApi.downloadBenefitsTemplate();
          filename = 'plantilla_prestaciones.xlsx';
          break;
        case 'job-positions':
          response = await bulkUploadApi.downloadJobPositionsTemplate();
          filename = 'plantilla_puestos.xlsx';
          break;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Plantilla descargada correctamente');
    } catch {
      toast.error('Error al descargar la plantilla');
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: UploadType; file: File }) => {
      switch (type) {
        case 'employees':
          return bulkUploadApi.importEmployees(selectedCompanyId, file);
        case 'companies':
          return bulkUploadApi.importCompanies(file);
        case 'departments':
          return bulkUploadApi.importDepartments(file);
        case 'benefits':
          return bulkUploadApi.importBenefits(file);
        case 'job-positions':
          return bulkUploadApi.importJobPositions(file);
      }
    },
    onSuccess: (response) => {
      const result = response.data as UploadResult;
      setUploadResult(result);
      if (result.success > 0 && result.errors.length === 0) {
        toast.success(`${result.success} registros importados correctamente`);
      } else if (result.success > 0 && result.errors.length > 0) {
        toast.success(`${result.success} registros importados, ${result.errors.length} errores`);
      } else {
        toast.error('No se pudo importar ningun registro');
      }
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al importar el archivo');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        toast.error('Solo se permiten archivos Excel (.xlsx)');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }
    if (selectedType === 'employees' && !selectedCompanyId) {
      toast.error('Selecciona una empresa para cargar empleados');
      return;
    }
    uploadMutation.mutate({ type: selectedType, file: selectedFile });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carga Masiva</h1>
        <p className="text-gray-600 mt-1">
          Importa datos masivamente usando plantillas de Excel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Upload type selection */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Tipo de Carga</h2>
            <div className="space-y-2">
              {(Object.keys(uploadTypeLabels) as UploadType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setUploadResult(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedType === type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{uploadTypeLabels[type].label}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {uploadTypeLabels[type].description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Upload area */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                Cargar {uploadTypeLabels[selectedType].label}
              </h2>
              <button
                onClick={() => downloadTemplate(selectedType)}
                className="btn btn-secondary"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Descargar Plantilla
              </button>
            </div>

            {/* Company selector for employees */}
            {selectedType === 'employees' && (
              <div className="mb-6">
                <label className="label">Empresa *</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="input"
                >
                  <option value="">Seleccionar empresa...</option>
                  {companies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.rfc})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File upload area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
              <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Arrastra y suelta tu archivo Excel aqui, o haz clic para seleccionar
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-secondary cursor-pointer">
                Seleccionar Archivo
              </label>
              {selectedFile && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg inline-flex items-center gap-2">
                  <DocumentArrowDownIcon className="h-5 w-5 text-primary-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-sm text-gray-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="btn btn-primary"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    Importar Datos
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results panel */}
          {uploadResult && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold mb-4">Resultado de la Importacion</h3>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{uploadResult.total}</div>
                  <div className="text-sm text-gray-500">Total Procesados</div>
                </div>
                <div className="bg-green-100 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                  <div className="text-sm text-green-700">Exitosos</div>
                </div>
                <div className="bg-red-100 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{uploadResult.errors.length}</div>
                  <div className="text-sm text-red-700">Errores</div>
                </div>
              </div>

              {/* Status message */}
              {uploadResult.errors.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6" />
                  <span className="font-medium">Todos los registros fueron importados correctamente</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6" />
                    <span className="font-medium">
                      Se encontraron {uploadResult.errors.length} errores durante la importacion
                    </span>
                  </div>

                  {/* Error list */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Campo</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {uploadResult.errors.map((error, index) => (
                          <tr key={index}>
                            <td className="font-medium">{error.row}</td>
                            <td className="text-gray-600">{error.field}</td>
                            <td className="text-red-600">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="card mt-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Instrucciones</h3>
            <ul className="list-disc list-inside space-y-2 text-blue-800">
              <li>Descarga la plantilla correspondiente al tipo de datos que deseas cargar</li>
              <li>Los campos marcados con * en el encabezado son obligatorios</li>
              <li>No modifiques los encabezados de las columnas</li>
              <li>La fila de ejemplo debe ser eliminada antes de la carga</li>
              <li>Las fechas deben estar en formato YYYY-MM-DD (ejemplo: 2024-01-15)</li>
              <li>Los valores de tipo enumeracion deben coincidir exactamente con los permitidos</li>
              {selectedType === 'employees' && (
                <>
                  <li>Los departamentos y puestos deben existir previamente en el sistema</li>
                  <li>El codigo de banco debe coincidir con los bancos registrados</li>
                </>
              )}
              {selectedType === 'departments' && (
                <li>La empresa (por RFC) debe existir previamente en el sistema</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
