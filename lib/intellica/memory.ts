import type { IntellicaResolvedProfile } from './types'

export function buildIntellicaMemoryHints(
  profile?: IntellicaResolvedProfile | null
): string[] {
  if (!profile) return []

  const hints: string[] = []

  if (profile.displayName) {
    hints.push(`Preferred name: ${profile.displayName}`)
  }

  if (profile.location?.label) {
    hints.push(`Likely location: ${profile.location.label}`)
  }

  return hints
}
