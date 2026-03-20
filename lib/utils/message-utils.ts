import { ModelMessage, UIMessage } from 'ai'

import { type Message as DBMessage } from '@/lib/db/schema'

// Interface matching the expected DB message input format
interface DatabaseMessageInput {
  role: DBMessage['role']
  parts: any // Using 'any' here as we don't know the exact structure expected by the database
}

/**
 * Converts a single message from AI SDK to a database-compatible message format
 * @param message - Message from AI SDK
 * @returns Database-compatible message object
 */
export function convertMessageForDB(
  message: ModelMessage
): DatabaseMessageInput {
  // Handle case where content might be a string, array, or null
  let parts: any

  if (message.content === null || message.content === undefined) {
    parts = []
  } else if (typeof message.content === 'string') {
    parts = [{ text: message.content }]
  } else if (Array.isArray(message.content)) {
    // For array content (common in assistant messages with tool calls)
    // Extract text parts and join them
    const textParts = message.content
      .filter(part => part.type === 'text')
      .map(part => ({ text: part.text }))

    if (textParts.length > 0) {
      parts = textParts
    } else {
      // If no text parts, use the first part's content or stringify the whole content
      parts = [{ text: JSON.stringify(message.content) }]
    }
  } else {
    // Fall back to JSON string for other content types
    parts = [{ text: JSON.stringify(message.content) }]
  }

  return {
    role: message.role,
    parts: parts
  }
}

/**
 * Converts an array of messages from AI SDK to database-compatible message format
 * @param messages - Array of messages from AI SDK
 * @returns Array of database-compatible message objects
 */
export function convertMessagesForDB(
  messages: ModelMessage[]
): DatabaseMessageInput[] {
  return messages.map(convertMessageForDB)
}

/**
 * Extract the first text content from a message for use as a title
 * @param message - Message from AI SDK
 * @param maxLength - Maximum title length to extract
 * @returns Extracted title string, truncated to maxLength
 */
export function extractTitleFromMessage(
  message: ModelMessage,
  maxLength = 100
): string {
  if (!message.content) return 'New Chat'

  if (typeof message.content === 'string') {
    return message.content.substring(0, maxLength)
  }

  // For array content, try to find text parts
  if (Array.isArray(message.content)) {
    const textPart = message.content.find(part => part.type === 'text')
    if (textPart && 'text' in textPart) {
      return textPart.text.substring(0, maxLength)
    }
  }

  return 'New Chat'
}

/**
 * Extracts text content from UIMessage parts.
 * @param parts Array of message parts to extract text from.
 * @returns Concatenated text content or empty string if no text content is found,
 *          if 'message' or 'message.parts' is undefined, or if 'parts' is empty or contains no text parts.
 */
export function getTextFromParts(parts?: UIMessage['parts']): string {
  return (
    parts
      ?.filter(part => part.type === 'text')
      .map(part => part.text)
      .join(' ') ?? ''
  )
}

/**
 * Merges two UIMessage objects by combining their parts
 * @param primaryMessage The main message (properties from this will be preserved)
 * @param secondaryMessage The message whose parts will be merged into the primary message
 * @returns A new UIMessage with combined parts
 */
export function mergeUIMessages(
  primaryMessage: UIMessage,
  secondaryMessage: UIMessage
): UIMessage {
  return {
    ...primaryMessage,
    parts: [...primaryMessage.parts, ...secondaryMessage.parts]
  }
}

/**
 * Checks if a UIMessage contains tool calls
 * @param message The message to check for tool calls
 * @returns true if the message contains tool calls, false otherwise
 */
export function hasToolCalls(message: UIMessage | null): boolean {
  if (!message || !message.parts) return false

  return message.parts.some(
    part =>
      part.type && (part.type.startsWith('tool-') || part.type === 'tool-call')
  )
}

/**
 * Client-side sanitizer: strips UIMessage parts with empty/invalid image data
 * BEFORE they are included in the request body sent from the browser.
 *
 * This is the earliest possible defence — the poisoned part never leaves the
 * browser at all, so it cannot contaminate the server-side conversion pipeline.
 *
 * Identical logic to sanitizeUIMessages but safe to import in browser bundles
 * (no server-only imports).
 */
export function sanitizeMessagesForSend(messages: UIMessage[]): UIMessage[] {
  return sanitizeUIMessages(messages)
}

/**
 * Strips UIMessage parts that carry empty image data before they reach
 * convertToModelMessages().  This is the first line of defence — it prevents
 * poisoned DB records from ever reaching the model layer.
 *
 * UIMessage file parts look like:
 *   { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,' }
 *
 * @param messages - UIMessage array from DB / UI state
 * @returns Sanitized copy with empty-image parts removed
 */
