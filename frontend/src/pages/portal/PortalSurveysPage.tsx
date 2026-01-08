import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'expired';
  anonymous: boolean;
  mandatory: boolean;
  estimatedTime: string;
  questions?: Question[];
  completedDate?: string;
}

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
  options?: string[];
  required: boolean;
}

// Mock data
const mockSurveys: Survey[] = [
  {
    id: '1',
    title: 'Encuesta de Clima Laboral 2026',
    description: 'Ayudanos a mejorar el ambiente de trabajo compartiendo tu opinion',
    category: 'Clima Laboral',
    dueDate: '2026-01-31',
    status: 'pending',
    anonymous: true,
    mandatory: true,
    estimatedTime: '10 min',
    questions: [
      { id: 'q1', text: 'En general, que tan satisfecho estas con tu trabajo?', type: 'rating', required: true },
      { id: 'q2', text: 'Como calificarias la comunicacion con tu supervisor?', type: 'rating', required: true },
      { id: 'q3', text: 'Te sientes valorado en tu equipo de trabajo?', type: 'yes_no', required: true },
      { id: 'q4', text: 'Que podriamos mejorar en tu area de trabajo?', type: 'text', required: false },
      { id: 'q5', text: 'Como calificarias los beneficios de la empresa?', type: 'rating', required: true },
      { id: 'q6', text: 'Recomendarias a la empresa como lugar para trabajar?', type: 'yes_no', required: true },
    ]
  },
  {
    id: '2',
    title: 'Evaluacion de Capacitacion',
    description: 'Evaluacion del curso de Seguridad de la Informacion',
    category: 'Capacitacion',
    dueDate: '2026-01-15',
    status: 'completed',
    anonymous: false,
    mandatory: false,
    estimatedTime: '5 min',
    completedDate: '2026-01-10'
  },
  {
    id: '3',
    title: 'Preferencias de Horario',
    description: 'Ayudanos a conocer tus preferencias para el nuevo esquema de horarios',
    category: 'Recursos Humanos',
    dueDate: '2026-02-15',
    status: 'pending',
    anonymous: false,
    mandatory: false,
    estimatedTime: '3 min',
    questions: [
      { id: 'q1', text: 'Cual seria tu horario preferido?', type: 'multiple_choice', options: ['7:00 - 16:00', '8:00 - 17:00', '9:00 - 18:00', '10:00 - 19:00'], required: true },
      { id: 'q2', text: 'Te gustaria un esquema hibrido (casa/oficina)?', type: 'yes_no', required: true },
      { id: 'q3', text: 'Comentarios adicionales', type: 'text', required: false },
    ]
  },
  {
    id: '4',
    title: 'Encuesta de Satisfaccion Q4 2025',
    description: 'Encuesta trimestral de satisfaccion',
    category: 'Clima Laboral',
    dueDate: '2025-12-31',
    status: 'expired',
    anonymous: true,
    mandatory: true,
    estimatedTime: '8 min',
  },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircleIcon }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: ClockIcon },
  completed: { label: 'Completada', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleIcon },
  expired: { label: 'Vencida', color: 'text-red-700', bgColor: 'bg-red-100', icon: ExclamationTriangleIcon },
};

