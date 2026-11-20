import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { AppEnv } from '../env'
import { readUser } from '../data/users'
import { SenderAccessDenied } from './login-access'
import type { ChatOperation } from './operation'
import type { StoredTurn } from './types'

export type ProviderStopPermission =
  { next: 'turn'; sender: MessageSender } | { next: 'reconnect' | 'message' }

export function eligibleProviderTurn(turn: StoredTurn): boolean {
  return (
    turn.state === 'running' &&
    !turn.stopRequest &&
    !turn.closeAfterStop &&
    !turn.loginFailure
  )
}

export async function observeProviderStopPermissions(
  operation: ChatOperation,
  env: AppEnv,
): Promise<ReadonlyMap<string, ProviderStopPermission>> {
  const turns = await operation.read(async (view) => {
    const active: StoredTurn[] = []
    for (const session of await view.sessions()) {
      const turn = session.activeTurnId
        ? await view.turn(session.activeTurnId)
        : undefined
      if (session.closedAt === null && turn && eligibleProviderTurn(turn))
        active.push(turn)
    }
    return active
  })
  const result = new Map<string, ProviderStopPermission>()
  for (const turn of turns) {
    try {
      const observed = await operation.logins.observe(
        turn.sessionId,
        undefined,
        turn.senderId,
      )
      if (!observed.login) {
        result.set(turn.id, {
          next: observed.session.loginAvailable ? 'message' : 'reconnect',
        })
        continue
      }
      const user = await readUser(env.DB, turn.senderId)
      result.set(
        turn.id,
        user
          ? {
              next: 'turn',
              sender: {
                id: user.id,
                githubLogin: user.githubLogin,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
              },
            }
          : { next: 'message' },
      )
    } catch (error) {
      if (!(error instanceof SenderAccessDenied)) throw error
      result.set(turn.id, { next: 'message' })
    }
  }
  return result
}
