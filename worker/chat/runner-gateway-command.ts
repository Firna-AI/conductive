import type {
  RunnerCommandV1,
  RunnerCommandV2,
  RunnerLogin,
  RunnerMessageDuringTurnV2,
  RunnerTurnCredential,
  RunnerTurnV2,
} from '../../src/shared/runner'
import type { WorkspaceTurnTokens } from '../model-gateway/workspace'

/** The caller holds the chat queue and has committed the turn's running state. */
export async function gatewayRunnerCommand(
  command: RunnerCommandV1,
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
  return login.agent === 'claude'
    ? { agent: login.agent, kind: login.kind, token }
    : { agent: login.agent, kind: login.kind, token }
}
