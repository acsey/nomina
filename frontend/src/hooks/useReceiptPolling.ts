import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Estados de recibo que requieren polling activo
 */
const POLLING_STATES = ['CALCULATING', 'STAMPING', 'PENDING', 'APPROVED'];

/**
 * Estados finales que no requieren más polling
 */
const FINAL_STATES = ['STAMP_OK', 'STAMP_ERROR', 'PAID', 'CANCELLED', 'SUPERSEDED'];

/**
 * HARDENING: Hook para polling inteligente de estado de recibo
 *
 * Comportamiento:
 * - Si estado es CALCULATING o STAMPING -> refresca cada 2 segundos
 * - Si estado es PENDING o APPROVED -> refresca cada 5 segundos
 * - Si estado es final (STAMP_OK, ERROR) -> detiene el polling
 *
 * @param receiptId ID del recibo a monitorear
 * @param fetchReceipt Función para obtener el recibo
 * @param enabled Habilitar/deshabilitar polling
 * @returns Estado actual y metadata del polling
 */
export function useReceiptPolling<T extends { status: string; version?: number }>(
  receiptId: string | undefined,
  fetchReceipt: (id: string) => Promise<T>,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const pollCountRef = useRef(0);

  // Query principal con refetch inteligente
  const {
    data: receipt,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['receipt-detail', receiptId],
    queryFn: () => fetchReceipt(receiptId!),
    enabled: !!receiptId && enabled,
    staleTime: 1000, // Considerar stale después de 1 segundo
    gcTime: 5 * 60 * 1000, // Mantener en cache 5 minutos
  });

  // Determinar intervalo de polling basado en estado
  const getPollingInterval = useCallback((status: string | undefined): number | null => {
    if (!status) return null;

    // Estados de procesamiento activo -> polling rápido
    if (status === 'CALCULATING' || status === 'STAMPING') {
      return 2000; // 2 segundos
    }

    // Estados pendientes -> polling moderado
    if (status === 'PENDING' || status === 'APPROVED') {
      return 5000; // 5 segundos
    }

    // Estados finales -> sin polling
    if (FINAL_STATES.includes(status)) {
      return null;
    }

    // Por defecto, sin polling
    return null;
  }, []);

  // Efecto para manejar el polling
  useEffect(() => {
    if (!receipt || !enabled) return;

    const interval = getPollingInterval(receipt.status);

    if (interval === null) {
      // Estado final alcanzado, no más polling
      pollCountRef.current = 0;
      return;
    }

    // Límite de seguridad: máximo 100 polls
    if (pollCountRef.current >= 100) {
      console.warn(
        `HARDENING: Polling detenido después de ${pollCountRef.current} intentos para recibo ${receiptId}`,
      );
      return;
    }

    const timeoutId = setTimeout(() => {
      pollCountRef.current += 1;
      refetch();
    }, interval);

    return () => clearTimeout(timeoutId);
  }, [receipt, enabled, receiptId, refetch, getPollingInterval]);

  // Resetear contador cuando cambia el recibo
  useEffect(() => {
    pollCountRef.current = 0;
  }, [receiptId]);

  // Información del estado de polling
  const pollingInfo = {
    isPolling: receipt ? POLLING_STATES.includes(receipt.status) : false,
    isFinalState: receipt ? FINAL_STATES.includes(receipt.status) : false,
    pollCount: pollCountRef.current,
    currentInterval: getPollingInterval(receipt?.status),
  };

  // Función para forzar refetch
  const forceRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['receipt-detail', receiptId] });
  }, [queryClient, receiptId]);

  return {
    receipt,
    isLoading,
    isError,
    error,
    isFetching,
    pollingInfo,
    forceRefetch,
  };
}

/**
 * HARDENING: Hook para polling de lista de recibos
 * Usado cuando se muestran múltiples recibos y alguno puede estar en proceso
 */
export function useReceiptsListPolling<T extends { id: string; status: string }[]>(
  fetchReceipts: () => Promise<T>,
  queryKey: string[],
  enabled = true,
) {
  // Query principal
  const {
    data: receipts,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: fetchReceipts,
    enabled,
    staleTime: 2000,
  });

  // Detectar si algún recibo necesita polling
  const hasProcessingReceipts = receipts?.some(
    (r) => POLLING_STATES.includes(r.status),
  ) ?? false;

  // Polling solo si hay recibos en proceso
  useEffect(() => {
    if (!hasProcessingReceipts || !enabled) return;

    const intervalId = setInterval(() => {
      refetch();
    }, 3000); // Polling cada 3 segundos para listas

    return () => clearInterval(intervalId);
  }, [hasProcessingReceipts, enabled, refetch]);

  return {
    receipts,
    isLoading,
    isError,
    isFetching,
    hasProcessingReceipts,
  };
}

export default useReceiptPolling;
