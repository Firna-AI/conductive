import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { UpdateWorkspaceCapabilitiesRequest } from '../../src/shared/secrets'
import type { WorkspaceChat } from '../chat/backend'
import {
  captureCapabilities,
  recordCapabilityChanges,
  type CapabilityTouch,
  type CapabilitySnapshot,
} from '../chat/capability-changes'
import { requireActiveOrg } from '../data/user-access'
import { requireOrgMember } from '../members/permissions'
import type { AppEnv } from '../env'
import {
  readWorkspaceCapabilities,
  requireOrgSecrets,
} from './capabilities-data'
import { readCapabilitiesChange } from './capabilities-input'
import { updateWorkspaceCapabilities } from './capabilities-writes'
import { warnWorker } from '../warnings'

export interface WorkspaceCapabilitiesWrite {
  orgId: string
  workspaceId: string
  member: MessageSender
  now: number
  change: UpdateWorkspaceCapabilitiesRequest
}

export async function writeWorkspaceCapabilities(
  chat: WorkspaceChat,
  env: AppEnv,
  input: WorkspaceCapabilitiesWrite,
) {
  const { orgId, workspaceId, member, now } = input
  const change = readCapabilitiesChange(input.change)
  return chat.authorizedWorkspaceOperation(
    workspaceId,
    async () => {
      await requireOrgMember(env.DB, orgId, member.id)
      await requireActiveOrg(env.DB, orgId)
      await readWorkspaceCapabilities(env.DB, orgId, workspaceId)
      if (change.preapprovedSecretIds !== undefined)
        await requireOrgSecrets(env.DB, orgId, change.preapprovedSecretIds)
    },
    async (operation) => {
      let before: CapabilitySnapshot = new Map()
      try {
        before = await chat.store.read(workspaceId, (view) =>
          captureCapabilities(env.DB, view),
        )
      } catch {
        warnWorker({ kind: 'capability_notes_failed' })
      }
      const writes = await updateWorkspaceCapabilities(env.DB, {
        orgId,
        workspaceId,
        userId: member.id,
        now,
        change,
      })
      const capabilities = await readWorkspaceCapabilities(
        env.DB,
        orgId,
        workspaceId,
      )
      const touches: CapabilityTouch[] = writes.map((write) => ({
        ...(write.sessionId ? { sessionId: write.sessionId } : {}),
        change: { kind: write.kind, names: write.names },
      }))
      try {
        if (before.size && touches.length)
          await operation.change((view) =>
            recordCapabilityChanges(env.DB, view, before, touches, member),
          )
        await chat.flushRunner()
      } catch {
        warnWorker({ kind: 'capability_notes_failed' })
      }
      return capabilities
    },
  )
}
