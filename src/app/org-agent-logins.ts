import type { Agent } from '../shared/generated/Agent'
import type { DefaultAgentLogin } from '../shared/generated/DefaultAgentLogin'
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

/**
 * How the org logins of an org keep the default logins of the account
 * current (decision 6 F of the org logins plan). The read of the org logins
 * names the default logins of the person in that org, so each operation
 * ends with that read, and the pickers follow it with no read of the
 * account.
 */
export interface OrgLoginDefaults {
  /**
   * Counts a change of an org login of `agent`, after a write that the
   * Worker took or a Refresh, so that a read that started before shows
   * none of its older default logins of that agent. False when the account
   * names no default login: no read then needs to follow a write.
   */
  orgLoginChanged(agent: Agent): boolean
  /**
   * Marks the start of a read of the org logins of `orgId`. The result shows
   * the default logins of its answer in place of those of that org, for
   * each agent with no change and no newer read meanwhile. An answer that
   * names none, from an older Worker, changes nothing.
   */
  markOrgRead(
    orgId: string,
  ): (defaults: readonly DefaultAgentLogin[] | undefined) => void
}

/** No account to keep current, such as for an org model of a test. */
const noLoginDefaults: OrgLoginDefaults = {
  orgLoginChanged: () => false,
  markOrgRead: () => () => undefined,
}

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
 * and the warning that an admin sees. Each operation that the Worker took
 * ends in `completed`, and each read gives its default logins to
 * `defaults`.
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
  private readonly defaults: OrgLoginDefaults

  constructor(
    api: ApiClient,
    orgId: string,
    defaults: OrgLoginDefaults = noLoginDefaults,
  ) {
    this.api = api
    this.orgId = orgId
    this.defaults = defaults
    this.resource = new Resource(() => this.readLogins())
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
    await this.completed(request.agent)
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
    await this.completed(agent)
  }

  /** Removes the org login of `agent`, with the note and the warning. */
  async remove(agent: Agent): Promise<void> {
    await this.resource.write(
      same,
      () => this.api.send('DELETE', this.path(agent), {}, ignore),
      () => put({ agent, connected: false }),
    )
    this.reads.removed(agent)
    await this.completed(agent)
  }

  /**
   * Reads the model list of the org endpoint of `agent` again. The answer
   * says whether it read a list, for the warning of the login. Only the
   * read of the logins holds the list, as `completed` says.
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
    await this.completed(agent, true)
  }

  /**
   * The end of each save, switch change, remove, and Refresh that the
   * Worker took. Each can change the default logins of the person in this
   * org, so it counts as a change of its agent, and the logins read again,
   * as `readLogins` says. A write reads again only while the account names
   * default logins, because its answer holds the login. A Refresh, with
   * `always`, reads again in each case, because only that read holds the
   * new list.
   */
  private async completed(agent: Agent, always = false): Promise<void> {
    const counted = this.defaults.orgLoginChanged(agent)
    if (counted || always) await this.resource.read()
  }

  /**
   * The one read of the org logins. Its answer also names the default
   * logins of the person in this org, which go to the account, as
   * `OrgLoginDefaults.markOrgRead` says.
   */
  private async readLogins(): Promise<OrgLogins> {
    const show = this.defaults.markOrgRead(this.orgId)
    const reply = await this.api.get(
      orgSettingsPaths.agentLogins(this.orgId),
      readOrgLogins,
    )
    show(reply.defaultLogins)
    return reply.agentLogins
  }

  private path(agent: Agent): string {
    return orgAgentLoginPath(this.orgId, agent)
  }
}
