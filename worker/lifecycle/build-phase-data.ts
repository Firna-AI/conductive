import type { AppEnv } from '../env'
import { buildMachineOwner, issueMachineToken } from '../machines/client'
import {
  buildPhaseStatement,
  type BuildJob,
  type BuildPhase,
} from './build-data'
import { buildLogStatements } from './build-log-statements'
import { encryptBuildMachineToken } from './build-machine-token'
import { buildPhaseStepStatements } from './build-step-data'
import { clearImageRetryStatement } from './image-retry-data'

/**
 * The step records and an optional log line commit with the phase change,
 * so a retry never repeats them.
 */
export async function completeBuildPhase(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  now: number,
  log?: string,
): Promise<void> {
  await db.batch([
    buildPhaseStatement(db, buildId, phase),
    clearImageRetryStatement(db, buildId),
    ...(log ? buildLogStatements(db, buildId, log, now) : []),
    ...buildPhaseStepStatements(db, buildId, phase, now),
  ])
}

/** A new job enters the allocating phase before its provider request. */
export async function beginBuildAllocation(
  env: AppEnv,
  job: BuildJob,
  now: number,
): Promise<string> {
  const { DB: db } = env
  const owner = buildMachineOwner(job.orgId, job.buildId)
  const ciphertext = await encryptBuildMachineToken(
    env,
    owner,
    await issueMachineToken(env, owner),
  )
  await db.batch([
    buildPhaseStatement(db, job.buildId, 'allocating', ciphertext),
    ...buildPhaseStepStatements(db, job.buildId, 'allocating', now),
  ])
  return ciphertext
}
