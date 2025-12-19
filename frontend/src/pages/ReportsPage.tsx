import { useState } from 'react';
import {
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { reportsApi, governmentApi } from '../services/api';
import toast from 'react-hot-toast';

const reportCategories = [
  {
    title: 'Reportes de Nómina',
    reports: [
      {
        id: 'payroll-summary',
        name: 'Resumen de Nómina',
        description: 'Resumen detallado de percepciones y deducciones por período',
        icon: DocumentChartBarIcon,
      },
      {
        id: 'payroll-excel',
        name: 'Nómina en Excel',
        description: 'Exportar nómina del período a formato Excel',
        icon: DocumentArrowDownIcon,
      },
      {
        id: 'payroll-pdf',
        name: 'Nómina en PDF',
        description: 'Exportar nómina del período a formato PDF',
        icon: DocumentArrowDownIcon,
      },
    ],
  },
  {
    title: 'Reportes Gubernamentales',
    reports: [
      {
        id: 'imss-report',
        name: 'Cuotas IMSS',
        description: 'Reporte de cuotas obrero-patronales del IMSS',
        icon: BuildingLibraryIcon,
      },
      {
        id: 'imss-sua',
        name: 'Archivo SUA',
        description: 'Generar archivo para Sistema Único de Autodeterminación',
        icon: DocumentArrowDownIcon,
      },
      {
        id: 'infonavit-report',
        name: 'Descuentos INFONAVIT',
        description: 'Reporte de descuentos por créditos INFONAVIT',
        icon: BuildingLibraryIcon,
      },
      {
        id: 'issste-report',
        name: 'Cuotas ISSSTE',
        description: 'Reporte de cuotas para trabajadores del ISSSTE',
        icon: BuildingLibraryIcon,
      },
    ],
  },
  {
    title: 'Reportes de Empleados',
    reports: [
      {
        id: 'employee-annual',
        name: 'Reporte Anual de Empleado',
        description: 'Historial de nómina y deducciones del año',
        icon: DocumentChartBarIcon,
      },
      {
        id: 'department-report',
        name: 'Reporte por Departamento',
        description: 'Resumen de nómina por departamento',
        icon: DocumentChartBarIcon,
      },
    ],
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleGenerateReport = async (reportId: string) => {
    setSelectedReport(reportId);
    toast.success('Generando reporte...');

    // TODO: Implementar generación de reportes con parámetros
    setTimeout(() => {
      toast.success('Reporte generado correctamente');
      setSelectedReport(null);
    }, 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Genera y descarga reportes del sistema
        </p>
      </div>

      <div className="space-y-8">
        {reportCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {category.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports.map((report) => (
                <div
                  key={report.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleGenerateReport(report.id)}
                >
                  <div className="flex items-start">
                    <div className="p-3 rounded-lg bg-primary-100">
                      <report.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {report.description}
                      </p>
                    </div>
                    {selectedReport === report.id && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
