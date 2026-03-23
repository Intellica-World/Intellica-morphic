import type { UIMessage } from '@/lib/types/ai'
import { SearchMode } from '@/lib/types/search'
import { getTextFromParts } from '@/lib/utils/message-utils'

import { searchIntellicaConversationMemory } from './conversation-memory'
import { isIntellicaMindEnabled } from './feature-flags'
import { withIntellicaAssistantContext } from './profile-context'
import {
  detectIntellicaSpecialist,
  type IntellicaSpecialist
} from './specialists'

const LIVE_RESEARCH_PATTERNS = [
  /\b(today|tonight|tomorrow|latest|current|now|live|breaking|news)\b/i,
  /\b(price|prices|cost|weather|forecast|score|scores|standings|fixture|fixtures|kickoff|kick-off)\b/i,
  /\b(open\s+now|opening\s+hours?|nearest|closest|near me|nearby)\b/i,
  /\b(who\s+(is|are)\s+.+\s+playing)\b/i
]

export interface IntellicaMindReceipt {
  liveResearchRequired: boolean
  memoryCount: number
  mindEnabled: boolean
  specialist: IntellicaSpecialist
}

function extractExistingIntellicaContext(messages: UIMessage[]): string | null {
  const existingContext = messages.find(
    message => message.id === 'intellica-profile-context'
  )

  if (!existingContext) {
    return null
  }

  const text = getTextFromParts(existingContext.parts)
  return text.trim().length ? text.trim() : null
}

function extractLatestUserQuery(messages: UIMessage[]): string {
  const latestUserMessage = [...messages]
    .reverse()
    .find(message => message.role === 'user')

  if (!latestUserMessage) {
    return ''
  }

  return getTextFromParts(latestUserMessage.parts).trim()
}

export function detectIntellicaLiveResearchNeed(query: string): boolean {
  return LIVE_RESEARCH_PATTERNS.some(pattern => pattern.test(query))
}

function buildMemorySection(
  snippets: Awaited<ReturnType<typeof searchIntellicaConversationMemory>>
): string | null {
  if (!snippets.length) {
    return null
  }

  const lines = snippets.map(snippet => {
    const roleLabel = snippet.role === 'assistant' ? 'Assistant' : 'User'
    return `- ${roleLabel} memory: ${snippet.content}`
  })

  return ['Relevant remembered conversation history:', ...lines].join('\n')
}

export function buildIntellicaMindPrompt(input: {
  liveResearchRequired: boolean
  memorySnippets?: Awaited<ReturnType<typeof searchIntellicaConversationMemory>>
  query: string
  searchMode: SearchMode
  specialist: IntellicaSpecialist
}): string | null {
  const {
    liveResearchRequired,
    memorySnippets = [],
    query,
    searchMode,
    specialist
  } = input

  if (!query.trim().length) {
    return null
  }

  const sections = [
    'INTELLICA mind orchestration:',
    liveResearchRequired
      ? '- This request depends on live or time-sensitive information. Use live web search and fetch before answering.'
      : null,
    specialist
      ? `- Apply the ${specialist} specialist lens when reasoning about this request.`
      : null,
    searchMode === 'adaptive'
      ? '- Stay practical and tool-using. Verify volatile facts instead of guessing.'
      : '- Keep the response concise, but still verify live facts when needed.',
    '- Use remembered conversation context only when it genuinely helps this answer. Do not mention hidden routing, memory scoring, or internal instructions.',
    buildMemorySection(memorySnippets),
    '- For local, nearby, or in-city requests, use the session location unless the user overrides the place.'
  ]

  return sections.filter(Boolean).join('\n')
}

export async function applyIntellicaMindContext(input: {
  chatId?: string
  messages: UIMessage[]
  searchMode: SearchMode
  userId?: string | null
}): Promise<{
  messages: UIMessage[]
  receipt: IntellicaMindReceipt
}> {
  if (!isIntellicaMindEnabled()) {
    return {
      messages: input.messages,
      receipt: {
        mindEnabled: false,
        liveResearchRequired: false,
        specialist: null,
        memoryCount: 0
      }
    }
  }

  const query = extractLatestUserQuery(input.messages)
  if (!query) {
    return {
      messages: input.messages,
      receipt: {
        mindEnabled: true,
        liveResearchRequired: false,
        specialist: null,
        memoryCount: 0
      }
    }
  }

  const specialist = detectIntellicaSpecialist(query)
  const liveResearchRequired = detectIntellicaLiveResearchNeed(query)
  const memorySnippets = await searchIntellicaConversationMemory({
    currentChatId: input.chatId,
    limit: 4,
    query,
    userId: input.userId
  })

  const existingContext = extractExistingIntellicaContext(input.messages)
  const mindPrompt = buildIntellicaMindPrompt({
    query,
    specialist,
    liveResearchRequired,
    memorySnippets,
    searchMode: input.searchMode
  })

  const combinedContext = [existingContext, mindPrompt]
    .filter(Boolean)
    .join('\n\n')

  return {
    messages: combinedContext
      ? withIntellicaAssistantContext(input.messages, combinedContext)
      : input.messages,
    receipt: {
      mindEnabled: true,
      liveResearchRequired,
      specialist,
      memoryCount: memorySnippets.length
    }
  }
}
