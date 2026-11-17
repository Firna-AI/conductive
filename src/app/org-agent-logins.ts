import type { Agent } from '../shared/generated/Agent'
import type {
  OrgAgentLoginStatus,
  SaveOrgAgentLoginRequest,
  UpdateOrgAgentLoginRequest,
} from '../shared/org-agent-logins'
import {
  orgAgentLoginPath,
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../shared/org-settings'
import type { ApiClient } from './api/client'
import { ignore } from './api/parse'
import {
  readModelListRefresh,
  readSavedOrgLogin,
} from './api/read-login-writes'
import { readOrgLogin, readOrgLogins } from './api/read-org-logins'
import { EndpointReads, type LoginReads } from './endpoint-reads'
import { Resource, same, type Change } from './resource'
import { valueOf, type Loadable, type Readable } from './store'

type OrgLogins = readonly OrgAgentLoginStatus[]

/** The logins with `login` in the place of the login of its agent. */
function put(login: OrgAgentLoginStatus): Change<OrgLogins> {
  return (logins) =>
    [...logins.filter((item) => item.agent !== login.agent), login].sort(
      (a, b) => a.agent.localeCompare(b.agent),
    )
}

/**
 * The org logins of one org: the API key or the own endpoint that an admin
 * connects for each agent, from decision 1 B of the org logins plan. Each
 * member reads them without the key or the full address, and only an admin
 * gets the model list of an own endpoint. A secret goes to the Worker in a
 * save and never comes back. Each write shows in the order of the writes,
 * as `Resource` says, so a read that started before a write answered never
 * takes it back. The answers of a save and of Refresh also say how the
 * reads of the model list went, which `endpointReads` keeps for the note
 * and the warning that an admin sees.
 */
export class OrgAgentLogins {
  readonly resource: Resource<OrgLogins>
  readonly logins: Readable<Loadable<OrgLogins>>
  private readonly reads = new EndpointReads()
  /**
   * The note and the warning of each org endpoint, from the answers of its
   * save and of Refresh in this page.
   */
  readonly endpointReads: Readable<LoginReads> = this.reads.store
  private readonly api: ApiClient
  private readonly orgId: string

  constructor(api: ApiClient, orgId: string) {
    this.api = api
    this.orgId = orgId
    this.resource = new Resource(() =>
      api.get(orgSettingsPaths.agentLogins(orgId), readOrgLogins),
    )
    this.logins = this.resource.store
  }

  /** The org login of `agent` as it shows, or a login that is not connected. */
  login(agent: Agent): OrgAgentLoginStatus {
    const shown = valueOf(this.logins.get())
    return (
      shown?.find((item) => item.agent === agent) ?? { agent, connected: false }
    )
  }

  /**
   * Saves the org login of an agent, in place of the login before, which
   * serves until the answer. The answer holds the saved login, with the
   * model list of an own endpoint, and says how the reads of that list
   * went. The Worker keeps the switch "Use for every member".
   */
  async save(request: SaveOrgAgentLoginRequest): Promise<void> {
    const saved = await this.resource.write(
      same,
      () =>
        this.api.send(
          'PUT',
          this.path(request.agent),
          request,
          readSavedOrgLogin,
        ),
      (answer) => put(answer.login),
    )
    this.reads.saved(saved)
  }

  /**
   * Saves the switch "Use for every member" of the org login of `agent`.
   * The new value shows at once, and a failed save shows the saved value
   * again. The answer holds the saved login, which can say that it is gone.
   */
  async setUseForEveryMember(
    agent: Agent,
    useForEveryMember: boolean,
  ): Promise<void> {
    const request: UpdateOrgAgentLoginRequest = { useForEveryMember }
    await this.resource.write(
      (logins) =>
        logins.map((login) =>
          login.agent === agent && login.connected
            ? { ...login, useForEveryMember }
            : login,
        ),
      () => this.api.send('PATCH', this.path(agent), request, readOrgLogin),
      put,
    )
  }

  /** Removes the org login of `agent`, with the note and the warning. */
  async remove(agent: Agent): Promise<void> {
    await this.resource.write(
      same,
      () => this.api.send('DELETE', this.path(agent), {}, ignore),
      () => put({ agent, connected: false }),
    )
    this.reads.removed(agent)
  }

  /**
   * Reads the model list of the org endpoint of `agent` again. The answer
   * says whether it read a list, for the warning of the login. The logins
   * then read again, because only they hold the list.
   */
  async refreshModels(agent: Agent): Promise<void> {
    const pressed = this.login(agent)
    const { modelListReadFailed } = await this.api.send(
      'POST',
      refreshOrgAgentLoginModelsPath(this.orgId, agent),
      {},
      readModelListRefresh,
    )
    this.reads.refreshed(pressed, this.login(agent), modelListReadFailed)
    await this.resource.read()
  }

  private path(agent: Agent): string {
    return orgAgentLoginPath(this.orgId, agent)
  }
}
