import type {
  AgentLoginStatus,
  RefreshAgentLoginModelsResponse,
  SaveAgentLoginResponse,
} from '../../shared/account'
import { flag, maybeFlag, record } from './parse'
import { readLogin } from './read-core'

/**
 * The answer of a save of an agent login: the saved login, apart from what
 * the reads of the model list of an own endpoint gave. A save of another
 * kind gives neither flag, so both are false.
 */
export type SavedLogin = { login: AgentLoginStatus } & Required<
  Pick<SaveAgentLoginResponse, 'endpointV1Added' | 'modelListReadFailed'>
>

export function readSavedLogin(value: unknown): SavedLogin {
  const answer = record(value, 'agent login')
  return {
    login: readLogin(answer),
    endpointV1Added: maybeFlag(answer, 'endpointV1Added') ?? false,
    modelListReadFailed: maybeFlag(answer, 'modelListReadFailed') ?? false,
  }
}

/** The answer of Refresh: whether it read the model list of the endpoint. */
export function readModelListRefresh(
  value: unknown,
): RefreshAgentLoginModelsResponse {
  const answer = record(value, 'model list refresh')
  return { modelListReadFailed: flag(answer, 'modelListReadFailed') }
}
