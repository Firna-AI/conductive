import type { RunnerAttachment } from '../../../src/shared/runner'
import type { ProviderInput } from './types'

export function attachmentDescription(
  command: ProviderInput,
  attachment: RunnerAttachment,
): string {
  const metadata = command.message.attachments.find(
    (item) => item.id === attachment.attachmentId,
  )
  return `Attached file: ${JSON.stringify({
    name: metadata?.name,
    mediaType: metadata?.mediaType,
    path: attachment.path,
  })}`
}
