'use client'

import { useEffect, useRef, useState } from 'react'

export interface UserLocation {
  lat: number
  lng: number
  accuracy?: number
  city?: string
  region?: string
  country?: string
  label?: string
}

interface GeolocationState {
  location: UserLocation | null
  error: string | null
  loading: boolean
}

export function useGeolocation(enabled = true): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false
  })
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation || fetchedRef.current) return
    fetchedRef.current = true

    setState(s => ({ ...s, loading: true }))

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords
        const base: UserLocation = { lat, lng, accuracy }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          if (res.ok) {
            const data = await res.json()
            const addr = data.address ?? {}
            base.city =
              addr.city ?? addr.town ?? addr.village ?? addr.county ?? undefined
            base.region = addr.state ?? undefined
            base.country = addr.country ?? undefined
            const parts = [
              addr.suburb ?? addr.neighbourhood,
              base.city,
              addr.state,
              base.country
            ].filter(Boolean)
            base.label = parts.join(', ')
          }
        } catch {}

        setState({ location: base, error: null, loading: false })
      },
      err => {
        setState({ location: null, error: err.message, loading: false })
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    )
  }, [])

  return state
}
