import path from 'node:path'

export const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'dmg',
  'pkg',
  'msi',
  'docm',
  'xlsm',
  'bat',
  'cmd',
  'com',
  'scr',
  'pif',
  'vbs',
  'js',
  'jar'
])

export const ARCHIVE_EXTENSIONS = new Set([
  'zip',
  'tar',
  'tgz',
  'gz',
  'bz2',
  '7z',
  'rar'
])

function normalizedExtension(filename: string): string {
  const ext = path
    .extname(filename || '')
    .toLowerCase()
    .replace('.', '')
  return ext
}

function normalizeMime(value?: string | null): string {
  return (value || '').trim().toLowerCase()
}

export function sniffMimeType(buffer: Uint8Array): string | null {
  if (buffer.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    if (png.every((value, index) => buffer[index] === value)) {
      return 'image/png'
    }
  }

  if (buffer.length >= 3) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg'
    }
  }

  if (buffer.length >= 4) {
    if (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return 'application/zip'
    }

    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'application/pdf'
    }
  }

  return null
}

function mimeAllowed(input: {
  declaredMime: string
  detectedMime: string | null
  allowedMimeTypes?: string[]
  allowedMimePrefixes?: string[]
}): boolean {
  const allowedTypes = (input.allowedMimeTypes || []).map(value =>
    value.toLowerCase()
  )
  const allowedPrefixes = (input.allowedMimePrefixes || []).map(value =>
    value.toLowerCase()
  )
  const candidates = [input.declaredMime, input.detectedMime || ''].filter(
    Boolean
  )

  if (allowedTypes.length === 0 && allowedPrefixes.length === 0) {
    return true
  }

  return candidates.some(candidate => {
    const lower = candidate.toLowerCase()
    if (allowedTypes.includes(lower)) {
      return true
    }

    return allowedPrefixes.some(prefix => lower.startsWith(prefix))
  })
}

export interface UploadPolicyInput {
  filename: string
  mimeType?: string | null
  sizeBytes: number
  maxBytes: number
  buffer?: Uint8Array
  allowedExtensions?: string[]
  allowedMimeTypes?: string[]
  allowedMimePrefixes?: string[]
  allowArchives?: boolean
}

export interface UploadPolicyResult {
  ok: boolean
  error?: string
  extension: string
  declaredMime: string
  detectedMime: string | null
}

export function validateUploadPolicy(
  input: UploadPolicyInput
): UploadPolicyResult {
  const extension = normalizedExtension(input.filename)
  const declaredMime = normalizeMime(input.mimeType)
  const detectedMime = input.buffer ? sniffMimeType(input.buffer) : null

  if (!input.filename || input.filename.trim().length === 0) {
    return {
      ok: false,
      error: 'Filename is required',
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return {
      ok: false,
      error: 'Uploaded file is empty',
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (input.sizeBytes > input.maxBytes) {
    return {
      ok: false,
      error: `File exceeds limit of ${input.maxBytes} bytes`,
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: `File extension .${extension} is blocked`,
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (!input.allowArchives && ARCHIVE_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: 'Archive uploads are blocked until archive handling is configured',
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (
    input.allowedExtensions &&
    input.allowedExtensions.length > 0 &&
    !input.allowedExtensions.includes(extension)
  ) {
    return {
      ok: false,
      error: `File extension .${extension} is not allowed`,
      extension,
      declaredMime,
      detectedMime
    }
  }

  if (
    !mimeAllowed({
      declaredMime,
      detectedMime,
      allowedMimeTypes: input.allowedMimeTypes,
      allowedMimePrefixes: input.allowedMimePrefixes
    })
  ) {
    return {
      ok: false,
      error: 'File type is not allowed',
      extension,
      declaredMime,
      detectedMime
    }
  }

  return {
    ok: true,
    extension,
    declaredMime,
    detectedMime
  }
}
