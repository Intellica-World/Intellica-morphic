import { describe, expect, it } from 'vitest'

import {
  buildIntellicaAssistantContext,
  withIntellicaAssistantContext
} from '@/lib/intellica/profile-context'
import {
  deserializeIntellicaProfileCookie,
  mergeIntellicaProfiles,
  serializeIntellicaProfileCookie
} from '@/lib/intellica/profile-cookie'
import { validateUploadPolicy } from '@/lib/intellica/upload-policy'

describe('intellica profile context', () => {
  it('merges device profile data and preserves location details', () => {
    const merged = mergeIntellicaProfiles(
      {
        deviceId: 'device-1',
        displayName: 'Ada'
      },
      {
        location: {
          city: 'Istanbul',
          country: 'Turkey',
          timezone: 'Europe/Istanbul',
          source: 'browser'
        }
      }
    )

    expect(merged).toEqual({
      deviceId: 'device-1',
      displayName: 'Ada',
      location: {
        city: 'Istanbul',
        country: 'Turkey',
        timezone: 'Europe/Istanbul',
        source: 'browser'
      }
    })
  })

  it('serializes and deserializes the profile cookie safely', () => {
    const encoded = serializeIntellicaProfileCookie({
      deviceId: 'device-2',
      displayName: 'Leyla',
      location: {
        city: 'Istanbul',
        region: 'Istanbul',
        country: 'Turkey',
        source: 'ip'
      }
    })

    expect(encoded).toBeTruthy()
    expect(deserializeIntellicaProfileCookie(encoded)).toEqual({
      deviceId: 'device-2',
      displayName: 'Leyla',
      location: {
        city: 'Istanbul',
        region: 'Istanbul',
        country: 'Turkey',
        source: 'ip'
      }
    })
  })

  it('builds hidden personalization context for nearby questions', () => {
    const context = buildIntellicaAssistantContext({
      displayName: 'Leyla',
      location: {
        city: 'Istanbul',
        region: 'Istanbul',
        country: 'Turkey',
        timezone: 'Europe/Istanbul',
        source: 'browser'
      }
    })

    expect(context).toContain('Preferred name: Leyla.')
    expect(context).toContain('Current location: Istanbul, Istanbul, Turkey.')
    expect(context).toContain('Use this only when it helps.')
  })

  it('injects personalization as a hidden system message without altering user messages', () => {
    const result = withIntellicaAssistantContext(
      [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'What is near me?' }]
        }
      ],
      'Personalization context for this user session:\n- Preferred name: Leyla.'
    )

    expect(result[0]).toMatchObject({
      id: 'intellica-profile-context',
      role: 'system'
    })
    expect(result[1]).toMatchObject({
      id: 'user-1',
      role: 'user'
    })
  })
})

describe('intellica upload policy', () => {
  it('blocks dangerous extensions and allows safe image uploads', () => {
    const blocked = validateUploadPolicy({
      filename: 'payload.js',
      mimeType: 'application/javascript',
      sizeBytes: 16,
      maxBytes: 1024
    })

    expect(blocked).toMatchObject({
      ok: false,
      error: 'File extension .js is blocked'
    })

    const allowed = validateUploadPolicy({
      filename: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: 128,
      maxBytes: 1024,
      allowedMimePrefixes: ['image/'],
      buffer: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    })

    expect(allowed).toMatchObject({
      ok: true,
      detectedMime: 'image/png',
      extension: 'png'
    })
  })
})
