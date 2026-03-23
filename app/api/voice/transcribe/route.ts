import { NextRequest, NextResponse } from 'next/server'

import {
  ELEVENLABS_MAX_AUDIO_BYTES,
  isIntellicaVoiceEnabled,
  transcribeIntellicaAudioBuffer,
  validateUploadPolicy
} from '@/lib/intellica'

const ALLOWED_AUDIO_EXTENSIONS = [
  'wav',
  'mp3',
  'm4a',
  'ogg',
  'webm',
  'mpeg',
  'mp4'
]
const MAX_AUDIO_BYTES = ELEVENLABS_MAX_AUDIO_BYTES

export async function POST(req: NextRequest) {
  const startedAt = Date.now()

  if (!isIntellicaVoiceEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'INTELLICA voice is disabled',
        latencyMs: Date.now() - startedAt
      },
      { status: 503 }
    )
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid content type',
          latencyMs: Date.now() - startedAt
        },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('audio')

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Audio file is required',
          latencyMs: Date.now() - startedAt
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const policyResult = validateUploadPolicy({
      filename: file.name || 'voice-upload.bin',
      mimeType: file.type,
      sizeBytes: file.size,
      maxBytes: MAX_AUDIO_BYTES,
      buffer,
      allowedExtensions: ALLOWED_AUDIO_EXTENSIONS,
      allowedMimePrefixes: ['audio/'],
      allowArchives: false
    })

    if (!policyResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: policyResult.error,
          latencyMs: Date.now() - startedAt
        },
        { status: 400 }
      )
    }

    const result = await transcribeIntellicaAudioBuffer({
      audioBuffer: buffer,
      filename: file.name,
      mimeType: file.type
    })

    const response = NextResponse.json({
      ok: true,
      text: result.text,
      provider: result.provider,
      latencyMs: Date.now() - startedAt,
      receipt: {
        voiceEnabled: true
      }
    })

    response.headers.set('x-intellica-voice', '1')
    response.headers.set('x-intellica-voice-provider', result.provider)

    return response
  } catch (error) {
    console.error('[Voice Transcribe] Error:', error)

    const message =
      error instanceof Error ? error.message : 'Voice transcription failed'
    const status = message.includes('ELEVENLABS_API_KEY is not configured')
      ? 503
      : 502

    return NextResponse.json(
      {
        ok: false,
        error:
          status === 503
            ? 'Voice transcription is not configured'
            : 'Voice transcription failed',
        latencyMs: Date.now() - startedAt
      },
      { status }
    )
  }
}
