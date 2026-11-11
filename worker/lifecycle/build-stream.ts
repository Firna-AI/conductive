import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { AppEnv } from '../env'
import { privateResponse } from '../http'
import { requireOrgMember } from './access'
import { readBuildSnapshot } from './build-log-reader'

export async function buildEventsResponse(input: {
  env: AppEnv
  orgId: string
  userId: string
  buildId: string
  after: number
  wait?: () => Promise<void>
}): Promise<Response> {
  await requireOrgMember(input.env.DB, input.orgId, input.userId)
  const initial = await readBuildSnapshot(
    input.env.DB,
    input.orgId,
    input.buildId,
    input.after,
    1,
  )
  let first = true
  let live = true
  let cursor = input.after
  const encoder = new TextEncoder()
  const wait =
    input.wait ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 250)))
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (live) {
          await requireOrgMember(input.env.DB, input.orgId, input.userId)
          const snapshot = first
            ? initial
            : await readBuildSnapshot(
                input.env.DB,
                input.orgId,
                input.buildId,
                cursor,
                1,
              )
          first = false
          if (!live) return
          const event = snapshot.log[0]
          if (event) {
            controller.enqueue(
              encoder.encode(
                `id: ${event.eventNumber}\nevent: log\ndata: ${JSON.stringify(event)}\n\n`,
              ),
            )
            cursor = event.eventNumber
            return
          }
          const { build } = snapshot
          if (build.state !== 'running') {
            controller.enqueue(
              encoder.encode(
                `event: build\ndata: ${JSON.stringify(build)}\n\n`,
              ),
            )
            controller.close()
            return
          }
          await wait()
        }
      } catch (error) {
        captureUnexpectedWorkerFailure('build_log_stream_failed', error)
        if (live) controller.error(error)
      }
    },
    cancel() {
      live = false
    },
  })
  return privateResponse(
    new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
  )
}
