import { NextRequest, NextResponse } from 'next/server'

import {
  isIntellicaVoiceEnabled,
  synthesizeIntellicaSpeech
} from '@/lib/intellica'

const MAX_TTS_CHARS = 4000

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
    const body = await req.json()
    const text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Text is required',
          latencyMs: Date.now() - startedAt
        },
        { status: 400 }
      )
    }

    if (text.length > MAX_TTS_CHARS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Text exceeds ${MAX_TTS_CHARS} character limit`,
          latencyMs: Date.now() - startedAt
        },
        { status: 400 }
      )
    }

    const result = await synthesizeIntellicaSpeech(text)
    const response = new NextResponse(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        'content-length': String(result.audioBuffer.length),
        'content-type': result.mimeType,
        'x-intellica-voice': '1',
        'x-intellica-voice-provider': result.provider,
        'x-intellica-voice-latency-ms': String(Date.now() - startedAt)
      }
    })

    return response
  } catch (error) {
    console.error('[Voice TTS] Error:', error)

    const message =
      error instanceof Error ? error.message : 'Voice synthesis failed'
    const status = message.includes('ELEVENLABS_API_KEY is not configured')
      ? 503
      : 502

    return NextResponse.json(
      {
        ok: false,
        error:
          status === 503
            ? 'Voice synthesis is not configured'
            : 'Voice synthesis failed',
        latencyMs: Date.now() - startedAt
      },
      { status }
    )
  }
}
