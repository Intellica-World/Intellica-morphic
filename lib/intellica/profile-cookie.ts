import type {
  IntellicaResolvedProfile,
  IntellicaUserLocation,
  IntellicaUserProfilePayload
} from './types'

export const INTELLICA_PROFILE_COOKIE_NAME = 'intellica_profile'

function sanitizeDisplayName(name?: string): string | undefined {
  const trimmed = name?.trim()
  if (!trimmed) return undefined

  return trimmed.slice(0, 80)
}

function roundCoordinate(value?: number): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.round(value * 10000) / 10000
}

function sanitizeLocation(
  location?: IntellicaUserLocation | null
): IntellicaUserLocation | undefined {
  if (!location) return undefined

  const nextLocation: IntellicaUserLocation = {
    lat: roundCoordinate(location.lat),
    lng: roundCoordinate(location.lng),
    accuracy:
      typeof location.accuracy === 'number' &&
      Number.isFinite(location.accuracy)
        ? Math.round(location.accuracy)
        : undefined,
    city: location.city?.trim().slice(0, 80),
    region: location.region?.trim().slice(0, 80),
    country: location.country?.trim().slice(0, 80),
    timezone: location.timezone?.trim().slice(0, 80),
    label: location.label?.trim().slice(0, 180),
    source: location.source
  }

  const hasAnyLocationData = Object.values(nextLocation).some(Boolean)
  return hasAnyLocationData ? nextLocation : undefined
}

export function normalizeIntellicaProfile(
  profile?: IntellicaUserProfilePayload | IntellicaResolvedProfile | null
): IntellicaResolvedProfile | null {
  if (!profile) return null

  const normalized: IntellicaResolvedProfile = {
    deviceId: profile.deviceId?.trim().slice(0, 80),
    displayName: sanitizeDisplayName(profile.displayName),
    location: sanitizeLocation(profile.location)
  }

  const hasData = Boolean(
    normalized.deviceId || normalized.displayName || normalized.location
  )

  return hasData ? normalized : null
}

export function mergeIntellicaProfiles(
  ...profiles: Array<
    IntellicaUserProfilePayload | IntellicaResolvedProfile | null | undefined
  >
): IntellicaResolvedProfile | null {
  const merged: IntellicaResolvedProfile = {}

  for (const profile of profiles) {
    const normalized = normalizeIntellicaProfile(profile)
    if (!normalized) continue

    if (normalized.deviceId) merged.deviceId = normalized.deviceId
    if (normalized.displayName) merged.displayName = normalized.displayName
    if (normalized.location) merged.location = normalized.location
  }

  return normalizeIntellicaProfile(merged)
}

export function serializeIntellicaProfileCookie(
  profile?: IntellicaResolvedProfile | null
): string | null {
  const normalized = normalizeIntellicaProfile(profile)
  if (!normalized) return null

  return encodeURIComponent(JSON.stringify(normalized))
}

export function deserializeIntellicaProfileCookie(
  value?: string | null
): IntellicaResolvedProfile | null {
  if (!value) return null

  try {
    const decoded = decodeURIComponent(value)
    return normalizeIntellicaProfile(JSON.parse(decoded))
  } catch {
    return null
  }
}
