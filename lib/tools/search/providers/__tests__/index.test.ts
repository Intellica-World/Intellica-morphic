import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getSearchProviderFallbackOrder,
  isSearchProviderConfigured
} from '@/lib/tools/search/providers'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('search provider fallback order', () => {
  it('keeps Tavily first for optimized searches and adds configured backups', () => {
    vi.stubEnv('SEARCH_API', 'tavily')
    vi.stubEnv('TAVILY_API_KEY', 'tavily-key')
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-key')
    vi.stubEnv('EXA_API_KEY', 'exa-key')

    expect(
      getSearchProviderFallbackOrder({
        type: 'optimized',
        primary: 'tavily'
      })
    ).toEqual(['tavily', 'brave', 'exa'])
  })

  it('prefers Brave for general searches when available, then falls back', () => {
    vi.stubEnv('SEARCH_API', 'tavily')
    vi.stubEnv('TAVILY_API_KEY', 'tavily-key')
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-key')

    expect(
      getSearchProviderFallbackOrder({
        type: 'general',
        primary: 'tavily'
      })
    ).toEqual(['brave', 'tavily'])
  })

  it('detects provider configuration from environment', () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'firecrawl-key')

    expect(isSearchProviderConfigured('firecrawl')).toBe(true)
    expect(isSearchProviderConfigured('tavily')).toBe(false)
  })
})
