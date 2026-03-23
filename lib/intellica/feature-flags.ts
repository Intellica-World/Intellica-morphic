export type IntellicaFeatureFlagName =
  | 'FEATURE_INTELLICA_MIGRATION_V1'
  | 'FEATURE_INTELLICA_PROFILE_CONTEXT_V1'
  | 'FEATURE_INTELLICA_LOCATION_V1'
  | 'FEATURE_INTELLICA_UPLOADS_V1'
  | 'FEATURE_INTELLICA_RECEIPTS_V1'
  | 'FEATURE_INTELLICA_FULL_MODE_V1'
  | 'FEATURE_INTELLICA_SPECIALISTS_V1'
  | 'FEATURE_INTELLICA_MIND_V1'
  | 'FEATURE_INTELLICA_MEMORY_V1'
  | 'FEATURE_INTELLICA_VOICE_V1'

const DEFAULTS: Record<IntellicaFeatureFlagName, boolean> = {
  FEATURE_INTELLICA_MIGRATION_V1: true,
  FEATURE_INTELLICA_PROFILE_CONTEXT_V1: true,
  FEATURE_INTELLICA_LOCATION_V1: true,
  FEATURE_INTELLICA_UPLOADS_V1: true,
  FEATURE_INTELLICA_RECEIPTS_V1: true,
  FEATURE_INTELLICA_FULL_MODE_V1: true,
  FEATURE_INTELLICA_SPECIALISTS_V1: true,
  FEATURE_INTELLICA_MIND_V1: true,
  FEATURE_INTELLICA_MEMORY_V1: true,
  FEATURE_INTELLICA_VOICE_V1: true
}

function parseBooleanFlag(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) return fallback

  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback

  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function isIntellicaFeatureEnabled(
  flag: IntellicaFeatureFlagName
): boolean {
  return parseBooleanFlag(process.env[flag], DEFAULTS[flag])
}

export function isIntellicaMigrationEnabled(): boolean {
  return isIntellicaFeatureEnabled('FEATURE_INTELLICA_MIGRATION_V1')
}

export function isIntellicaProfileContextEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_PROFILE_CONTEXT_V1')
  )
}

export function isIntellicaLocationEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_LOCATION_V1')
  )
}

export function isIntellicaUploadHardeningEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_UPLOADS_V1')
  )
}

export function isIntellicaReceiptsEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_RECEIPTS_V1')
  )
}

export function isIntellicaFullModeEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_FULL_MODE_V1')
  )
}

export function isIntellicaSpecialistsEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_SPECIALISTS_V1')
  )
}

export function isIntellicaMindEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_MIND_V1')
  )
}

export function isIntellicaConversationMemoryEnabled(): boolean {
  return (
    isIntellicaMindEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_MEMORY_V1')
  )
}

export function isIntellicaVoiceEnabled(): boolean {
  return (
    isIntellicaMigrationEnabled() &&
    isIntellicaFeatureEnabled('FEATURE_INTELLICA_VOICE_V1')
  )
}
