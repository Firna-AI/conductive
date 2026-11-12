import type { WorkspaceStorage } from './platform-storage'
import type { AppEnv } from '../env'
import { releasedStartLog, type EncryptedStartLog } from './start-logs'
import type { MaskedStartLog } from './masked-start-log'

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
