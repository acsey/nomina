import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon, PlayIcon, PauseIcon, StopIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

type ClockStatus = 'not_clocked_in' | 'working' | 'on_break' | 'clocked_out';

interface ClockState {
  status: ClockStatus;
  clockInTime: string | null;
  breakStartTime: string | null;
  totalWorkedMinutes: number;
  breakMinutes: number;
}

export default function ClockWidget() {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockState, setClockState] = useState<ClockState>({
    status: 'not_clocked_in',
    clockInTime: null,
    breakStartTime: null,
    totalWorkedMinutes: 0,
    breakMinutes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Format minutes to HH:MM
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Calculate worked time since clock in
  const calculateWorkedTime = () => {
    if (!clockState.clockInTime || clockState.status === 'not_clocked_in') {
      return 0;
    }

    const clockIn = new Date(clockState.clockInTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000);

    // Subtract break time if on break
    const breakTime = clockState.status === 'on_break' && clockState.breakStartTime
      ? Math.floor((now.getTime() - new Date(clockState.breakStartTime).getTime()) / 60000)
      : 0;

    return Math.max(0, diffMinutes - clockState.breakMinutes - breakTime);
  };

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to clock in
      setClockState({
        status: 'working',
        clockInTime: new Date().toISOString(),
        breakStartTime: null,
        totalWorkedMinutes: 0,
        breakMinutes: 0,
      });
    } catch (error) {
      console.error('Error clocking in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to start break
      setClockState((prev) => ({
        ...prev,
        status: 'on_break',
        breakStartTime: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error starting break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsLoading(true);
    try {
      // Calculate break duration
      const breakStart = clockState.breakStartTime ? new Date(clockState.breakStartTime) : new Date();
      const breakDuration = Math.floor((new Date().getTime() - breakStart.getTime()) / 60000);

      // TODO: Call API to end break
      setClockState((prev) => ({
        ...prev,
        status: 'working',
        breakStartTime: null,
        breakMinutes: prev.breakMinutes + breakDuration,
      }));
    } catch (error) {
      console.error('Error ending break:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to clock out
      setClockState((prev) => ({
        ...prev,
        status: 'clocked_out',
        totalWorkedMinutes: calculateWorkedTime(),
      }));
    } catch (error) {
      console.error('Error clocking out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (clockState.status) {
      case 'working':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'on_break':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'clocked_out':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (clockState.status) {
      case 'working':
        return t('portal.clock.status.working');
      case 'on_break':
        return t('portal.clock.status.onBreak');
      case 'clocked_out':
        return t('portal.clock.status.clockedOut');
      default:
        return t('portal.clock.status.notClockedIn');
    }
  };

  const workedTime = calculateWorkedTime();

  return (
    <div className="flex items-center gap-4">
      {/* Current Time Display */}
      <div className="flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-gray-400" />
        <span className="text-lg font-mono font-semibold text-gray-700 dark:text-gray-200">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-600" />

      {/* Status Badge */}
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {clockState.status === 'working' && (
          <CheckCircleIcon className="inline-block h-4 w-4 mr-1 -mt-0.5" />
        )}
        {getStatusText()}
      </div>

      {/* Worked Time */}
      {clockState.status !== 'not_clocked_in' && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">{formatMinutes(workedTime)}</span>
          <span className="text-gray-400 ml-1">{t('portal.clock.todayHours')}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {clockState.status === 'not_clocked_in' && (
          <button
            onClick={handleClockIn}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlayIcon className="h-4 w-4" />
            {t('portal.clock.clockIn')}
          </button>
        )}

        {clockState.status === 'working' && (
          <>
            <button
              onClick={handleStartBreak}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PauseIcon className="h-4 w-4" />
              {t('portal.clock.breakStart')}
            </button>
            <button
              onClick={handleClockOut}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <StopIcon className="h-4 w-4" />
              {t('portal.clock.clockOut')}
            </button>
          </>
        )}

        {clockState.status === 'on_break' && (
          <button
            onClick={handleEndBreak}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PlayIcon className="h-4 w-4" />
            {t('portal.clock.breakEnd')}
          </button>
        )}

        {clockState.status === 'clocked_out' && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('portal.clock.todayHours')}: {formatMinutes(clockState.totalWorkedMinutes)}
          </div>
        )}
      </div>
    </div>
  );
}
