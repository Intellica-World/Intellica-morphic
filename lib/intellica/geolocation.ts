import type { IntellicaUserLocation } from './types'

const GEOLOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const geolocationCache = new Map<
  string,
  { expiresAt: number; location: IntellicaUserLocation }
>()

function isPrivateIp(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('127.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('192.168.') ||
    ip === '::1'
  )
}

export function extractRequestIp(request: Request): string | null {
  const headers = request.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')

  const firstValue = [forwardedFor, realIp, cfConnectingIp]
    .map(value => value?.split(',')[0]?.trim())
    .find(Boolean)

  return firstValue || null
}

function buildLocationLabel(
  location: IntellicaUserLocation
): string | undefined {
  const parts = [location.city, location.region, location.country].filter(
    Boolean
  )
  return parts.length > 0 ? parts.join(', ') : undefined
}

async function fetchLocationByIp(
  ip: string
): Promise<IntellicaUserLocation | null> {
  const apiKey = process.env.IPINFO_API_KEY
  const endpoint = apiKey
    ? `https://ipinfo.io/${ip}?token=${apiKey}`
    : `https://ipinfo.io/${ip}/json`

  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }
  })

  if (!response.ok) return null

  const payload = await response.json()
  const [lat, lng] =
    typeof payload.loc === 'string'
      ? payload.loc.split(',').map((value: string) => Number(value))
      : [undefined, undefined]

  const location: IntellicaUserLocation = {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    city: payload.city || undefined,
    region: payload.region || undefined,
    country: payload.country || undefined,
    timezone: payload.timezone || undefined,
    source: 'ip'
  }

  location.label = buildLocationLabel(location)

  return location
}

export async function resolveApproximateLocationFromRequest(
  request: Request
): Promise<IntellicaUserLocation | null> {
  const ip = extractRequestIp(request)
  if (!ip || isPrivateIp(ip)) return null

  const cached = geolocationCache.get(ip)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location
  }

  try {
    const location = await fetchLocationByIp(ip)
    if (!location) return null

    geolocationCache.set(ip, {
      location,
      expiresAt: Date.now() + GEOLOCATION_CACHE_TTL_MS
    })

    return location
  } catch (error) {
    console.error('[intellica] failed to resolve IP geolocation:', error)
    return null
  }
}
