import { restackPrompt } from '../../src/ui/components/workspace/barCopy'
import type { User } from '../../src/shared/api'
import type { MergeQueueBranchLabel } from '../../src/shared/generated/MergeQueueBranchLabel'
import { queueId } from '../merge-queue/contracts'
import { queueChanged } from '../merge-queue/errors'
import type {
  QueueFixAdmission,
  QueueFixRequest,
} from '../merge-queue/fix-contracts'
import { acceptMessage } from './messages'
import type { ChatOperation } from './operation'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

async function fixSession(view: ChatTransaction) {
  const sessions = await view.sessions()
  if (sessions.some((session) => session.activeTurnId !== null))
    return { kind: 'waiting', wait: 'active-turn' } as const
  const newest = sessions
    .filter((session) => session.closedAt === null)
    .sort(
      (a, b) =>
        b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    )[0]
  return newest
    ? ({ kind: 'session', session: newest } as const)
    : ({ kind: 'waiting', wait: 'open-session' } as const)
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

/** The caller holds the workspace sequence through the admission. */
export async function acceptQueueFix(
  operation: ChatOperation,
  fix: QueueFixRequest,
  authorize: () => Promise<User>,
  baseLabel: () => Promise<MergeQueueBranchLabel>,
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
  const target = await operation.read(fixSession)
  if (target.kind === 'waiting') return target
  const { login, owner } = await operation.logins.observe(
    target.session.id,
    undefined,
    user.id,
  )
  if (!login || !owner) return { kind: 'waiting', wait: 'agent-login' }
  const label = restack.sync ? undefined : await baseLabel()
  return operation.change(async (transaction) => {
    const current = await fixSession(transaction)
    if (current.kind === 'waiting') return current
    if (current.session.id !== target.session.id) return { kind: 'deferred' }
    const sender = await authorize()
    const session = current.session
    if (!session.login) {
      session.login = owner
      delete session.defaultLogin
      await transaction.saveSession(session)
    }
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
        choice: session.choice,
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
