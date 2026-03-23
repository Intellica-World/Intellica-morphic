const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1'

export const ELEVENLABS_MAX_AUDIO_BYTES = 25 * 1024 * 1024
export const ELEVENLABS_TRANSCRIPTION_MODEL = 'scribe_v1'
export const ELEVENLABS_TTS_MODEL = 'eleven_multilingual_v2'
export const ELEVENLABS_TTS_OUTPUT_FORMAT = 'mp3_44100_128'
export const ELEVENLABS_FALLBACK_VOICE_ID = 'CwhRBWXzGAHq8TQ4Fs17'

export interface IntellicaAudioTranscriptionInput {
  audioBuffer: Uint8Array
  filename?: string | null
  mimeType?: string | null
  languageCode?: string | null
}

export interface IntellicaAudioTranscriptionResult {
  provider: 'elevenlabs-stt'
  text: string
}

export interface IntellicaSpeechSynthesisResult {
  audioBuffer: Buffer
  mimeType: 'audio/mpeg'
  provider: 'elevenlabs-tts'
  voiceId: string
}

function getElevenLabsApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured')
  }

  return apiKey
}

function getVoiceCandidates(): string[] {
  return Array.from(
    new Set(
      [process.env.ELEVENLABS_VOICE_ID?.trim(), ELEVENLABS_FALLBACK_VOICE_ID]
        .filter(Boolean)
        .map(voiceId => voiceId as string)
    )
  )
}

async function parseProviderError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const payload = await response.json()
      if (typeof payload?.detail?.message === 'string') {
        return payload.detail.message
      }

      if (typeof payload?.detail === 'string') {
        return payload.detail
      }

      if (typeof payload?.error === 'string') {
        return payload.error
      }

      if (typeof payload?.message === 'string') {
        return payload.message
      }

      return JSON.stringify(payload)
    } catch {
      return response.statusText || 'Unknown provider error'
    }
  }

  try {
    const text = await response.text()
    return text || response.statusText || 'Unknown provider error'
  } catch {
    return response.statusText || 'Unknown provider error'
  }
}

export async function transcribeIntellicaAudioBuffer(
  input: IntellicaAudioTranscriptionInput
): Promise<IntellicaAudioTranscriptionResult> {
  const apiKey = getElevenLabsApiKey()
  const formData = new FormData()

  formData.append('model_id', ELEVENLABS_TRANSCRIPTION_MODEL)
  if (input.languageCode?.trim()) {
    formData.append('language_code', input.languageCode.trim())
  }

  formData.append(
    'file',
    new Blob([Buffer.from(input.audioBuffer)], {
      type: input.mimeType?.trim() || 'audio/webm'
    }),
    input.filename?.trim() || 'intellica-voice-upload.webm'
  )

  const response = await fetch(`${ELEVENLABS_API_BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey
    },
    body: formData
  })

  if (!response.ok) {
    const message = await parseProviderError(response)
    throw new Error(`ElevenLabs transcription failed: ${message}`)
  }

  const payload = await response.json()
  const text = typeof payload?.text === 'string' ? payload.text.trim() : ''

  if (!text) {
    throw new Error('ElevenLabs transcription failed: empty transcript')
  }

  return {
    provider: 'elevenlabs-stt',
    text
  }
}

async function synthesizeWithVoiceCandidate(input: {
  apiKey: string
  text: string
  voiceId: string
}): Promise<IntellicaSpeechSynthesisResult> {
  const response = await fetch(
    `${ELEVENLABS_API_BASE_URL}/text-to-speech/${input.voiceId}?output_format=${ELEVENLABS_TTS_OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': input.apiKey
      },
      body: JSON.stringify({
        model_id: ELEVENLABS_TTS_MODEL,
        text: input.text
      })
    }
  )

  if (!response.ok) {
    const message = await parseProviderError(response)
    throw new Error(message)
  }

  return {
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    mimeType: 'audio/mpeg',
    provider: 'elevenlabs-tts',
    voiceId: input.voiceId
  }
}

export async function synthesizeIntellicaSpeech(
  text: string
): Promise<IntellicaSpeechSynthesisResult> {
  const apiKey = getElevenLabsApiKey()
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new Error('Speech synthesis requires non-empty text')
  }

  const voiceCandidates = getVoiceCandidates()
  let lastError: Error | null = null

  for (const voiceId of voiceCandidates) {
    try {
      return await synthesizeWithVoiceCandidate({
        apiKey,
        text: trimmedText,
        voiceId
      })
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Voice synthesis failed')
    }
  }

  throw new Error(
    `ElevenLabs synthesis failed: ${lastError?.message || 'Unknown provider error'}`
  )
}
