import type { AppEnv } from '../../env'
import { createApp } from '../../application'
export { Workspace } from '../../index'

let sequence = 0
const app = createApp({
  now: () => 1_800_000_000_000,
  randomToken: () => `native-upload-${++sequence}`,
})

export default {
  fetch(request: Request, env: AppEnv, context: ExecutionContext) {
    const fault = new URL(request.url).searchParams.get('fixtureBody')
    if (
      fault === 'short' ||
      fault === 'interrupted' ||
      fault === 'after-bytes'
    ) {
      let first = true
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (first) {
            first = false
            controller.enqueue(
              new Uint8Array(
                fault === 'after-bytes' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3],
              ),
            )
            return
          }
          if (fault === 'interrupted' || fault === 'after-bytes')
            controller.error(new Error('Injected interrupted body'))
          else controller.close()
        },
      })
      const init = { body, duplex: 'half' }
      request = new Request(request, init)
    }
    return app.fetch(request, env, context)
  },
}
