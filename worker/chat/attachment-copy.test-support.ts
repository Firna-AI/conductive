import { onTestFinished } from 'vitest'

import type { AppEnv } from '../env'
import { errorResponse } from '../http'
import { LifecycleHost } from '../lifecycle/lifecycle-host-test-support'
import { attachmentCommandTransfer } from '../test-support/attachment-command'
import { FakeBoat } from '../test-support/fake-boat'
import { handleAttachmentDownload } from './attachment-download'

export function providerCopy(
  env: AppEnv,
  options: {
    hold?: Promise<void>
    entered?: () => void
    fail?: () => boolean
  } = {},
) {
  const boat = new FakeBoat()
  const transfer = attachmentCommandTransfer({
    before: async () => {
      options.entered?.()
      await options.hold
    },
    fail: options.fail,
    copied: (sandboxId, path, bytes) =>
      boat.setFile(sandboxId, path, bytes.byteLength),
    download: async (request) => {
      try {
        return await handleAttachmentDownload(request, env)
      } catch (error) {
        return errorResponse(error)
      }
    },
  })
  const host = new LifecycleHost(env, transfer)
  onTestFinished(() => host.close())
  return {
    ...transfer,
    host,
    fetch: async (request: Request) => {
      const response = await transfer.fetch(request)
      return response ?? boat.fetch(request)
    },
  }
}
