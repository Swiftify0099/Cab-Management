/**
 * useCommonJob — React Hook for Common Job Contract
 * ════════════════════════════════════════════════════════════════════════════════
 * Provides a unified interface for the Driver App to interact with any active
 * job across all service domains (Ride, Parcel, Transport, Airport, Rental,
 * Outstation) through the Common Job Contract API.
 *
 * Usage:
 *   const { activeJob, loading, error, sendCommand, refreshJob } = useCommonJob()
 *
 * The hook:
 * - Polls the active job endpoint on mount and focus
 * - Provides sendCommand() for driver actions (ARRIVE_PICKUP, START, COMPLETE)
 * - Auto-refreshes after successful commands
 * - Returns typed CommonJob data
 */
import { useState, useEffect, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../api/client'
import type {
  CommonJob,
  CommonJobCommand,
  CommandResult,
  JobListItem,
  JobResponse,
  JobHistoryResponse,
  CommandResponse,
} from '../types/commonJob'

interface UseCommonJobReturn {
  /** Currently active job (any service domain), null if none */
  activeJob: CommonJob | null
  /** Loading state for initial fetch */
  loading: boolean
  /** Error message if last operation failed */
  error: string | null
  /** Send a command to the active job's backend service */
  sendCommand: (
    jobId: string,
    command: CommonJobCommand,
    params?: Record<string, any>,
    jobType?: string
  ) => Promise<CommandResult>
  /** Manually refresh the active job */
  refreshJob: () => Promise<void>
  /** Fetch job history across all domains */
  fetchHistory: (limit?: number, jobType?: string) => Promise<JobListItem[]>
  /** Fetch a specific job by ID */
  fetchJobById: (jobId: string, jobType?: string) => Promise<CommonJob | null>
  /** Whether a command is currently being processed */
  commandLoading: boolean
}

export function useCommonJob(): UseCommonJobReturn {
  const [activeJob, setActiveJob] = useState<CommonJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)

  // ─── Fetch Active Job ──────────────────────────────────────────────────────

  const refreshJob = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/driver/jobs/active')
      const data: JobResponse = res.data

      if (data.success && data.data) {
        setActiveJob(data.data as CommonJob)
      } else {
        setActiveJob(null)
      }
    } catch (err: any) {
      // Don't set error for "no active job" scenario
      if (err.response?.status !== 404) {
        const detail = err.response?.data?.detail || err.message
        setError(detail || 'Could not fetch active job.')
      }
      setActiveJob(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    refreshJob()
  }, [refreshJob])

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      refreshJob()
    }, [refreshJob])
  )

  // ─── Send Command ──────────────────────────────────────────────────────────

  const sendCommand = useCallback(
    async (
      jobId: string,
      command: CommonJobCommand,
      params?: Record<string, any>,
      jobType?: string
    ): Promise<CommandResult> => {
      setCommandLoading(true)
      setError(null)

      try {
        const queryParams = jobType ? `?job_type=${jobType}` : ''
        const res = await api.post(`/driver/jobs/${jobId}/command${queryParams}`, {
          command,
          params: params || null,
        })
        const data: CommandResponse = res.data

        if (data.success && data.data) {
          // Auto-refresh job state after successful command
          await refreshJob()
          return data.data as CommandResult
        }

        return {
          success: false,
          message: data.message || 'Command failed.',
        }
      } catch (err: any) {
        const detail = err.response?.data?.detail || err.message
        const errorMsg = detail || 'Command failed.'
        setError(errorMsg)
        return {
          success: false,
          message: errorMsg,
        }
      } finally {
        setCommandLoading(false)
      }
    },
    [refreshJob]
  )

  // ─── Fetch Job History ─────────────────────────────────────────────────────

  const fetchHistory = useCallback(
    async (limit: number = 20, jobType?: string): Promise<JobListItem[]> => {
      try {
        const params: Record<string, any> = { limit }
        if (jobType) params.job_type = jobType

        const res = await api.get('/driver/jobs/history/list', { params })
        const data: JobHistoryResponse = res.data

        if (data.success && data.data?.items) {
          return data.data.items as JobListItem[]
        }
        return []
      } catch {
        return []
      }
    },
    []
  )

  // ─── Fetch Job By ID ──────────────────────────────────────────────────────

  const fetchJobById = useCallback(
    async (jobId: string, jobType?: string): Promise<CommonJob | null> => {
      try {
        const params: Record<string, any> = {}
        if (jobType) params.job_type = jobType

        const res = await api.get(`/driver/jobs/${jobId}`, { params })
        const data: JobResponse = res.data

        if (data.success && data.data) {
          return data.data as CommonJob
        }
        return null
      } catch {
        return null
      }
    },
    []
  )

  return {
    activeJob,
    loading,
    error,
    sendCommand,
    refreshJob,
    fetchHistory,
    fetchJobById,
    commandLoading,
  }
}
