import type { WorkspaceStorage } from './platform-storage'
import type { AppEnv } from '../env'
import {
  encryptedStartText,
  releasedStartLog,
  startLogContext,
  type EncryptedStartLog,
} from './start-logs'
import type { MaskedStartLog } from './masked-start-log'
import { readStartJob, serializeStartJob } from './start-job-codec'
import { START_ALLOCATION_CLEANUP_KEY } from './start-allocation-cleanup'
import { startAlarmDeadline } from './start-provider-retry'
import type {
  StartJobStorage,
  WorkspaceStartResult,
  WorkspaceCreationAdmission,
} from './start-types'

export const START_JOB_KEY = 'lifecycle:start-job'
const JOB = START_JOB_KEY
export const START_RESULT_KEY = 'lifecycle:start-result'
const RESULT = START_RESULT_KEY
const CREATE_RESULT = 'lifecycle:create-result'
const PUBLICATION = 'lifecycle:create-publication'
export const START_LOG_PREFIX = 'lifecycle:start-log:'
const LOG = START_LOG_PREFIX

export async function readStartLog(
  storage: WorkspaceStorage,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): Promise<MaskedStartLog> {
  const log = await readEncryptedStartLog(storage)
  return releasedStartLog(env, log.context, log.chunks, log.secretsCiphertext)
}

export async function readEncryptedStartLog(
  storage: WorkspaceStorage,
): Promise<EncryptedStartLog> {
  const chunks: string[] = []
  let after = LOG
  while (true) {
    const entries = await storage.list('text', {
      prefix: LOG,
      startAfter: after,
      limit: 1_000,
    })
    chunks.push(...entries.values())
    if (entries.size < 1_000)
      return {
        context:
          (await storage.get('text', 'lifecycle:start-log-context')) ?? '',
        chunks,
        secretsCiphertext: await storage.get('text', 'lifecycle:start-secrets'),
      }
    after = [...entries.keys()].at(-1) ?? after
  }
}

