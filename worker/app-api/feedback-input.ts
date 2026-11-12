import {
  FEEDBACK_SCREENSHOTS_MAX_BYTES,
  type FeedbackContext,
} from '../../src/shared/feedback'
import { readImage, type CheckedImage } from '../../src/shared/images'
import { HttpError, isRecord, requiredString } from '../http'

export interface ParsedFeedback {
  draftId: string
  text: string
  context: FeedbackContext
  screenshots: CheckedImage[]
}

export function readFeedback(
  body: Record<string, unknown> | null,
): ParsedFeedback {
  if (!body || !isRecord(body.context) || !Array.isArray(body.screenshots))
    return invalidInput()
  if (typeof body.context.desktop !== 'boolean') return invalidInput()
  const draftId = requiredString(body.draftId)
  const text = requiredString(body.text)
  const context: FeedbackContext = {
    orgId: optionalId(body.context.orgId),
    workspaceId: optionalId(body.context.workspaceId),
    appVersion: requiredString(body.context.appVersion),
    desktop: body.context.desktop,
  }
  let totalBytes = 0
  const screenshots = body.screenshots.map((value: unknown) => {
    if (!isRecord(value) || typeof value.content !== 'string')
      return invalidImage()
    let decoded: string
    try {
      decoded = atob(value.content)
    } catch {
      return invalidImage()
    }
    totalBytes += decoded.length
    if (totalBytes > FEEDBACK_SCREENSHOTS_MAX_BYTES)
      throw new HttpError(
        413,
        'feedback_images_too_large',
        'Together, the screenshots can be up to 7 MB.',
      )
    const bytes = Uint8Array.from(decoded, (character) =>
      character.charCodeAt(0),
    )
    return readImage(bytes) ?? invalidImage()
  })
  return { draftId, text, context, screenshots }
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null) return null
  return typeof value === 'string' ? value : invalidInput()
}

function invalidInput(): never {
  throw new HttpError(400, 'invalid_input', 'Complete the required fields.')
}

function invalidImage(): never {
  throw new HttpError(
    400,
    'feedback_image_invalid',
    'Add a PNG, JPEG, GIF, or WebP image.',
  )
}
