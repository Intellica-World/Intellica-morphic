/**
 * INTELLICA Agent Registry
 * 
 * Manages pool of specialist agents available for task execution.
 * Each agent has specific capabilities and expertise areas.
 */

import { z } from 'zod'

import type { Agent, AgentCapabilities, AgentRole } from './types';

// ─── Agent Implementations ───────────────────────────────────────────────

class GeneralAgent implements Agent {
  role: AgentRole = 'general';
  capabilities: AgentCapabilities = {
    domains: ['general'],
    taskTypes: ['answer', 'explain', 'summarize'],
    maxComplexity: 5,
    avgResponseTime: 2000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `I understand your query: "${subtask.description}". Let me help you with that.`,
      confidence: 0.8,
      metadata: { agentType: 'general' },
    };
  }
}

class LegalAgent implements Agent {
  role: AgentRole = 'legal';
  capabilities: AgentCapabilities = {
    domains: ['law', 'legal', 'contracts', 'compliance'],
    taskTypes: ['analyze', 'advise', 'review', 'explain'],
    maxComplexity: 8,
    avgResponseTime: 5000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Legal analysis for "${subtask.title}": Based on legal principles and applicable regulations, I can provide guidance on this matter.`,
      confidence: 0.85,
      metadata: { agentType: 'legal', jurisdiction: 'multi-jurisdiction' },
    };
  }
}

class BusinessAgent implements Agent {
  role: AgentRole = 'business';
  capabilities: AgentCapabilities = {
    domains: ['business', 'offshore', 'structuring', 'tax'],
    taskTypes: ['analyze', 'structure', 'advise', 'plan'],
    maxComplexity: 8,
    avgResponseTime: 4000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Business strategy for "${subtask.title}": I can help with company structuring, tax optimization, and business planning.`,
      confidence: 0.82,
      metadata: { agentType: 'business', specialties: ['offshore', 'structuring', 'tax'] },
    };
  }
}

class ArchitectureAgent implements Agent {
  role: AgentRole = 'architecture';
  capabilities: AgentCapabilities = {
    domains: ['architecture', 'planning', 'design', 'construction'],
    taskTypes: ['design', 'plan', 'review', 'advise'],
    maxComplexity: 7,
    avgResponseTime: 3500,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Architectural approach to "${subtask.title}": I can provide design guidance and planning expertise.`,
      confidence: 0.80,
      metadata: { agentType: 'architecture', specialties: ['planning', 'design', 'construction'] },
    };
  }
}

class MedicalAgent implements Agent {
  role: AgentRole = 'medical';
  capabilities: AgentCapabilities = {
    domains: ['medical', 'health', 'wellness'],
    taskTypes: ['analyze', 'explain', 'research'],
    maxComplexity: 9,
    avgResponseTime: 6000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Medical information for "${subtask.title}": I can provide health guidance based on current medical knowledge.`,
      confidence: 0.75,
      metadata: { agentType: 'medical', disclaimer: 'This is information only. Always consult a qualified medical professional.' },
    };
  }
}

class FinanceAgent implements Agent {
  role: AgentRole = 'finance';
  capabilities: AgentCapabilities = {
    domains: ['finance', 'investment', 'markets', 'trading'],
    taskTypes: ['analyze', 'advise', 'research', 'forecast'],
    maxComplexity: 8,
    avgResponseTime: 4500,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Financial analysis for "${subtask.title}": I can help with investment strategies and market analysis.`,
      confidence: 0.83,
      metadata: { agentType: 'finance', specialties: ['investment', 'markets', 'trading'] },
    };
  }
}

class PropertyAgent implements Agent {
  role: AgentRole = 'property';
  capabilities: AgentCapabilities = {
    domains: ['property', 'real-estate', 'planning'],
    taskTypes: ['analyze', 'advise', 'evaluate', 'research'],
    maxComplexity: 7,
    avgResponseTime: 3000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Property analysis for "${subtask.title}": I can assist with real estate guidance and property planning.`,
      confidence: 0.79,
      metadata: { agentType: 'property', specialties: ['real-estate', 'planning'] },
    };
  }
}

