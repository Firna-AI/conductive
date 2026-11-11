import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import { createWorkerErrorRuntime, type WorkerErrorRuntime } from './runtime'
import { WorkerErrorLimiter } from './suppression'

const limiter = new WorkerErrorLimiter(Date.now)
let invalidWarned = false
let cached:
  { dsn?: string; origin: string; runtime: WorkerErrorRuntime } | undefined

export function workerErrorRuntime(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'CONDUCTIVE_ERROR_TRACKING_DSN'>,
  override?: WorkerErrorRuntime,
): WorkerErrorRuntime {
  if (override) return override
  if (
    cached &&
    cached.dsn === env.CONDUCTIVE_ERROR_TRACKING_DSN &&
    cached.origin === env.APP_ORIGIN
  )
    return cached.runtime
  const runtime = createWorkerErrorRuntime(env, {
    now: Date.now,
    limiter,
    warn(warning) {
      if (invalidWarned) return
      invalidWarned = true
      warnWorker(warning)
    },
  })
  cached = {
    dsn: env.CONDUCTIVE_ERROR_TRACKING_DSN,
    origin: env.APP_ORIGIN,
    runtime,
  }
  return runtime
}
