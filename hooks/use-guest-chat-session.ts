'use client'

import { Dispatch, SetStateAction, useEffect, useRef } from 'react'

import type { UIMessage } from '@/lib/types/ai'

const GUEST_CHAT_STORAGE_KEY = 'intellica:guest-chat:v1'

interface PersistedGuestChat {
  chatId: string
  messages: UIMessage[]
}

function readGuestChat(): PersistedGuestChat | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(GUEST_CHAT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedGuestChat

    if (!parsed.chatId || !Array.isArray(parsed.messages)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearGuestChatSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(GUEST_CHAT_STORAGE_KEY)
}

export function useGuestChatSession(input: {
  chatId: string
  isGuest: boolean
  messages: UIMessage[]
  savedMessages: UIMessage[]
  setChatId: Dispatch<SetStateAction<string>>
  setMessages: (messages: UIMessage[]) => void
}) {
  const hydratedRef = useRef(!input.isGuest)

  useEffect(() => {
    if (!input.isGuest || hydratedRef.current) return
    hydratedRef.current = true

    if (input.savedMessages.length > 0 || input.messages.length > 0) return

    const persisted = readGuestChat()
    if (!persisted) return

    input.setChatId(persisted.chatId)
    input.setMessages(persisted.messages)
  }, [input])

  useEffect(() => {
    if (
      !input.isGuest ||
      !hydratedRef.current ||
      typeof window === 'undefined'
    ) {
      return
    }

    if (input.messages.length === 0) {
      window.localStorage.removeItem(GUEST_CHAT_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      GUEST_CHAT_STORAGE_KEY,
      JSON.stringify({
        chatId: input.chatId,
        messages: input.messages
      } satisfies PersistedGuestChat)
    )
  }, [input.chatId, input.isGuest, input.messages])
}
