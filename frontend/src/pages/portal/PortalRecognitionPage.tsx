import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  AcademicCapIcon,
  StarIcon,
  SparklesIcon,
  UserGroupIcon,
  LightBulbIcon,
  HeartIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { employeesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

interface Recognition {
  id: string;
  title: string;
  description: string;
  category: string;
  givenBy: string;
  givenByRole: string;
  date: string;
  points?: number;
}

interface Course {
  id: string;
  name: string;
  provider: string;
  status: 'completed' | 'in_progress' | 'pending';
  completedDate?: string;
  dueDate?: string;
  duration: string;
  certificate?: boolean;
  mandatory: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: typeof TrophyIcon;
  color: string;
  earnedDate?: string;
  locked: boolean;
}

const categoryIcons: Record<string, typeof TrophyIcon> = {
  'Trabajo en equipo': UserGroupIcon,
  'Innovacion': LightBulbIcon,
  'Liderazgo': RocketLaunchIcon,
  'Servicio al cliente': HeartIcon,
  'Excelencia': SparklesIcon,
  'Cumplimiento de metas': TrophyIcon,
};

// Mock data
const mockRecognitions: Recognition[] = [
  { id: '1', title: 'Excelente trabajo en equipo', description: 'Por su colaboracion destacada en el proyecto de migracion de sistemas', category: 'Trabajo en equipo', givenBy: 'Maria Lopez', givenByRole: 'Gerente de TI', date: '2025-12-15', points: 50 },
  { id: '2', title: 'Innovacion en procesos', description: 'Por implementar una solucion que redujo el tiempo de procesamiento en 40%', category: 'Innovacion', givenBy: 'Carlos Martinez', givenByRole: 'Director de Operaciones', date: '2025-11-20', points: 100 },
  { id: '3', title: 'Atencion excepcional', description: 'Por resolver de manera eficiente las incidencias reportadas por usuarios', category: 'Servicio al cliente', givenBy: 'Ana Garcia', givenByRole: 'Coordinadora de Soporte', date: '2025-10-05', points: 30 },
];

const mockCourses: Course[] = [
  { id: '1', name: 'Seguridad de la Informacion', provider: 'Empresa', status: 'completed', completedDate: '2025-06-15', duration: '4 horas', certificate: true, mandatory: true },
  { id: '2', name: 'Prevencion de Lavado de Dinero', provider: 'Empresa', status: 'completed', completedDate: '2025-03-20', duration: '2 horas', certificate: true, mandatory: true },
  { id: '3', name: 'Excel Avanzado', provider: 'LinkedIn Learning', status: 'in_progress', duration: '8 horas', certificate: true, mandatory: false },
  { id: '4', name: 'Gestion del Tiempo', provider: 'Coursera', status: 'pending', dueDate: '2026-03-01', duration: '6 horas', certificate: true, mandatory: false },
  { id: '5', name: 'Codigo de Etica', provider: 'Empresa', status: 'pending', dueDate: '2026-01-31', duration: '1 hora', certificate: false, mandatory: true },
];

const mockBadges: Badge[] = [
  { id: '1', name: 'Primer Aniversario', description: '1 ano en la empresa', icon: CalendarDaysIcon, color: 'bg-blue-500', earnedDate: '2025-09-01', locked: false },
  { id: '2', name: 'Innovador', description: '3 reconocimientos de innovacion', icon: LightBulbIcon, color: 'bg-yellow-500', earnedDate: '2025-11-20', locked: false },
  { id: '3', name: 'Colaborador Estrella', description: '5 reconocimientos de trabajo en equipo', icon: StarIcon, color: 'bg-purple-500', locked: true },
  { id: '4', name: 'Maestro del Aprendizaje', description: '10 cursos completados', icon: AcademicCapIcon, color: 'bg-green-500', locked: true },
  { id: '5', name: 'Lider Nato', description: '3 reconocimientos de liderazgo', icon: RocketLaunchIcon, color: 'bg-red-500', locked: true },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  completed: { label: 'Completado', color: 'text-green-700', bgColor: 'bg-green-100' },
  in_progress: { label: 'En progreso', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

export default function PortalRecognitionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'recognitions' | 'courses' | 'badges'>('recognitions');

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
  const recognitions = mockRecognitions;
  const courses = mockCourses;
  const badges = mockBadges;

  // Calculate stats
  const totalPoints = recognitions.reduce((sum, r) => sum + (r.points || 0), 0);
  const completedCourses = courses.filter(c => c.status === 'completed').length;
  const earnedBadges = badges.filter(b => !b.locked).length;

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reconocimientos y Capacitacion</h1>
        <p className="text-gray-500 dark:text-gray-400">Tus logros, cursos y badges</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-yellow-400 to-yellow-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Puntos Acumulados</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
            </div>
            <TrophyIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-400 to-green-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Cursos Completados</p>
              <p className="text-3xl font-bold">{completedCourses}/{courses.length}</p>
            </div>
            <AcademicCapIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-400 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Badges Obtenidos</p>
              <p className="text-3xl font-bold">{earnedBadges}/{badges.length}</p>
            </div>
            <CheckBadgeIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('recognitions')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recognitions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrophyIcon className="h-5 w-5 inline-block mr-2" />
          Reconocimientos ({recognitions.length})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'courses'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AcademicCapIcon className="h-5 w-5 inline-block mr-2" />
          Cursos ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'badges'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CheckBadgeIcon className="h-5 w-5 inline-block mr-2" />
          Badges ({badges.length})
        </button>
      </div>

      {/* Recognitions Tab */}
      {activeTab === 'recognitions' && (
        <div className="space-y-4">
          {recognitions.length === 0 ? (
            <div className="card text-center py-12">
              <TrophyIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aun no tienes reconocimientos</p>
            </div>
          ) : (
            recognitions.map((recognition) => {
              const CategoryIcon = categoryIcons[recognition.category] || TrophyIcon;
              return (
                <div key={recognition.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                      <CategoryIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{recognition.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{recognition.description}</p>
                        </div>
                        {recognition.points && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            <StarSolidIcon className="h-4 w-4" />
                            <span className="font-bold">{recognition.points} pts</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{recognition.category}</span>
                        <span>De: {recognition.givenBy} ({recognition.givenByRole})</span>
                        <span>{dayjs(recognition.date).format('DD/MM/YYYY')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {/* Mandatory courses alert */}
          {courses.some(c => c.mandatory && c.status === 'pending') && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="font-medium">Tienes cursos obligatorios pendientes</span>
              </div>
            </div>
          )}

          {courses.map((course) => (
            <div key={course.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    course.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                    course.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <AcademicCapIcon className={`h-6 w-6 ${
                      course.status === 'completed' ? 'text-green-600' :
                      course.status === 'in_progress' ? 'text-blue-600' :
                      'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{course.name}</h3>
                      {course.mandatory && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                          Obligatorio
                        </span>
                      )}
                      {course.certificate && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          Con certificado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{course.provider}</span>
                      <span>-</span>
                      <span>{course.duration}</span>
                      {course.completedDate && (
                        <>
                          <span>-</span>
                          <span>Completado: {dayjs(course.completedDate).format('DD/MM/YYYY')}</span>
                        </>
                      )}
                      {course.dueDate && course.status === 'pending' && (
                        <>
                          <span>-</span>
                          <span className="text-yellow-600">Vence: {dayjs(course.dueDate).format('DD/MM/YYYY')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[course.status].bgColor} ${statusConfig[course.status].color}`}>
                    {statusConfig[course.status].label}
                  </span>
                  {course.status !== 'completed' && (
                    <button className="btn btn-primary btn-sm">
                      {course.status === 'in_progress' ? 'Continuar' : 'Iniciar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`card text-center p-6 ${badge.locked ? 'opacity-50' : ''} hover:shadow-md transition-shadow`}
              >
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${badge.locked ? 'bg-gray-200 dark:bg-gray-700' : badge.color}`}>
                  <BadgeIcon className={`h-8 w-8 ${badge.locked ? 'text-gray-400' : 'text-white'}`} />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mt-4">{badge.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                {badge.earnedDate && (
                  <p className="text-xs text-green-600 mt-2">
                    Obtenido: {dayjs(badge.earnedDate).format('DD/MM/YYYY')}
                  </p>
                )}
                {badge.locked && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    Por desbloquear
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
