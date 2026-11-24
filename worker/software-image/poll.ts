import type { AppDependencies, AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { ProviderError } from '../sandbox/errors'
import { warnWorker } from '../warnings'
import { softwareImageResult } from './result'
import { softwareImageResponse } from './response'
import type { SoftwareImageResult, SoftwareImageRuntime } from './types'

/** Leave time for the reply before the deploy client's 30-second limit. */
const RESPONSE_LIMIT_MS = 20_000
/** Stop network work before the 30 seconds of post-response waitUntil ends. */
const WORK_LIMIT_MS = 45_000

export async function boundedSoftwareImagePoll(
  env: AppEnv,
  dependencies: AppDependencies,
  execution: Pick<ExecutionContext, 'waitUntil'> | undefined,
  run: (runtime: SoftwareImageRuntime) => Promise<SoftwareImageResult>,
): Promise<Response> {
  let stopped = false
  let checkpoint: SoftwareImageResult | undefined
  const output: string[] = []
  const controller = new AbortController()
  const workTimer = setTimeout(() => controller.abort(), WORK_LIMIT_MS)
  const runtime: SoftwareImageRuntime = {
    env,
    dependencies: {
      ...dependencies,
      fetch: (request) => {
        if (stopped) throw new ProviderError('unavailable', 503)
        return dependencies.fetch(
          new Request(request, {
            signal: AbortSignal.any([request.signal, controller.signal]),
          }),
        )
      },
    },
    poll: {
      stopped: () => stopped,
      expired: () => controller.signal.aborted,
      async runNetworkCall(call) {
        if (stopped || controller.signal.aborted)
          throw new ProviderError('unavailable', 503)
        let stop: (() => void) | undefined
        const abort = new Promise<never>((_, reject) => {
          stop = () => reject(new ProviderError('unavailable', 503))
          controller.signal.addEventListener('abort', stop, { once: true })
        })
        try {
          return await Promise.race([call(), abort])
        } finally {
          if (stop) controller.signal.removeEventListener('abort', stop)
        }
      },
      checkpoint: (image, text) => {
        checkpoint = softwareImageResult(image, text)
      },
      output: (parts) => output.push(...parts),
    },
  }
  let responseTimer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<Response>((resolve) => {
    responseTimer = setTimeout(() => {
      stopped = true
      resolve(
        privateResponse(
          checkpoint
            ? softwareImageResponse(checkpoint, output)
            : errorResponse(
                new HttpError(
                  503,
                  'service_unavailable',
                  'The app is not available. Try again.',
                ),
              ),
        ),
      )
    }, RESPONSE_LIMIT_MS)
  })
  const work = run(runtime).then((result) =>
    softwareImageResponse(result, output),
  )
  const retained = work.then(
    () => clearTimeout(workTimer),
    () => {
      clearTimeout(workTimer)
      if (stopped) warnWorker({ kind: 'software_image_repair_failed' })
    },
  )
  execution?.waitUntil(retained)
  try {
    return await Promise.race([work, deadline])
  } finally {
    stopped = true
    clearTimeout(responseTimer)
  }
}
