import type { AppEnv } from '../env'
import type { ChatOperation } from './operation'
import type { WakeUpResume } from './session-wake-up-records'
import type { ChatTransaction } from './store'
import { TurnCompletion } from './turn-completion'
import type { StoredTurn } from './types'
import { admitWake } from './wake-admission'

export async function authorizeWakeUpResume(
  operation: ChatOperation,
  receipt: WakeUpResume,
  turn: StoredTurn,
  env: AppEnv,
  generation?: number,
): Promise<boolean> {
  const admission = await admitWake(operation, receipt, env, {
    retryTurn: turn,
    requireSetter: true,
  })
  if (admission.kind === 'admitted') return true
  const { messageId, sessionId } = receipt
  await operation.change(async (view) => {
    await view.wakeUps.assertActive(generation)
    const message = await view.message(messageId)
    if (message?.state !== 'queued') return
    const command = (await view.pending()).find(
      (item) => 'messageId' in item && item.messageId === messageId,
    )
    if (!command || !('turnId' in command)) return
    await view.removeCommand(command.commandId)
    const receivingTurn = await view.turn(command.turnId)
    if (receivingTurn) {
      receivingTurn.messageIds = receivingTurn.messageIds.filter(
        (id) => id !== messageId,
      )
      const session = await view.session(sessionId)
      if (
        session &&
        receivingTurn.state === 'queued' &&
        command.type === 'turn'
      )
        await new TurnCompletion(view, session).stopped(receivingTurn, () =>
          crypto.randomUUID(),
        )
      else await view.saveTurn(receivingTurn)
    }

    await view.wakeUps.endResume(receipt)
    await view.emit({
      type: 'session.wake-up-ended',
      sessionId,
      at:
        receipt.at ??
        (await retainedWakeUpTime(view, receipt)) ??
        message.createdAt,
      wakeUpId: receipt.id,
      outcome: { kind: 'could-not-start', reason: admission },
    })
  })
  return false
}

async function retainedWakeUpTime(
  view: ChatTransaction,
  receipt: WakeUpResume,
) {
  let after = 0
  for (;;) {
    const page = await view.history(after, view.eventNumber, {
      sessionId: receipt.sessionId,
    })
    for (const { event } of page.events)
      if (
        event.type === 'session.wake-up-scheduled' &&
        event.wakeUp.id === receipt.id
      )
        return event.wakeUp.at
    if (!page.hasMore) return undefined
    after = page.nextAfterEventNumber
  }
}
