/**
 * Driver Safety Intelligence API Service — Feature 22
 */
import { api } from '../api/client'
import {
  SafetySOSResponse,
  TrustedContactItem,
  LiveTripShareData,
  SharedTripTelemetry,
  SafetyAlertItem,
  SafetyIncidentPayload,
} from '../types/driverSafety'

class DriverSafetyServiceClass {
  public async triggerSOS(
    rideId: string,
    lat: number,
    lng: number,
    accuracy: number = 10.0,
    reason?: string
  ): Promise<SafetySOSResponse> {
    const res = await api.post('/matching/safety/sos', {
      ride_id: rideId,
      latitude: lat,
      longitude: lng,
      accuracy,
      reason,
    })
    return res.data?.data
  }

  public async getTrustedContacts(): Promise<TrustedContactItem[]> {
    try {
      const res = await api.get('/matching/safety/trusted-contacts')
      return res.data?.data || []
    } catch (err) {
      console.warn('[DriverSafetyService] getTrustedContacts error:', err)
      return []
    }
  }

  public async addTrustedContact(
    name: string,
    phone: string,
    relationship: string = 'Family'
  ): Promise<TrustedContactItem> {
    const res = await api.post('/matching/safety/trusted-contacts', {
      name,
      phone,
      relationship,
    })
    return res.data?.data
  }

  public async deleteTrustedContact(contactId: string): Promise<any> {
    const res = await api.delete(`/matching/safety/trusted-contacts/${contactId}`)
    return res.data?.data
  }

  public async createLiveTripShare(rideId: string): Promise<LiveTripShareData> {
    const res = await api.post(`/matching/safety/rides/${rideId}/share`)
    return res.data?.data
  }

  public async getSharedTrip(token: string): Promise<SharedTripTelemetry> {
    const res = await api.get(`/matching/safety/share/${token}`)
    return res.data?.data
  }

  public async recordSafetyAlert(
    alertType: string,
    severity: string,
    lat: number,
    lng: number,
    rideId?: string,
    details: Record<string, any> = {}
  ): Promise<SafetyAlertItem> {
    const res = await api.post('/matching/safety/alerts', {
      alert_type: alertType,
      severity,
      latitude: lat,
      longitude: lng,
      ride_id: rideId,
      details,
    })
    return res.data?.data
  }

  public async resolveSafetyAlert(
    alertId: string,
    resolutionType: string = 'IM_SAFE'
  ): Promise<any> {
    const res = await api.post(`/matching/safety/alerts/${alertId}/resolve`, {
      resolution_type: resolutionType,
    })
    return res.data?.data
  }

  public async reportIncident(payload: SafetyIncidentPayload): Promise<any> {
    const res = await api.post('/matching/safety/incidents', payload)
    return res.data?.data
  }
}

export const DriverSafetyService = new DriverSafetyServiceClass()
