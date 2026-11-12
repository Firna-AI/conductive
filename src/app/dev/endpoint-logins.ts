import type { AgentLoginStatus } from '../../shared/account'
import { endpointLoginFixtures } from '../../test-support/fixtures/agent-logins'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import type { DevOptions } from './options'

/** When the seeded model list was read: 4 minutes before the fake starts. */
const checkedAt = FAKE_TIME - 4 * 60_000

/**
 * The own endpoint logins of `login=endpoint`: both agents on one shared
 * endpoint. With `modelList=unlisted`, the last model list of the Claude
 * login does not name the last Claude model of the app. With
 * `modelList=none`, it names no Claude model of the app.
 */
export function devEndpointLogins(
  modelList: DevOptions['modelList'],
): readonly AgentLoginStatus[] {
  const logins = endpointLoginFixtures(FAKE_TIME)
  if (modelList === null) return logins
  const claude = coreFixtures()
    .models.models.filter((model) => model.agent === 'claude')
    .map((model) => model.model)
  const missing = modelList === 'none' ? claude : claude.slice(-1)
  return logins.map((login) =>
    login.agent === 'claude' && login.connected && login.kind === 'endpoint'
      ? { ...login, modelList: { missing, checkedAt } }
      : login,
  )
}
