import type { UserMessage } from '../../src/shared/generated/UserMessage'
import { sessionLink } from '../../src/shared/session-link'
import { wakeText, wakeWords } from '../../src/ui/components/chat/wakeCopy'
import type { AppEnv } from '../env'
import type { ChatOperation } from './operation'
import type { ChatDependencies } from './types'
import { TurnLifecycle } from './turn-lifecycle'
import { watchAdmission } from './session-watch-admission'
import type { ReadySessionWatch, WatchReceipt } from './session-watch-records'

/** Persist the ordinary message and its visible notice with one durable receipt. */
export async function acceptSessionWatchNotice(
  operation: ChatOperation,
  watch: ReadySessionWatch,
  env: AppEnv,
  dependencies: Pick<
    ChatDependencies,
    'randomId' | 'sessionWatchAlarm' | 'now'
  >,
  generation: number,
): Promise<WatchReceipt> {
  const previous = await operation.read((view) =>
    view.watches.receipt(watch.id),
  )
  if (previous) return previous
  const admitted = await watchAdmission(operation, watch, env)
  if (!admitted)
    return operation.change(async (view) => {
      await view.watches.assertActive(generation)
      const receipt: WatchReceipt = { watch, state: 'suppressed' }
      await view.watches.saveReceipt(receipt)
      return receipt
    })
  await dependencies.sessionWatchAlarm?.(dependencies.now() + 30_000, true)
  const link = sessionLink(
    env.APP_ORIGIN,
    watch.orgId,
    watch.workspaceId,
    watch.sessionId,
  )
  return operation.change(async (view) => {
    await view.watches.assertActive(generation)
    const { session, user } = admitted
    const turn = await new TurnLifecycle(view, session).select(
      user.id,
      dependencies.randomId,
    )
    const message: UserMessage = {
      id: `session-watch:${watch.id}`,
      sessionId: session.id,
      text: wakeText(wakeWords(watch.state, watch.reason ?? undefined), link),
      sender: {
        id: user.id,
        githubLogin: user.githubLogin,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      attachments: [],
      choice: session.choice,
      createdAt: view.now,
      state: 'queued',
    }
    await view.saveMessage(message)
    const type = turn.messageIds.length ? 'message' : 'turn'
    turn.messageIds.push(message.id)
    await view.saveTurn(turn)
    await view.saveMessageTurn(message.id, turn.id)
    await view.saveNewestTurn(session.id, turn.id)
    await view.saveCommand({
      type,
      commandId: dependencies.randomId(),
      sessionId: session.id,
      turnId: turn.id,
      messageId: message.id,
      sessionWatchId: watch.id,
      attachments: [],
    })
    await view.emit({
      type: 'session.watch-notice',
      watchId: watch.id,
      messageId: message.id,
      sessionId: session.id,
      turnId: turn.id,
      watchedWorkspaceId: watch.workspaceId,
      watchedSession: { id: watch.sessionId, link },
      watchedTurnId: watch.turnId,
      state: watch.state,
      reason: watch.reason,
    })
    await view.saveSession(session)
    await view.emit({ type: 'session.updated', session })
    const receipt: WatchReceipt = {
      watch,
      state: 'accepted',
      messageId: message.id,
      resume: 'pending',
    }
    await view.watches.saveReceipt(receipt)
    return receipt
  })
}
