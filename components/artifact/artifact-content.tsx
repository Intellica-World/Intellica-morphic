'use client'

import { Part, ToolPart, VibeCodingPart } from '@/lib/types/ai'
import { VibeCodingPanel } from '@/components/vibe-coding-panel'

import { ReasoningContent } from './reasoning-content'
import { TodoInvocationContent } from './todo-invocation-content'
import { ToolInvocationContent } from './tool-invocation-content'

function isTodoToolPart(part: Part): part is ToolPart<'todoWrite'> {
  return part.type === 'tool-todoWrite'
}

function isVibeCodingPart(part: Part): part is VibeCodingPart {
  return part.type === 'vibe-coding'
}

export function ArtifactContent({ part, onClose }: { part: Part | null; onClose?: () => void }) {
  if (!part) return null

  switch (part.type) {
    case 'vibe-coding':
      if (isVibeCodingPart(part)) {
        return (
          <VibeCodingPanel
            prompt={part.prompt}
            type={part.buildType}
            uiStyle={part.uiStyle}
            platform={part.platform}
            onClose={onClose}
          />
        )
      }
      return null
    case 'tool-search':
    case 'tool-fetch':
    case 'tool-askQuestion':
      return <ToolInvocationContent part={part} />
    case 'tool-todoWrite':
      if (isTodoToolPart(part)) {
        return <TodoInvocationContent part={part} />
      }
      return null
    case 'reasoning':
      return <ReasoningContent reasoning={part.text} />
    default:
      return (
        <div className="p-4">Details for this part type are not available</div>
      )
  }
}