export default function PortalSurveysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

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

  // Use mock data for now
  const surveys = mockSurveys;

  const filteredSurveys = filter === 'all'
    ? surveys
    : surveys.filter(s => s.status === filter);

  const pendingCount = surveys.filter(s => s.status === 'pending').length;
  const mandatoryPending = surveys.filter(s => s.status === 'pending' && s.mandatory).length;

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = () => {
    if (!selectedSurvey?.questions) return;

    // Check required questions
    const unanswered = selectedSurvey.questions.filter(
      q => q.required && !answers[q.id]
    );

    if (unanswered.length > 0) {
      toast.error(`Por favor responde todas las preguntas obligatorias (${unanswered.length} pendientes)`);
      return;
    }

    // TODO: Send to API
    toast.success('Encuesta enviada exitosamente');
    setSelectedSurvey(null);
    setAnswers({});
  };

  const RatingInput = ({ questionId, value }: { questionId: string; value?: number }) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleAnswer(questionId, star)}
          className="p-1 hover:scale-110 transition-transform"
        >
          {star <= (value || 0) ? (
            <StarSolidIcon className="h-8 w-8 text-yellow-400" />
          ) : (
            <StarIcon className="h-8 w-8 text-gray-300" />
          )}
        </button>
      ))}
    </div>
  );

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

  // Survey Modal
  if (selectedSurvey) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedSurvey.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{selectedSurvey.description}</p>
              </div>
              <button
                onClick={() => { setSelectedSurvey(null); setAnswers({}); }}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              {selectedSurvey.anonymous && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Anonima</span>
              )}
              {selectedSurvey.mandatory && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Obligatoria</span>
              )}
              <span className="text-gray-500">
                Tiempo estimado: {selectedSurvey.estimatedTime}
              </span>
            </div>
          </div>

          {/* Questions */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedSurvey.questions?.map((question, idx) => (
              <div key={question.id} className="space-y-3">
                <label className="block">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {idx + 1}. {question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>

                {question.type === 'rating' && (
                  <RatingInput questionId={question.id} value={answers[question.id]} />
                )}

                {question.type === 'text' && (
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Escribe tu respuesta..."
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                  />
                )}

                {question.type === 'yes_no' && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAnswer(question.id, 'yes')}
                      className={`px-6 py-2 rounded-lg border-2 transition-colors ${
                        answers[question.id] === 'yes'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Si
                    </button>
                    <button
                      onClick={() => handleAnswer(question.id, 'no')}
                      className={`px-6 py-2 rounded-lg border-2 transition-colors ${
                        answers[question.id] === 'no'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}

                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(question.id, option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                          answers[question.id] === option
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 border-t dark:border-gray-700 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {Object.keys(answers).length} de {selectedSurvey.questions?.length} preguntas respondidas
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedSurvey(null); setAnswers({}); }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button onClick={handleSubmit} className="btn btn-primary">
                Enviar Respuestas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Encuestas</h1>
        <p className="text-gray-500 dark:text-gray-400">Responde las encuestas publicadas por Recursos Humanos</p>
      </div>

      {/* Alert for mandatory pending surveys */}
      {mandatoryPending > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Tienes {mandatoryPending} encuesta(s) obligatoria(s) pendiente(s)
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Por favor completalas antes de la fecha limite
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {surveys.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
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
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'completed', label: 'Completadas' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {f.label}
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
            const StatusIcon = statusConfig[survey.status].icon;
            const isClickable = survey.status === 'pending' && survey.questions;
            return (
              <div
                key={survey.id}
                onClick={() => isClickable && setSelectedSurvey(survey)}
                className={`card ${isClickable ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      survey.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      survey.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <ChatBubbleLeftRightIcon className={`h-6 w-6 ${
                        survey.status === 'pending' ? 'text-yellow-600' :
                        survey.status === 'completed' ? 'text-green-600' :
                        'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{survey.title}</h3>
                        {survey.mandatory && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Obligatoria
                          </span>
                        )}
                        {survey.anonymous && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Anonima
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{survey.category}</span>
                        <span>-</span>
                        <span>{survey.estimatedTime}</span>
                        {survey.status === 'pending' && (
                          <>
                            <span>-</span>
                            <span className={dayjs(survey.dueDate).isBefore(dayjs().add(3, 'day')) ? 'text-red-600' : ''}>
                              Vence: {dayjs(survey.dueDate).format('DD/MM/YYYY')}
                            </span>
                          </>
                        )}
                        {survey.completedDate && (
                          <>
                            <span>-</span>
                            <span>Respondida: {dayjs(survey.completedDate).format('DD/MM/YYYY')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[survey.status].bgColor} ${statusConfig[survey.status].color}`}>
                      <StatusIcon className="h-4 w-4 inline-block mr-1" />
                      {statusConfig[survey.status].label}
                    </span>
                    {isClickable && (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
