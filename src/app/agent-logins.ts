import type { Agent } from '../shared/generated/Agent'
import type { DefaultAgentLogin } from '../shared/generated/DefaultAgentLogin'
import type { AccountResponse, AgentLoginStatus } from '../shared/account'
import { AGENTS } from './api/read-core'
import type { Store } from './store'

/**
 * What a read of the account gives the logins: the own logins of the
 * person, and the default login of each org and agent that the server
 * names. An older reply names no default login.
 */
export type LoginRead = Pick<AccountResponse, 'agentLogins' | 'defaultLogins'>

/** The number of the last change of each agent login at one moment. */
export type LoginChanges = ReadonlyMap<Agent, number>

/** One read of the logins, from its start to its answer. */
interface ReadTurn {
  /**
   * Whether the read can show the data of `agent`: no change of that agent
   * came after the changes that it follows, and no read that started later
   * showed that data.
   */
  fresh(agent: Agent): boolean
  /** Notes the agents whose data the read showed. */
  showed(agents: Iterable<Agent>): void
}

const byAgent = (a: { agent: Agent }, b: { agent: Agent }) =>
  a.agent.localeCompare(b.agent)

/**
 * The default logins with `entries` in place of the entries of the org
 * `orgId` for the agents of `agents`, at the place of the first entry that
 * they replace, or at the end. The default logins of the other orgs stay.
 */
function withOrgDefaults(
  current: readonly DefaultAgentLogin[],
  orgId: string,
  agents: ReadonlySet<Agent>,
  entries: readonly DefaultAgentLogin[],
): DefaultAgentLogin[] {
  const replaced = (entry: DefaultAgentLogin) =>
    entry.orgId === orgId && agents.has(entry.agent)
  const at = current.findIndex(replaced)
  const kept = current.filter((entry) => !replaced(entry))
  const place = at === -1 ? kept.length : at
  return [
    ...kept.slice(0, place),
    ...entries.filter(replaced),
    ...kept.slice(place),
  ]
}

/**
 * The agent logins in the account store, and the order of the changes and
 * the reads that show there. Each local change of a login counts one up: a
 * save, a remove, a connected sign-in, a share change, a change of an org
 * login, and an org that joins the orgs of the person, at its start and
 * when its reply shows. Each read counts one up at its start. A share reply
 * and a read show the data of an agent, its login and its default logins,
 * only while no later change of that agent came first. A read also shows
 * that data only while no read that started later showed it. So a removed
 * login stays removed, a read never takes back a local change, and an
 * older reply never takes back a newer one. The default logins of an agent
 * follow the same rule, because each change of a login of that agent can
 * change them.
 */
export class AgentLogins {
  /** The number of the last change of each agent login. */
  private readonly changes = new Map<Agent, number>()
  /** The number of the last read that started. */
  private reads = 0
  /** The number of the newest read that showed the data of each agent. */
  private readonly shownAt = new Map<Agent, number>()
  private readonly account: Store<AccountResponse | null>

  constructor(account: Store<AccountResponse | null>) {
    this.account = account
  }

  /** The login of `agent`, or a login that is not connected. */
  get(agent: Agent): AgentLoginStatus {
    return (
      this.account.get()?.agentLogins.find((item) => item.agent === agent) ?? {
        agent,
        connected: false,
      }
    )
  }

  /**
   * Whether the account names the default logins, which an older reply of
   * the account does not.
   */
  namesDefaults(): boolean {
    return this.account.get()?.defaultLogins !== undefined
  }

  /**
   * The changes so far. A read that starts after a request, such as after
   * the Refresh of an own endpoint, gives them to `mark`, so that a change
   * during that request counts too.
   */
  changesSoFar(): LoginChanges {
    return new Map(this.changes)
  }

  /** Counts a change of the login of `agent`, and gives its number. */
  change(agent: Agent): number {
    const change = (this.changes.get(agent) ?? 0) + 1
    this.changes.set(agent, change)
    return change
  }

  /** Shows a login that a write gave, as a change of its own. */
  put(login: AgentLoginStatus): void {
    this.change(login.agent)
    this.show({ agentLogins: [login] }, new Set([login.agent]))
  }

  /**
   * Shows `login`, the reply to the change `change` of its login, as a
   * change of its own, unless a later change of that login came first.
   */
  putReply(change: number, login: AgentLoginStatus): void {
    if (this.changes.get(login.agent) === change) this.put(login)
  }

  /**
   * Marks the start of a read of the account. The result shows each login
   * of the answer whose agent is fresh for the read, as `ReadTurn` says,
   * and the default logins of that agent when the answer names them.
   * `since` gives the changes that the read follows: by default, those at
   * its start. `only` limits the result to one agent, for a read after a
   * change of its login.
   */
  mark(
    since: LoginChanges = this.changesSoFar(),
  ): (read: LoginRead, only?: Agent) => void {
    const turn = this.begin(since)
    return (read, only) => {
      const agents = AGENTS.filter(
        (agent) => (only === undefined || agent === only) && turn.fresh(agent),
      )
      if (this.show(read, new Set(agents))) turn.showed(agents)
    }
  }

  /**
   * Marks the start of a read of the org logins of the org `orgId`, whose
   * answer names the default logins of the person in that org only. The
   * result shows them in place of the default logins of that org, for
   * each agent that is fresh for the read, as `ReadTurn` says. The default
   * logins of the other orgs stay.
   */
  markOrg(orgId: string): (defaults: readonly DefaultAgentLogin[]) => void {
    const turn = this.begin(this.changesSoFar())
    return (defaults) => {
      const account = this.account.get()
      const agents = AGENTS.filter((agent) => turn.fresh(agent))
      if (!account || agents.length === 0) return
      this.account.set({
        ...account,
        defaultLogins: withOrgDefaults(
          account.defaultLogins ?? [],
          orgId,
          new Set(agents),
          defaults,
        ),
      })
      turn.showed(agents)
    }
  }

  /** Starts a read that follows `since`: it takes the next number. */
  private begin(since: LoginChanges): ReadTurn {
    const at = ++this.reads
    return {
      fresh: (agent) =>
        this.changes.get(agent) === since.get(agent) &&
        at > (this.shownAt.get(agent) ?? 0),
      showed: (agents) => {
        for (const agent of agents) this.shownAt.set(agent, at)
      },
    }
  }

  /**
   * Shows the logins of `read` of the agents of `agents`, and the default
   * logins of those agents in place of the ones that show. Says whether
   * anything showed.
   */
  private show(read: LoginRead, agents: ReadonlySet<Agent>): boolean {
    const account = this.account.get()
    if (!account) return false
    const logins = read.agentLogins.filter((login) => agents.has(login.agent))
    const defaults = read.defaultLogins?.filter((entry) =>
      agents.has(entry.agent),
    )
    if (logins.length === 0 && !defaults?.length) return false
    const next: AccountResponse = {
      ...account,
      agentLogins: [
        ...account.agentLogins.filter(
          (item) => !logins.some((login) => login.agent === item.agent),
        ),
        ...logins,
      ].sort(byAgent),
    }
    if (defaults) {
      next.defaultLogins = [
        ...(account.defaultLogins ?? []).filter(
          (entry) => !agents.has(entry.agent),
        ),
        ...defaults,
      ]
    }
    this.account.set(next)
    return true
  }
}
