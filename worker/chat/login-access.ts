import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import type { Agent } from '../../src/shared/generated/Agent'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { readSessionLogin } from './queries'
import { readLoginAccess, sessionLoginCandidate } from './login-access-data'
import type { ChatDependencies } from './types'

/** This failure closes the runner and leaves its commands queued. */
export class RunnerAccessDenied extends Error {}

/** Reuse can be refused while the starter's own login stays available. */
export class LoginReuseDenied extends Error {}

export class SenderAccessDenied extends HttpError {
  constructor() {
    super(
      409,
      'agent_login_required',
      'The message sender no longer has access to this workspace.',
    )
  }
}

export async function readLogin(
  dependencies: ChatDependencies,
  owner: SessionLogin | null,
  agent: Agent,
  runnerTokenHash?: string,
  senderId?: string,
) {
  const login = await dependencies.resolveLogin(
    owner,
    agent,
    runnerTokenHash,
    senderId,
  )
  return login?.agent === agent ? login : null
}

export function loginResolver(
  env: AppEnv,
  workspaceId: () => string | null,
  override?: ChatDependencies['resolveLogin'],
): ChatDependencies['resolveLogin'] {
  const read: ChatDependencies['resolveLogin'] =
    override ??
    ((login, agent) =>
      login === null
        ? Promise.resolve(null)
        : readSessionLogin(env, login, agent))
  return async (login, agent, runnerTokenHash, senderId) => {
    const id = workspaceId()
    if (!id) return null
    const access = (
      await readLoginAccess(
        env,
        { workspaceId: id },
        [{ sessionId: 'credential', agent, ...(login ? { login } : {}) }],
        { runnerTokenHash, senderId },
      )
    ).get('credential')
    if (runnerTokenHash !== undefined && !access?.runnerAllowed)
      throw new RunnerAccessDenied()
    if (senderId !== undefined && !access?.senderAllowed)
      throw new SenderAccessDenied()
    const candidate =
      login && access ? sessionLoginCandidate(access, login) : null
    if (!candidate?.allowed || !login) return null
    if (
      candidate.available &&
      !candidate.shared &&
      senderId !== undefined &&
      login.type === 'personal' &&
      senderId !== login.userId
    )
      throw new LoginReuseDenied()
    return read(login, agent, runnerTokenHash, senderId)
  }
}
