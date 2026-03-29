'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Check,
  Code2,
  Download,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  Smartphone,
  Wand2,
  X
} from 'lucide-react'

import { cn } from '@/lib/utils'

export interface VibeCodingResult {
  html: string
  sessionId: string
  model: string
  prompt: string
  type: string
  uiStyle: string
  platform: string
  downloadFilename: string
}

export interface VibeCodingStage {
  stage: string
  progress: number
  message: string
}

interface VibeCodingPanelProps {
  prompt: string
  type: string
  uiStyle: string
  platform?: string
  onClose?: () => void
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  analyzing: <Wand2 size={14} className="animate-pulse" />,
  architecting: <Code2 size={14} className="animate-pulse" />,
  designing: <Monitor size={14} className="animate-pulse" />,
  building: <Loader2 size={14} className="animate-spin" />,
  assembling: <Loader2 size={14} className="animate-spin" />,
  polishing: <Loader2 size={14} className="animate-spin" />,
  complete: <Check size={14} className="text-green-500" />,
  error: <X size={14} className="text-red-500" />,
}

export function VibeCodingPanel({ prompt, type, uiStyle, platform = 'web', onClose }: VibeCodingPanelProps) {
  const [stage, setStage] = useState<VibeCodingStage>({ stage: 'analyzing', progress: 0, message: 'Starting...' })
  const [result, setResult] = useState<VibeCodingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [refineInput, setRefineInput] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startBuild = useCallback(async (buildPrompt: string, buildType: string, buildStyle: string) => {
    setResult(null)
    setError(null)
    setStage({ stage: 'analyzing', progress: 0, message: 'Starting...' })

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/vibe-coding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt, type: buildType, uiStyle: buildStyle, platform }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setError(`Server error: ${res.status}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.stage === 'complete') {
              setResult(data as VibeCodingResult)
              setStage({ stage: 'complete', progress: 100, message: 'Your app is ready!' })
            } else if (data.stage === 'error') {
              setError(data.message)
              setStage({ stage: 'error', progress: 0, message: data.message })
            } else {
              setStage({ stage: data.stage, progress: data.progress, message: data.message })
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message ?? 'Build failed')
        setStage({ stage: 'error', progress: 0, message: 'Build failed' })
      }
    }
  }, [platform])

  useEffect(() => {
    startBuild(prompt, type, uiStyle)
    return () => { abortRef.current?.abort() }
  }, [prompt, type, uiStyle, startBuild])

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.downloadFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenInTab = () => {
    if (!result) return
    const blob = new Blob([result.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleRefine = async () => {
    if (!refineInput.trim() || !result) return
    setIsRefining(true)
    const refinedPrompt = `${prompt}. Additional requirement: ${refineInput.trim()}`
    setRefineInput('')
    await startBuild(refinedPrompt, type, uiStyle)
    setIsRefining(false)
  }

  const isBuilding = stage.stage !== 'complete' && stage.stage !== 'error'

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 size={16} className="text-violet-500 flex-shrink-0" />
          <span className="text-sm font-semibold truncate">Vibe Coding</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">— {prompt.slice(0, 40)}{prompt.length > 40 ? '…' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          {result && (
            <>
              <button
                onClick={() => setPreviewDevice(d => d === 'desktop' ? 'mobile' : 'desktop')}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Toggle device"
              >
                {previewDevice === 'desktop' ? <Smartphone size={14} /> : <Monitor size={14} />}
              </button>
              <button
                onClick={handleOpenInTab}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Download HTML"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => startBuild(prompt, type, uiStyle)}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Rebuild"
              >
                <RefreshCw size={14} />
              </button>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors ml-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Build Progress */}
      {isBuilding && (
        <div className="px-4 py-6 flex flex-col items-center justify-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            {STAGE_ICONS[stage.stage] ?? <Loader2 size={14} className="animate-spin" />}
            <span className="font-medium">{stage.message}</span>
          </div>
          <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            {['analyzing', 'architecting', 'designing', 'building', 'assembling', 'polishing'].map(s => (
              <span
                key={s}
                className={cn(
                  'px-2 py-0.5 rounded-full transition-colors',
                  stage.stage === s
                    ? 'bg-violet-500/20 text-violet-400'
                    : stage.progress > getStageProgress(s)
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-muted text-muted-foreground/40'
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isBuilding && (
        <div className="px-4 py-4 flex flex-col items-center gap-3">
          <div className="text-sm text-red-400 text-center">{error}</div>
          <button
            onClick={() => startBuild(prompt, type, uiStyle)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      {result && !isBuilding && (
        <>
          <div className="flex border-b border-border flex-shrink-0">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                activeTab === 'preview'
                  ? 'border-violet-500 text-violet-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                activeTab === 'code'
                  ? 'border-violet-500 text-violet-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Code
            </button>
            <div className="ml-auto flex items-center px-3 gap-1">
              <span className="text-xs text-muted-foreground">via {result.model}</span>
            </div>
          </div>

          {/* Preview */}
          {activeTab === 'preview' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className={cn(
                'flex-1 min-h-0 flex items-start justify-center p-2 bg-muted/20 overflow-auto',
                previewDevice === 'mobile' ? 'items-start pt-4' : ''
              )}>
                <div className={cn(
                  'bg-white rounded-lg shadow-xl overflow-hidden transition-all',
                  previewDevice === 'mobile' ? 'w-[390px] h-[844px]' : 'w-full h-full min-h-[400px]'
                )}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={result.html}
                    sandbox="allow-scripts allow-forms allow-modals"
                    className="w-full h-full border-0"
                    title="Vibe Coding Preview"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Code */}
          {activeTab === 'code' && (
            <div className="flex-1 min-h-0 overflow-auto p-3">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                {result.html}
              </pre>
            </div>
          )}

          {/* Deploy Bar */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-2 flex-shrink-0 bg-muted/20">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <Download size={12} /> Download HTML
            </button>
            <button
              onClick={handleOpenInTab}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              <ExternalLink size={12} /> Open Full Screen
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors ml-auto"
              onClick={handleOpenInTab}
            >
              <Rocket size={12} /> Deploy
            </button>
          </div>

          {/* Refine Input */}
          <div className="border-t border-border px-3 py-2 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={refineInput}
              onChange={e => setRefineInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine() } }}
              placeholder="Refine: make the button blue, add a footer..."
              className="flex-1 text-xs bg-muted rounded-lg px-3 py-1.5 outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-violet-500/50"
              disabled={isRefining}
            />
            <button
              onClick={handleRefine}
              disabled={!refineInput.trim() || isRefining}
              className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              {isRefining ? <Loader2 size={12} className="animate-spin" /> : 'Refine'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function getStageProgress(stageName: string): number {
  const stages: Record<string, number> = {
    analyzing: 8,
    architecting: 22,
    designing: 38,
    building: 58,
    assembling: 82,
    polishing: 94,
  }
  return stages[stageName] ?? 0
}
