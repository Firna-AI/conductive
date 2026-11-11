import type {
  RunnerCommandV1,
  RunnerCommandV2,
  RunnerMessageDuringTurnV2,
  RunnerTurnCredential,
  RunnerTurnV2,
} from '../../src/shared/runner'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'
import type { AgentLogin } from './login-kind'
import type { AgentCommand } from './types'

/** The caller holds the chat queue and has committed the turn's running state. */
export async function gatewayRunnerCommand(
  command: AgentCommand,
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
  return login.agent === 'codex'
    ? { agent: 'codex', kind: 'api-key', token }
    : {
        agent: 'claude',
        kind: login.kind === 'token' ? 'token' : 'api-key',
        token,
        ...(login.kind === 'endpoint' ? { promptCacheTtl: '1h' } : {}),
      }
}

export function nativeRunnerCommand(
  command: AgentCommand,
): RunnerCommandV1 | null {
  if (command.type !== 'turn' && command.type !== 'message') return command
  const { login, ...fields } = command
  if (login.kind === 'endpoint') return null
  return { ...fields, login }
}