export function sanitizeUIMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message, msgIdx) => {
    if (!message.parts || message.parts.length === 0) return message

    const sanitizedParts = message.parts.filter((part: any, partIdx: number) => {
      if (part.type !== 'file') return true
      const mediaType: string = (part.mediaType ?? '').toLowerCase()
      if (!mediaType.startsWith('image/') && mediaType !== 'image') return true

      const url: string = typeof part.url === 'string' ? part.url : (part.url == null ? '' : String(part.url))
      if (url.trim() === '') {
        console.log(`[sanitizeUIMessages] Dropped empty-url image at messages[${msgIdx}].parts[${partIdx}] mediaType=${part.mediaType}`)
        return false
      }

      const lowerUrl = url.toLowerCase()
      const b64Marker = ';base64,'
      const idx = lowerUrl.indexOf(b64Marker)
      if (idx === -1) {
        if (lowerUrl.startsWith('data:')) {
          console.log(`[sanitizeUIMessages] Dropped malformed data-url image at messages[${msgIdx}].parts[${partIdx}]`)
          return false
        }
        return url.trim().length > 0
      }
      const base64Data = url.slice(idx + b64Marker.length).trim()
      if (base64Data.length === 0) {
        console.log(`[sanitizeUIMessages] Dropped empty-base64 image at messages[${msgIdx}].parts[${partIdx}] url_length=${url.length}`)
        return false
      }
      return true
    })

    if (sanitizedParts.length === message.parts.length) return message
    return { ...message, parts: sanitizedParts }
  })
}

/**
 * Returns true if a model message content part is a valid image/file part.
 *
 * After convertToModelMessages(), image attachments have:
 *   { type: 'file', mediaType: 'image/jpeg', data: 'data:image/jpeg;base64,<bytes>' }
 *
 * When the image bytes are missing (empty upload, DB record with no bytes),
 * `data` ends with 'base64,' and nothing after — Anthropic returns HTTP 400.
 *
 * We also guard the legacy `type: 'image'` shape used by some providers.
 */
function isValidImagePart(part: any): boolean {
  if (part.type === 'file') {
    const mediaType: string = (part.mediaType ?? '').toLowerCase()
    if (!mediaType.startsWith('image/') && mediaType !== 'image') return true

    let data: string
    if (typeof part.data === 'string') {
      data = part.data
    } else if (part.data == null) {
      data = ''
    } else if (typeof part.data === 'object' && part.data instanceof Uint8Array) {
      return part.data.length > 0
    } else {
      data = String(part.data)
    }

    if (data.trim() === '') return false

    const b64Marker = ';base64,'
    const markerIdx = data.toLowerCase().indexOf(b64Marker)
    if (markerIdx === -1) {
      if (data.toLowerCase().startsWith('data:')) return false
      return data.trim().length > 0
    }

    const base64Data = data.slice(markerIdx + b64Marker.length).trim()
    return base64Data.length > 0
  }

  if (part.type === 'image') {
    const src = part.image ?? part.source ?? part.data
    if (src == null || src === '') return false
    if (typeof src === 'string') {
      if (src.trim() === '') return false
      const b64Marker = ';base64,'
      const markerIdx = src.toLowerCase().indexOf(b64Marker)
      if (markerIdx !== -1) return src.slice(markerIdx + b64Marker.length).trim().length > 0
      if (src.toLowerCase().startsWith('data:')) return false
      return src.trim().length > 0
    }
    if (typeof src === 'object') {
      if (src instanceof Uint8Array) return src.length > 0
      const data = src.base64 ?? src.data ?? ''
      return typeof data === 'string' && data.trim().length > 0
    }
  }

  return true
}

/**
 * Removes image content parts with empty or missing base64 data from model messages.
 *
 * Anthropic's API returns HTTP 400 if any image part has an empty base64 string.
 * This happens when conversation history is loaded from the database and the
 * original image bytes are no longer present in the stored record.
 *
 * Covers both the AI SDK `type:'file'` shape and legacy `type:'image'` shapes.
 *
 * @param messages - Array of ModelMessages to sanitize
 * @returns Sanitized messages with invalid image parts removed
 */
export function sanitizeModelMessages(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((message, msgIdx) => {
    if (!Array.isArray(message.content)) return message

    const sanitizedContent = message.content.filter((part, partIdx) => {
      const valid = isValidImagePart(part)
      if (!valid) {
        console.log(
          `[sanitizeModelMessages] Dropped empty image at messages[${msgIdx}].content[${partIdx}]`,
          { type: (part as any).type, mediaType: (part as any).mediaType }
        )
      }
      return valid
    })

    if (sanitizedContent.length === message.content.length) return message

    return { ...message, content: sanitizedContent } as ModelMessage
  })
}
