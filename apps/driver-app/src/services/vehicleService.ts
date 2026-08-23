/**
 * CabBooking Driver App — Authoritative Vehicle Management Service & Requirement Engine
 * Handles Multi-Vehicle State, Document Lifecycle, Inspection Hub, Active Switching & Expiry Engine.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, kycApi, vehicleApi } from '../api/client'

export type VehicleType =
  | 'hatchback'
  | 'sedan'
  | 'suv'
  | 'tempo_traveller'
  | 'mini_bus'
  | 'bike'

export type VehicleStatus =
  | 'DRAFT'
  | 'DOCUMENTS_REQUIRED'
  | 'PENDING_REVIEW'
  | 'INSPECTION_REQUIRED'
  | 'INSPECTION_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REMOVED'

export type InspectionStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'RESCHEDULE_REQUIRED'

export type OwnershipType = 'self' | 'leased' | 'company' | 'fleet_partner'

export interface VehicleDocument {
  id: string
  vehicle_id: string
  doc_type: string
  name: string
  document_number?: string
  file_url?: string
  status: 'not_uploaded' | 'under_review' | 'approved' | 'rejected' | 'expiring_soon' | 'expired'
  issue_date?: string
  expires_at?: string
  expiry_label?: string
  is_expired?: boolean
  is_expiring_soon?: boolean
  rejection_reason?: string
  version: number
  is_mandatory: boolean
}

export interface VehicleInspection {
  id: string
  vehicle_id: string
  status: InspectionStatus
  status_label: string
  scheduled_at?: string
  completed_at?: string
  hub_location?: string
  hub_address?: string
  inspector_name?: string
  checklist_results?: Record<string, boolean>
  score?: number
  notes?: string
  rejection_reason?: string
  expires_at?: string
}

export interface DriverVehicle {
  id: string
  vehicle_type: VehicleType
  make: string
  model: string
  variant?: string
  year: number
  color: string
  registration_number: string
  seat_capacity: number
  fuel_type: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
  ownership_type: OwnershipType
  registered_owner_name: string
  registration_date?: string
  has_ac: boolean
  parcel_capable: boolean
  parcel_capacity_kg?: number
  is_active: boolean
  status: VehicleStatus
  status_label: string
  inspection_status: InspectionStatus
  insurance_expiry?: string
  pollution_expiry?: string
  permit_expiry?: string
  fitness_expiry?: string
  photos: string[]
  rejection_reason?: string
  documents: VehicleDocument[]
  inspection?: VehicleInspection
  created_at: string
  updated_at: string
}

export interface VehicleDashboardSummary {
  total_vehicles: number
  active_vehicle: DriverVehicle | null
  standby_vehicles: DriverVehicle[]
  pending_count: number
  action_required_count: number
  max_vehicles_allowed: number
  can_add_more: boolean
}

export const MAX_VEHICLES_PER_DRIVER = 5
export const EXPIRY_WARNING_DAYS = 30

const STORAGE_KEY = '@driver_vehicles_v3'

// ── Requirement Engine: Dynamic Document Requirements per Vehicle Type ───
export const VEHICLE_REQUIREMENT_CONFIG: Record<
  VehicleType,
  {
    label: string
    icon: string
    seats: number
    requires_inspection: boolean
    required_docs: { type: string; name: string; has_expiry: boolean; mandatory: boolean }[]
  }
> = {
  sedan: {
    label: 'Sedan',
    icon: 'car-side',
    seats: 4,
    requires_inspection: false,
    required_docs: [
      { type: 'rc_book', name: 'RC Book (Front & Back)', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Commercial Vehicle Insurance', has_expiry: true, mandatory: true },
      { type: 'permit', name: 'State / Tourist Permit', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'PUC (Pollution Certificate)', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Vehicle 4-Side Photos', has_expiry: false, mandatory: true },
    ],
  },
  hatchback: {
    label: 'Hatchback',
    icon: 'car-hatchback',
    seats: 4,
    requires_inspection: false,
    required_docs: [
      { type: 'rc_book', name: 'RC Book (Front & Back)', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Comprehensive Insurance', has_expiry: true, mandatory: true },
      { type: 'permit', name: 'Commercial Permit', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'PUC Certificate', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Vehicle Photos', has_expiry: false, mandatory: true },
    ],
  },
  suv: {
    label: 'SUV / MUV',
    icon: 'car-estate',
    seats: 6,
    requires_inspection: true,
    required_docs: [
      { type: 'rc_book', name: 'RC Book (Front & Back)', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Commercial Insurance Policy', has_expiry: true, mandatory: true },
      { type: 'permit', name: 'All-India Commercial Permit', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'PUC Certificate', has_expiry: true, mandatory: true },
      { type: 'fitness', name: 'Vehicle Fitness Certificate', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Vehicle 4-Angle Photos', has_expiry: false, mandatory: true },
    ],
  },
  tempo_traveller: {
    label: 'Tempo Traveller',
    icon: 'van-passenger',
    seats: 12,
    requires_inspection: true,
    required_docs: [
      { type: 'rc_book', name: 'Commercial RC Book', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Heavy Passenger Insurance', has_expiry: true, mandatory: true },
      { type: 'permit', name: 'All-India Stage Carriage Permit', has_expiry: true, mandatory: true },
      { type: 'fitness', name: 'RTO Fitness Certificate', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'Commercial PUC', has_expiry: true, mandatory: true },
      { type: 'speed_governor', name: 'Speed Governor Certificate', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Interior & Exterior Photos', has_expiry: false, mandatory: true },
    ],
  },
  mini_bus: {
    label: 'Mini Bus',
    icon: 'bus-side',
    seats: 22,
    requires_inspection: true,
    required_docs: [
      { type: 'rc_book', name: 'Commercial Bus RC', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Passenger Fleet Insurance', has_expiry: true, mandatory: true },
      { type: 'permit', name: 'National Bus Permit', has_expiry: true, mandatory: true },
      { type: 'fitness', name: 'RTO Fitness Certificate', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'PUC Certificate', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Bus 6-Angle Asset Photos', has_expiry: false, mandatory: true },
    ],
  },
  bike: {
    label: 'Bike / Two-Wheeler',
    icon: 'motorbike',
    seats: 1,
    requires_inspection: false,
    required_docs: [
      { type: 'rc_book', name: 'Bike RC Book', has_expiry: true, mandatory: true },
      { type: 'insurance', name: 'Two-Wheeler Insurance', has_expiry: true, mandatory: true },
      { type: 'puc', name: 'PUC Certificate', has_expiry: true, mandatory: true },
      { type: 'vehicle_photo', name: 'Bike Front & Side Photo', has_expiry: false, mandatory: true },
    ],
  },
}

// ── Initial Seed Data (Production-Quality Default State) ───────────────────
export const INITIAL_MOCK_VEHICLES: DriverVehicle[] = [
  {
    id: 'veh-001-honda-city',
    vehicle_type: 'sedan',
    make: 'Honda',
    model: 'City',
    variant: 'VXI',
    year: 2023,
    color: 'Pearl White',
    registration_number: 'MH 12 AB 1234',
    seat_capacity: 4,
    fuel_type: 'petrol',
    ownership_type: 'self',
    registered_owner_name: 'Rahul Ramesh Sharma',
    registration_date: '2023-04-15',
    has_ac: true,
    parcel_capable: true,
    parcel_capacity_kg: 50,
    is_active: true,
    status: 'ACTIVE',
    status_label: 'Active & Online Ready',
    inspection_status: 'PASSED',
    insurance_expiry: '2026-03-28',
    pollution_expiry: '2026-06-15',
    permit_expiry: '2027-04-14',
    photos: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop',
    ],
    documents: [
      {
        id: 'doc-v1-rc',
        vehicle_id: 'veh-001-honda-city',
        doc_type: 'rc_book',
        name: 'RC Book (Front & Back)',
        document_number: 'MH12AB1234',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2023-04-15',
        expires_at: '2038-04-14',
        expiry_label: 'Valid till 2038',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v1-ins',
        vehicle_id: 'veh-001-honda-city',
        doc_type: 'insurance',
        name: 'Commercial Vehicle Insurance',
        document_number: 'BAJAJ-ALL-889921',
        file_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
        status: 'approved',
        issue_date: '2025-03-29',
        expires_at: '2026-03-28',
        expiry_label: 'Expires in 42 days',
        version: 2,
        is_mandatory: true,
      },
      {
        id: 'doc-v1-permit',
        vehicle_id: 'veh-001-honda-city',
        doc_type: 'permit',
        name: 'State / Tourist Permit',
        document_number: 'MH-PERM-2023-9901',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2023-04-15',
        expires_at: '2027-04-14',
        expiry_label: 'Valid till Apr 2027',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v1-puc',
        vehicle_id: 'veh-001-honda-city',
        doc_type: 'puc',
        name: 'PUC (Pollution Certificate)',
        document_number: 'PUC-PUNE-2025-771',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2025-12-16',
        expires_at: '2026-06-15',
        expiry_label: 'Valid till Jun 2026',
        version: 1,
        is_mandatory: true,
      },
    ],
    inspection: {
      id: 'insp-001',
      vehicle_id: 'veh-001-honda-city',
      status: 'PASSED',
      status_label: 'Inspection Passed (Score: 98/100)',
      scheduled_at: '2026-01-10T10:30:00Z',
      completed_at: '2026-01-10T11:15:00Z',
      hub_location: 'Hadapsar Inspection Hub, Pune',
      hub_address: 'Survey No. 42, Magarpatta Road, Hadapsar, Pune - 411028',
      inspector_name: 'Vikram Shinde (Inspector ID: #702)',
      score: 98,
      notes: 'Vehicle is in excellent condition. Clean interior, all safety belts and lights operational.',
      expires_at: '2027-01-10',
    },
    created_at: '2026-01-08T09:00:00Z',
    updated_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 'veh-002-innova-crysta',
    vehicle_type: 'suv',
    make: 'Toyota',
    model: 'Innova Crysta',
    variant: '2.4 GX 7-STR',
    year: 2024,
    color: 'Silver Metallic',
    registration_number: 'MH 14 DE 5678',
    seat_capacity: 6,
    fuel_type: 'diesel',
    ownership_type: 'self',
    registered_owner_name: 'Rahul Ramesh Sharma',
    registration_date: '2024-02-20',
    has_ac: true,
    parcel_capable: true,
    parcel_capacity_kg: 100,
    is_active: false,
    status: 'INACTIVE',
    status_label: 'Approved (Standby)',
    inspection_status: 'PASSED',
    insurance_expiry: '2027-02-18',
    pollution_expiry: '2026-08-20',
    permit_expiry: '2029-02-19',
    photos: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    ],
    documents: [
      {
        id: 'doc-v2-rc',
        vehicle_id: 'veh-002-innova-crysta',
        doc_type: 'rc_book',
        name: 'RC Book (Front & Back)',
        document_number: 'MH14DE5678',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2024-02-20',
        expires_at: '2039-02-19',
        expiry_label: 'Valid till 2039',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v2-ins',
        vehicle_id: 'veh-002-innova-crysta',
        doc_type: 'insurance',
        name: 'Commercial Insurance Policy',
        document_number: 'HDFC-ERGO-994411',
        file_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
        status: 'approved',
        issue_date: '2024-02-20',
        expires_at: '2027-02-18',
        expiry_label: 'Valid till Feb 2027',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v2-permit',
        vehicle_id: 'veh-002-innova-crysta',
        doc_type: 'permit',
        name: 'All-India Commercial Permit',
        document_number: 'AI-PERMIT-2024-8812',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2024-02-20',
        expires_at: '2029-02-19',
        expiry_label: 'Valid till Feb 2029',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v2-puc',
        vehicle_id: 'veh-002-innova-crysta',
        doc_type: 'puc',
        name: 'PUC Certificate',
        document_number: 'PUC-PCMC-2026-112',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2026-02-20',
        expires_at: '2026-08-20',
        expiry_label: 'Valid till Aug 2026',
        version: 1,
        is_mandatory: true,
      },
    ],
    inspection: {
      id: 'insp-002',
      vehicle_id: 'veh-002-innova-crysta',
      status: 'PASSED',
      status_label: 'Inspection Passed (Score: 100/100)',
      scheduled_at: '2026-01-20T14:00:00Z',
      completed_at: '2026-01-20T14:45:00Z',
      hub_location: 'Wakad Inspection Hub, PCMC',
      hub_address: 'Hinjawadi Flyover Junction, Wakad, Pune - 411057',
      inspector_name: 'Anand Kulkarni (Inspector ID: #405)',
      score: 100,
      notes: 'Brand new vehicle condition. Meets all commercial 7-seater safety guidelines.',
      expires_at: '2027-01-20',
    },
    created_at: '2026-01-18T11:00:00Z',
    updated_at: '2026-02-05T16:00:00Z',
  },
  {
    id: 'veh-003-maruti-swift',
    vehicle_type: 'hatchback',
    make: 'Maruti Suzuki',
    model: 'Swift',
    variant: 'ZXI CNG',
    year: 2022,
    color: 'Magma Grey',
    registration_number: 'MH 12 PQ 9999',
    seat_capacity: 4,
    fuel_type: 'cng',
    ownership_type: 'self',
    registered_owner_name: 'Rahul Ramesh Sharma',
    registration_date: '2022-08-10',
    has_ac: true,
    parcel_capable: false,
    is_active: false,
    status: 'REJECTED',
    status_label: 'Action Required',
    inspection_status: 'REQUIRED',
    photos: [],
    rejection_reason: 'PUC Certificate has expired. Please upload renewed emission certificate.',
    documents: [
      {
        id: 'doc-v3-rc',
        vehicle_id: 'veh-003-maruti-swift',
        doc_type: 'rc_book',
        name: 'RC Book (Front & Back)',
        document_number: 'MH12PQ9999',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'approved',
        issue_date: '2022-08-10',
        expires_at: '2037-08-09',
        expiry_label: 'Valid till 2037',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v3-ins',
        vehicle_id: 'veh-003-maruti-swift',
        doc_type: 'insurance',
        name: 'Comprehensive Insurance',
        document_number: 'ICICI-LOMB-774411',
        file_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
        status: 'approved',
        issue_date: '2025-08-10',
        expires_at: '2026-08-09',
        expiry_label: 'Valid till Aug 2026',
        version: 1,
        is_mandatory: true,
      },
      {
        id: 'doc-v3-puc',
        vehicle_id: 'veh-003-maruti-swift',
        doc_type: 'puc',
        name: 'PUC Certificate',
        document_number: 'OLD-PUC-1299',
        file_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        status: 'rejected',
        issue_date: '2025-01-10',
        expires_at: '2025-07-10',
        expiry_label: 'Expired on Jul 10, 2025',
        is_expired: true,
        rejection_reason: 'The PUC certificate is expired. Upload valid renewed certificate with QR code.',
        version: 1,
        is_mandatory: true,
      },
    ],
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-12T11:00:00Z',
  },
]

// ── Service Core Engine ───────────────────────────────────────────────────

export class VehicleService {
  /**
   * Loads all vehicles from persistent storage or API
   */
  static async getVehicles(): Promise<DriverVehicle[]> {
    try {
      const res = await api.get('/driver/vehicles').catch(() => api.get('/driver/my-vehicles')).catch(() => null)
      if (res?.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const backendVehicles: DriverVehicle[] = res.data.data.map((v: any) => ({
          id: v.id || `veh-${v.vehicle_number || Date.now()}`,
          vehicle_type: v.vehicle_type || 'sedan',
          make: v.make || v.brand || 'Vehicle',
          model: v.model || '',
          variant: v.variant || '',
          year: Number(v.year || 2023),
          color: v.color || 'White',
          registration_number: v.registration_number || v.vehicle_number || 'MH12XX0000',
          seat_capacity: Number(v.capacity || v.seat_capacity || 4),
          fuel_type: v.fuel_type || 'petrol',
          ownership_type: v.ownership_type || 'self',
          registered_owner_name: v.registered_owner_name || 'Driver Partner',
          has_ac: v.has_ac ?? true,
          parcel_capable: v.parcel_capable ?? false,
          is_active: !!v.is_active,
          status: (v.status ? v.status.toUpperCase() : (v.is_active ? 'ACTIVE' : 'APPROVED')) as VehicleStatus,
          status_label: v.is_active ? 'Active & Online Ready' : 'Approved (Standby)',
          inspection_status: v.inspection_status || 'PASSED',
          photos: v.photos || [],
          documents: v.documents || [],
          created_at: v.created_at || new Date().toISOString(),
        }))
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(backendVehicles))
        return backendVehicles
      }
    } catch (e) {
      console.warn('[VehicleService] Backend load notice:', e)
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: DriverVehicle[] = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('[VehicleService] Error loading local cache:', e)
    }

    // No backend data and no local cache — return empty (driver needs to add vehicles)
    return []
  }

  /**
   * Retrieves dashboard summary metrics
   */
  static async getDashboardSummary(): Promise<VehicleDashboardSummary> {
    const vehicles = await this.getVehicles()
    const active = vehicles.find(v => v.is_active && v.status === 'ACTIVE') || null
    const standby = vehicles.filter(v => v.id !== active?.id && v.status !== 'REMOVED')
    const pending = vehicles.filter(v => ['PENDING_REVIEW', 'DOCUMENTS_REQUIRED', 'INSPECTION_REQUIRED', 'INSPECTION_PENDING'].includes(v.status)).length
    const actionRequired = vehicles.filter(v => ['REJECTED', 'EXPIRED'].includes(v.status)).length

    return {
      total_vehicles: vehicles.filter(v => v.status !== 'REMOVED').length,
      active_vehicle: active,
      standby_vehicles: standby,
      pending_count: pending,
      action_required_count: actionRequired,
      max_vehicles_allowed: MAX_VEHICLES_PER_DRIVER,
      can_add_more: vehicles.filter(v => v.status !== 'REMOVED').length < MAX_VEHICLES_PER_DRIVER,
    }
  }

  /**
   * Get specific vehicle details by ID
   */
  static async getVehicleById(vehicleId: string): Promise<DriverVehicle | null> {
    const list = await this.getVehicles()
    return list.find(v => v.id === vehicleId) || null
  }

  /**
   * Add a new vehicle (Enforces MAX_VEHICLES_PER_DRIVER and normalization)
   */
  static async createVehicle(data: {
    vehicle_type: VehicleType
    make: string
    model: string
    variant?: string
    year: number
    color: string
    registration_number: string
    seat_capacity?: number
    fuel_type: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
    ownership_type: OwnershipType
    registered_owner_name: string
    registration_date?: string
    has_ac?: boolean
    parcel_capable?: boolean
    parcel_capacity_kg?: number
    photos?: string[]
  }): Promise<DriverVehicle> {
    const list = await this.getVehicles()
    const activeCount = list.filter(v => v.status !== 'REMOVED').length

    if (activeCount >= MAX_VEHICLES_PER_DRIVER) {
      throw new Error(`Maximum vehicle limit (${MAX_VEHICLES_PER_DRIVER}) reached. Please remove an inactive vehicle to add a new one.`)
    }

    const cleanReg = data.registration_number.replace(/\s+/g, '').toUpperCase()
    const existing = list.find(v => v.registration_number.replace(/\s+/g, '').toUpperCase() === cleanReg && v.status !== 'REMOVED')
    if (existing) {
      throw new Error(`Vehicle with registration number ${data.registration_number} is already registered.`)
    }

    const config = VEHICLE_REQUIREMENT_CONFIG[data.vehicle_type]
    const initialDocs: VehicleDocument[] = config.required_docs.map((doc, idx) => ({
      id: `doc-${Date.now()}-${idx}`,
      vehicle_id: `veh-${Date.now()}`,
      doc_type: doc.type,
      name: doc.name,
      status: 'not_uploaded',
      version: 1,
      is_mandatory: doc.mandatory,
    }))

    const newVehicle: DriverVehicle = {
      id: `veh-${Date.now()}`,
      vehicle_type: data.vehicle_type,
      make: data.make.trim(),
      model: data.model.trim(),
      variant: data.variant?.trim() || undefined,
      year: data.year,
      color: data.color.trim(),
      registration_number: data.registration_number.toUpperCase().trim(),
      seat_capacity: data.seat_capacity || config.seats,
      fuel_type: data.fuel_type,
      ownership_type: data.ownership_type,
      registered_owner_name: data.registered_owner_name.trim(),
      registration_date: data.registration_date,
      has_ac: data.has_ac ?? true,
      parcel_capable: data.parcel_capable ?? false,
      parcel_capacity_kg: data.parcel_capacity_kg,
      is_active: false,
      status: 'DOCUMENTS_REQUIRED',
      status_label: 'Documents Required (0 Uploaded)',
      inspection_status: config.requires_inspection ? 'REQUIRED' : 'NOT_REQUIRED',
      photos: data.photos || [],
      documents: initialDocs,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Set vehicle_id on generated docs
    newVehicle.documents.forEach(d => (d.vehicle_id = newVehicle.id))

    const updated = [newVehicle, ...list]
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return newVehicle
  }

  /**
   * Update permitted vehicle fields
   */
  static async updateVehicle(
    vehicleId: string,
    data: {
      color?: string
      has_ac?: boolean
      parcel_capable?: boolean
      parcel_capacity_kg?: number
      fuel_type?: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid'
    }
  ): Promise<DriverVehicle> {
    const list = await this.getVehicles()
    const idx = list.findIndex(v => v.id === vehicleId)
    if (idx === -1) throw new Error('Vehicle not found')

    const target = list[idx]
    if (data.color) target.color = data.color.trim()
    if (data.has_ac !== undefined) target.has_ac = data.has_ac
    if (data.parcel_capable !== undefined) target.parcel_capable = data.parcel_capable
    if (data.parcel_capacity_kg !== undefined) target.parcel_capacity_kg = data.parcel_capacity_kg
    if (data.fuel_type) target.fuel_type = data.fuel_type

    target.updated_at = new Date().toISOString()
    list[idx] = target
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return target
  }

  /**
   * Switch Active Vehicle with atomic consistency
   */
  static async switchActiveVehicle(vehicleId: string): Promise<DriverVehicle> {
    const list = await this.getVehicles()
    const target = list.find(v => v.id === vehicleId)
    if (!target) throw new Error('Vehicle not found')

    // Eligibility check
    if (target.status !== 'APPROVED' && target.status !== 'INACTIVE' && target.status !== 'ACTIVE') {
      throw new Error(`Cannot activate vehicle: Current status is ${target.status_label}. Only approved vehicles can be set as active.`)
    }

    if (target.inspection_status === 'REQUIRED' || target.inspection_status === 'FAILED') {
      throw new Error('Cannot activate vehicle: Physical inspection is required and has not passed.')
    }

    // Check if any mandatory doc is expired
    const hasExpiredDoc = target.documents.some(d => d.is_expired || d.status === 'expired')
    if (hasExpiredDoc) {
      throw new Error('Cannot activate vehicle: One or more vehicle documents have expired. Please renew documents first.')
    }

    // Atomic switch: de-activate all, then activate target
    const updated = list.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          is_active: true,
          status: 'ACTIVE' as VehicleStatus,
          status_label: 'Active & Online Ready',
          updated_at: new Date().toISOString(),
        }
      } else if (v.is_active) {
        return {
          ...v,
          is_active: false,
          status: 'INACTIVE' as VehicleStatus,
          status_label: 'Approved (Standby)',
          updated_at: new Date().toISOString(),
        }
      }
      return v
    })

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    const activated = updated.find(v => v.id === vehicleId)!

    // Sync with backend API if available
    try {
      await api.post(`/driver/vehicles/${vehicleId}/activate`)
    } catch {}

    return activated
  }

  /**
   * Save or upload document for a vehicle
   */
  static async uploadVehicleDocument(
    vehicleId: string,
    docType: string,
    data: {
      file_url: string
      document_number?: string
      issue_date?: string
      expires_at?: string
    }
  ): Promise<VehicleDocument> {
    const list = await this.getVehicles()
    const vIdx = list.findIndex(v => v.id === vehicleId)
    if (vIdx === -1) throw new Error('Vehicle not found')

    const vehicle = list[vIdx]
    let doc = vehicle.documents.find(d => d.doc_type === docType)

    if (doc) {
      doc.file_url = data.file_url
      if (data.document_number) doc.document_number = data.document_number
      if (data.issue_date) doc.issue_date = data.issue_date
      if (data.expires_at) doc.expires_at = data.expires_at
      doc.version += 1
      doc.status = 'under_review'
      doc.rejection_reason = undefined
    } else {
      const config = VEHICLE_REQUIREMENT_CONFIG[vehicle.vehicle_type]
      const docDef = config.required_docs.find(d => d.type === docType)
      doc = {
        id: `doc-${Date.now()}`,
        vehicle_id: vehicleId,
        doc_type: docType,
        name: docDef?.name || docType.replace('_', ' ').toUpperCase(),
        document_number: data.document_number,
        file_url: data.file_url,
        status: 'under_review',
        issue_date: data.issue_date,
        expires_at: data.expires_at,
        version: 1,
        is_mandatory: docDef?.mandatory ?? true,
      }
      vehicle.documents.push(doc)
    }

    // Recalculate vehicle status
    const allUploaded = vehicle.documents.every(d => d.status !== 'not_uploaded')
    if (allUploaded && vehicle.status === 'DOCUMENTS_REQUIRED') {
      vehicle.status = 'PENDING_REVIEW'
      vehicle.status_label = 'Verification in Progress'
    }

    vehicle.updated_at = new Date().toISOString()
    list[vIdx] = vehicle
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))

    // Attempt remote upload to Cloudinary/backend if file is local
    if (data.file_url && (data.file_url.startsWith('file://') || data.file_url.startsWith('content://') || data.file_url.startsWith('/'))) {
      try {
        const formData = new FormData()
        const filename = data.file_url.split('/').pop() || `${docType}.jpg`
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : 'image/jpeg'
        formData.append('file', {
          uri: data.file_url,
          name: filename,
          type,
        } as any)
        if (data.document_number) formData.append('document_number', data.document_number)
        if (data.expires_at) formData.append('expires_at', data.expires_at)
        formData.append('vehicle_id', vehicleId)

        await kycApi.uploadDocument(docType, formData).catch(() =>
          vehicleApi.uploadVehicleDocument(vehicleId, docType, formData).catch(() => {})
        )
      } catch (uploadErr) {
        console.warn('[VehicleService] Remote upload skipped:', uploadErr)
      }
    }

    return doc
  }

  /**
   * Schedule vehicle physical/digital inspection
   */
  static async scheduleInspection(
    vehicleId: string,
    data: {
      scheduled_at: string
      hub_location: string
      hub_address: string
    }
  ): Promise<VehicleInspection> {
    const list = await this.getVehicles()
    const vIdx = list.findIndex(v => v.id === vehicleId)
    if (vIdx === -1) throw new Error('Vehicle not found')

    const vehicle = list[vIdx]
    const insp: VehicleInspection = {
      id: `insp-${Date.now()}`,
      vehicle_id: vehicleId,
      status: 'SCHEDULED',
      status_label: 'Inspection Scheduled',
      scheduled_at: data.scheduled_at,
      hub_location: data.hub_location,
      hub_address: data.hub_address,
      notes: 'Please arrive 15 minutes before your scheduled appointment with vehicle documents.',
    }

    vehicle.inspection = insp
    vehicle.inspection_status = 'SCHEDULED'
    vehicle.status = 'INSPECTION_PENDING'
    vehicle.status_label = 'Inspection Appointment Scheduled'
    vehicle.updated_at = new Date().toISOString()

    list[vIdx] = vehicle
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return insp
  }

  /**
   * Soft-delete / Archive a vehicle
   */
  static async archiveVehicle(vehicleId: string): Promise<boolean> {
    const list = await this.getVehicles()
    const vIdx = list.findIndex(v => v.id === vehicleId)
    if (vIdx === -1) throw new Error('Vehicle not found')

    const vehicle = list[vIdx]
    if (vehicle.is_active) {
      const otherApproved = list.find(v => v.id !== vehicleId && v.status === 'INACTIVE' && v.inspection_status !== 'FAILED')
      if (otherApproved) {
        throw new Error(`Cannot remove active vehicle directly. Please switch your active vehicle to "${otherApproved.make} ${otherApproved.model}" first.`)
      }
    }

    vehicle.status = 'REMOVED'
    vehicle.is_active = false
    vehicle.updated_at = new Date().toISOString()

    list[vIdx] = vehicle
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  }

  /**
   * Developer Mode: Simulate vehicle approval, rejection, or expiry
   */
  static async devSetVehicleStatus(
    vehicleId: string,
    targetStatus: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'PENDING_REVIEW' | 'INSPECTION_REQUIRED',
    reason?: string
  ): Promise<DriverVehicle> {
    const list = await this.getVehicles()
    const vIdx = list.findIndex(v => v.id === vehicleId)
    if (vIdx === -1) throw new Error('Vehicle not found')

    const vehicle = list[vIdx]

    if (targetStatus === 'APPROVED') {
      vehicle.status = vehicle.is_active ? 'ACTIVE' : 'INACTIVE'
      vehicle.status_label = vehicle.is_active ? 'Active & Online Ready' : 'Approved (Standby)'
      vehicle.inspection_status = 'PASSED'
      vehicle.rejection_reason = undefined
      vehicle.documents.forEach(d => {
        d.status = 'approved'
        d.rejection_reason = undefined
        d.is_expired = false
      })
    } else if (targetStatus === 'REJECTED') {
      vehicle.status = 'REJECTED'
      vehicle.status_label = 'Action Required'
      vehicle.is_active = false
      vehicle.rejection_reason = reason || 'Vehicle RC details could not be verified against the official Vahan registry.'
      if (vehicle.documents[0]) {
        vehicle.documents[0].status = 'rejected'
        vehicle.documents[0].rejection_reason = vehicle.rejection_reason
      }
    } else if (targetStatus === 'EXPIRED') {
      vehicle.status = 'EXPIRED'
      vehicle.status_label = 'Documents Expired'
      vehicle.is_active = false
      const insDoc = vehicle.documents.find(d => d.doc_type === 'insurance')
      if (insDoc) {
        insDoc.status = 'expired'
        insDoc.is_expired = true
        insDoc.expiry_label = 'Expired 2 days ago'
      }
    } else if (targetStatus === 'INSPECTION_REQUIRED') {
      vehicle.status = 'INSPECTION_REQUIRED'
      vehicle.status_label = 'Vehicle Inspection Required'
      vehicle.inspection_status = 'REQUIRED'
      vehicle.is_active = false
    } else {
      vehicle.status = 'PENDING_REVIEW'
      vehicle.status_label = 'Under Compliance Review'
    }

    vehicle.updated_at = new Date().toISOString()
    list[vIdx] = vehicle
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return vehicle
  }
}
