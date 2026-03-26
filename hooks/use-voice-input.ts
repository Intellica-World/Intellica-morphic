'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type VoiceInputStatus = 'idle' | 'recording' | 'transcribing'

const PREFERRED_AUDIO_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg'
]

function getSupportedAudioType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  return (
    PREFERRED_AUDIO_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ||
    ''
  )
}

interface UseVoiceInputOptions {
  onError?: (message: string) => void
  onTranscript: (transcript: string) => void
}

export function useVoiceInput({ onError, onTranscript }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  const [supported, setSupported] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    )
  }, [])

  const resetMediaState = useCallback(() => {
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    chunksRef.current = []
  }, [])

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      setStatus('transcribing')

      try {
        const formData = new FormData()
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
        formData.append('audio', blob, `intellica-voice.${extension}`)

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData
        })

        const result = (await response.json()) as {
          error?: string
          ok?: boolean
          text?: string
        }

        if (!response.ok || !result.ok || !result.text?.trim()) {
          throw new Error(result.error || 'Voice transcription failed')
        }

        onTranscript(result.text.trim())
        setStatus('idle')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Voice transcription failed'
        onError?.(message)
        setStatus('idle')
      }
    },
    [onError, onTranscript]
  )

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!supported) {
      onError?.('Voice input is not supported in this browser')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.addEventListener('dataavailable', event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        resetMediaState()

        if (blob.size > 0) {
          void uploadRecording(blob)
        } else {
          onError?.('No audio was captured')
          setStatus('idle')
        }
      })

      recorder.start()
      setStatus('recording')
    } catch (error) {
      resetMediaState()
      const message =
        error instanceof Error ? error.message : 'Unable to start recording'
      onError?.(message)
      setStatus('idle')
    }
  }, [onError, resetMediaState, supported, uploadRecording])

  const toggleRecording = useCallback(() => {
    if (status === 'recording') {
      stopRecording()
      return
    }

    if (status === 'idle') {
      void startRecording()
    }
  }, [startRecording, status, stopRecording])

  useEffect(() => {
    return () => {
      resetMediaState()
    }
  }, [resetMediaState])

  return {
    isRecording: status === 'recording',
    isTranscribing: status === 'transcribing',
    startRecording,
    status,
    stopRecording,
    supported,
    toggleRecording
  }
}
