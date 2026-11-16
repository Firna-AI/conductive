import { HttpError } from '../http'

export class AttachmentMissing extends HttpError {
  constructor(names: readonly string[]) {
    const label =
      names.length < 3
        ? names.join(' and ')
        : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
    super(
      404,
      'attachment_missing',
      names.length === 1
        ? `${label} is no longer in the cloud computer. Attach it again in a new message.`
        : `${label} are no longer in the cloud computer. Attach them again in a new message.`,
    )
  }
}
