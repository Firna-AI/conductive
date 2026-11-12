import type { OrgSummary } from '../shared/orgs'
import { isSuspended } from './permissions'
import { Store, type Readable } from './store'

type Orgs = readonly OrgSummary[]

/**
 * The suspension of each org as the tab knows it: from the summary in the
 * org list of the person, and from the refusals of the API with
 * `org_suspended`. `AppModel` keeps one for the whole app.
 */
export class OrgSuspensions {
  /**
   * The orgs whose requests the API refused with `org_suspended`. Such a
   * refusal shows that the org is suspended, also while its summary is old.
   * It gives no time of the suspension, so the summary stays as the server
   * sent it.
   */
  readonly refused = new Store<ReadonlySet<string>>(new Set())
  private readonly orgs: Readable<Orgs>

  constructor(orgs: Readable<Orgs>) {
    this.orgs = orgs
  }

  /**
   * Whether an org is suspended, from its summary or from a refusal of the
   * API, as a value to follow.
   */
  suspended(orgId: string): Readable<boolean> {
    return {
      get: () => {
        const org = this.orgs.get().find((item) => item.id === orgId)
        return org !== undefined && isSuspended(org, this.refused.get())
      },
      subscribe: (listener) => {
        const stops = [
          this.orgs.subscribe(listener),
          this.refused.subscribe(listener),
        ]
        return () => {
          for (const stop of stops) stop()
        }
      },
    }
  }

  /**
   * Takes a refusal with `org_suspended` for one of the org's requests, also
   * while the org list still shows the org in use. So a page with an old
   * org list shows the suspended org at once, and keeps it after an owner
   * change of a workspace.
   */
  note(orgId: string): void {
    const refused = this.refused.get()
    if (!refused.has(orgId)) this.refused.set(new Set([...refused, orgId]))
  }
}
