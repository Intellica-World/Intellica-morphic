import type { ModelType } from '@/lib/types/model-type'
import type { SearchMode } from '@/lib/types/search'

export const INTELLICA_FULL_MODE_SEARCH_MODE: SearchMode = 'adaptive'
export const INTELLICA_FULL_MODE_MODEL_TYPE: ModelType = 'quality'
export const INTELLICA_STANDARD_SEARCH_MODE: SearchMode = 'quick'
export const INTELLICA_STANDARD_MODEL_TYPE: ModelType = 'speed'

export function resolveIntellicaSearchMode(input: {
  cookieValue?: string | null
  fullModeEnabled: boolean
}): SearchMode {
  if (input.fullModeEnabled) {
    return INTELLICA_FULL_MODE_SEARCH_MODE
  }

  if (input.cookieValue === 'quick' || input.cookieValue === 'adaptive') {
    return input.cookieValue
  }

  return INTELLICA_STANDARD_SEARCH_MODE
}

export function resolveIntellicaModelType(input: {
  cookieValue?: string | null
  forceSpeed?: boolean
  fullModeEnabled: boolean
}): ModelType {
  if (input.fullModeEnabled) {
    return INTELLICA_FULL_MODE_MODEL_TYPE
  }

  if (input.forceSpeed) {
    return INTELLICA_STANDARD_MODEL_TYPE
  }

  if (input.cookieValue === 'speed' || input.cookieValue === 'quality') {
    return input.cookieValue
  }

  return INTELLICA_STANDARD_MODEL_TYPE
}
