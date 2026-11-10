import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { PendingCommand } from './types'

export type DispatchState = 'send' | 'wait' | 'skip'
export type DispatchResult<T> =
  { state: 'send'; command: T } | { state: 'wait' | 'skip' }

/** A waiting message holds only later messages of its turn. Stop stays independent. */
export async function dispatchInOrder(
  commands: readonly PendingCommand[],
  attempt: (command: PendingCommand) => Promise<DispatchState>,
): Promise<void> {
  const waitingTurns = new Set<string>()
  for (const command of commands) {
    const message = command.type === 'turn' || command.type === 'message'
    if (message && waitingTurns.has(command.turnId)) continue
    const state = await attempt(command)
    if (message && state === 'wait') waitingTurns.add(command.turnId)
  }
}

export async function commandDispatchState(
  view: ChatTransaction,
  command: PendingCommand,
): Promise<DispatchState> {
  if (!(await view.command(command.commandId))) return 'skip'
  const session = await view.session(command.sessionId)
  if (!session) return 'skip'
  if ('turnId' in command) {
    const turn = await view.turn(command.turnId)
    // Only a running copy failure saves an interrupt after its turn ends.
    if (
      command.type === 'interrupt' &&
      turn?.state === 'failed' &&
      turn.started === true
    )
      return 'send'
    if (
      !turn ||
      turn.state === 'finished' ||
      turn.state === 'stopped' ||
      turn.state === 'failed'
    )
      return 'skip'
  }
  if (await new TurnLifecycle(view, session).canDispatch(command)) return 'send'
  return session.closedAt === null ? 'wait' : 'skip'
}
