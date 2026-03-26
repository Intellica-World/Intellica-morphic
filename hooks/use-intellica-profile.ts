'use client'

import { useCallback, useEffect, useState } from 'react'

import type {
  IntellicaStoredProfile,
  IntellicaUserProfilePayload
} from '@/lib/intellica/types'

import { useGeolocation } from './use-geolocation'

const PROFILE_STORAGE_KEY = 'intellica:user-profile:v1'

function createDeviceId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `device-${Math.random().toString(36).slice(2, 10)}`
}

function readStoredProfile(): IntellicaStoredProfile {
  if (typeof window === 'undefined') {
    return { deviceId: 'server-render' }
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) {
      return { deviceId: createDeviceId() }
    }

    const parsed = JSON.parse(raw) as IntellicaStoredProfile
    return {
      deviceId: parsed.deviceId || createDeviceId(),
      displayName: parsed.displayName,
      dismissedNamePrompt: parsed.dismissedNamePrompt,
      location: parsed.location || null,
      updatedAt: parsed.updatedAt
    }
  } catch {
    return { deviceId: createDeviceId() }
  }
}

function persistStoredProfile(profile: IntellicaStoredProfile) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({
      ...profile,
      updatedAt: new Date().toISOString()
    })
  )
}

export function useIntellicaProfile() {
  const profileFeatureEnabled =
    process.env.NEXT_PUBLIC_FEATURE_INTELLICA_PROFILE_CONTEXT_V1 !== 'false'
  const locationFeatureEnabled =
    process.env.NEXT_PUBLIC_FEATURE_INTELLICA_LOCATION_V1 !== 'false'

  const [mounted, setMounted] = useState(false)
  const [storedProfile, setStoredProfile] = useState<IntellicaStoredProfile>(
    { deviceId: 'server-render' }
  )

  useEffect(() => {
    setStoredProfile(readStoredProfile())
    setMounted(true)
  }, [])

  const geolocation = useGeolocation(
    profileFeatureEnabled &&
      locationFeatureEnabled &&
      (!storedProfile.location || !storedProfile.location.label)
  )

  useEffect(() => {
    if (!profileFeatureEnabled) return
    persistStoredProfile(storedProfile)
  }, [profileFeatureEnabled, storedProfile])

  useEffect(() => {
    if (!geolocation.location) return

    setStoredProfile(previous => ({
      ...previous,
      location: {
        ...geolocation.location,
        source: 'browser'
      }
    }))
  }, [geolocation.location])

  const saveDisplayName = useCallback((displayName: string) => {
    const trimmed = displayName.trim()
    if (!trimmed) return

    setStoredProfile(previous => ({
      ...previous,
      displayName: trimmed.slice(0, 80),
      dismissedNamePrompt: false
    }))
  }, [])

  const dismissNamePrompt = useCallback(() => {
    setStoredProfile(previous => ({
      ...previous,
      dismissedNamePrompt: true
    }))
  }, [])

  const userProfile: IntellicaUserProfilePayload = {
    deviceId: storedProfile.deviceId,
    displayName: storedProfile.displayName,
    location: storedProfile.location || null,
    dismissedNamePrompt: storedProfile.dismissedNamePrompt
  }

  return {
    dismissNamePrompt,
    locationError: geolocation.error,
    locationLabel: storedProfile.location?.label || null,
    locationLoading: geolocation.loading,
    profile: storedProfile,
    saveDisplayName,
    shouldPromptForName:
      mounted &&
      profileFeatureEnabled &&
      !storedProfile.displayName &&
      !storedProfile.dismissedNamePrompt,
    userProfile
  }
}
