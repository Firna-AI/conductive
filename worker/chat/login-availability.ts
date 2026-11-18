import type { Session } from '../../src/shared/generated/Session'
import type { AppEnv } from '../env'
import { defaultLogin } from './default-login'
import { publicLoginOwner } from './login-owner'
import {
  readLoginAccess,
  sessionLoginCandidate,
  type SessionLoginTarget,
} from './login-access-data'

export type SessionLoginMetadata = Pick<
  Session,
  'loginAvailable' | 'loginShared' | 'defaultLogin'
>

export async function readLoginMetadata(
  env: AppEnv,
  workspaceId: string,
  targets: readonly SessionLoginTarget[],
): Promise<ReadonlyMap<string, SessionLoginMetadata>> {
  const access = await readLoginAccess(env, { workspaceId }, targets)
  const result = new Map<string, SessionLoginMetadata>()
  for (const target of targets) {
    const entry = access.get(target.sessionId)
    const login = target.login ?? (target.userId ? defaultLogin(entry) : null)
    const owner = publicLoginOwner(login)
    const candidate =
      entry && login ? sessionLoginCandidate(entry, login) : null
    result.set(target.sessionId, {
      loginAvailable: candidate?.available === true,
      loginShared:
        login?.type === 'org' ||
        (candidate?.available === true && candidate.shared),
      ...(!target.login && owner ? { defaultLogin: owner } : {}),
    })
  }
  return result
}
