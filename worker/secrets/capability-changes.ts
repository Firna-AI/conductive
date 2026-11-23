import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { WorkspaceOperation } from '../chat/workspace-operation'
import {
  captureCapabilities,
  recordCapabilityChanges,
  type CapabilitySnapshot,
  type CapabilityTouch,
} from '../chat/capability-changes'
import { warnWorker } from '../warnings'
import type { SecretRuntime } from './runtime'

export async function captureSecretCapabilities(
  runtime: SecretRuntime,
  workspaceId: string,
  skip?: ReadonlySet<string>,
): Promise<CapabilitySnapshot> {
  try {
    return await runtime.chat.store.read(workspaceId, (view) =>
      captureCapabilities(runtime.env.DB, view, skip),
    )
  } catch {
    warnWorker({ kind: 'capability_notes_failed' })
    return new Map()
  }
}

export async function secretCapabilitiesChanged(
  runtime: SecretRuntime,
  operation: WorkspaceOperation,
  before: CapabilitySnapshot,
  touches: readonly CapabilityTouch[],
  member: MessageSender,
  skip?: ReadonlySet<string>,
) {
  try {
    if (before.size && touches.length)
      await operation.change((view) =>
        recordCapabilityChanges(
          runtime.env.DB,
          view,
          before,
          touches,
          member,
          skip,
        ),
      )
    await runtime.chat.flushRunner()
  } catch {
    warnWorker({ kind: 'capability_notes_failed' })
  }
}
