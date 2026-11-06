import { createContext, useContext } from 'react'
import type { AppModel } from '../app/app-model'
import type { OrgModel } from '../app/org-model'

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
