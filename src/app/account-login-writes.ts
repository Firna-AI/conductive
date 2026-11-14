import {
  ACCOUNT_PATHS,
  agentLoginPath,
  codexDevicePath,
  refreshAgentLoginModelsPath,
  type PollCodexDeviceResponse,
  type SaveAgentLoginRequest,
  type StartCodexDeviceResponse,
  type UpdateAgentLoginRequest,
  type UpdateAgentLoginResponse,
} from '../shared/account'
import type { Agent } from '../shared/agents'
import type { AccountLoginReads } from './account-login-reads'
import type { AgentLogins } from './agent-logins'
import { ignore } from './api/parse'
import {
  readCodexDevicePoll,
  readCodexDeviceStart,
  readLogin,
} from './api/read-core'
import { readModelListRefresh, readSavedLogin } from './api/read-login-writes'
import type { EndpointReads } from './endpoint-reads'
import type { AppServices } from './services'

/**
 * The writes of the agent logins of the account: a save, the ChatGPT
 * sign-in of Codex, a Refresh of the model list of an own endpoint, a share
 * change, and a remove. A secret goes to the Worker in a write and never
 * comes back. `logins` shows each answer in the order of the changes. The
 * answers of a save and of Refresh also say how the reads of the model list
 * went, which `endpointReads` keeps for the note and the warning.
 */
export class AccountLoginWrites {
  private readonly services: AppServices
  private readonly logins: AgentLogins
  private readonly loginReads: AccountLoginReads
  private readonly endpointReads: EndpointReads

  constructor(
    services: AppServices,
    logins: AgentLogins,
    loginReads: AccountLoginReads,
    endpointReads: EndpointReads,
  ) {
    this.services = services
    this.logins = logins
    this.loginReads = loginReads
    this.endpointReads = endpointReads
  }

  /**
   * Saves a login. The save of an own endpoint also reads the model list of
   * the endpoint, which its answer does not hold, so the account is read
   * again for it. Its answer says how those reads went. A failed read of
   * the account leaves the saved login without its list, so the pickers
   * hide nothing until the next read.
   */
  async save(request: SaveAgentLoginRequest): Promise<void> {
    const saved = await this.services.api.send(
      'PUT',
      agentLoginPath(request.agent),
      request,
      readSavedLogin,
    )
    const { login } = saved
    this.logins.put(login)
    this.endpointReads.saved(saved)
    if (login.connected && login.kind === 'endpoint')
      await this.loginReads
        .readAgent(login.agent, this.logins.mark())
        .catch(() => undefined)
  }

  /**
   * Starts a ChatGPT sign-in of Codex. The Worker asks OpenAI for a code,
   * and keeps the sign-in under the handle of the answer. No token comes to
   * the browser.
   */
  startCodexSignIn(): Promise<StartCodexDeviceResponse> {
    return this.services.api.send(
      'POST',
      ACCOUNT_PATHS.codexDevice,
      {},
      readCodexDeviceStart,
    )
  }

  /**
   * Asks the Worker for the state of the ChatGPT sign-in of `handle`. At the
   * end of a sign-in, the Worker saved the login, so the account shows it as
   * the Codex login, as a save does.
   */
  async pollCodexSignIn(handle: string): Promise<PollCodexDeviceResponse> {
    const answer = await this.services.api.send(
      'POST',
      codexDevicePath(handle),
      {},
      readCodexDevicePoll,
    )
    if (answer.state === 'connected') this.logins.put(answer.login)
    return answer
  }

  /**
   * Refreshes an endpoint list, without restoring a changed login. Its
   * answer says whether it read a list, for the warning of the login.
   */
  async refreshModels(agent: Agent): Promise<void> {
    const show = this.logins.mark()
    const pressed = this.logins.get(agent)
    const { modelListReadFailed } = await this.services.api.send(
      'POST',
      refreshAgentLoginModelsPath(agent),
      {},
      readModelListRefresh,
    )
    this.endpointReads.refreshed(
      pressed,
      this.logins.get(agent),
      modelListReadFailed,
    )
    await this.loginReads.readAgent(agent, show)
  }

  /**
   * Saves whether the messages of other members in the sessions of the user
   * run on a login of the user. The reply holds the saved status of the
   * login, which can say that the login is gone. A save, a remove, or
   * another share change that comes first makes the reply old, so it does
   * not show. A reply that shows is a change too, so that a read of the
   * logins that ran meanwhile does not take it back.
   */
  async setNoReuse(agent: Agent, noReuse: boolean): Promise<void> {
    const change = this.logins.change(agent)
    const request: UpdateAgentLoginRequest = { noReuse }
    const saved: UpdateAgentLoginResponse = await this.services.api.send(
      'PATCH',
      agentLoginPath(agent),
      request,
      readLogin,
    )
    this.logins.putReply(change, saved)
  }

  /** Removes a login, with the note and the warning of its reads. */
  async remove(agent: Agent): Promise<void> {
    await this.services.api.send('DELETE', agentLoginPath(agent), {}, ignore)
    this.logins.put({ agent, connected: false })
    this.endpointReads.removed(agent)
  }
}
