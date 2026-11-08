import { createContext, useContext } from 'react'
import type { AppModel } from '../app/app-model'
import type { OrgModel } from '../app/org-model'
import { isSuspended, type OrgAccess } from '../app/permissions'
import { useStore } from '../app/store'
import type { OrgSummary } from '../shared/orgs'

export const AppModelContext = createContext<AppModel | null>(null)

/** The shared data of the app: the person, the orgs, and the account. */
export function useApp(): AppModel {
  const app = useContext(AppModelContext)
  if (!app) throw new Error('The app has no model.')
  return app
}

/** The data of one org, which loads part by part as screens need it. */
export function useOrgModel(orgId: string): OrgModel {
  return useApp().org(orgId)
}

/**
 * What the person signed in may do in an org: their role, and whether the
 * org is suspended, from its summary or from a refusal of the API.
 */
export function useOrgAccess(
  org: Pick<OrgSummary, 'id' | 'role' | 'suspension'>,
): OrgAccess {
  const refused = useStore(useApp().refusedOrgs)
  return { role: org.role, suspended: isSuspended(org, refused) }
}
