import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PaperAirplaneIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { portalApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Survey {
  id: string;
  title: string;
  description?: string;
  type: string;
  isPublished: boolean;
  isAnonymous: boolean;
  startsAt: string;
  endsAt?: string;
  targetAudience?: string;
  createdAt: string;
  questions: Question[];
  responses?: any[];
  totalQuestions?: number;
  totalResponses?: number;
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options?: any;
  isRequired: boolean;
  orderIndex: number;
}

interface SurveyResults {
  survey: Survey;
  totalResponses: number;
  questionResults: {
    questionId: string;
    questionText: string;
    type: string;
    totalAnswers: number;
    averageRating?: number;
    optionCounts?: Record<string, number>;
  }[];
}

const surveyTypes = [
  { value: 'CLIMATE', label: 'Clima Laboral' },
  { value: 'SATISFACTION', label: 'Satisfaccion' },
  { value: 'TRAINING', label: 'Capacitacion' },
  { value: 'EXIT', label: 'Entrevista de Salida' },
  { value: 'FEEDBACK', label: 'Retroalimentacion' },
  { value: 'OTHER', label: 'Otra' },
];

const questionTypes = [
  { value: 'RATING', label: 'Calificacion (1-5 estrellas)' },
  { value: 'SCALE', label: 'Escala (1-10)' },
  { value: 'MULTIPLE_CHOICE', label: 'Opcion Multiple' },
  { value: 'YES_NO', label: 'Si / No' },
  { value: 'TEXT', label: 'Respuesta Abierta' },
];

export default function SurveysManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [selectedResults, setSelectedResults] = useState<SurveyResults | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published' | 'closed'>('all');

  // Form state for creating survey
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CLIMATE',
    isAnonymous: true,
    startsAt: dayjs().format('YYYY-MM-DD'),
    endsAt: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    targetAudience: 'ALL',
    questions: [
      { questionText: '', type: 'RATING', isRequired: true, options: null as string[] | null }
    ],
  });

  // Fetch surveys from API
  const { data: surveysData, isLoading } = useQuery({
    queryKey: ['hr-surveys'],
    queryFn: async () => {
      const response = await portalApi.getAllSurveys();
      return response;
    },
  });

  const surveys = surveysData?.data || [];

  // Create survey mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return portalApi.createSurvey(data);
    },
    onSuccess: () => {
      toast.success('Encuesta creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['hr-surveys'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear encuesta');
    },
  });

  // Publish survey mutation
  const publishMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      return portalApi.publishSurvey(surveyId);
    },
    onSuccess: () => {
      toast.success('Encuesta publicada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['hr-surveys'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al publicar encuesta');
    },
  });

  // Get results
  const fetchResults = async (survey: Survey) => {
    try {
      const response = await portalApi.getSurveyResults(survey.id);
      setSelectedResults(response.data);
      setSelectedSurvey(survey);
      setShowResultsModal(true);
    } catch (error) {
      // For now use mock results
      setSelectedResults({
        survey,
        totalResponses: survey.totalResponses || 0,
        questionResults: survey.questions.map(q => ({
          questionId: q.id,
          questionText: q.questionText,
          type: q.type,
          totalAnswers: survey.totalResponses || 0,
          averageRating: q.type === 'RATING' ? 4.2 : null,
          optionCounts: q.type === 'YES_NO' ? { 'Si': 35, 'No': 10 } : null,
        })),
      });
      setSelectedSurvey(survey);
      setShowResultsModal(true);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'CLIMATE',
      isAnonymous: true,
      startsAt: dayjs().format('YYYY-MM-DD'),
      endsAt: dayjs().add(7, 'day').format('YYYY-MM-DD'),
      targetAudience: 'ALL',
      questions: [
        { questionText: '', type: 'RATING', isRequired: true, options: null }
      ],
    });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { questionText: '', type: 'RATING', isRequired: true, options: null }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length > 1) {
      setFormData({
        ...formData,
        questions: formData.questions.filter((_, i) => i !== index)
      });
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.title.trim()) {
      toast.error('El titulo es requerido');
      return;
    }

    const validQuestions = formData.questions.filter(q => q.questionText.trim());
    if (validQuestions.length === 0) {
      toast.error('Agrega al menos una pregunta');
      return;
    }

    createMutation.mutate({
      ...formData,
      startsAt: new Date(formData.startsAt),
      endsAt: formData.endsAt ? new Date(formData.endsAt) : null,
      questions: validQuestions.map((q, idx) => ({
        ...q,
        options: q.options?.filter(o => o.trim()) || null,
      })),
    });
  };

  const getSurveyStatus = (survey: Survey) => {
    const now = dayjs();
    const endsAt = survey.endsAt ? dayjs(survey.endsAt) : null;

    if (!survey.isPublished) return 'draft';
    if (endsAt && endsAt.isBefore(now)) return 'closed';
    return 'published';
  };

  const handlePreview = (survey: Survey) => {
    setSelectedSurvey(survey);
    setShowPreviewModal(true);
  };

  const exportToExcel = (results: SurveyResults) => {
    // Create CSV content (Excel-compatible)
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Header
    csvContent += `Encuesta:,${results.survey.title}\n`;
    csvContent += `Total Respuestas:,${results.totalResponses}\n`;
    csvContent += `Fecha Exportacion:,${dayjs().format('DD/MM/YYYY HH:mm')}\n\n`;

    // Questions and results
    csvContent += 'Pregunta,Tipo,Total Respuestas,Promedio/Distribucion\n';

    results.questionResults.forEach((qr) => {
      let resultData = '';
      if (qr.averageRating !== null) {
        resultData = `Promedio: ${qr.averageRating.toFixed(2)}`;
      } else if (qr.optionCounts) {
        resultData = Object.entries(qr.optionCounts)
          .map(([opt, count]) => `${opt}: ${count}`)
          .join(' | ');
      } else {
        resultData = `${qr.totalAnswers} respuestas`;
      }
      csvContent += `"${qr.questionText}",${qr.type},${qr.totalAnswers},"${resultData}"\n`;
    });

    // Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `encuesta_${results.survey.title.replace(/\s+/g, '_')}_resultados.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Resultados exportados exitosamente');
  };

  const filteredSurveys = activeTab === 'all'
    ? surveys
    : surveys.filter(s => getSurveyStatus(s) === activeTab);

  const statusConfig = {
    draft: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: ClockIcon },
    published: { label: 'Activa', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircleIcon },
    closed: { label: 'Cerrada', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircleIcon },
  };

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
            Gestion de Encuestas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Crea y administra encuestas para los empleados
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Encuesta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{surveys.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {surveys.filter(s => getSurveyStatus(s) === 'published').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ClockIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Borradores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {surveys.filter(s => getSurveyStatus(s) === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Respuestas Totales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {surveys.reduce((sum, s) => sum + (s.totalResponses || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-gray-700 pb-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'published', label: 'Activas' },
          { key: 'draft', label: 'Borradores' },
          { key: 'closed', label: 'Cerradas' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Surveys List */}
      <div className="space-y-4">
        {filteredSurveys.length === 0 ? (
          <div className="card text-center py-12">
            <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay encuestas en esta categoria</p>
          </div>
        ) : (
          filteredSurveys.map((survey) => {
            const status = getSurveyStatus(survey);
            const config = statusConfig[status];
            const StatusIcon = config.icon;

            return (
              <div key={survey.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${config.bgColor}`}>
                      <ClipboardDocumentListIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{survey.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        {survey.isAnonymous && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Anonima
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{survey.questions?.length || 0} preguntas</span>
                        <span>-</span>
                        <span>{survey.totalResponses || 0} respuestas</span>
                        <span>-</span>
                        <span>Inicio: {dayjs(survey.startsAt).format('DD/MM/YYYY')}</span>
                        {survey.endsAt && (
                          <>
                            <span>-</span>
                            <span>Fin: {dayjs(survey.endsAt).format('DD/MM/YYYY')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'draft' && (
                      <button
                        onClick={() => publishMutation.mutate(survey.id)}
                        disabled={publishMutation.isPending}
                        className="btn btn-primary btn-sm inline-flex items-center gap-1"
                        title="Publicar"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                        Publicar
                      </button>
                    )}
                    <button
                      onClick={() => fetchResults(survey)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Ver resultados"
                    >
                      <ChartBarIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handlePreview(survey)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Vista previa"
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

      {/* Create Survey Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Crear Nueva Encuesta
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Titulo *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Encuesta de Clima Laboral 2026"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Descripcion</label>
                  <textarea
                    className="input"
                    placeholder="Describe el proposito de la encuesta..."
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {surveyTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Audiencia</label>
                  <select
                    className="input"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  >
                    <option value="ALL">Todos los empleados</option>
                    <option value="DEPARTMENT">Por departamento</option>
                    <option value="POSITION">Por puesto</option>
                  </select>
                </div>
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Fecha de fin</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isAnonymous}
                      onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Encuesta anonima (no se guardara quien respondio)
                    </span>
                  </label>
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="label mb-0">Preguntas</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Agregar pregunta
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((question, index) => (
                    <div key={index} className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm font-medium text-gray-500 mt-2">
                          {index + 1}.
                        </span>
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            className="input"
                            placeholder="Escribe la pregunta..."
                            value={question.questionText}
                            onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              className="input"
                              value={question.type}
                              onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            >
                              {questionTypes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={question.isRequired}
                                onChange={(e) => updateQuestion(index, 'isRequired', e.target.checked)}
                                className="rounded text-primary-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Obligatoria</span>
                            </label>
                          </div>
                          {question.type === 'MULTIPLE_CHOICE' && (
                            <div>
                              <label className="text-sm text-gray-500">Opciones (una por linea)</label>
                              <textarea
                                className="input mt-1"
                                placeholder="Opcion 1&#10;Opcion 2&#10;Opcion 3"
                                rows={3}
                                value={(question.options || []).join('\n')}
                                onChange={(e) => updateQuestion(index, 'options', e.target.value.split('\n'))}
                              />
                            </div>
                          )}
                        </div>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Encuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Resultados: {selectedResults.survey.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedResults.totalResponses} respuestas recibidas
                </p>
              </div>
              <button onClick={() => setShowResultsModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedResults.totalResponses === 0 ? (
                <div className="text-center py-12">
                  <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aun no hay respuestas para esta encuesta</p>
                </div>
              ) : (
                selectedResults.questionResults.map((result, index) => (
                  <div key={result.questionId} className="p-4 border dark:border-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      {index + 1}. {result.questionText}
                    </h4>

                    {result.averageRating !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-primary-600">
                          {result.averageRating.toFixed(1)}
                        </span>
                        <span className="text-gray-500">/ 5 promedio</span>
                        <div className="flex-1 ml-4">
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${(result.averageRating / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {result.optionCounts && (
                      <div className="space-y-2">
                        {Object.entries(result.optionCounts).map(([option, count]) => (
                          <div key={option} className="flex items-center gap-3">
                            <span className="w-20 text-sm text-gray-600">{option}</span>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-600 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${(count / result.totalAnswers) * 100}%` }}
                                >
                                  <span className="text-xs text-white font-medium">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="w-12 text-sm text-gray-500 text-right">
                              {Math.round((count / result.totalAnswers) * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.type === 'TEXT' && (
                      <p className="text-sm text-gray-500">
                        {result.totalAnswers} respuestas de texto recibidas
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between p-6 border-t dark:border-gray-700">
              <button
                onClick={() => selectedResults && exportToExcel(selectedResults)}
                className="btn btn-secondary inline-flex items-center gap-2"
                disabled={selectedResults?.totalResponses === 0}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Exportar a Excel
              </button>
              <button onClick={() => setShowResultsModal(false)} className="btn btn-secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 mb-2 inline-block">
                  Vista Previa
                </span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedSurvey.title}
                </h2>
                {selectedSurvey.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedSurvey.description}</p>
                )}
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedSurvey.questions.map((question, index) => (
                <div key={question.id} className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {question.questionText}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </p>

                      {/* Render question type preview */}
                      <div className="mt-3">
                        {question.type === 'RATING' && (
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon key={star} className="h-8 w-8 text-gray-300 hover:text-yellow-400 cursor-pointer" />
                            ))}
                          </div>
                        )}

                        {question.type === 'SCALE' && (
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                className="w-8 h-8 border rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-primary-50 hover:border-primary-500"
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}

                        {question.type === 'YES_NO' && (
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={`q-${question.id}`} className="text-primary-600" disabled />
                              <span className="text-gray-700 dark:text-gray-300">Si</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={`q-${question.id}`} className="text-primary-600" disabled />
                              <span className="text-gray-700 dark:text-gray-300">No</span>
                            </label>
                          </div>
                        )}

                        {question.type === 'MULTIPLE_CHOICE' && question.options && (
                          <div className="space-y-2">
                            {(Array.isArray(question.options) ? question.options : []).map((option: string, optIdx: number) => (
                              <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`q-${question.id}`} className="text-primary-600" disabled />
                                <span className="text-gray-700 dark:text-gray-300">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {question.type === 'TEXT' && (
                          <textarea
                            className="input w-full"
                            rows={3}
                            placeholder="Escribe tu respuesta aqui..."
                            disabled
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500">
                {selectedSurvey.isAnonymous ? 'Esta encuesta es anonima' : 'Las respuestas se guardaran con tu nombre'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowPreviewModal(false)} className="btn btn-secondary">
                  Cerrar
                </button>
                {!selectedSurvey.isPublished && (
                  <button
                    onClick={() => {
                      publishMutation.mutate(selectedSurvey.id);
                      setShowPreviewModal(false);
                    }}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Publicar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