class TravelAgent implements Agent {
  role: AgentRole = 'travel';
  capabilities: AgentCapabilities = {
    domains: ['travel', 'booking', 'concierge', 'logistics'],
    taskTypes: ['book', 'plan', 'recommend', 'coordinate'],
    maxComplexity: 6,
    avgResponseTime: 2500,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Travel planning for "${subtask.title}": I can help with bookings and travel arrangements.`,
      confidence: 0.85,
      metadata: { agentType: 'travel', specialties: ['booking', 'concierge'] },
    };
  }
}

class ResearchAgent implements Agent {
  role: AgentRole = 'research';
  capabilities: AgentCapabilities = {
    domains: ['research', 'analysis', 'investigation'],
    taskTypes: ['research', 'analyze', 'investigate', 'report'],
    maxComplexity: 8,
    avgResponseTime: 5000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Research findings for "${subtask.title}": Based on analysis, I can provide comprehensive research on this topic.`,
      confidence: 0.88,
      metadata: { agentType: 'research', methodology: 'comprehensive' },
    };
  }
}

// TOP-TIER SPECIALIST AGENTS FOR WORLD-CLASS SYSTEM

class IPSpecialistAgent implements Agent {
  role: AgentRole = 'ip-specialist';
  capabilities: AgentCapabilities = {
    domains: ['intellectual-property', 'patents', 'trademarks', 'copyright', 'legal'],
    taskTypes: ['analyze', 'protect', 'search', 'advise', 'file'],
    maxComplexity: 9,
    avgResponseTime: 7000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `IP protection analysis for "${subtask.title}": I can provide comprehensive intellectual property guidance across US, UK, EU, and UAE jurisdictions.`,
      confidence: 0.92,
      metadata: { agentType: 'ip-specialist', jurisdictions: ['US', 'UK', 'EU', 'UAE'], specialties: ['patents', 'trademarks', 'copyright', 'trade-secrets'] },
    };
  }
}

class VoiceActionAgent implements Agent {
  role: AgentRole = 'voice-action';
  capabilities: AgentCapabilities = {
    domains: ['voice', 'mobile', 'automation', 'commands'],
    taskTypes: ['execute', 'command', 'automate', 'coordinate'],
    maxComplexity: 7,
    avgResponseTime: 2000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Voice action execution for "${subtask.title}": I can execute voice commands for calendar, contacts, bookings, travel, and more.`,
      confidence: 0.90,
      metadata: { agentType: 'voice-action', platforms: ['mobile', 'desktop'], actions: ['calendar', 'contacts', 'bookings', 'travel', 'messages'] },
    };
  }
}

class CreativeAgent implements Agent {
  role: AgentRole = 'creative';
  capabilities: AgentCapabilities = {
    domains: ['creative', 'design', 'adobe', 'visual', 'content'],
    taskTypes: ['design', 'create', 'edit', 'produce'],
    maxComplexity: 8,
    avgResponseTime: 6000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Creative design guidance for "${subtask.title}": I can help with Adobe Creative Cloud, design workflows, and visual content creation.`,
      confidence: 0.89,
      metadata: { agentType: 'creative', tools: ['Photoshop', 'Illustrator', 'InDesign', 'Premiere', 'After Effects'], specialties: ['graphic-design', 'video', 'photography'] },
    };
  }
}

