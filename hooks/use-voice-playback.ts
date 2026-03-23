'use client'

import { useCallback, useEffect, useState } from 'react'

let activePlaybackId: string | null = null
let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null

const listeners = new Set<(playbackId: string | null) => void>()

function notifyListeners(playbackId: string | null) {
  for (const listener of listeners) {
    listener(playbackId)
  }
}

function cleanupActiveAudio() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }

  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = null
  }

  activePlaybackId = null
  notifyListeners(null)
}

export function normalizeVoiceText(text: string): string {
  return text
    .replace(/\[\s*\d+\s*\]\(#([^)]+)\)/g, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

async function startVoicePlayback(
  playbackId: string,
  text: string
): Promise<void> {
  const normalizedText = normalizeVoiceText(text)

  if (!normalizedText) {
    throw new Error('Nothing to play')
  }

  cleanupActiveAudio()

  const response = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: normalizedText })
  })

  if (!response.ok) {
    let message = 'Voice playback failed'
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload?.error) {
        message = payload.error
      }
    } catch {
      // Ignore JSON parsing issues and keep the default message.
    }

    throw new Error(message)
  }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)
  const audio = new Audio(audioUrl)

  activePlaybackId = playbackId
  activeAudio = audio
  activeAudioUrl = audioUrl
  notifyListeners(playbackId)

  const handleEnd = () => {
    cleanupActiveAudio()
  }

  audio.addEventListener('ended', handleEnd, { once: true })
  audio.addEventListener('error', handleEnd, { once: true })

  try {
    await audio.play()
  } catch (error) {
    cleanupActiveAudio()

    throw error instanceof Error
      ? error
      : new Error('Voice playback could not start')
  }
}

export async function playVoiceResponse(
  playbackId: string,
  text: string
): Promise<void> {
  await startVoicePlayback(playbackId, text)
}

export function stopVoicePlayback() {
  cleanupActiveAudio()
}

export function useVoicePlayback(playbackId: string, text: string) {
  const [isSpeaking, setIsSpeaking] = useState(activePlaybackId === playbackId)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const listener = (currentPlaybackId: string | null) => {
      setIsSpeaking(currentPlaybackId === playbackId)
      if (currentPlaybackId !== playbackId) {
        setIsLoading(false)
      }
    }

    listeners.add(listener)
    listener(activePlaybackId)

    return () => {
      listeners.delete(listener)
    }
  }, [playbackId])

  const stop = useCallback(() => {
    stopVoicePlayback()
  }, [])

  const play = useCallback(async () => {
    setIsLoading(true)

    try {
      await startVoicePlayback(playbackId, text)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)

      throw error instanceof Error
        ? error
        : new Error('Voice playback could not start')
    }
  }, [playbackId, text])

  const toggle = useCallback(async () => {
    if (activePlaybackId === playbackId) {
      stop()
      return
    }

    await play()
  }, [play, playbackId, stop])

  return {
    isLoading,
    isSpeaking,
    stop,
    toggle
  }
}
