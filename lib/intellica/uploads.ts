import { PutObjectCommand } from '@aws-sdk/client-s3'

import {
  getR2Client,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL
} from '@/lib/storage/r2-client'

import { isIntellicaUploadHardeningEnabled } from './feature-flags'
import { validateUploadPolicy } from './upload-policy'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx'
]
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

function buildDataUrl(buffer: Buffer, mediaType: string): string {
  return `data:${mediaType};base64,${buffer.toString('base64')}`
}

function canUseR2PublicUploads(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      R2_PUBLIC_URL
  )
}

async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  filename: string
): Promise<string> {
  const client = getR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentDisposition: `inline; filename="${filename}"`
    })
  )

  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

export async function storeIntellicaUploadedFile(file: File): Promise<{
  file: {
    filename: string
    key?: string
    mediaType: string
    storage: 'inline' | 'r2'
    type: 'file'
    url: string
  }
  receipt: {
    hardeningApplied: boolean
    storage: 'inline' | 'r2'
  }
}> {
  const buffer = Buffer.from(await file.arrayBuffer())

  const policyResult = validateUploadPolicy({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    maxBytes: MAX_FILE_SIZE,
    buffer,
    allowedExtensions: ALLOWED_EXTENSIONS,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    allowArchives: false
  })

  if (!policyResult.ok) {
    throw new Error(policyResult.error || 'Upload policy rejected the file')
  }

  const safeFilename = sanitizeFilename(file.name)

  if (isIntellicaUploadHardeningEnabled() && canUseR2PublicUploads()) {
    const key = `uploads/${Date.now()}-${safeFilename}`
    const url = await uploadToR2(key, buffer, file.type, safeFilename)

    return {
      file: {
        filename: safeFilename,
        key,
        mediaType: file.type,
        storage: 'r2',
        type: 'file',
        url
      },
      receipt: {
        hardeningApplied: true,
        storage: 'r2'
      }
    }
  }

  return {
    file: {
      filename: safeFilename,
      mediaType: file.type,
      storage: 'inline',
      type: 'file',
      url: buildDataUrl(buffer, file.type)
    },
    receipt: {
      hardeningApplied: isIntellicaUploadHardeningEnabled(),
      storage: 'inline'
    }
  }
}
