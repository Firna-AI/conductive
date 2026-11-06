import type { AppEnv } from '../env'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { DurableLifecycleState } from './durable-types'
import { requireOrgMember } from './access'
import { readWorkspace } from './workspace-data'
import { creationSender, markCreationFailed } from './creation-attempt-data'

export interface FailedCreationDraft {
  workspaceId: string
  orgId: string
  senderUserId: string
  sessionId: string
  turnId: string
  request: SendMessageRequest
  error: { code: string; message: string; log: string | null }
}

const KEY = 'lifecycle:failed-creation'
export interface FailedCreationStorage {
  get(key: string): Promise<FailedCreationDraft | undefined>
  put(key: string, value: FailedCreationDraft): Promise<void>
}

export async function retainFailedCreation(
  env: AppEnv,
  storage: FailedCreationStorage,
  state: DurableLifecycleState | undefined,
  error: FailedCreationDraft['error'],
  fallback?: Omit<FailedCreationDraft, 'error'>,
): Promise<void> {
  let draft = fallback
  if (!draft && state?.pendingFirstMessage) {
    const row = await readWorkspace(env.DB, state.orgId, state.workspaceId)
    draft = {
      workspaceId: state.workspaceId,
      orgId: state.orgId,
      senderUserId: '',
      sessionId: row.sessionId,
      turnId: row.firstTurnId,
      request: state.pendingFirstMessage,
    }
  }
  if (!draft) return
  const index = await creationSender(env.DB, draft.workspaceId, draft.orgId)
  if (!index) return
  await storage.put(KEY, { ...draft, senderUserId: index.senderUserId, error })
  await markCreationFailed(env.DB, draft.workspaceId)
}

/** Later browser recovery passes the authenticated sender, never a body user ID. */
export async function failedCreationForSender(
  env: AppEnv,
  storage: FailedCreationStorage,
  orgId: string,
  senderUserId: string,
): Promise<FailedCreationDraft | undefined> {
  await requireOrgMember(env.DB, orgId, senderUserId)
  const draft = await storage.get(KEY)
  return draft?.orgId === orgId && draft.senderUserId === senderUserId
    ? draft
    : undefined
}
