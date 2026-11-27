import type {
  ChatWorkspaceSummary,
  ChatWorkspaceSummaryOptions,
} from '../chat/workspace-summary'
import type { DurableLifecycleState } from './durable-types'

interface SummaryReader {
  workspaceSummary(
    workspaceId?: string,
    options?: ChatWorkspaceSummaryOptions,
  ): Promise<ChatWorkspaceSummary>
}

/**
 * The chat summary of a workspace. With `messageWaiting`, it also says
 * whether a message waits: in the chat queue, or as the first message of
 * a new workspace that the chat has not accepted yet. The list mark runs
 * its light for a start only while a message waits, as
 * docs/protocol/workspace-marks.md says.
 */
export async function waitingSummary(
  chat: SummaryReader,
  readLifecycle: () => Promise<
    Pick<DurableLifecycleState, 'pendingFirstMessage'> | undefined
  >,
  options?: ChatWorkspaceSummaryOptions,
): Promise<ChatWorkspaceSummary> {
  const summary = await chat.workspaceSummary(undefined, options)
  if (!options?.messageWaiting || summary.messageWaiting) return summary
  const lifecycle = await readLifecycle()
  return {
    ...summary,
    messageWaiting: (lifecycle?.pendingFirstMessage ?? null) !== null,
  }
}