export function durableStartStorage(
  storage: WorkspaceStorage,
  now: () => number,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): StartJobStorage {
  async function storedResult(result: WorkspaceStartResult | undefined) {
    if (!result || result.ok) return result
    const log = await readStartLog(storage, env)
    return {
      ...result,
      error: { ...result.error, log: log.text ? log : null },
    }
  }
  return {
    job: async () => {
      const job = await storage.get('job', JOB)
      return job ? readStartJob(job) : undefined
    },
    epoch: async () =>
      (await storage.get('number', 'lifecycle:stop-epoch')) ?? 0,
    stop: async () =>
      storage.transaction(async (transaction) => {
        await transaction.put(
          'number',
          'lifecycle:stop-epoch',
          ((await transaction.get('number', 'lifecycle:stop-epoch')) ?? 0) + 1,
        )
        const current = await transaction.get('job', JOB)
        if (current)
          await transaction.put('job', JOB, { ...current, cancelled: true })
        return Boolean(current)
      }),
    begin: async (job, epoch) => {
      const old = await storage.list('text', { prefix: LOG })
      return storage.transaction(async (transaction) => {
        if (
          ((await transaction.get('number', 'lifecycle:stop-epoch')) ?? 0) !==
          epoch
        )
          return false
        for (const key of old.keys()) await transaction.delete(key)
        await transaction.delete(RESULT)
        await transaction.delete('lifecycle:start-log-count')
        await transaction.delete('lifecycle:start-secrets')
        await transaction.put(
          'text',
          'lifecycle:start-log-context',
          startLogContext(job.workspaceId, job.attempt),
        )
        await transaction.put('job', JOB, serializeStartJob(job))
        await transaction.setAlarm(now())
        return true
      })
    },
    update: async (job) => {
      await storage.transaction(async (transaction) => {
        const current = await transaction.get('job', JOB)
        if (current?.attempt === job.attempt)
          await transaction.put('job', JOB, {
            ...serializeStartJob(job),
            cancelled: current.cancelled || job.cancelled,
          })
      })
    },
    retry: async (attempt, state) =>
      storage.transaction(async (transaction) => {
        const current = await transaction.get('job', JOB)
        if (
          !current ||
          current.attempt !== attempt ||
          current.cancelled ||
          current.failure
        )
          return false
        if (state === 'progress' && !current.providerRetry) return true
        await transaction.put('job', JOB, {
          ...current,
          providerRetry:
            state === 'progress'
              ? current.providerRetry
                ? { ...current.providerRetry, retryAt: null }
                : null
              : state,
        })
        return true
      }),
    deferAllocationCleanup: (job) =>
      storage.put('job', START_ALLOCATION_CLEANUP_KEY, serializeStartJob(job)),
    result: async () => storedResult(await storage.get('result', RESULT)),
    creationResult: async () =>
      storedResult((await storage.get('creation', CREATE_RESULT))?.result),
    admission: async () => {
      const current = await storage.get('job', JOB)
      if (current?.kind === 'create' && current.phase !== 'records')
        return { ok: true, created: current.admission }
      return (await storage.get('creation', CREATE_RESULT))?.admission
    },
    publication: () => storage.get('publication', PUBLICATION),
    clearPublication: async () => {
      await storage.transaction(async (transaction) => {
        await transaction.delete(PUBLICATION)
        if (!(await transaction.get('job', JOB)))
          await transaction.deleteAlarm()
      })
    },
    complete: async (result) => {
      await storage.transaction(async (transaction) => {
        const current = await transaction.get('job', JOB)
        if (!current || (current.cancelled && result.ok)) return
        const stored = result.ok
          ? result
          : { ...result, error: { ...result.error, log: null } }
        await transaction.put('result', RESULT, stored)
        if (current.kind === 'create') {
          let admission: WorkspaceCreationAdmission
          if (current.phase === 'records') {
            if (stored.ok)
              throw new Error('A create completed before admission')
            admission = stored
          } else admission = { ok: true, created: current.admission }
          await transaction.put('creation', CREATE_RESULT, {
            result: stored,
            admission,
          })
          await transaction.put('publication', PUBLICATION, {
            workspaceId: current.workspaceId,
            state: result.ok ? 'succeeded' : 'failed',
          })
        }
        await transaction.delete(JOB)
        if (current.kind === 'create')
          await transaction.setAlarm(now() + 30_000)
        else await transaction.deleteAlarm()
      })
    },
    secrets: async (values) => {
      const context =
        (await storage.get('text', 'lifecycle:start-log-context')) ?? ''
      await storage.put(
        'text',
        'lifecycle:start-secrets',
        await encryptedStartText(
          env,
          context,
          JSON.stringify({ secrets: values }),
        ),
      )
    },
    capture: async (job, output) => {
      const context = startLogContext(job.workspaceId, job.attempt)
      const chunks: string[] = []
      for (const [stream, text] of [
        ['stdout', output.stdout],
        ['stderr', output.stderr],
      ]) {
        for (let offset = 0; offset < text.length; offset += 16_384)
          chunks.push(
            await encryptedStartText(
              env,
              context,
              JSON.stringify({
                stream,
                text: text.slice(offset, offset + 16_384),
              }),
            ),
          )
      }
      await storage.transaction(async (transaction) => {
        const current = await transaction.get('job', JOB)
        if (current?.attempt !== job.attempt || current.cancelled) return
        let count =
          (await transaction.get('number', 'lifecycle:start-log-count')) ?? 0
        for (const chunk of chunks)
          await transaction.put(
            'text',
            `${LOG}${String(++count).padStart(16, '0')}`,
            chunk,
          )
        await transaction.put('number', 'lifecycle:start-log-count', count)
        await transaction.put('job', JOB, {
          ...serializeStartJob(job),
          stdoutOffset: output.stdoutNextOffset,
          stderrOffset: output.stderrNextOffset,
        })
      })
    },
    schedule: async (at) =>
      storage.setAlarm(
        Math.min(
          at ?? now() + 1_000,
          startAlarmDeadline(await storage.get('job', JOB), now()),
        ),
      ),
  }
}
