import type { AppEnv } from '../env'
import { releasedStartLog, type EncryptedStartLog } from './start-logs'
import type { WorkspaceStartResult } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

type TransportStartResult = WorkspaceStartResult<EncryptedStartLog>

/** RPC copies ciphertext and plain metadata. Masked classes stay local. */
export interface WorkspaceLifecycleTransport extends Omit<
  WorkspaceLifecycleEndpoint,
  | 'waitLifecycleStart'
  | 'waitCreationLifecycle'
  | 'readCreationLifecycleResult'
  | 'readLifecycleStartLog'
> {
  waitLifecycleStart(): Promise<TransportStartResult>
  waitCreationLifecycle(): Promise<TransportStartResult>
  readCreationLifecycleResult(): Promise<TransportStartResult | undefined>
  readLifecycleStartLog(): Promise<EncryptedStartLog>
}

export async function startResultForTransport(
  result: WorkspaceStartResult,
  readLog: () => Promise<EncryptedStartLog>,
): Promise<TransportStartResult> {
  return result.ok
    ? result
    : { ...result, error: { ...result.error, log: await readLog() } }
}

async function releasedStartResult(
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
  result: TransportStartResult,
): Promise<WorkspaceStartResult> {
  if (result.ok) return result
  const payload = result.error.log
  const log = payload
    ? await releasedStartLog(
        env,
        payload.context,
        payload.chunks,
        payload.secretsCiphertext,
      )
    : null
  return { ...result, error: { ...result.error, log: log?.text ? log : null } }
}

/** Re-mask decrypted data after RPC instead of trusting serialized strings. */
export function workspaceLifecycleEndpoint(
  transport: WorkspaceLifecycleTransport,
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
): WorkspaceLifecycleEndpoint {
  return {
    initializeLifecycle: (input) => transport.initializeLifecycle(input),
    readLifecycle: () => transport.readLifecycle(),
    beginLifecycleStart: (kind) => transport.beginLifecycleStart(kind),
    lifecycleStep: (id, label, state) =>
      transport.lifecycleStep(id, label, state),
    lifecyclePrepared: () => transport.lifecyclePrepared(),
    lifecycleFailed: (error) => transport.lifecycleFailed(error),
    lifecycleStopped: () => transport.lifecycleStopped(),
    clearLifecycle: () => transport.clearLifecycle(),
    lifecycleActivity: () => transport.lifecycleActivity(),
    openLifecycleTab: (tabId) => transport.openLifecycleTab(tabId),
    closeLifecycleTab: (tabId) => transport.closeLifecycleTab(tabId),
    credentialSender: (turnId) => transport.credentialSender(turnId),
    retryFailedCreateCleanup: (id) => transport.retryFailedCreateCleanup(id),
    finishDiskMaintenance: () => transport.finishDiskMaintenance(),
    queueLifecycleStart: (job) => transport.queueLifecycleStart(job),
    async waitLifecycleStart() {
      return releasedStartResult(env, await transport.waitLifecycleStart())
    },
    async waitCreationLifecycle() {
      return releasedStartResult(env, await transport.waitCreationLifecycle())
    },
    waitCreationAdmission: () => transport.waitCreationAdmission(),
    async readCreationLifecycleResult() {
      const result = await transport.readCreationLifecycleResult()
      return result ? releasedStartResult(env, result) : undefined
    },
    async readLifecycleStartLog() {
      const log = await transport.readLifecycleStartLog()
      return releasedStartLog(
        env,
        log.context,
        log.chunks,
        log.secretsCiphertext,
      )
    },
    retainLifecycleFailedCreation: (error, fallback) =>
      transport.retainLifecycleFailedCreation(error, fallback),
  }
}
