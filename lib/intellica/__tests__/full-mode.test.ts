import { describe, expect, it } from 'vitest'

import {
  resolveIntellicaModelType,
  resolveIntellicaSearchMode
} from '@/lib/intellica/full-mode'

describe('intellica full mode', () => {
  it('forces adaptive search and quality model when full mode is enabled', () => {
    expect(
      resolveIntellicaSearchMode({
        cookieValue: 'quick',
        fullModeEnabled: true
      })
    ).toBe('adaptive')

    expect(
      resolveIntellicaModelType({
        cookieValue: 'speed',
        fullModeEnabled: true
      })
    ).toBe('quality')
  })

  it('preserves existing cookies when full mode is disabled', () => {
    expect(
      resolveIntellicaSearchMode({
        cookieValue: 'quick',
        fullModeEnabled: false
      })
    ).toBe('quick')

    expect(
      resolveIntellicaModelType({
        cookieValue: 'quality',
        fullModeEnabled: false
      })
    ).toBe('quality')
  })

  it('falls back to speed when forceSpeed is active outside full mode', () => {
    expect(
      resolveIntellicaModelType({
        cookieValue: 'quality',
        forceSpeed: true,
        fullModeEnabled: false
      })
    ).toBe('speed')
  })
})
