import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  ClockIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  PauseIcon,
  PlayIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { attendanceApi, employeesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: string;
  hoursWorked: number | null;
}

interface EmployeeInfo {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  jobPosition: { name: string } | null;
  department: { name: string } | null;
  company: { name: string } | null;
  workSchedule: {
    name: string;
    entryTime: string;
    exitTime: string;
  } | null;
}

export default function WebTimeclockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employee by user email
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-by-email', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const response = await employeesApi.getByEmail(user.email);
        return response.data as EmployeeInfo;
      } catch {
        return null;
      }
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (employeeData?.id) {
      setEmployeeId(employeeData.id);
    }
  }, [employeeData]);

  // Fetch today's attendance record
  const { data: todayRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['today-attendance', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      try {
        const response = await attendanceApi.getTodayRecord(employeeId);
        return response.data as AttendanceRecord;
      } catch {
        return null;
      }
    },
    enabled: !!employeeId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(employeeId!),
    onSuccess: () => {
      toast.success('Entrada registrada correctamente');
      queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar entrada');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(employeeId!),
    onSuccess: () => {
      toast.success('Salida registrada correctamente');
      queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar salida');
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () => attendanceApi.breakStart(employeeId!),
    onSuccess: () => {
      toast.success('Inicio de descanso registrado');
      queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar inicio de descanso');
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () => attendanceApi.breakEnd(employeeId!),
    onSuccess: () => {
      toast.success('Fin de descanso registrado');
      queryClient.invalidateQueries({ queryKey: ['today-attendance', employeeId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar fin de descanso');
    },
  });

  const isLoading = employeeLoading || recordLoading;
  const isMutating =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    breakStartMutation.isPending ||
    breakEndMutation.isPending;

  // Determine current state
  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;
  const isOnBreak = !!todayRecord?.breakStart && !todayRecord?.breakEnd;
  const canCheckIn = !hasCheckedIn;
  const canCheckOut = hasCheckedIn && !hasCheckedOut && !isOnBreak;
  const canStartBreak = hasCheckedIn && !hasCheckedOut && !isOnBreak;
  const canEndBreak = isOnBreak;

  // Calculate worked time
  const getWorkedTime = () => {
    if (!todayRecord?.checkIn) return '00:00:00';
    const start = dayjs(todayRecord.checkIn);
    const end = todayRecord.checkOut ? dayjs(todayRecord.checkOut) : dayjs();
    let totalSeconds = end.diff(start, 'second');

    // Subtract break time if applicable
    if (todayRecord.breakStart && todayRecord.breakEnd) {
      const breakStart = dayjs(todayRecord.breakStart);
      const breakEnd = dayjs(todayRecord.breakEnd);
      totalSeconds -= breakEnd.diff(breakStart, 'second');
    } else if (todayRecord.breakStart && !todayRecord.breakEnd) {
      const breakStart = dayjs(todayRecord.breakStart);
      totalSeconds -= dayjs().diff(breakStart, 'second');
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <UserCircleIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Inicia sesión para registrar asistencia
          </h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <UserCircleIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            No se encontró registro de empleado
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Tu cuenta de usuario no está vinculada a un registro de empleado.
            Contacta a Recursos Humanos para vincular tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with current time */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Checador Web
        </h1>
        <div className="text-6xl font-mono font-bold text-primary-600 dark:text-primary-400">
          {dayjs(currentTime).format('HH:mm:ss')}
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {dayjs(currentTime).format('dddd, D [de] MMMM [de] YYYY')}
        </p>
      </div>

      {/* Employee info card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          {employeeData.photoUrl ? (
            <img
              src={
                employeeData.photoUrl.startsWith('/')
                  ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${employeeData.photoUrl}`
                  : employeeData.photoUrl
              }
              alt={`${employeeData.firstName} ${employeeData.lastName}`}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserCircleIcon className="w-14 h-14 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {employeeData.firstName} {employeeData.lastName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {employeeData.employeeNumber} • {employeeData.jobPosition?.name}
            </p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <BuildingOfficeIcon className="w-4 h-4" />
                {employeeData.department?.name}
              </span>
              {employeeData.workSchedule && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {employeeData.workSchedule.entryTime} - {employeeData.workSchedule.exitTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's status */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-primary-600" />
          Estado del día
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Entrada</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {todayRecord?.checkIn
                ? dayjs(todayRecord.checkIn).format('HH:mm:ss')
                : '--:--:--'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Salida</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {todayRecord?.checkOut
                ? dayjs(todayRecord.checkOut).format('HH:mm:ss')
                : '--:--:--'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Descanso</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {todayRecord?.breakStart
                ? `${dayjs(todayRecord.breakStart).format('HH:mm')} - ${
                    todayRecord.breakEnd
                      ? dayjs(todayRecord.breakEnd).format('HH:mm')
                      : 'En curso'
                  }`
                : '--:-- - --:--'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo trabajado</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400 font-mono">
              {getWorkedTime()}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-4 text-center">
          {hasCheckedOut ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              Jornada completada
            </span>
          ) : isOnBreak ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              En descanso
            </span>
          ) : hasCheckedIn ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Trabajando
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Sin registrar entrada
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Check In */}
        <button
          onClick={() => checkInMutation.mutate()}
          disabled={!canCheckIn || isMutating}
          className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
            canCheckIn
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ArrowRightOnRectangleIcon className="w-12 h-12 mb-2" />
          <span className="text-lg font-semibold">Entrada</span>
        </button>

        {/* Check Out */}
        <button
          onClick={() => checkOutMutation.mutate()}
          disabled={!canCheckOut || isMutating}
          className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
            canCheckOut
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ArrowLeftOnRectangleIcon className="w-12 h-12 mb-2" />
          <span className="text-lg font-semibold">Salida</span>
        </button>

        {/* Break Start */}
        <button
          onClick={() => breakStartMutation.mutate()}
          disabled={!canStartBreak || isMutating}
          className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
            canStartBreak
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PauseIcon className="w-12 h-12 mb-2" />
          <span className="text-lg font-semibold">Iniciar Descanso</span>
        </button>

        {/* Break End */}
        <button
          onClick={() => breakEndMutation.mutate()}
          disabled={!canEndBreak || isMutating}
          className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all ${
            canEndBreak
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PlayIcon className="w-12 h-12 mb-2" />
          <span className="text-lg font-semibold">Terminar Descanso</span>
        </button>
      </div>

      {/* Loading overlay */}
      {isMutating && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Registrando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
