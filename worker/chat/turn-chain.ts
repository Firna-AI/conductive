import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

const PROVIDER_CONTINUATION_LIMIT_MS = 30 * 24 * 60 * 60 * 1_000
const PROVIDER_CONTINUATION_MIN_MS = 15 * 60 * 1_000

function appMessage(id: string): boolean {
  return id.startsWith('continuation:') || id.startsWith('secret-notice:')
}

export async function turnChainStartedAt(
  view: ChatTransaction,
  turn: StoredTurn,
): Promise<number> {
  let memberAt: number | undefined
  let firstAt: number | undefined
  for (const id of turn.messageIds) {
    const message = await view.message(id)
    if (!message || message.sessionId !== turn.sessionId) continue
    firstAt = Math.min(firstAt ?? Infinity, message.createdAt)
    if (!appMessage(id))
      memberAt = Math.max(memberAt ?? -Infinity, message.createdAt)
  }
  return Math.max(
    turn.chainStartedAt ?? memberAt ?? firstAt ?? turn.startedAt ?? view.now,
    memberAt ?? -Infinity,
  )
}

export async function continuationWithinLimit(
  view: ChatTransaction,
  turn: StoredTurn,
): Promise<boolean> {
  const chainStartedAt = await turnChainStartedAt(view, turn)
  if (chainStartedAt + PROVIDER_CONTINUATION_LIMIT_MS <= view.now) return false
  return (
    turn.providerContinuationStartedAt === undefined ||
    (turn.providerContinuationStartedAt !== null &&
      turn.providerContinuationStartedAt + PROVIDER_CONTINUATION_MIN_MS <=
        view.now)
  )
}
