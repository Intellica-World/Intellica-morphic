import { isIntellicaSpecialistsEnabled } from './feature-flags'

export type IntellicaSpecialist =
  | 'travel'
  | 'property'
  | 'medical'
  | 'legal'
  | 'finance'
  | null

const SPECIALIST_PATTERNS: Array<[IntellicaSpecialist, RegExp]> = [
  ['travel', /\b(flight|hotel|istanbul|travel|trip|airport|near me)\b/i],
  ['property', /\b(property|apartment|rent|real estate|villa)\b/i],
  ['medical', /\b(doctor|hospital|medical|health|pharmacy)\b/i],
  ['legal', /\b(law|legal|contract|visa|permit)\b/i],
  ['finance', /\b(finance|market|investment|stock|crypto)\b/i]
]

export function detectIntellicaSpecialist(query: string): IntellicaSpecialist {
  if (!isIntellicaSpecialistsEnabled()) return null

  for (const [specialist, pattern] of SPECIALIST_PATTERNS) {
    if (pattern.test(query)) return specialist
  }

  return null
}
