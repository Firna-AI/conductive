import type {
  RunnerCommandV1,
  RunnerCommandV2,
  RunnerLogin,
  RunnerMessageDuringTurnV2,
  RunnerTurnCredential,
  RunnerTurnV2,
} from '../../src/shared/runner'
import { isRunnerV1Login } from '../../src/shared/runner'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import { parseCodexTokens, parseCodexIdentity } from '../codex-auth/tokens'
import type { RunnerDispatchCommand } from './types'

export function legacyRunnerCommand(
  command: RunnerDispatchCommand,
): RunnerCommandV1 {
  if (command.type !== 'turn' && command.type !== 'message') return command
  if (!isRunnerV1Login(command.login))
    throw new Error('The runner cannot use this login kind.')
  return { ...command, login: command.login }
}

/** The caller holds the chat queue and has committed the turn's running state. */
export async function gatewayRunnerCommand(
  command: RunnerDispatchCommand,
  workspaceId: string,
  forRunningTurn: WorkspaceTurnTokens['forRunningTurn'],
): Promise<RunnerCommandV2 | null> {
  if (command.type !== 'turn' && command.type !== 'message') return command
  const { login, ...fields } = command
  if (fields.type === 'message') {
    const message: RunnerMessageDuringTurnV2 = fields
    return message
  }
  const token = await forRunningTurn(workspaceId, fields.turnId, login)
  if (!token) return null
  const turn: RunnerTurnV2 = {
    ...fields,
    credential: nativeCredential(login, token),
  }
  return turn
}

function nativeCredential(
  login: RunnerLogin,
  token: string,
): RunnerTurnCredential {
  if (login.agent === 'codex' && login.kind === 'token') {
    const stored = parseCodexTokens(login.secret)
    const account = stored ? parseCodexIdentity(stored.idToken) : null
    if (!stored || !account)
      throw new Error(chatGptSignInCopy.causes.notRenewed)
    return { agent: 'codex', kind: 'token', token, account }
  }
  return login.agent === 'claude'
    ? { agent: 'claude', kind: login.kind, token }
    : { agent: 'codex', kind: 'api-key', token }
}
