import type {
  AgentLoginStatus,
  RefreshAgentLoginModelsResponse,
  SaveAgentLoginResponse,
} from '../../shared/account'
import { flag, maybeFlag, record } from './parse'
import { readLogin } from './read-core'
import { readOrgLogin } from './read-org-logins'

/**
 * The answer of a save of an agent login of the account, or of an org
 * login: the saved login, apart from what the reads of the model list of
 * an own endpoint gave. A save of another kind gives neither flag, so both
 * are false.
 */
export type SavedLogin<Login = AgentLoginStatus> = { login: Login } & Required<
  Pick<SaveAgentLoginResponse, 'endpointV1Added' | 'modelListReadFailed'>
>

/** A reader of the answer of a save, with `read`, the reader of its login. */
function savedWith<Login>(
  read: (value: unknown) => Login,
): (value: unknown) => SavedLogin<Login> {
  return (value) => {
    const answer = record(value, 'agent login')
    return {
      login: read(answer),
      endpointV1Added: maybeFlag(answer, 'endpointV1Added') ?? false,
      modelListReadFailed: maybeFlag(answer, 'modelListReadFailed') ?? false,
    }
  }
}

export const readSavedLogin = savedWith(readLogin)

export const readSavedOrgLogin = savedWith(readOrgLogin)

/** The answer of Refresh: whether it read the model list of the endpoint. */
export function readModelListRefresh(
  value: unknown,
): RefreshAgentLoginModelsResponse {
  const answer = record(value, 'model list refresh')
  return { modelListReadFailed: flag(answer, 'modelListReadFailed') }
}
