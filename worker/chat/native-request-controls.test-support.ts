import type { NativeActor } from '../test-support/native-runtime'
import type { NativeWorkspaceOptions } from '../test-support/native-workspace-api'

export function nativeRequestControls(
  actor: NativeActor,
  options: NativeWorkspaceOptions,
  drain: () => Promise<void>,
) {
  let requestSequence = 0
  return {
    heldRequest: async (input: Request, value: unknown) => {
      const id = `request-${++requestSequence}`
      let enter: () => void = () => {}
      let release: () => void = () => {}
      const reading = new Promise<void>((resolve) => {
        enter = resolve
      })
      const pending = new Promise<void>((resolve) => {
        release = resolve
      })
      await actor.api.requests.prepare(id, {
        url: input.url,
        method: input.method,
        headers: Object.fromEntries(input.headers),
        body: value,
        onJson: async () => {
          enter()
          await pending
        },
      })
      return {
        reading,
        release,
        bodyUsed: () => actor.api.requests.bodyUsed(id),
        fetch: async () => {
          const response = await actor.api.requests.dispatch(id)
          await drain()
          return new Response(response.body, {
            status: response.status,
            headers: response.headers,
          })
        },
      }
    },
    observeNextQueued: async () => {
      let enter: () => void = () => {}
      const queued = new Promise<void>((resolve) => {
        enter = resolve
      })
      options.onQueued = async () => {
        enter()
      }
      await actor.configure(options)
      return {
        queued,
        restore: async () => {
          options.onQueued = undefined
          await actor.configure(options)
        },
      }
    },
  }
}
