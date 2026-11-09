import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type PendingOrgInvite,
} from '../shared/members'
import {
  WAITLIST_PATHS,
  type UseInviteCodeRequest,
  type UseInviteCodeResponse,
} from '../shared/waitlist'
import { readAcceptedOrg, readPendingInvites } from './api/read-invitations'
import { readWaitlistState } from './api/read-waitlist'
import type { AppModel } from './app-model'
import { routes } from './router'
import { asApiError, loading, ready, Store, type Readable } from './store'
import {
  failureOf,
  initialWaitlist,
  type CodeSource,
  type Opener,
  type Waitlist,
} from './waitlist-state'

/**
 * The person signed in without app access, on the only screen that the
 * app shows them. The ways in that the person can take: a code from the
 * field or from a join link, and the Accept of an org invitation. The
 * app reads the app access again after each of them, and each time that
 * the person comes back to the page, with no timer. When app access
 * arrives, the app opens as usual. An answer from before a new start, a
 * sign-out, or the open of the app changes nothing.
 */
export class WaitlistModel {
  private readonly shown = new Store<Waitlist>(initialWaitlist)
  readonly state: Readable<Waitlist> = this.shown
  private readonly app: AppModel
  /** Each boot that leaves the waitlist counts one up. */
  private generation = 0
  private readingInvitations: Promise<void> | null = null
  private refreshing: Promise<void> | null = null

  constructor(app: AppModel) {
    this.app = app
    // The model lives as long as the app model, so it never unsubscribes.
    app.boot.subscribe(() => {
      if (app.boot.get().state === 'waiting') return
      this.generation += 1
      this.readingInvitations = null
      this.refreshing = null
    })
  }

  private update(change: Partial<Waitlist>): void {
    this.shown.change((current) => ({ ...current, ...change }))
  }

  /**
   * Reads the waitlist state for a session without app access, as the
   * app starts. The answer says whether the person still waits.
   */
  async load(): Promise<boolean> {
    const run = this.generation
    const state = await this.app.services.api.get(
      WAITLIST_PATHS.state,
      readWaitlistState,
    )
    if (run === this.generation) {
      this.shown.set({ ...initialWaitlist, approvalEmail: state.approvalEmail })
    }
    return !state.appAccess
  }

  /** The screen shows. Its first show reads the invitations. */
  open(): void {
    if (this.shown.get().invitations === null) void this.readInvitations()
  }

  /**
   * Reads the invitations of the person, at the first show, for Try
   * again, and at each return to the page. A list that shows stays when a
   * later read fails.
   */
  readInvitations(): Promise<void> {
    if (this.readingInvitations) return this.readingInvitations
    const run = this.generation
    if (this.shown.get().invitations === null) {
      this.update({ invitations: loading })
    }
    const reading = this.app.services.api
      .get(PENDING_ORG_INVITES_PATH, readPendingInvites)
      .then(
        (invites) => {
          if (run === this.generation) {
            this.update({ invitations: ready(invites) })
          }
        },
        (error: unknown) => {
          if (run !== this.generation) return
          if (this.shown.get().invitations?.state === 'ready') return
          this.update({
            invitations: { state: 'failed', error: asApiError(error) },
          })
        },
      )
      .finally(() => {
        if (this.readingInvitations === reading) this.readingInvitations = null
      })
    this.readingInvitations = reading
    return reading
  }

  /**
   * The person comes back to the page: the app reads the invitations and
   * the app access again. With app access, the app opens as usual. A use
   * of a code or an Accept that runs opens the app itself. A failed read
   * changes nothing.
   */
  refresh(open: Opener): Promise<void> {
    void this.readInvitations()
    if (this.refreshing) return this.refreshing
    const run = this.generation
    const refreshing = this.readAccess()
      .then(async (access) => {
        if (run !== this.generation || access !== true || this.busy()) return
        await this.enter(routes.home(), open)
      })
      .finally(() => {
        if (this.refreshing === refreshing) this.refreshing = null
      })
    this.refreshing = refreshing
    return refreshing
  }

