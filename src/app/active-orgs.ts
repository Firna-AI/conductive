import type { OrgSummary } from '../shared/orgs'
import type { Readable } from './store'

/** The orgs that switchers use, in their saved order, including suspended orgs. */
export function selectActiveOrgs(orgs: readonly OrgSummary[]): OrgSummary[] {
  return orgs.filter((org) => !org.deletion)
}

/** One active snapshot per source value, shared by every reader. */
export function activeOrgSource(
  source: Readable<readonly OrgSummary[]>,
): Readable<readonly OrgSummary[]> {
  let read: {
    source: readonly OrgSummary[]
    value: readonly OrgSummary[]
  } | null = null
  return {
    get: () => {
      const orgs = source.get()
      if (read === null || read.source !== orgs) {
        read = { source: orgs, value: selectActiveOrgs(orgs) }
      }
      return read.value
    },
    subscribe: (listener) => source.subscribe(listener),
  }
}
