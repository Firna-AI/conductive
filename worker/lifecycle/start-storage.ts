import type { AppEnv } from '../env'
import {
  encryptedStartText,
  releasedStartLog,
  startLogContext,
} from './start-logs'
import type {
  StartJobStorage,
  WorkspaceStartJob,
  WorkspaceStartResult,
} from './start-types'

const JOB = 'lifecycle:start-job'
const RESULT = 'lifecycle:start-result'
const LOG = 'lifecycle:start-log:'

export async function readStartLog(
  storage: DurableObjectStorage,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): Promise<string> {
  const chunks: string[] = []
  let after = LOG
  while (true) {
    const entries = await storage.list<string>({
      prefix: LOG,
      startAfter: after,
      limit: 1_000,
    })
    chunks.push(...entries.values())
    if (entries.size < 1_000)
      return releasedStartLog(
        env,
        (await storage.get<string>('lifecycle:start-log-context')) ?? '',
        chunks,
        await storage.get<string>('lifecycle:start-secrets'),
      )
    after = [...entries.keys()].at(-1) ?? after
  }
}

export function durableStartStorage(
  storage: DurableObjectStorage,
  now: () => number,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): StartJobStorage {
  return {
    job: () => storage.get<WorkspaceStartJob>(JOB),
    epoch: async () => (await storage.get<number>('lifecycle:stop-epoch')) ?? 0,
    stop: async () =>
      storage.transaction(async (transaction) => {
        await transaction.put(
          'lifecycle:stop-epoch',
          ((await transaction.get<number>('lifecycle:stop-epoch')) ?? 0) + 1,
        )
        const current = await transaction.get<WorkspaceStartJob>(JOB)
        if (current) await transaction.put(JOB, { ...current, cancelled: true })
        return Boolean(current)
      }),
    begin: async (job, epoch) => {
      const old = await storage.list({ prefix: LOG })
      return storage.transaction(async (transaction) => {
        if (
          ((await transaction.get<number>('lifecycle:stop-epoch')) ?? 0) !==
          epoch
        )
          return false
        for (const key of old.keys()) await transaction.delete(key)
        await transaction.delete(RESULT)
        await transaction.delete('lifecycle:start-log-count')
        await transaction.delete('lifecycle:start-secrets')
        await transaction.put(
          'lifecycle:start-log-context',
          startLogContext(job.workspaceId, job.attempt),
        )
        await transaction.put(JOB, job)
        await transaction.setAlarm(now())
        return true
      })
    },
    update: async (job) => {
      await storage.transaction(async (transaction) => {
        const current = await transaction.get<WorkspaceStartJob>(JOB)
        if (current?.attempt === job.attempt)
          await transaction.put(JOB, {
            ...job,
            cancelled: current.cancelled || job.cancelled,
          })
      })
    },
    result: async () => {
      const result = await storage.get<WorkspaceStartResult>(RESULT)
      return result && !result.ok
        ? {
            ...result,
            error: {
              ...result.error,
              log: (await readStartLog(storage, env)) || null,
            },
          }
        : result
    },
    complete: async (result) => {
      await storage.transaction(async (transaction) => {
        const current = await transaction.get<WorkspaceStartJob>(JOB)
        if (!current || (current.cancelled && result.ok)) return
        await transaction.put(RESULT, result)
        await transaction.delete(JOB)
      })
    },
    secrets: async (values) => {
      const context =
        (await storage.get<string>('lifecycle:start-log-context')) ?? ''
      await storage.put(
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
        const current = await transaction.get<WorkspaceStartJob>(JOB)
        if (current?.attempt !== job.attempt || current.cancelled) return
        let count =
          (await transaction.get<number>('lifecycle:start-log-count')) ?? 0
        for (const chunk of chunks)
          await transaction.put(
            `${LOG}${String(++count).padStart(16, '0')}`,
            chunk,
          )
        await transaction.put('lifecycle:start-log-count', count)
        await transaction.put(JOB, {
          ...job,
          stdoutOffset: output.stdoutNextOffset,
          stderrOffset: output.stderrNextOffset,
        })
      })
    },
    schedule: () => storage.setAlarm(now() + 1_000),
  }
}
