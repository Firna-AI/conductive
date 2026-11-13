import type { AppEnv } from '../env'
import { errorResponse } from '../http'
import { attachmentCommandTransfer } from '../test-support/attachment-command'
import { handleAttachmentDownload } from './attachment-download'

export function providerCopy(
  env: AppEnv,
  options: {
    hold?: Promise<void>
    entered?: () => void
    fail?: () => boolean
  } = {},
) {
  const transfer = attachmentCommandTransfer({
    before: async () => {
      options.entered?.()
      await options.hold
    },
    fail: options.fail,
    download: async (request) => {
      try {
        return await handleAttachmentDownload(request, env)
      } catch (error) {
        return errorResponse(error)
      }
    },
  })
  return {
    ...transfer,
    fetch: async (request: Request) => {
      const response = await transfer.fetch(request)
      if (!response) throw new Error('Unexpected provider request')
      return response
    },
  }
}
