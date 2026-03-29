/**
 * INTELLICA Vibe Coding — Intent Detector
 *
 * Detects whether a user prompt is a build/creation request
 * that should be routed to the vibe coding engine instead of
 * the regular search/chat pipeline.
 */

export type VibeCodingType =
  | 'app'
  | 'landing-page'
  | 'dashboard'
  | 'game'
  | 'component'
  | 'api'
  | 'product'

export interface VibeCodingDetection {
  isVibeCoding: boolean
  type: VibeCodingType
  confidence: 'high' | 'medium'
  uiStyle: 'modern' | 'minimal' | 'glassmorphism' | 'dark-pro' | 'enterprise' | 'playful'
  platform: 'web' | 'mobile' | 'desktop' | 'pwa'
}

const BUILD_VERBS =
  /\b(build|make|create|design|generate|code|develop|write|prototype|scaffold|spin up|set up|put together|implement)\b/i

const CREATION_PHRASES =
  /\b(i (want|need|would like)|can you (make|build|create|design|give me)|show me|give me|i'd like)\b/i

const APP_NOUNS =
  /\b(app|application|website|web site|webapp|web app|site|portal|platform|tool|dashboard|admin|panel|interface|ui|frontend|backend|api|service|saas|product|startup|system|calculator|converter|tracker|manager|planner|scheduler|crm|erp|cms|shop|store|marketplace|chatbot|bot)\b/i

const LANDING_PAGE =
  /\b(landing page|home page|homepage|portfolio|marketing page|sales page|promo page)\b/i

const GAME_NOUNS =
  /\b(game|arcade|puzzle|quiz|trivia|pac[- ]?man|space invader|tetris|chess|checkers|snake|platformer|shooter|rpg)\b/i

const DASHBOARD_NOUNS =
  /\b(dashboard|analytics|metrics|stats|report|chart|graph|kpi|monitoring|admin panel|control panel|data visuali[sz]ation)\b/i

const COMPONENT_NOUNS =
  /\b(component|button|form|modal|sidebar|navbar|navigation|header|footer|card|table|list|grid|carousel|slider|dropdown|menu)\b/i

const STYLE_HINTS: Record<string, VibeCodingDetection['uiStyle']> = {
  minimal: 'minimal',
  minimalist: 'minimal',
  'clean and simple': 'minimal',
  glass: 'glassmorphism',
  glassmorphism: 'glassmorphism',
  frosted: 'glassmorphism',
  dark: 'dark-pro',
  'dark mode': 'dark-pro',
  'dark theme': 'dark-pro',
  professional: 'enterprise',
  corporate: 'enterprise',
  enterprise: 'enterprise',
  fun: 'playful',
  playful: 'playful',
  colorful: 'playful',
  cute: 'playful',
}

function detectStyle(prompt: string): VibeCodingDetection['uiStyle'] {
  const lower = prompt.toLowerCase()
  for (const [hint, style] of Object.entries(STYLE_HINTS)) {
    if (lower.includes(hint)) return style
  }
  return 'modern'
}

function detectPlatform(prompt: string): VibeCodingDetection['platform'] {
  const lower = prompt.toLowerCase()
  if (/\b(mobile|ios|android|react native|flutter|phone)\b/.test(lower)) return 'mobile'
  if (/\b(desktop|electron|native app|windows app|mac app)\b/.test(lower)) return 'desktop'
  if (/\bpwa\b/.test(lower)) return 'pwa'
  return 'web'
}

export function detectVibeCoding(prompt: string): VibeCodingDetection {
  const text = prompt.trim()
  if (!text || text.length < 5) {
    return { isVibeCoding: false, type: 'app', confidence: 'medium', uiStyle: 'modern', platform: 'web' }
  }

  const hasBuildVerb = BUILD_VERBS.test(text)
  const hasCreationPhrase = CREATION_PHRASES.test(text)
  const hasAppNoun = APP_NOUNS.test(text)
  const hasLandingPage = LANDING_PAGE.test(text)
  const hasGame = GAME_NOUNS.test(text)
  const hasDashboard = DASHBOARD_NOUNS.test(text)
  const hasComponent = COMPONENT_NOUNS.test(text)

  const isVibeCoding =
    (hasBuildVerb || hasCreationPhrase) &&
    (hasAppNoun || hasLandingPage || hasGame || hasDashboard || hasComponent)

  if (!isVibeCoding) {
    return { isVibeCoding: false, type: 'app', confidence: 'medium', uiStyle: 'modern', platform: 'web' }
  }

  let type: VibeCodingType = 'app'
  if (hasGame) type = 'game'
  else if (hasLandingPage) type = 'landing-page'
  else if (hasDashboard) type = 'dashboard'
  else if (hasComponent) type = 'component'
  else if (/\b(api|backend|server|endpoint|service)\b/i.test(text)) type = 'api'
  else if (/\b(saas|platform|startup|product|marketplace)\b/i.test(text)) type = 'product'

  const confidence: VibeCodingDetection['confidence'] =
    hasBuildVerb && (hasAppNoun || hasLandingPage || hasGame) ? 'high' : 'medium'

  return {
    isVibeCoding: true,
    type,
    confidence,
    uiStyle: detectStyle(text),
    platform: detectPlatform(text),
  }
}
