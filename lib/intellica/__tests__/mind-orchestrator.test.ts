import { describe, expect, it } from 'vitest'

import {
  applyIntellicaMindContext,
  buildIntellicaMindPrompt,
  detectIntellicaLiveResearchNeed
} from '@/lib/intellica/mind-orchestrator'
import { scoreIntellicaConversationMemory } from '@/lib/intellica/conversation-memory'

describe('intellica mind orchestrator', () => {
  it('detects live research needs for current sports questions', () => {
    expect(
      detectIntellicaLiveResearchNeed('Who is Arsenal playing tomorrow?')
    ).toBe(true)
    expect(
      detectIntellicaLiveResearchNeed('Summarize the principles of stoicism')
    ).toBe(false)
  })

  it('builds a specialist-aware orchestration prompt', () => {
    const prompt = buildIntellicaMindPrompt({
      query: 'What is the nearest airport hotel in Istanbul?',
      specialist: 'travel',
      liveResearchRequired: true,
      searchMode: 'adaptive',
      memorySnippets: [
        {
          chatId: 'chat-1',
          role: 'assistant',
          content: 'You previously asked about hotels near IST airport.',
          createdAt: new Date().toISOString(),
          score: 4.2
        }
      ]
    })

    expect(prompt).toContain('live or time-sensitive information')
    expect(prompt).toContain('travel specialist lens')
    expect(prompt).toContain('Relevant remembered conversation history')
  })

  it('scores relevant memory higher than unrelated memory', () => {
    const relevant = scoreIntellicaConversationMemory(
      'nearest pharmacy in Istanbul',
      'We discussed late-night pharmacies in Istanbul near Taksim yesterday.'
    )
    const unrelated = scoreIntellicaConversationMemory(
      'nearest pharmacy in Istanbul',
      'You asked about Japanese ramen recipes and kitchen knives.'
    )

    expect(relevant).toBeGreaterThan(unrelated)
  })

  it('merges the hidden profile context with the mind prompt', async () => {
    const result = await applyIntellicaMindContext({
      chatId: 'chat-1',
      searchMode: 'adaptive',
      messages: [
        {
          id: 'intellica-profile-context',
          role: 'system',
          parts: [
            {
              type: 'text',
              text: 'Personalization context for this user session:\n- Current location: Istanbul, Turkey.'
            }
          ]
        },
        {
          id: 'user-1',
          role: 'user',
          parts: [
            { type: 'text', text: 'What is the nearest pharmacy open now?' }
          ]
        }
      ]
    })

    expect(result.receipt.liveResearchRequired).toBe(true)
    expect(result.messages[0].id).toBe('intellica-profile-context')
    expect(result.messages[0].parts[0]).toMatchObject({
      type: 'text'
    })
    expect((result.messages[0].parts[0] as { text: string }).text).toContain(
      'INTELLICA mind orchestration'
    )
  })
})
