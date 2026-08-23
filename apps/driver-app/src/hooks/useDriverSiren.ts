/**
 * useDriverSiren Hook
 * ─────────────────────────────────────────────────────────────
 * React hook providing reactive sound state, siren selection,
 * preview, test, and mute controls for UI components.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  DriverSoundService,
  DRIVER_SIRENS,
  SirenOption,
} from '../services/driverSoundService'

export function useDriverSiren() {
  const [sirenState, setSirenState] = useState({
    isPlaying: DriverSoundService.isAlertPlaying(),
    isMuted: DriverSoundService.isAlertMuted(),
    activeSirenId: DriverSoundService.getSelectedSirenId(),
    volume: DriverSoundService.getVolume(),
  })
  const [selectedSiren, setSelectedSiren] = useState<SirenOption>(
    DriverSoundService.getSelectedSiren()
  )

  useEffect(() => {
    const unsub = DriverSoundService.subscribe(st => {
      setSirenState(st)
      setSelectedSiren(DriverSoundService.getSelectedSiren())
    })
    return unsub
  }, [])

  const selectSiren = useCallback(async (sirenId: string) => {
    await DriverSoundService.setSelectedSirenId(sirenId)
    setSelectedSiren(DriverSoundService.getSelectedSiren())
  }, [])

  const playPreview = useCallback(async (sirenId: string) => {
    await DriverSoundService.previewSiren(sirenId)
  }, [])

  const testRinging = useCallback(async (sirenId?: string) => {
    await DriverSoundService.testRinging(sirenId)
  }, [])

  const stopSound = useCallback(() => {
    DriverSoundService.stopIncomingAlert()
  }, [])

  const toggleMute = useCallback(() => {
    return DriverSoundService.toggleMute()
  }, [])

  return {
    ...sirenState,
    selectedSiren,
    availableSirens: DRIVER_SIRENS,
    selectSiren,
    playPreview,
    testRinging,
    stopSound,
    toggleMute,
  }
}
