/**
 * INTELLICA Agent Router
 * Routes user queries to appropriate specialist agents
 * Determines domain, selects agent, and executes specialized responses
 */

import { agentRegistry } from './agent-registry'
import type { Agent, AgentRole } from './types'

export interface AgentRoutingResult {
  selectedAgent: Agent | null
  confidence: number
  reasoning: string
  domain: string
  agentRole: AgentRole | null
  shouldRoute: boolean
}

export class AgentRouter {
  private static instance: AgentRouter

  static getInstance(): AgentRouter {
    if (!AgentRouter.instance) {
      AgentRouter.instance = new AgentRouter()
    }
    return AgentRouter.instance
  }

  // Domain keyword mapping for agent selection
  private domainKeywords = {
    legal: [
      'law', 'legal', 'contract', 'sue', 'court', 'lawyer', 'attorney', 'barrister',
      'solicitor', 'lawsuit', 'litigation', 'regulation', 'compliance', 'jurisdiction',
      'statute', 'precedent', 'legal advice', 'legal rights'
    ],
    business: [
      'business', 'company', 'corporation', 'startup', 'entrepreneur', 'offshore',
      'structuring', 'tax', 'corporate', 'merger', 'acquisition', 'investment',
      'business plan', 'strategy', 'revenue', 'profit', 'business model'
    ],
    architecture: [
      'architecture', 'building', 'design', 'construction', 'planning', 'blueprint',
      'architect', 'structural', 'urban planning', 'interior design', 'landscape',
      'building design', 'construction project', 'zoning', 'permit'
    ],
    medical: [
      'medical', 'health', 'doctor', 'medicine', 'diagnosis', 'treatment', 'symptoms',
      'disease', 'healthcare', 'hospital', 'clinic', 'pharmacy', 'medical advice',
      'wellness', 'fitness', 'nutrition', 'mental health'
    ],
    finance: [
      'finance', 'financial', 'investment', 'stock', 'trading', 'portfolio', 'wealth',
      'financial planning', 'retirement', 'insurance', 'banking', 'credit', 'loan',
      'mortgage', 'tax planning', 'financial advice'
    ],
    property: [
      'property', 'real estate', 'house', 'home', 'apartment', 'rent', 'buy house',
      'mortgage', 'property investment', 'landlord', 'tenant', 'rental', 'realty',
      'property market', 'housing market'
    ],
    travel: [
      'travel', 'flight', 'hotel', 'vacation', 'holiday', 'trip', 'booking',
      'airline', 'resort', 'cruise', 'tourism', 'destination', 'itinerary',
      'travel planning', 'accommodation', 'travel insurance'
    ],
    research: [
      'research', 'study', 'analysis', 'investigate', 'data', 'statistics',
      'report', 'findings', 'survey', 'experiment', 'academic', 'scholarly',
      'research paper', 'data analysis', 'market research'
    ],
    'ip-specialist': [
      'patent', 'trademark', 'copyright', 'intellectual property', 'IP', 'patent application',
      'trademark registration', 'copyright protection', 'trade secret', 'IP law',
      'patent search', 'brand protection', 'IP rights', 'invention'
    ],
    'voice-action': [
      'voice command', 'voice action', 'execute', 'calendar', 'contact', 'book',
      'schedule', 'appointment', 'meeting', 'reminder', 'voice control',
      'hands-free', 'voice assistant', 'voice automation'
    ],
    creative: [
      'creative', 'design', 'adobe', 'photoshop', 'illustrator', 'graphic design',
      'logo', 'branding', 'visual design', 'creative work', 'artwork',
      'design software', 'creative suite', 'digital art'
    ],
    engineering: [
      'code', 'programming', 'software', 'development', 'engineering', 'technical',
      'algorithm', 'database', 'API', 'system architecture', 'debug', 'optimize',
      'coding', 'web development', 'app development', 'technical solution'
    ],
    sports: [
      'sports', 'football', 'soccer', 'rugby', 'tennis', 'golf', 'cricket', 'basketball',
      'formula1', 'F1', 'olympics', 'premiership', 'champions league', 'world cup',
      'match', 'game', 'team', 'player', 'commentary', 'analysis', 'prediction',
      'tactical', 'coach', 'referee', 'score', 'goal', 'tournament', 'league'
    ],
    commodities: [
      'commodities', 'gold', 'silver', 'oil', 'gas', 'energy', 'metals', 'trading',
      'markets', 'futures', 'prices', 'commodity', 'bullion', 'precious metals',
      'agriculture', 'wheat', 'corn', 'coffee', 'sugar', 'copper', 'aluminum'
    ],
    artDirection: [
      'art direction', 'design', 'branding', 'creative direction', 'visual design',
      'aesthetics', 'art director', 'creative director', 'brand identity', 'logo design',
      'visual identity', 'design direction', 'creative strategy', 'artistic direction'
    ],
    editorial: [
      'editorial', 'content', 'publishing', 'writing', 'journalism', 'media',
      'editor', 'editorial director', 'content director', 'publisher', 'writer',
      'journalist', 'media strategy', 'content strategy', 'editorial content'
    ],
    marketing: [
      'marketing', 'advertising', 'social media', 'digital marketing', 'brand marketing',
      'growth', 'google ads', 'facebook ads', 'tiktok', 'instagram', 'twitter',
      'social media marketing', 'digital advertising', 'marketing strategy', 'campaign'
    ],
    music: [
      'music', 'sound', 'audio', 'production', 'composition', 'music theory',
      'sound design', 'audio engineering', 'music production', 'composer', 'producer',
      'songwriting', 'arrangement', 'orchestration', 'mixing', 'mastering'
    ],
    programming: [
      'programming', 'coding', 'development', 'software', 'web development', 'app development',
      'vibe coding', 'code', 'program', 'build', 'create app', 'debug',
      'software engineering', 'full stack', 'frontend', 'backend', 'database', 'api'
    ]
  }

