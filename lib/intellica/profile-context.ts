import type { UIMessage } from '@/lib/types/ai'

import {
  isIntellicaLocationEnabled,
  isIntellicaMigrationEnabled,
  isIntellicaProfileContextEnabled,
  isIntellicaUploadHardeningEnabled
} from './feature-flags'
import { resolveApproximateLocationFromRequest } from './geolocation'
import {
  deserializeIntellicaProfileCookie,
  mergeIntellicaProfiles,
  normalizeIntellicaProfile,
  serializeIntellicaProfileCookie
} from './profile-cookie'
import type {
  IntellicaContextReceipt,
  IntellicaResolvedProfile,
  IntellicaUserLocation,
  IntellicaUserProfilePayload
} from './types'

function buildLocationLabel(
  location?: IntellicaUserLocation | null
): string | null {
  if (!location) return null
  const parts = [location.city, location.region, location.country].filter(
    Boolean
  )
  if (parts.length === 0 && location.label) return location.label
  return parts.length > 0 ? parts.join(', ') : null
}

export function buildIntellicaAssistantContext(
  profile?: IntellicaResolvedProfile | null
): string | null {
  const normalizedProfile = normalizeIntellicaProfile(profile)
  if (!normalizedProfile) return null

  const lines = [
    'Personalization context for this user session:',
    normalizedProfile.displayName
      ? `- Preferred name: ${normalizedProfile.displayName}.`
      : null,
    normalizedProfile.location
      ? `- Current location: ${buildLocationLabel(normalizedProfile.location) || 'Unknown'}.${
          normalizedProfile.location.source === 'ip'
            ? ' This is approximate network-based location.'
            : ''
        }`
      : null,
    normalizedProfile.location?.timezone
      ? `- Timezone: ${normalizedProfile.location.timezone}.`
      : null,
    'Use this only when it helps. For local or "near me" questions, use the location above unless the user gives a different place.'
  ].filter(Boolean)

  return lines.join('\n')
}

export function withIntellicaAssistantContext(
  messages: UIMessage[],
  assistantContext?: string | null
): UIMessage[] {
  if (!assistantContext) return messages

  const systemMessage: UIMessage = {
    id: 'intellica-profile-context',
    role: 'system',
    parts: [{ type: 'text', text: assistantContext }]
  }

  return [
    systemMessage,
    ...messages.filter(message => message.id !== systemMessage.id)
  ]
}

export async function resolveIntellicaRequestContext(input: {
  request: Request
  cookieValue?: string | null
  rawProfile?: IntellicaUserProfilePayload | null
}): Promise<{
  assistantContext: string | null
  cookieValue: string | null
  profile: IntellicaResolvedProfile | null
  receipt: IntellicaContextReceipt
}> {
  if (!isIntellicaMigrationEnabled()) {
    return {
      assistantContext: null,
      cookieValue: null,
      profile: null,
      receipt: {
        migrationEnabled: false,
        profileContextEnabled: false,
        uploadHardeningEnabled: false
      }
    }
  }

  const cookieProfile = deserializeIntellicaProfileCookie(input.cookieValue)
  const bodyProfile = normalizeIntellicaProfile(input.rawProfile)

  let resolvedProfile = mergeIntellicaProfiles(cookieProfile, bodyProfile)

  if (isIntellicaLocationEnabled() && !resolvedProfile?.location) {
    const approximateLocation = await resolveApproximateLocationFromRequest(
      input.request
    )

    if (approximateLocation) {
      resolvedProfile = mergeIntellicaProfiles(resolvedProfile, {
        location: approximateLocation
      })
    }
  }

  return {
    assistantContext: isIntellicaProfileContextEnabled()
      ? buildIntellicaAssistantContext(resolvedProfile)
      : null,
    cookieValue: serializeIntellicaProfileCookie(resolvedProfile),
    profile: resolvedProfile,
    receipt: {
      migrationEnabled: true,
      profileContextEnabled: isIntellicaProfileContextEnabled(),
      uploadHardeningEnabled: isIntellicaUploadHardeningEnabled(),
      locationSource: resolvedProfile?.location?.source
    }
  }
}
