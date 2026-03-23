import {
  isIntellicaMindEnabled,
  isIntellicaReceiptsEnabled,
  isIntellicaVoiceEnabled
} from './feature-flags'
import type { IntellicaContextReceipt } from './types'

export function applyIntellicaMigrationHeaders(
  response: Response,
  receipt: IntellicaContextReceipt
): Response {
  if (!isIntellicaReceiptsEnabled()) return response

  response.headers.set('x-intellica-migration', 'phase1-phase5')
  response.headers.set(
    'x-intellica-profile-context',
    receipt.profileContextEnabled ? '1' : '0'
  )
  response.headers.set(
    'x-intellica-upload-hardening',
    receipt.uploadHardeningEnabled ? '1' : '0'
  )

  if (receipt.locationSource) {
    response.headers.set('x-intellica-location-source', receipt.locationSource)
  }

  response.headers.set('x-intellica-mind', isIntellicaMindEnabled() ? '1' : '0')
  response.headers.set(
    'x-intellica-voice-enabled',
    isIntellicaVoiceEnabled() ? '1' : '0'
  )

  return response
}
