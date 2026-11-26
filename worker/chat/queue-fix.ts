import { restackPrompt } from '../../src/ui/components/workspace/barCopy'
import type { User } from '../../src/shared/api'
import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type { MergeQueueBranchLabel } from '../../src/shared/generated/MergeQueueBranchLabel'
import { queueId } from '../merge-queue/contracts'
import { queueChanged } from '../merge-queue/errors'
import type {
  QueueFixAdmission,
  QueueFixRequest,
} from '../merge-queue/fix-contracts'
import { acceptMessage } from './messages'
import type { ChatOperation } from './operation'
import { SessionLogins } from './session-login'
import { createSession } from './sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

async function activeTurn(view: ChatTransaction): Promise<boolean> {
  return (await view.sessions()).some(
    (session) => session.activeTurnId !== null,
  )
}

async function accepted(
  view: ChatTransaction,
  messageId: string,
): Promise<QueueFixAdmission> {
  const turnId = await view.messageTurn(messageId)
  const turn = turnId ? await view.turn(turnId) : undefined
  if (!turn) throw queueChanged()
  return { kind: 'accepted', turnId: turn.id, queued: turn.state === 'queued' }
}

/**
 * Send the restack prompt as a message of the queuer, in a new session of
 * the queuer. The caller holds the workspace sequence through the
 * admission.
 */
export async function acceptQueueFix(
  operation: ChatOperation,
  fix: QueueFixRequest,
  authorize: () => Promise<User>,
  baseLabel: () => Promise<MergeQueueBranchLabel>,
  defaultChoice: (userId: string) => Promise<AgentChoice>,
  dependencies: ChatDependencies,
): Promise<QueueFixAdmission> {
  const { messageId, scope, entry, restack } = fix
  const user = await authorize()
  const receipt = await operation.read((view) =>
    view.queueFixes.receipt(messageId),
  )
  if (receipt) {
    if (queueId(receipt) !== queueId(scope)) throw queueChanged()
    return operation.read((view) => accepted(view, messageId))
  }
  if (await operation.read(activeTurn))
    return { kind: 'waiting', wait: 'active-turn' }
  // Fast mode stays off, as in a session that `create_session` starts.
  const choice = dependencies.normalizeChoice({
    ...(await defaultChoice(user.id)),
    fast: false,
  })
  const resolved = await SessionLogins.resolve(
    dependencies,
    user.id,
    choice.agent,
  )
  if (!resolved) return { kind: 'waiting', wait: 'agent-login' }
  const label = restack.sync ? undefined : await baseLabel()
  return operation.change(async (transaction) => {
    if (await activeTurn(transaction))
      return { kind: 'waiting', wait: 'active-turn' }
    const sender = await authorize()
    const session = await createSession(
      transaction,
      choice,
      dependencies.randomId(),
      sender,
      dependencies,
      null,
      resolved.owner,
    )
    await acceptMessage(
      transaction,
      session.id,
      {
        id: messageId,
        text: restackPrompt({
          number: entry.pullNumber,
          baseHead: restack.baseHead,
          basePullNumber: restack.basePullNumber,
          oldBase: restack.oldBase,
          sync: restack.sync,
          label,
        }),
        choice,
        attachmentIds: [],
      },
      sender,
      { attachments: [], paths: [] },
      dependencies.randomId,
      dependencies.readAutomaticTitleWorkspace,
    )
    await transaction.queueFixes.saveReceipt(messageId, scope)
    return accepted(transaction, messageId)
  })
}
