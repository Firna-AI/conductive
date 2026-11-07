import type { WorkspaceStorage } from './platform-storage'
import type { AppEnv } from '../env'
import {
  encryptedStartText,
  releasedStartLog,
  startLogContext,
  type EncryptedStartLog,
} from './start-logs'
import type { MaskedStartLog } from './masked-start-log'
import type { StartJobStorage } from './start-types'

export const START_JOB_KEY = 'lifecycle:start-job'
const JOB = START_JOB_KEY
export const START_RESULT_KEY = 'lifecycle:start-result'
const RESULT = START_RESULT_KEY
const CREATE_RESULT = 'lifecycle:create-result'
export const CREATE_ADMISSION_KEY = 'lifecycle:create-admission'
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
  async function storedResult(key: string) {
    const result = await storage.get('result', key)
    if (!result || result.ok) return result
    const log = await readStartLog(storage, env)
    return {
      ...result,
      error: { ...result.error, log: log.text ? log : null },
    }
  }
  return {
    job: () => storage.get('job', JOB),
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
        await transaction.put('job', JOB, job)
        await transaction.setAlarm(now())
        return true
      })
    },
    update: async (job) => {
      await storage.transaction(async (transaction) => {
        const current = await transaction.get('job', JOB)
        if (current?.attempt === job.attempt)
          await transaction.put('job', JOB, {
            ...job,
            cancelled: current.cancelled || job.cancelled,
          })
      })
    },
    result: () => storedResult(RESULT),
    creationResult: () => storedResult(CREATE_RESULT),
    admission: () => storage.get('admission', CREATE_ADMISSION_KEY),
    admit: async (created) => {
      await storage.put('admission', CREATE_ADMISSION_KEY, {
        ok: true,
        created,
      })
    },
    publication: () => storage.get('publication', PUBLICATION),
    clearPublication: async () => {
      await storage.delete(PUBLICATION)
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
          if (!(await transaction.get('admission', CREATE_ADMISSION_KEY))) {
            if (stored.ok)
              throw new Error('A create completed before admission')
            await transaction.put('admission', CREATE_ADMISSION_KEY, stored)
          }
          await transaction.put('result', CREATE_RESULT, stored)
          await transaction.put('publication', PUBLICATION, {
            workspaceId: current.workspaceId,
            state: result.ok ? 'succeeded' : 'failed',
          })
        }
        await transaction.delete(JOB)
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
          ...job,
          stdoutOffset: output.stdoutNextOffset,
          stderrOffset: output.stderrNextOffset,
        })
      })
    },
    schedule: () => storage.setAlarm(now() + 1_000),
  }
}
