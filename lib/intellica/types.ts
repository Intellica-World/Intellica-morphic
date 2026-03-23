export type IntellicaLocationSource = 'browser' | 'ip' | 'cookie'

export interface IntellicaUserLocation {
  lat?: number
  lng?: number
  accuracy?: number
  city?: string
  region?: string
  country?: string
  timezone?: string
  label?: string
  source?: IntellicaLocationSource
}

export interface IntellicaUserProfilePayload {
  deviceId?: string
  displayName?: string
  dismissedNamePrompt?: boolean
  location?: IntellicaUserLocation | null
}

export interface IntellicaResolvedProfile {
  deviceId?: string
  displayName?: string
  location?: IntellicaUserLocation | null
}

export interface IntellicaContextReceipt {
  migrationEnabled: boolean
  profileContextEnabled: boolean
  uploadHardeningEnabled: boolean
  locationSource?: IntellicaLocationSource
}

export interface IntellicaStoredProfile extends IntellicaUserProfilePayload {
  updatedAt?: string
}
