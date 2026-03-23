import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'

import { loadChat } from '@/lib/actions/chat'
import { calculateConversationTurn, trackChatEvent } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import {
  applyIntellicaMigrationHeaders,
  INTELLICA_PROFILE_COOKIE_NAME,
  isIntellicaFullModeEnabled,
  resolveIntellicaRequestContext,
  resolveIntellicaModelType,
  resolveIntellicaSearchMode,
  withIntellicaAssistantContext
} from '@/lib/intellica'
import { checkAndEnforceOverallChatLimit } from '@/lib/rate-limit/chat-limits'
import { checkAndEnforceGuestLimit } from '@/lib/rate-limit/guest-limit'
import { createChatStreamResponse } from '@/lib/streaming/create-chat-stream-response'
import { createEphemeralChatStreamResponse } from '@/lib/streaming/create-ephemeral-chat-stream-response'
import { SearchMode } from '@/lib/types/search'
import { selectModel } from '@/lib/utils/model-selection'
import { perfLog, perfTime } from '@/lib/utils/perf-logging'
import { resetAllCounters } from '@/lib/utils/perf-tracking'
import { isProviderEnabled } from '@/lib/utils/registry'

export const maxDuration = 300

export async function POST(req: Request) {
  const startTime = performance.now()
  const abortSignal = req.signal

  // Reset counters for new request (development only)
  if (process.env.ENABLE_PERF_LOGGING === 'true') {
    resetAllCounters()
  }

  try {
    const body = await req.json()
    const {
      message,
      messages,
      chatId,
      trigger,
      messageId,
      isNewChat,
      userLocation,
      userProfile
    } = body

    perfLog(
      `API Route - Start: chatId=${chatId}, trigger=${trigger}, isNewChat=${isNewChat}`
    )

    // Handle different triggers using AI SDK standard values
    if (trigger === 'regenerate-message') {
      if (!messageId) {
        return new Response('messageId is required for regeneration', {
          status: 400,
          statusText: 'Bad Request'
        })
      }
    } else if (trigger === 'submit-message') {
      if (!message) {
        return new Response('message is required for submission', {
          status: 400,
          statusText: 'Bad Request'
        })
      }
    }

    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')

    const authStart = performance.now()
    const userId = await getCurrentUserId()
    perfTime('Auth completed', authStart)

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const guestChatEnabled = process.env.ENABLE_GUEST_CHAT === 'true'
    const isGuest = !userId
    if (isGuest && !guestChatEnabled) {
      return new Response('Authentication required', {
        status: 401,
        statusText: 'Unauthorized'
      })
    }

    if (isGuest) {
      const forwardedFor = req.headers.get('x-forwarded-for') || ''
      const ip =
        forwardedFor.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        null
      const guestLimitResponse = await checkAndEnforceGuestLimit(ip)
      if (guestLimitResponse) return guestLimitResponse
    }

    const cookieStore = await cookies()
    const normalizedProfile =
      userProfile && typeof userProfile === 'object' ? userProfile : null
    const normalizedLocation =
      userLocation && typeof userLocation === 'object' ? userLocation : null
    const intellicaContext = await resolveIntellicaRequestContext({
      request: req,
      cookieValue:
        cookieStore.get(INTELLICA_PROFILE_COOKIE_NAME)?.value ?? null,
      rawProfile: normalizedProfile
        ? {
            ...normalizedProfile,
            ...(normalizedLocation ? { location: normalizedLocation } : {})
          }
        : normalizedLocation
          ? { location: normalizedLocation }
          : null
    })

    if (intellicaContext.cookieValue) {
      cookieStore.set(
        INTELLICA_PROFILE_COOKIE_NAME,
        intellicaContext.cookieValue,
        {
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        }
      )
    }

    const fullModeEnabled = isIntellicaFullModeEnabled()
    const searchModeCookie = cookieStore.get('searchMode')?.value
    const isCloudDeployment = process.env.MORPHIC_CLOUD_DEPLOYMENT === 'true'
    const forceSpeed = !fullModeEnabled && (isGuest || isCloudDeployment)
    const searchMode: SearchMode = resolveIntellicaSearchMode({
      cookieValue: searchModeCookie,
      fullModeEnabled
    })
    const modelTypePreference = resolveIntellicaModelType({
      cookieValue: cookieStore.get('modelType')?.value,
      forceSpeed,
      fullModeEnabled
    })
    const modelCookieStore =
      forceSpeed || fullModeEnabled
        ? ({
            get: (name: string) =>
              name === 'modelType'
                ? ({ value: modelTypePreference } as const)
                : cookieStore.get(name)
          } as typeof cookieStore)
        : cookieStore

    // Select the appropriate model based on model type preference and search mode
    const selectedModel = selectModel({
      cookieStore: modelCookieStore,
      searchMode
    })

    if (!isProviderEnabled(selectedModel.providerId)) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    const modelTypeCookie = cookieStore.get('modelType')?.value
    const modelType = modelTypePreference
    if (!isGuest) {
      const overallLimitResponse = await checkAndEnforceOverallChatLimit(userId)
      if (overallLimitResponse) return overallLimitResponse
    }

    const streamStart = performance.now()
    perfLog(
      `createChatStreamResponse - Start: model=${selectedModel.providerId}:${selectedModel.id}, searchMode=${searchMode}, modelType=${modelType}`
    )

    // Convert string message to proper message object for AI SDK compatibility
    const messageObject =
      typeof message === 'string'
        ? {
            role: 'user',
            content: message,
            parts: [{ type: 'text', text: message }]
          }
        : message ?? null

    const guestMessages = withIntellicaAssistantContext(
      Array.isArray(messages) ? messages : [],
      intellicaContext.assistantContext
    )
    // Keep all answers on the grounded researcher/mind pipeline until the
    // specialist agents can return real responses instead of scaffold text.

    const response = isGuest
      ? await createEphemeralChatStreamResponse({
          messages: guestMessages,
          model: selectedModel,
          abortSignal,
          searchMode,
          modelType,
          chatId
        })
      : await createChatStreamResponse({
          message: messageObject,
          model: selectedModel,
          chatId,
          userId: userId, // userId is guaranteed to be non-null after authentication check above
          trigger,
          messageId,
          abortSignal,
          isNewChat,
          assistantContext: intellicaContext.assistantContext,
          searchMode,
          modelType
        })

    perfTime('createChatStreamResponse resolved', streamStart)

    // Track analytics event (non-blocking)
    // Calculate conversation turn by loading chat history
    ;(async () => {
      try {
        let conversationTurn = 1 // Default for new chats

        // For existing chats, load history and calculate turn number
        if (!isNewChat && !isGuest) {
          const chat = await loadChat(chatId, userId)
          if (chat?.messages) {
            // Add 1 to account for the current message being sent
            conversationTurn = calculateConversationTurn(chat.messages) + 1
          }
        }

        if (!isGuest && userId) {
          await trackChatEvent({
            searchMode,
            modelType,
            conversationTurn,
            isNewChat: isNewChat ?? false,
            trigger:
              (trigger as 'submit-message' | 'regenerate-message') ??
              'submit-message',
            chatId,
            userId,
            modelId: selectedModel.id
          })
        }
      } catch (error) {
        // Log error but don't throw - analytics should never break the app
        console.error('Analytics tracking failed:', error)
      }
    })()

    // Invalidate the cache for this specific chat after creating the response
    // This ensures the next load will get fresh data
    if (chatId && !isGuest) {
      revalidateTag(`chat-${chatId}`, 'max')
    }

    const totalTime = performance.now() - startTime
    perfLog(`Total API route time: ${totalTime.toFixed(2)}ms`)
    perfLog(`=== Summary ===`)
    perfLog(`Chat Type: ${isNewChat ? 'NEW' : 'EXISTING'}`)
    perfLog(`Total Time: ${totalTime.toFixed(2)}ms`)
    perfLog(`================`)

    return applyIntellicaMigrationHeaders(response, intellicaContext.receipt)
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
