import { and, desc, eq, ne } from 'drizzle-orm'

import { chats, messages, parts } from '@/lib/db/schema'
import { withRLS } from '@/lib/db/with-rls'

import { isIntellicaConversationMemoryEnabled } from './feature-flags'

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'we',
  'what',
  'when',
  'where',
  'who',
  'with',
  'you',
  'your'
])

export interface IntellicaConversationMemorySnippet {
  chatId: string
  role: string
  content: string
  createdAt: string
  score: number
}

function normalizeMemoryText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function tokenizeIntellicaMemoryQuery(query: string): string[] {
  return Array.from(
    new Set(
      normalizeMemoryText(query)
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map(token => token.trim())
        .filter(token => token.length >= 3 && !STOP_WORDS.has(token))
    )
  )
}

function getRecencyBonus(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (ageMs <= oneDay) return 0.4
  if (ageMs <= oneDay * 7) return 0.25
  if (ageMs <= oneDay * 30) return 0.1
  return 0
}

export function scoreIntellicaConversationMemory(
  query: string,
  content: string,
  createdAt = new Date()
): number {
  const queryTokens = tokenizeIntellicaMemoryQuery(query)
  const normalizedContent = normalizeMemoryText(content).toLowerCase()

  if (queryTokens.length === 0 || !normalizedContent) {
    return 0
  }

  const tokenMatches = queryTokens.filter(token =>
    normalizedContent.includes(token)
  ).length

  if (tokenMatches === 0) {
    return 0
  }

  const exactPhraseBonus = normalizedContent.includes(
    normalizeMemoryText(query).toLowerCase()
  )
    ? 1.5
    : 0

  const coverageScore = tokenMatches / queryTokens.length

  return (
    coverageScore * 3 +
    tokenMatches * 0.3 +
    exactPhraseBonus +
    getRecencyBonus(createdAt)
  )
}

function clipMemorySnippet(content: string, maxLength = 220): string {
  const normalized = normalizeMemoryText(content)
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export async function searchIntellicaConversationMemory(input: {
  currentChatId?: string
  limit?: number
  query: string
  userId?: string | null
}): Promise<IntellicaConversationMemorySnippet[]> {
  const { currentChatId, limit = 4, query, userId } = input

  if (
    !isIntellicaConversationMemoryEnabled() ||
    !userId ||
    !query.trim().length
  ) {
    return []
  }

  return withRLS(userId, async tx => {
    const conditions = [eq(chats.userId, userId), eq(parts.type, 'text')]

    if (currentChatId) {
      conditions.push(ne(messages.chatId, currentChatId))
    }

    const rows = await tx
      .select({
        chatId: messages.chatId,
        role: messages.role,
        createdAt: messages.createdAt,
        content: parts.text_text
      })
      .from(messages)
      .innerJoin(chats, eq(chats.id, messages.chatId))
      .innerJoin(parts, eq(parts.messageId, messages.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(80)

    return rows
      .map(row => {
        const content = clipMemorySnippet(row.content || '')
        const createdAt = row.createdAt || new Date(0)

        return {
          chatId: row.chatId,
          role: row.role,
          content,
          createdAt: createdAt.toISOString(),
          score: scoreIntellicaConversationMemory(query, content, createdAt)
        }
      })
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  })
}