class EngineeringAgent implements Agent {
  role: AgentRole = 'engineering';
  capabilities: AgentCapabilities = {
    domains: ['engineering', 'development', 'code', 'architecture', 'technical'],
    taskTypes: ['develop', 'code', 'architect', 'debug', 'optimize'],
    maxComplexity: 9,
    avgResponseTime: 8000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Engineering solution for "${subtask.title}": I can provide technical development, code generation, and system architecture expertise.`,
      confidence: 0.87,
      metadata: { agentType: 'engineering', languages: ['TypeScript', 'Python', 'JavaScript'], frameworks: ['React', 'Node.js', 'Next.js'] },
    };
  }
}

class SportsAgent implements Agent {
  role: AgentRole = 'sports';
  capabilities: AgentCapabilities = {
    domains: ['sports', 'football', 'rugby', 'tennis', 'golf', 'cricket', 'basketball', 'formula1', 'olympics'],
    taskTypes: ['analyze', 'commentate', 'predict', 'explain', 'strategize'],
    maxComplexity: 8,
    avgResponseTime: 4000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Sports analysis for "${subtask.title}": I can provide professional sports commentary, tactical analysis, predictions, and expert insights across all major sports including Premiership football, rugby, tennis, golf, and more.`,
      confidence: 0.93,
      metadata: { agentType: 'sports', expertise: ['Premiership football', 'Rugby Union', 'Tennis', 'Golf', 'Cricket', 'Basketball', 'F1', 'Olympics'], commentary: ['Play-by-play', 'Tactical analysis', 'Expert insight', 'Historical context'], lastUpdated: new Date().toISOString() },
    };
  }
}

class CommoditiesAgent implements Agent {
  role: AgentRole = 'commodities';
  capabilities: AgentCapabilities = {
    domains: ['commodities', 'gold', 'silver', 'oil', 'gas', 'agriculture', 'metals', 'energy', 'trading'],
    taskTypes: ['analyze', 'predict', 'advise', 'price', 'market', 'trend'],
    maxComplexity: 9,
    avgResponseTime: 5000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Commodities analysis for "${subtask.title}": I provide expert-level analysis on gold, silver, oil, gas, and all major commodities with real-time market data and price predictions.`,
      confidence: 0.94,
      metadata: { agentType: 'commodities', expertise: ['Gold', 'Silver', 'Oil', 'Gas', 'Agricultural commodities', 'Metals', 'Energy markets'], lastUpdated: new Date().toISOString() },
    };
  }
}

class ArtDirectorAgent implements Agent {
  role: AgentRole = 'art-director';
  capabilities: AgentCapabilities = {
    domains: ['art-direction', 'design', 'branding', 'creative-direction', 'visual-design', 'aesthetics'],
    taskTypes: ['design', 'create', 'advise', 'direct', 'brand', 'visualize'],
    maxComplexity: 8,
    avgResponseTime: 6000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Art direction for "${subtask.title}": I provide professional art direction covering design, branding, creative direction, visual design, and complete aesthetic solutions for all creative projects.`,
      confidence: 0.91,
      metadata: { agentType: 'art-director', expertise: ['Art Direction', 'Design', 'Branding', 'Creative Direction', 'Visual Design', 'Aesthetics'], lastUpdated: new Date().toISOString() },
    };
  }
}

class EditorialDirectorAgent implements Agent {
  role: AgentRole = 'editorial-director';
  capabilities: AgentCapabilities = {
    domains: ['editorial', 'content', 'publishing', 'writing', 'journalism', 'media'],
    taskTypes: ['write', 'edit', 'publish', 'direct', 'content', 'editorial'],
    maxComplexity: 9,
    avgResponseTime: 5000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Editorial direction for "${subtask.title}": I provide highest-level editorial expertise covering content creation, publishing, journalism, media strategy, and complete editorial oversight.`,
      confidence: 0.92,
      metadata: { agentType: 'editorial-director', expertise: ['Editorial Direction', 'Content Creation', 'Publishing', 'Journalism', 'Media Strategy'], lastUpdated: new Date().toISOString() },
    };
  }
}

class MarketingDirectorAgent implements Agent {
  role: AgentRole = 'marketing-director';
  capabilities: AgentCapabilities = {
    domains: ['marketing', 'advertising', 'social-media', 'digital-marketing', 'brand-marketing', 'growth'],
    taskTypes: ['market', 'advertise', 'grow', 'strategy', 'campaign', 'social'],
    maxComplexity: 9,
    avgResponseTime: 5500,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Marketing direction for "${subtask.title}": I provide expert marketing strategies covering Google, Facebook, TikTok, all social media platforms, digital advertising, and complete business growth solutions.`,
      confidence: 0.93,
      metadata: { agentType: 'marketing-director', expertise: ['Google Ads', 'Facebook Marketing', 'TikTok Strategy', 'Social Media', 'Digital Marketing', 'Business Growth'], lastUpdated: new Date().toISOString() },
    };
  }
}

