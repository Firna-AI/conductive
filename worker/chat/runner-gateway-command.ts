import type {
  RunnerCommandV1,
  RunnerCommandV2,
  RunnerMessageDuringTurnV2,
  RunnerTurnCredential,
  RunnerTurnV2,
} from '../../src/shared/runner'
import { isRunnerV1Login } from '../../src/shared/runner'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import type { AgentLogin } from './login-kind'
import { parseCodexTokens, parseCodexIdentity } from '../codex-auth/tokens'
import type { ResolvedCommand } from './types'

export function compatibilityFailure(login: AgentLogin): string {
  if (login.agent === 'codex' && login.kind === 'token')
    return 'This cloud computer cannot run Codex with ChatGPT. Ask an admin to build the org image again. Then start a new workspace. You can also connect an OpenAI API key.'
  return 'This cloud computer cannot use this agent login. Ask an admin to build the org image again. Then start a new workspace.'
}

export function legacyRunnerCommand(command: ResolvedCommand): RunnerCommandV1 {
  if (command.type !== 'turn' && command.type !== 'message') return command
  if (command.login.kind === 'endpoint' || !isRunnerV1Login(command.login))
    throw new Error('The runner cannot use this login kind.')
  return { ...command, login: command.login }
}

/** The caller holds the chat queue and has committed the turn's running state. */
export async function gatewayRunnerCommand(
  command: ResolvedCommand,
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
  login: AgentLogin,
  token: string,
): RunnerTurnCredential {
  if (login.agent === 'codex' && login.kind === 'token') {
    const stored = parseCodexTokens(login.secret)
    const account = stored ? parseCodexIdentity(stored.idToken) : null
    if (!stored || !account)
      throw new Error(chatGptSignInCopy.causes.notRenewed)
    return { agent: 'codex', kind: 'token', token, account }
  }
  return login.agent === 'codex'
    ? { agent: 'codex', kind: 'api-key', token }
    : {
        agent: 'claude',
        kind: login.kind === 'token' ? 'token' : 'api-key',
        token,
        ...(login.kind === 'endpoint' ? { promptCacheTtl: '1h' } : {}),
      }
}
