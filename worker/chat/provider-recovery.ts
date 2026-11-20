import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { Session } from '../../src/shared/generated/Session'
import { prependProviderContinuation } from './provider-continuation'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

export interface ProviderRecovery {
  sourceTurnId: string
  sender: MessageSender
  started: boolean
  acknowledgedMessageIds: string[]
}

export async function observeProviderRecovery(
  view: ChatTransaction,
  session: Session,
  source: StoredTurn,
  event: AgentChatEvent,
  randomId: () => string,
): Promise<void> {
  if (source.endReason !== 'cloud_computer_stopped') return
  for (const next of await view.turns()) {
    const recovery = next.providerRecovery
    if (
      next.sessionId !== source.sessionId ||
      next.state !== 'queued' ||
      recovery?.sourceTurnId !== source.id
    )
      continue
    recovery.started ||=
      event.type === 'turn.started' ||
      (event.type === 'turn.completed' && event.filesUnavailable === true)
    const acknowledged =
      event.type === 'turn.started'
        ? event.messageIds
        : event.type === 'turn.completed' ||
            event.type === 'assistant.completed'
          ? event.userMessageIds
          : []
    if (recovery.started)
      recovery.acknowledgedMessageIds = [
        ...new Set([...recovery.acknowledgedMessageIds, ...acknowledged]),
      ]
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      if (recovery.started) {
        const received = new Set(recovery.acknowledgedMessageIds)
        const commands = (await view.pending()).filter(
          (command) =>
            (command.type === 'turn' || command.type === 'message') &&
            command.turnId === next.id,
        )
        for (const command of commands)
          await view.removeCommand(command.commandId)
        next.messageIds = next.messageIds.filter((id) => !received.has(id))
        for (const id of received) await view.saveMessageTurn(id, source.id)
        await view.saveCommand(
          await prependProviderContinuation(
            view,
            session,
            next,
            recovery.sender,
            randomId,
          ),
        )
        for (const command of commands) {
          if (!('messageId' in command) || received.has(command.messageId))
            continue
          await view.saveCommand({ ...command, type: 'message' })
        }
      }
      delete next.providerRecovery
    }
    await view.saveTurn(next)
  }
}
