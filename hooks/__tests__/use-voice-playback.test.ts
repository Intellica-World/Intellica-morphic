import { describe, expect, it } from 'vitest'

import { normalizeVoiceText } from '../use-voice-playback'

describe('normalizeVoiceText', () => {
  it('strips citations and markdown links for speech playback', () => {
    expect(
      normalizeVoiceText(
        'Nearest cafe is [1](#tool-call). See [Galata](https://example.com) for details.'
      )
    ).toBe('Nearest cafe is . See Galata for details.')
  })

  it('removes markdown formatting noise and collapses whitespace', () => {
    expect(
      normalizeVoiceText('# Heading\n\n- First item\n- `Code` sample')
    ).toBe('Heading First item Code sample')
  })
})
