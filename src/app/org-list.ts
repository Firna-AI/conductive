import type {
  OrgColorRequest,
  OrgSummary,
  RenameOrgRequest,
} from '../shared/orgs'
import { SendQueue } from './send-queue'
import { Store, type Readable } from './store'

type Orgs = readonly OrgSummary[]

/** A move of one org that waits to go out or for its answer. */
interface OrgMove {
  orgId: string
  /** The place among the other orgs. */
  index: number
  /** The server saved the move. */
  saved: boolean
}

/**
 * The list with the org at `index` among the other orgs, as the server
 * moves it. An index past the end puts the org at the end. A list without
 * the org stays as it is.
 */
function orgMoved(orgs: Orgs, move: Pick<OrgMove, 'orgId' | 'index'>): Orgs {
  const org = orgs.find((item) => item.id === move.orgId)
  if (!org) return orgs
  const others = orgs.filter((item) => item !== org)
  const at = Math.min(Math.max(move.index, 0), others.length)
  return [...others.slice(0, at), org, ...others.slice(at)]
}

/**
 * The orgs of the person in their own order, as the rail, the org switcher,
 * and the command palette show them: the list that the server confirmed,
 * then the moves that wait, in the order that the person made them.
 *
 * - A move shows at once. A failed move goes back alone, so the other moves
 *   and the confirmed changes stay.
 * - Moves go out one at a time, each after the answer of the one before.
 *   A failed move does not stop the next one.
 * - A saved move joins the confirmed list once each earlier move has its
 *   answer. So a later change, such as a new org at the end, goes after it,
 *   as on the server. The list reads only at the first load, so no read
 *   confirms the moves.
 */
export class OrgList implements Readable<Orgs> {
  private readonly shown = new Store<Orgs>([])
  private confirmed: Orgs = []
  private moves: OrgMove[] = []
  private readonly sends = new SendQueue()

  get = (): Orgs => this.shown.get()

  subscribe = (listener: () => void): (() => void) =>
    this.shown.subscribe(listener)

  /**
   * The list of a read, such as the first load of the app. The moves that
   * wait stay over it.
   */
  load(orgs: Orgs): void {
    this.confirmed = orgs
    this.show()
  }

  /**
   * Puts a newer record of an org in the list, such as the answer of Delete
   * org. An org that the list does not have goes at the end.
   */
  put(org: OrgSummary): void {
    const known = this.confirmed.some((item) => item.id === org.id)
    this.confirmed = known
      ? this.confirmed.map((item) => (item.id === org.id ? org : item))
      : [...this.confirmed, org]
    this.show()
  }

  /** Applies only requested reply fields to an org that the list still has. */
  patch(org: OrgSummary, request: RenameOrgRequest | OrgColorRequest): void {
    this.confirmed = this.confirmed.map((current) => {
      if (current.id !== org.id) return current
      const next = { ...current }
      if ('name' in request) {
        next.name = org.name
        if (request.initials !== undefined) {
          if (org.initials === undefined) delete next.initials
          else next.initials = org.initials
        }
      }
      if ('color' in request) {
        if (org.color === undefined) delete next.color
        else next.color = org.color
      }
      return next
    })
    this.show()
  }

  /** Takes an org out of the list, such as after a leave. */
  remove(orgId: string): void {
    this.confirmed = this.confirmed.filter((org) => org.id !== orgId)
    this.show()
  }

  /**
   * Shows the move of an org to `index` among the other orgs at once, and
   * sends it after each earlier move has its answer. A failure takes back
   * this move only, and throws.
   */
  async move(
    orgId: string,
    index: number,
    save: () => Promise<void>,
  ): Promise<void> {
    const move: OrgMove = { orgId, index, saved: false }
    this.moves = [...this.moves, move]
    this.show()
    try {
      await this.sends.run(save)
      move.saved = true
    } catch (error) {
      this.moves = this.moves.filter((item) => item !== move)
      throw error
    } finally {
      this.settle()
    }
  }

  /** The saved moves at the front join the confirmed list, in their order. */
  private settle(): void {
    let first = this.moves.at(0)
    while (first?.saved) {
      this.confirmed = orgMoved(this.confirmed, first)
      this.moves = this.moves.slice(1)
      first = this.moves.at(0)
    }
    this.show()
  }

  private show(): void {
    this.shown.set(this.moves.reduce(orgMoved, this.confirmed))
  }
}
