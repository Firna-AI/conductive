import type { AgentLoginStatus } from '../shared/account'
import type { Agent } from '../shared/agents'
import type { Timestamp } from '../shared/api'
import type { SavedLogin } from './api/read-login-writes'
import { Store, type Readable } from './store'

/**
 * What the reads of the model list of an own endpoint login gave at its
 * last save or Refresh in this page. `addedV1`: the save of a Codex address
 * added `/v1`, because only that address lists the models. `readFailed`:
 * the save or the last Refresh read no model list.
 */
export interface EndpointRead {
  addedV1: boolean
  readFailed: boolean
}

/** The reads of one login, with `savedAt`, the save time of that login. */
interface LoginRead extends EndpointRead {
  savedAt: Timestamp
}

/** The reads of the login of each agent, by agent. */
export type LoginReads = Readonly<Partial<Record<Agent, LoginRead>>>

/** No note and no warning, as after a reload. */
const noRead: EndpointRead = { addedV1: false, readFailed: false }

/** The save time of an own endpoint login, or null for another login. */
function savedAtOf(login: AgentLoginStatus): Timestamp | null {
  return login.connected && login.kind === 'endpoint' ? login.updatedAt : null
}

/**
 * The reads of `login`: those of its own save or Refresh in this page. A
 * login that a later save replaced, also in another tab, has none, because
 * its save time differs.
 */
export function endpointReadOf(
  reads: LoginReads,
  login: AgentLoginStatus,
): EndpointRead {
  const read = reads[login.agent]
  if (read === undefined || read.savedAt !== savedAtOf(login)) return noRead
  return { addedV1: read.addedV1, readFailed: read.readFailed }
}

/**
 * The note and the warning under each own endpoint login, from the answers
 * of its save and of Refresh. Only the memory of the page keeps them, beside
 * the account, so a reload removes them, and each screen that draws the
 * logins again shows them. A save sets both. A Refresh sets the warning
 * while the login that it read still shows, and keeps the note. A Remove
 * clears both.
 */
export class EndpointReads {
  private readonly reads = new Store<LoginReads>({})
  readonly store: Readable<LoginReads> = this.reads

  /** Keeps the reads of a save, in place of those of the login before. */
  saved(saved: SavedLogin): void {
    this.keep(saved.login.agent, savedAtOf(saved.login), {
      addedV1: saved.endpointV1Added,
      readFailed: saved.modelListReadFailed,
    })
  }

  /**
   * Keeps whether a Refresh of `pressed`, the login that showed at its
   * press, read a list, while `shown`, the login at its answer, is the same
   * login. A save or a Remove in between owns the reads.
   */
  refreshed(
    pressed: AgentLoginStatus,
    shown: AgentLoginStatus,
    readFailed: boolean,
  ): void {
    const savedAt = savedAtOf(shown)
    if (savedAt === null || savedAt !== savedAtOf(pressed)) return
    const { addedV1 } = endpointReadOf(this.reads.get(), shown)
    this.keep(shown.agent, savedAt, { addedV1, readFailed })
  }

  /** Clears the reads of a login that the user removed. */
  removed(agent: Agent): void {
    this.keep(agent, null, noRead)
  }

  private keep(
    agent: Agent,
    savedAt: Timestamp | null,
    read: EndpointRead,
  ): void {
    const { [agent]: replaced, ...others } = this.reads.get()
    const shows = savedAt !== null && (read.addedV1 || read.readFailed)
    if (shows) this.reads.set({ ...others, [agent]: { ...read, savedAt } })
    else if (replaced) this.reads.set(others)
  }
}
