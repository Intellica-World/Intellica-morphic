'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface IntellicaProfileBannerProps {
  locationError?: string | null
  locationLabel?: string | null
  locationLoading?: boolean
  onDismiss: () => void
  onSaveName: (name: string) => void
  open: boolean
}

export function IntellicaProfileBanner({
  locationError,
  locationLabel,
  locationLoading = false,
  onDismiss,
  onSaveName,
  open
}: IntellicaProfileBannerProps) {
  const [draftName, setDraftName] = useState('')

  if (!open) return null

  const locationMessage = locationLoading
    ? 'Checking location so Intellica can answer nearby questions more accurately.'
    : locationLabel
      ? `Current location detected: ${locationLabel}.`
      : locationError
        ? 'Browser location was not available, so Intellica will fall back to approximate network location when needed.'
        : 'Intellica will use your browser location when you allow it.'

  return (
    <div className="w-full px-4 pb-3">
      <Card className="mx-auto w-full max-w-3xl border-border/60 bg-background/95">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Can I ask your name?</CardTitle>
          <CardDescription>{locationMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            placeholder="Your name"
            onKeyDown={event => {
              if (event.key === 'Enter' && draftName.trim()) {
                event.preventDefault()
                onSaveName(draftName)
                setDraftName('')
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!draftName.trim()) return
                onSaveName(draftName)
                setDraftName('')
              }}
              disabled={!draftName.trim()}
            >
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