  async routeQuery(query: string, context?: any): Promise<AgentRoutingResult> {
    const normalizedQuery = query.toLowerCase()
    
    // Calculate domain scores
    const domainScores = this.calculateDomainScores(normalizedQuery)
    
    // Find best matching domain
    const bestDomain = this.findBestDomain(domainScores)
    
    // Get corresponding agent
    const agent = agentRegistry.getAgent(bestDomain.agentRole)
    
    return {
      selectedAgent: agent,
      confidence: bestDomain.confidence,
      reasoning: bestDomain.reasoning,
      domain: bestDomain.domain,
      agentRole: bestDomain.agentRole,
      shouldRoute: agent !== null && bestDomain.confidence > 0.3
    }
  }

  private calculateDomainScores(query: string): Record<string, { score: number; matches: string[] }> {
    const scores: Record<string, { score: number; matches: string[] }> = {}
    
    for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
      const matches = keywords.filter(keyword => query.includes(keyword))
      const score = matches.length / keywords.length
      
      if (score > 0) {
        scores[domain] = { score, matches }
      }
    }
    
    return scores
  }

  private findBestDomain(domainScores: Record<string, { score: number; matches: string[] }>): {
    domain: string
    agentRole: AgentRole
    confidence: number
    reasoning: string
  } {
    // Find domain with highest score
    let bestDomain = ''
    let bestScore = 0
    let bestMatches: string[] = []
    
    for (const [domain, { score, matches }] of Object.entries(domainScores)) {
      if (score > bestScore) {
        bestDomain = domain
        bestScore = score
        bestMatches = matches
      }
    }
    
    // If no strong domain match, default to general
    if (bestScore < 0.1) {
      return {
        domain: 'general',
        agentRole: 'general',
        confidence: 0.5,
        reasoning: 'No specific domain detected, using general agent'
      }
    }
    
    // Map domain to agent role
    const agentRole = bestDomain as AgentRole
    
    return {
      domain: bestDomain,
      agentRole,
      confidence: Math.min(bestScore * 2, 1), // Scale confidence
      reasoning: `Detected domain: ${bestDomain} based on keywords: ${bestMatches.join(', ')}`
    }
  }

  async executeWithAgent(
    query: string, 
    agent: Agent, 
    context?: any
  ): Promise<{ content: string; confidence: number; metadata?: any }> {
    try {
      const subtask = {
        title: query,
        description: query,
        complexity: this.estimateComplexity(query)
      }
      
      return await agent.execute(subtask, context)
    } catch (error) {
      return {
        content: `I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.`,
        confidence: 0.1,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private estimateComplexity(query: string): number {
    // Simple complexity estimation based on query characteristics
    const factors = {
      length: Math.min(query.length / 100, 1), // Longer queries might be more complex
      questionWords: (query.match(/\b(what|how|why|when|where|which|who)\b/gi) || []).length * 0.1,
      technicalTerms: (query.match(/\b(analysis|research|development|implementation|strategy)\b/gi) || []).length * 0.2
    }
    
    return Math.min(Object.values(factors).reduce((sum, factor) => sum + factor, 0), 1)
  }

  getAvailableDomains(): string[] {
    return Object.keys(this.domainKeywords)
  }

  getDomainKeywords(domain: string): string[] {
    return this.domainKeywords[domain as keyof typeof this.domainKeywords] || []
  }
}

export const agentRouter = AgentRouter.getInstance()
