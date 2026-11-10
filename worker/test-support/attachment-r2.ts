import type { AppEnv } from '../env'
import { attachmentBucket } from '../chat/attachment-record'

/** Keep real local R2 operations, but fail external deletion for recovery tests. */
export function failedAttachmentDeletes(env: AppEnv): AppEnv {
  return {
    ...env,
    CHAT_ATTACHMENTS: new Proxy(attachmentBucket(env), {
      get(target, property) {
        if (property === 'delete')
          return async () => {
            throw new Error('Injected R2 delete failure')
          }
        return Reflect.get(target, property, target)
      },
    }),
  }
}
