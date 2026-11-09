import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type PendingOrgInvite,
} from '../shared/members'
import type { OrgSummary } from '../shared/orgs'
import type { ApiError } from './api/client'
import { readAcceptedOrg, readPendingInvites } from './api/read-invitations'
import type { AppModel } from './app-model'
import {
  asApiError,
  loading,
  ready,
  Store,
  type Loadable,
  type Readable,
} from './store'

/** An acceptance that failed. It shows until the next acceptance starts. */
interface AcceptFailure {
  invite: PendingOrgInvite
  error: ApiError
}

/** The invitations of the signed-in user, as the page before Home shows them. */
export interface Invitations {
  /** The pending invitations, or `null` until Home asks for them. */
  list: Loadable<readonly PendingOrgInvite[]> | null
  /** The user chose Continue to workspaces, so Home opens the app as usual. */
  passed: boolean
  /** The invitation whose acceptance runs. */
  accepting: string | null
  failure: AcceptFailure | null
}

const initial: Invitations = {
  list: null,
  passed: false,
  accepting: null,
  failure: null,
}

/**
 * The invitations that wait for the signed-in user (decision 78). Home
 * reads them at its first show for that user, so the first load of the app
 * and the other addresses never wait for them. A failed read keeps the user
 * signed in: Home shows it with Try again. Only the user accepts an
 * invitation, so a sign-in accepts nothing. A sign-out, or a sign-in of
 * another person, forgets the invitations, and an answer for the person
 * before changes nothing.
 */
export class InvitationsModel {
  private readonly shown = new Store<Invitations>(initial)
  readonly state: Readable<Invitations> = this.shown
  private readonly app: AppModel
  /** Each new person counts one up, so an older answer knows it is obsolete. */
  private generation = 0
  private userId: string | null = null
  private reading: Promise<void> | null = null

  constructor(app: AppModel) {
    this.app = app
    // The model lives as long as the app model, so it never unsubscribes.
    app.boot.subscribe(() => this.followPerson())
  }

  private followPerson(): void {
    const boot = this.app.boot.get()
    const person = boot.state === 'ready' ? boot.user.id : null
    if (
      boot.state !== 'signed-out' &&
      (person === null || person === this.userId)
    ) {
      return
    }
    this.userId = person
    this.generation += 1
    this.reading = null
    this.shown.set(initial)
  }

  private update(change: Partial<Invitations>): void {
    this.shown.change((current) => ({ ...current, ...change }))
  }

  /** Home shows. Its first show for the signed-in user reads the list. */
  open(): void {
    if (this.shown.get().list === null) void this.read()
  }

  /**
   * Reads the pending invitations, at the first show of Home and for Try
   * again. A list that failed stays until the answer of its next read.
   */
  read(): Promise<void> {
    if (this.reading) return this.reading
    const run = this.generation
    if (this.shown.get().list === null) this.update({ list: loading })
    const reading = this.app.services.api
      .get(PENDING_ORG_INVITES_PATH, readPendingInvites)
      .then(
        (invites) => {
          if (run === this.generation) this.update({ list: ready(invites) })
        },
        (error: unknown) => {
          if (run !== this.generation) return
          this.update({ list: { state: 'failed', error: asApiError(error) } })
        },
      )
      .finally(() => {
        if (this.reading === reading) this.reading = null
      })
    this.reading = reading
    return reading
  }

  /** Continue to workspaces: Home opens the app as usual, and accepts nothing. */
  pass(): void {
    this.update({ passed: true })
  }

  /**
   * Accepts one invitation, one at a time. The user joins its org, and the
   * org goes to the list of orgs. Then `open` gets the org, and the
   * invitations of that org leave the list, in one batch, so Home never
   * opens another org in between. A failure shows until the next
   * acceptance.
   */
  async accept(
    invite: PendingOrgInvite,
    open: (org: OrgSummary) => void,
  ): Promise<void> {
    if (this.shown.get().accepting !== null) return
    const run = this.generation
    this.update({ accepting: invite.id, failure: null })
    let org: OrgSummary
    try {
      org = await this.app.services.api.send(
        'POST',
        acceptOrgInvitePath(invite.id),
        {},
        readAcceptedOrg,
      )
    } catch (error) {
      if (run !== this.generation) return
      this.update({
        accepting: null,
        failure: { invite, error: asApiError(error) },
      })
      return
    }
    if (run !== this.generation) return
    this.app.putOrg(org)
    open(org)
    const { list } = this.shown.get()
    this.update({
      accepting: null,
      list:
        list?.state === 'ready'
          ? ready(list.value.filter((item) => item.orgId !== org.id))
          : list,
    })
    // Get started counts the org that the user joined.
    void this.app.refreshGetStarted().catch(() => undefined)
  }
}