class MusicSpecialistAgent implements Agent {
  role: AgentRole = 'music-specialist';
  capabilities: AgentCapabilities = {
    domains: ['music', 'sound', 'audio', 'production', 'composition', 'music-theory', 'sound-design'],
    taskTypes: ['compose', 'produce', 'analyze', 'create', 'sound', 'music'],
    maxComplexity: 8,
    avgResponseTime: 4500,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Music expertise for "${subtask.title}": I provide comprehensive music knowledge covering composition, production, sound design, music theory, and all aspects of audio creation and analysis.`,
      confidence: 0.90,
      metadata: { agentType: 'music-specialist', expertise: ['Music Composition', 'Audio Production', 'Sound Design', 'Music Theory', 'Audio Engineering'], lastUpdated: new Date().toISOString() },
    };
  }
}

class ProgrammingSpecialistAgent implements Agent {
  role: AgentRole = 'programming-specialist';
  capabilities: AgentCapabilities = {
    domains: ['programming', 'coding', 'development', 'software', 'web-development', 'app-development', 'vibe-coding'],
    taskTypes: ['code', 'develop', 'program', 'build', 'create-app', 'debug'],
    maxComplexity: 9,
    avgResponseTime: 3000,
  };

  async execute(subtask: any, context: any): Promise<{ content: string; confidence: number; metadata?: any }> {
    return {
      content: `Programming expertise for "${subtask.title}": I provide comprehensive programming and development services including web development, app creation, debugging, and complete software solutions with modern vibe coding approaches.`,
      confidence: 0.95,
      metadata: { agentType: 'programming-specialist', expertise: ['Web Development', 'App Development', 'Software Engineering', 'Debugging', 'Vibe Coding', 'Modern Frameworks'], lastUpdated: new Date().toISOString() },
    };
  }
}

// ─── Agent Registry ───────────────────────────────────────────────────────

class AgentRegistry {
  private agents: Map<AgentRole, Agent> = new Map();

  constructor() {
    // Register all available agents
    this.registerAgent(new GeneralAgent());
    this.registerAgent(new LegalAgent());
    this.registerAgent(new BusinessAgent());
    this.registerAgent(new ArchitectureAgent());
    this.registerAgent(new MedicalAgent());
    this.registerAgent(new FinanceAgent());
    this.registerAgent(new PropertyAgent());
    this.registerAgent(new TravelAgent());
    this.registerAgent(new ResearchAgent());
    
    // Register top-tier specialist agents for world-class system
    this.registerAgent(new IPSpecialistAgent());
    this.registerAgent(new VoiceActionAgent());
    this.registerAgent(new CreativeAgent());
    this.registerAgent(new EngineeringAgent());
    this.registerAgent(new SportsAgent());
    this.registerAgent(new CommoditiesAgent());
    this.registerAgent(new ArtDirectorAgent());
    this.registerAgent(new EditorialDirectorAgent());
    this.registerAgent(new MarketingDirectorAgent());
    this.registerAgent(new MusicSpecialistAgent());
    this.registerAgent(new ProgrammingSpecialistAgent());
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.role, agent);
  }

  getAgent(role: AgentRole): Agent | null {
    return this.agents.get(role) || null;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByCapability(domain: string): Agent[] {
    return this.getAllAgents().filter(agent =>
      agent.capabilities.domains.includes(domain)
    );
  }

  getAvailableRoles(): AgentRole[] {
    return Array.from(this.agents.keys());
  }
}

// ─── Export Registry Instance & Class ───────────────────────────────────────

export { AgentRegistry };
export const agentRegistry = new AgentRegistry();

// ─── Types Export ───────────────────────────────────────────────────────

export type {
  Agent,
  AgentCapabilities,
  AgentRole,
};
