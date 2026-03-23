import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ELEVENLABS_FALLBACK_VOICE_ID,
  ELEVENLABS_TRANSCRIPTION_MODEL,
  ELEVENLABS_TTS_MODEL,
  synthesizeIntellicaSpeech,
  transcribeIntellicaAudioBuffer
} from '@/lib/intellica/voice'

const originalEnv = { ...process.env }

describe('intellica voice helpers', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      FEATURE_INTELLICA_MIGRATION_V1: 'true',
      FEATURE_INTELLICA_VOICE_V1: 'true',
      ELEVENLABS_API_KEY: 'test-elevenlabs-key'
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('transcribes audio through ElevenLabs speech-to-text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: 'Find me coffee near Galata Tower'
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await transcribeIntellicaAudioBuffer({
      audioBuffer: Buffer.from('voice-sample'),
      filename: 'sample.webm',
      mimeType: 'audio/webm'
    })

    expect(result).toEqual({
      provider: 'elevenlabs-stt',
      text: 'Find me coffee near Galata Tower'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.elevenlabs.io/v1/speech-to-text')
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-elevenlabs-key'
        }),
        body: expect.any(FormData)
      })
    )

    const formData = init.body as FormData
    expect(formData.get('model_id')).toBe(ELEVENLABS_TRANSCRIPTION_MODEL)
  })

  it('synthesizes speech through ElevenLabs TTS and returns mp3 audio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Buffer.from('mp3-audio'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' }
      })
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await synthesizeIntellicaSpeech('Voice check')

    expect(result).toEqual(
      expect.objectContaining({
        provider: 'elevenlabs-tts',
        mimeType: 'audio/mpeg',
        voiceId: ELEVENLABS_FALLBACK_VOICE_ID
      })
    )
    expect(result.audioBuffer.toString()).toBe('mp3-audio')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_FALLBACK_VOICE_ID}?output_format=mp3_44100_128`
    )
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': 'test-elevenlabs-key'
        })
      })
    )

    expect(JSON.parse(String(init.body))).toEqual({
      model_id: ELEVENLABS_TTS_MODEL,
      text: 'Voice check'
    })
  })

  it('falls back to the premade voice when the configured voice is rejected', async () => {
    process.env.ELEVENLABS_VOICE_ID = 'restricted-voice'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: {
              message: 'Voice requires a higher plan'
            }
          }),
          {
            status: 403,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('fallback-audio'), {
          status: 200,
          headers: { 'content-type': 'audio/mpeg' }
        })
      )

    vi.stubGlobal('fetch', fetchMock)

    const result = await synthesizeIntellicaSpeech('Fallback voice check')

    expect(result.voiceId).toBe(ELEVENLABS_FALLBACK_VOICE_ID)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_FALLBACK_VOICE_ID}?output_format=mp3_44100_128`
    )
  })
})
