import type { AutomationRun } from '../../src/shared/automations'
import type { ChatTransaction } from './store'

export async function automationChainOutcome(
  view: ChatTransaction,
  firstTurnId: string,
): Promise<
  | { state: 'finished' }
  | { state: 'failed'; error: NonNullable<AutomationRun['error']> }
  | undefined
> {
  let turn = await view.turn(firstTurnId)
  const sessionId = turn?.sessionId
  const seen = new Set<string>()
  while (turn && turn.sessionId === sessionId && !seen.has(turn.id)) {
    seen.add(turn.id)
    const continuation = turn.providerStop?.continuationTurnId
    if (continuation) {
      turn = await view.turn(continuation)
      continue
    }
    if (turn.state === 'finished') return { state: 'finished' }
    if (turn.state === 'failed')
      return {
        state: 'failed',
        error: turn.error ?? {
          code: 'agent_turn_failed',
          message: 'The agent could not finish. Try again in the workspace.',
        },
      }
    if (
      turn.state === 'stopped' &&
      turn.endReason === 'cloud_computer_stopped' &&
      turn.providerStop
    ) {
      return {
        state: 'failed',
        error: {
          code:
            turn.providerStop.next === 'reconnect'
              ? 'agent_login_required'
              : 'cloud_computer_stopped',
          message:
            turn.providerStop.next === 'reconnect'
              ? 'Connect the agent login again to continue in the workspace.'
              : 'The cloud computer stopped before the agent finished. Send a message in the workspace to continue.',
          source: 'provider_stop',
        },
      }
    }
    return undefined
  }
}
