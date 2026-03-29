import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { type NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

const STAGE_MESSAGES = [
  { stage: 'analyzing', progress: 8, message: 'Understanding your request...' },
  { stage: 'architecting', progress: 22, message: 'Designing the architecture...' },
  { stage: 'designing', progress: 38, message: 'Creating the UI blueprint...' },
  { stage: 'building', progress: 58, message: 'Generating code with Claude...' },
  { stage: 'assembling', progress: 82, message: 'Assembling the preview...' },
  { stage: 'polishing', progress: 94, message: 'Polishing the final result...' },
]

function buildSystemPrompt(type: string, uiStyle: string): string {
  const styleGuide: Record<string, string> = {
    modern: 'Clean lines, white/light background, blue/purple accents, Inter font, subtle shadows, 8px border-radius',
    minimal: 'Ultra-clean, monochrome, single accent (#6366f1), large bold typography, maximum white space',
    glassmorphism: 'Dark background (#0a0a1a), frosted glass panels (backdrop-filter: blur), neon accent colors, translucent cards',
    'dark-pro': 'Black background (#000), neon accents (#00ff88 or #7c3aed), high contrast, monospace font for code, developer aesthetic',
    enterprise: 'Navy/slate palette, structured grid, dense information layout, professional sans-serif, data-heavy',
    playful: 'Bright gradient background, rounded corners (16px+), vibrant colors, bouncy micro-animations, friendly illustrations via emojis',
  }

  const styleNote = styleGuide[uiStyle] ?? styleGuide.modern

  return `You are INTELLICA's elite vibe coding engine — the most advanced AI app builder available.

Generate a COMPLETE, FULLY WORKING, self-contained HTML file with INLINE CSS and INLINE JavaScript.

DESIGN STYLE: ${styleNote}
BUILD TYPE: ${type}

REQUIREMENTS:
1. The HTML must be 100% self-contained (no external CDN links except Google Fonts)
2. Include beautiful, production-quality CSS with smooth animations and hover states
3. Include working JavaScript — all interactions, data, and logic must function
4. Make it visually stunning — better than any template
5. Include realistic placeholder data and content
6. Make it fully responsive (mobile + desktop)
7. Add micro-interactions: hover effects, transitions, smooth scrolling
8. Use modern CSS: CSS Grid, Flexbox, CSS variables for theming
9. Include a working navigation if relevant
10. The output must render immediately in an <iframe> with no dependencies

CRITICAL: Output ONLY the complete HTML file starting with <!DOCTYPE html>
Do NOT include markdown code blocks, explanations, or anything outside the HTML.
The first character of your response must be < and the last must be >`
}

function buildUserPrompt(prompt: string, type: string, uiStyle: string): string {
  return `Build this for me: "${prompt}"

Type: ${type}
Style: ${uiStyle}

Create a complete, stunning, fully functional ${type}. Make it look like it was built by a world-class design team. Include:
- Beautiful visual design matching the ${uiStyle} style
- Smooth CSS animations and transitions
- Working interactive elements
- Realistic content and data
- Professional typography
- Mobile-responsive layout

Output ONLY the raw HTML file. Start with <!DOCTYPE html>`
}

function sendStage(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  stage: string,
  progress: number,
  message: string,
  extra?: Record<string, unknown>
) {
  const data = JSON.stringify({ stage, progress, message, ...extra })
  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { prompt, type = 'app', uiStyle = 'modern', platform = 'web', sessionId } = body as {
    prompt?: string
    type?: string
    uiStyle?: string
    platform?: string
    sessionId?: string
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream stage progress updates
        for (let i = 0; i < STAGE_MESSAGES.length - 1; i++) {
          const s = STAGE_MESSAGES[i]
          sendStage(controller, encoder, s.stage, s.progress, s.message)
          await new Promise(r => setTimeout(r, 300 + Math.random() * 200))
        }

        // Generate the actual app using Claude Sonnet (best for code generation)
        let html = ''
        let usedModel = 'claude-sonnet-4-6'

        try {
          const result = await generateText({
            model: anthropic('claude-sonnet-4-6'),
            system: buildSystemPrompt(type, uiStyle),
            prompt: buildUserPrompt(prompt, type, uiStyle),
            maxOutputTokens: 8000,
          })
          html = result.text.trim()
        } catch {
          // Fallback to GPT-4o if Claude fails
          try {
            usedModel = 'gpt-4o'
            const result = await generateText({
              model: openai('gpt-4o'),
              system: buildSystemPrompt(type, uiStyle),
              prompt: buildUserPrompt(prompt, type, uiStyle),
              maxOutputTokens: 8000,
            })
            html = result.text.trim()
          } catch (err2) {
            sendStage(controller, encoder, 'error', 0, 'Generation failed — please try again.')
            controller.close()
            return
          }
        }

        // Clean up the HTML (remove markdown code blocks if model added them)
        if (html.startsWith('```')) {
          html = html.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '').trim()
        }

        // Ensure it's valid HTML
        if (!html.toLowerCase().includes('<!doctype')) {
          html = `<!DOCTYPE html>\n${html}`
        }

        // Final stage — complete with the generated HTML
        const last = STAGE_MESSAGES[STAGE_MESSAGES.length - 1]
        sendStage(controller, encoder, last.stage, last.progress, last.message)
        await new Promise(r => setTimeout(r, 150))

        // Send completion with the HTML payload
        const completionData = JSON.stringify({
          stage: 'complete',
          progress: 100,
          message: 'Your app is ready!',
          html,
          sessionId: sessionId ?? crypto.randomUUID(),
          model: usedModel,
          prompt,
          type,
          uiStyle,
          platform,
          downloadFilename: `intellica-${type}-${Date.now()}.html`,
        })
        controller.enqueue(encoder.encode(`data: ${completionData}\n\n`))
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unexpected error'
        sendStage(controller, encoder, 'error', 0, `Build failed: ${errMsg}`)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
