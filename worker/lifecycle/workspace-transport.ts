import type { AppEnv } from '../env'
import { releasedStartLog, type EncryptedStartLog } from './start-logs'
import type { WorkspaceStartIntent, WorkspaceStartResult } from './start-types'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { TurnTokenEndpoint } from '../model-gateway/types'
import { requireFeatureResult, type FeatureResult } from '../features/result'
import type { ActivateWorkspaceResponse } from '../../src/shared/workspaces'
import {
  serializeStartJob,
  type StoredWorkspaceStartJob,
} from './start-job-codec'

type TransportStartResult = WorkspaceStartResult<EncryptedStartLog>

/** RPC copies ciphertext and plain metadata. Masked classes stay local. Gateway credentials stay within Worker calls. */
export interface WorkspaceLifecycleTransport
  extends
    Omit<
      WorkspaceLifecycleEndpoint,
      | 'waitLifecycleStart'
      | 'waitCreationLifecycle'
      | 'readCreationLifecycleResult'
      | 'readLifecycleStartLog'
      | 'queueLifecycleStart'
      | 'activateImportedWorkspace'
    >,
    TurnTokenEndpoint {
  activateImportedWorkspace(
    orgId: string,
    workspaceId: string,
    userId: string,
  ): Promise<FeatureResult<ActivateWorkspaceResponse>>
  queueLifecycleStart(
    job: StoredWorkspaceStartJob,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean>
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
): WorkspaceLifecycleEndpoint & TurnTokenEndpoint {
  return {
    activateImportedWorkspace: async (orgId, id, userId) =>
      requireFeatureResult(
        await transport.activateImportedWorkspace(orgId, id, userId),
      ),
    activationCredentialSender: (id) =>
      transport.activationCredentialSender(id),
    sendImportCommand: (id, command) =>
      transport.sendImportCommand(id, command),
    seedImportSession: (id, input) => transport.seedImportSession(id, input),
    initializeLifecycle: (input) => transport.initializeLifecycle(input),
    readLifecycle: () => transport.readLifecycle(),
    beginLifecycleStart: (kind) => transport.beginLifecycleStart(kind),
    lifecycleStep: (id, label, state) =>
      transport.lifecycleStep(id, label, state),
    lifecyclePrepared: () => transport.lifecyclePrepared(),
    lifecycleFailed: (error) => transport.lifecycleFailed(error),
    lifecycleStopped: () => transport.lifecycleStopped(),
    suspendLifecycle: (id, ownerId) => transport.suspendLifecycle(id, ownerId),
    reconcileLifecycleAccess: (id) => transport.reconcileLifecycleAccess(id),
    clearLifecycle: () => transport.clearLifecycle(),
    lifecycleActivity: () => transport.lifecycleActivity(),
    credentialSender: (turnId) => transport.credentialSender(turnId),
    checkTurnToken: (token) => transport.checkTurnToken(token),
    retryFailedCreateCleanup: (id) => transport.retryFailedCreateCleanup(id),
    finishDiskMaintenance: () => transport.finishDiskMaintenance(),
    queueLifecycleStart: (job, intent) =>
      transport.queueLifecycleStart(serializeStartJob(job), intent),
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
  }
}
