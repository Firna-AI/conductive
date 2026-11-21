import type { Agent } from '../shared/generated/Agent'
import type { AccountResponse, AgentLoginStatus } from '../shared/account'
import type { Store } from './store'

/**
 * What a read of the account gives the logins: the own logins of the
 * person, and the default login of each org and agent that the server
 * names. An older reply names no default login.
 */
type LoginRead = Pick<AccountResponse, 'agentLogins' | 'defaultLogins'>

export type LoginMark = (
  read: LoginRead,
  only?: Agent,
  current?: (agent: Agent) => boolean,
) => void

const byAgent = (a: { agent: Agent }, b: { agent: Agent }) =>
  a.agent.localeCompare(b.agent)

/**
 * The agent logins in the account store, and the order of the changes that
 * show there. Only a reply of the account holds the logins and the default
 * logins of every org, so only such a reply writes them. Each local change
 * of a login counts one up: a save, a remove, a connected sign-in, a share
 * change, a change of an org login, and an org that joins the orgs of the
 * person, at its start and when its reply shows. A share reply and a read
 * show a login only while no later change of that login came first, so a
 * removed login stays removed, and a read never takes back a local change.
 * The default logins of an agent follow the same rule, because each change
 * of a login of that agent can change them. So each change reads the
 * account again, as `AccountLoginWrites` says.
 */
export class AgentLogins {
  /** The number of the last change of each agent login. */
  private readonly changes = new Map<Agent, number>()
  private readonly reads = new Map<Agent, number>()
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

  /** Counts complete replies that name defaults and pass this agent's read mark. */
  readVersion(agent: Agent): number {
    return this.reads.get(agent) ?? 0
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
    this.show({ agentLogins: [login] }, () => true)
  }

  /**
   * Shows `login`, the reply to the change `change` of its login, as a
   * change of its own, unless a later change of that login came first.
   */
  putReply(change: number, login: AgentLoginStatus): void {
    if (this.changes.get(login.agent) === change) this.put(login)
  }

  /**
   * Marks the changes before a read of the account. The result shows each
   * login of the answer whose agent had no change after the mark, and the
   * default logins of that agent when the answer names them. `only` limits
   * the result to one agent, for a read after a change of its login.
   * `current` also checks the order of complete replies and session facts.
   * These checks do not retire a pending local write.
   */
  mark(): LoginMark {
    const marked = new Map(this.changes)
    return (read, only, current = () => true) =>
      this.show(
        read,
        (agent) =>
          (only === undefined || agent === only) &&
          this.changes.get(agent) === marked.get(agent) &&
          current(agent),
        true,
      )
  }

  /**
   * Shows the logins of `read` whose agent `shown` takes, and the default
   * logins of those agents in place of the ones that show.
   */
  private show(
    read: LoginRead,
    shown: (agent: Agent) => boolean,
    complete = false,
  ): void {
    const account = this.account.get()
    if (!account) return
    const logins = read.agentLogins.filter((login) => shown(login.agent))
    const defaults = read.defaultLogins?.filter((entry) => shown(entry.agent))
    if (logins.length === 0 && !defaults?.length) return
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
        ...(account.defaultLogins ?? []).filter((entry) => !shown(entry.agent)),
        ...defaults,
      ]
    }
    if (complete && defaults !== undefined) {
      const agents = new Set(
        [...logins, ...(defaults ?? [])].map((item) => item.agent),
      )
      for (const agent of agents)
        this.reads.set(agent, this.readVersion(agent) + 1)
    }
    this.account.set(next)
  }
}
