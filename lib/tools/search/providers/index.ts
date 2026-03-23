import { SearchProvider } from './base'
import { BraveSearchProvider } from './brave'
import { ExaSearchProvider } from './exa'
import { FirecrawlSearchProvider } from './firecrawl'
import { SearXNGSearchProvider } from './searxng'
import { TavilySearchProvider } from './tavily'

export type SearchProviderType =
  | 'tavily'
  | 'exa'
  | 'searxng'
  | 'firecrawl'
  | 'brave'
export const DEFAULT_PROVIDER: SearchProviderType = 'tavily'

const PROVIDER_ENV_CHECKS: Record<SearchProviderType, () => boolean> = {
  tavily: () => Boolean(process.env.TAVILY_API_KEY),
  exa: () => Boolean(process.env.EXA_API_KEY),
  searxng: () => Boolean(process.env.SEARXNG_API_URL),
  firecrawl: () => Boolean(process.env.FIRECRAWL_API_KEY),
  brave: () => Boolean(process.env.BRAVE_SEARCH_API_KEY)
}

export function createSearchProvider(
  type?: SearchProviderType
): SearchProvider {
  const providerType =
    type || (process.env.SEARCH_API as SearchProviderType) || DEFAULT_PROVIDER

  switch (providerType) {
    case 'tavily':
      return new TavilySearchProvider()
    case 'exa':
      return new ExaSearchProvider()
    case 'searxng':
      return new SearXNGSearchProvider()
    case 'brave':
      return new BraveSearchProvider()
    case 'firecrawl':
      return new FirecrawlSearchProvider()
    default:
      // Default to TavilySearchProvider if an unknown provider is specified
      return new TavilySearchProvider()
  }
}

export function isSearchProviderConfigured(type: SearchProviderType): boolean {
  return PROVIDER_ENV_CHECKS[type]()
}

export function getSearchProviderFallbackOrder(input?: {
  type?: 'general' | 'optimized'
  primary?: SearchProviderType
}): SearchProviderType[] {
  const uniqueProviders = new Set<SearchProviderType>()
  const configuredPrimary =
    input?.primary ||
    (process.env.SEARCH_API as SearchProviderType) ||
    DEFAULT_PROVIDER

  if (input?.type === 'general' && isSearchProviderConfigured('brave')) {
    uniqueProviders.add('brave')
  }

  uniqueProviders.add(configuredPrimary)

  for (const candidate of [
    'tavily',
    'brave',
    'exa',
    'firecrawl',
    'searxng'
  ] satisfies SearchProviderType[]) {
    if (isSearchProviderConfigured(candidate)) {
      uniqueProviders.add(candidate)
    }
  }

  return [...uniqueProviders]
}

export { BraveSearchProvider } from './brave'
export type { ExaSearchProvider } from './exa'
export type { FirecrawlSearchProvider } from './firecrawl'
export { SearXNGSearchProvider } from './searxng'
export { TavilySearchProvider } from './tavily'
export type { SearchProvider }
