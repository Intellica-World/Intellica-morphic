/**
 * Agent System Types
 */

export interface AgentCapabilities {
  domains: string[];
  taskTypes: string[];
  maxComplexity: number;
  avgResponseTime: number;
}

export interface Agent {
  role: AgentRole;
  capabilities: AgentCapabilities;
  execute(subtask: any, context: any): Promise<{
    content: string;
    confidence: number;
    metadata?: any;
  }>;
}

export type AgentRole = 
  | 'general'
  | 'legal'
  | 'business'
  | 'architecture'
  | 'medical'
  | 'finance'
  | 'property'
  | 'travel'
  | 'research'
  | 'ip-specialist'
  | 'voice-action'
  | 'creative'
  | 'engineering'
  | 'sports'
  | 'commodities'
  | 'art-director'
  | 'editorial-director'
  | 'marketing-director'
  | 'music-specialist'
  | 'programming-specialist';
