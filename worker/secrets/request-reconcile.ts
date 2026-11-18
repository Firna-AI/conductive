import type { SecretRequestEnd } from '../../src/shared/secret-requests'
import { activeStoredTurn } from '../devices/access'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import { secretWorkspaceState } from './grant-data'
import { openSecretRequest, type StoredSecretRequest } from './request-records'
import type { SecretRuntime } from './runtime'
import { pruneSavedOutputSecrets } from '../chat/output-filter-records'
import { runningOutputSecrets } from '../lifecycle/output-secrets'
import { agentOutputSecrets, storedAgentOutputSecrets } from './output-values'

export const SECRET_REQUEST_WAIT_MS = 90_000

export async function reconcileSecretRequests(
  runtime: SecretRuntime,
  operation: WorkspaceOperation,
  workspaceId: string,
) {
  const notices: StoredSecretRequest[] = []
  const records = await runtime.chat.store.read(workspaceId, (view) =>
    view.secrets.requests(),
  )
  const values = await runtime.records.values()
  const unsettled = records.some(
    (record) =>
      openSecretRequest(record.request) ||
      (record.request.state === 'allowed' &&
        record.lateAnswer &&
        record.request.notice === null),
  )
  if (!unsettled && !values.length) return notices
  const state = await secretWorkspaceState(runtime.env.DB, workspaceId)
  if (!state) return notices
  const endedBy: SecretRequestEnd | null =
    state.archivedAt !== null
      ? 'archived'
      : state.orgSuspendedAt !== null
        ? 'org-suspended'
        : state.ownerSuspendedAt !== null
          ? 'owner-suspended'
          : null
  for (const record of records) {
    if (openSecretRequest(record.request)) {
      const session = await runtime.chat.store.read(workspaceId, (view) =>
        view.session(record.request.sessionId),
      )
      const end =
        endedBy ?? (session?.closedAt !== null ? 'session-closed' : null)
      if (end)
        record.request = {
          ...record.request,
          state: 'not-answered',
          endedBy: end,
          updatedAt: runtime.now(),
        }
      else if (
        record.request.state === 'waiting' &&
        (record.request.createdAt + SECRET_REQUEST_WAIT_MS <= runtime.now() ||
          !(await activeStoredTurn(
            runtime.chat,
            workspaceId,
            record.request.turnId,
          )))
      )
        record.request = {
          ...record.request,
          state: 'late',
          late: true,
          updatedAt: runtime.now(),
        }
      else continue
      await runtime.publish(operation, record)
    } else if (
      !endedBy &&
      record.request.state === 'allowed' &&
      record.lateAnswer &&
      record.request.notice === null
    ) {
      record.request.notice = await runtime.chat.secretNotice(record)
      await runtime.publish(operation, record)
      if (record.request.notice.state === 'sent') notices.push(record)
    }
  }
  if (
    values.some(
      (value) =>
        state.archivedAt !== null ||
        (value.expiresAt !== null && value.expiresAt <= runtime.now()),
    )
  )
    await operation.change(async (view) => {
      const workspace = { id: workspaceId, orgId: state.orgId }
      const running = await runningOutputSecrets(runtime.env, workspace)
      await view.output.maskTools(
        runtime.env,
        workspaceId,
        new Set([
          ...running,
          ...(await storedAgentOutputSecrets(
            runtime.env,
            view.secrets,
            workspace,
          )),
        ]),
      )
      await view.secrets.expire(runtime.now(), state.archivedAt !== null)
      await pruneSavedOutputSecrets(
        runtime.env,
        view,
        new Set([
          ...running,
          ...(await agentOutputSecrets(
            runtime.env,
            view.secrets,
            { id: workspaceId, orgId: state.orgId },
            runtime.now(),
          )),
        ]),
      )
    })
  return notices
}