  /** Uses a code from the field of the screen. */
  submitCode(code: string, open: Opener): Promise<void> {
    return this.use(code, 'field', open)
  }

  /**
   * Opens a join link: the app uses its code at once, or shows why the code
   * did not work at the sign-in, from the error code that the sign-in put in
   * the link. An unknown error code counts as none, so the app uses the code.
   */
  join(code: string, error: string | null, open: Opener): Promise<void> {
    const reason = error === null ? null : failureOf(error)
    if (reason === null) return this.use(code, 'link', open)
    this.update({ code: { state: 'refused', from: 'link', reason } })
    return Promise.resolve()
  }

  /**
   * Accepts one org invitation, one at a time. The membership comes with
   * app access, so the app reads the app access again and opens the org.
   * The pause refuses the Accept with `signups_paused`, and the invitation
   * stays. A failure shows until the next Accept.
   */
  async accept(invite: PendingOrgInvite, open: Opener): Promise<void> {
    if (this.shown.get().accepting !== null) return
    const run = this.generation
    this.update({
      accepting: invite.id,
      acceptFailure: null,
      acceptPaused: false,
    })
    let orgId: string
    try {
      const org = await this.app.services.api.send(
        'POST',
        acceptOrgInvitePath(invite.id),
        {},
        readAcceptedOrg,
      )
      orgId = org.id
    } catch (error) {
      if (run !== this.generation) return
      const problem = asApiError(error)
      this.update(
        failureOf(problem.code) === 'paused'
          ? { accepting: null, acceptPaused: true }
          : { accepting: null, acceptFailure: { invite, error: problem } },
      )
      return
    }
    const access = await this.readAccess()
    if (run !== this.generation) return
    if (access !== false) {
      await this.enter(routes.org(orgId), open)
      return
    }
    this.update({ accepting: null })
    void this.readInvitations()
  }

  /**
   * One use of a code at a time. A code that works gives app access, and the
   * app opens as usual. A code that does not work shows its reason until the
   * next use, and stays unused.
   */
  private async use(
    code: string,
    from: CodeSource,
    open: Opener,
  ): Promise<void> {
    if (this.shown.get().code.state === 'using') return
    const run = this.generation
    this.update({ code: { state: 'using', from } })
    const request: UseInviteCodeRequest = { code }
    let state: UseInviteCodeResponse
    try {
      state = await this.app.services.api.send(
        'POST',
        WAITLIST_PATHS.useCode,
        request,
        readWaitlistState,
      )
    } catch (error) {
      if (run !== this.generation) return
      const problem = asApiError(error)
      const reason = failureOf(problem.code)
      this.update({
        code:
          reason === null
            ? { state: 'failed', from, error: problem }
            : { state: 'refused', from, reason },
      })
      return
    }
    if (run !== this.generation) return
    if (state.appAccess) {
      await this.enter(routes.home(), open)
      return
    }
    this.update({ code: { state: 'none' }, approvalEmail: state.approvalEmail })
  }

  /** A use of a code or an Accept runs. */
  private busy(): boolean {
    const { code, accepting } = this.shown.get()
    return code.state === 'using' || accepting !== null
  }

  /**
   * Reads the app access again, and keeps the address of the approval
   * email. The answer is `null` when the read failed.
   */
  private async readAccess(): Promise<boolean | null> {
    const run = this.generation
    try {
      const state = await this.app.services.api.get(
        WAITLIST_PATHS.state,
        readWaitlistState,
      )
      if (run === this.generation) {
        this.update({ approvalEmail: state.approvalEmail })
      }
      return state.appAccess
    } catch {
      return null
    }
  }

  /**
   * App access arrived. The address changes to `to` while the waitlist
   * still shows, then the app opens there.
   */
  private async enter(to: string, open: Opener): Promise<void> {
    open(to)
    await this.app.admit()
  }
}
