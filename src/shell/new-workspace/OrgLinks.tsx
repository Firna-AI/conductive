import { useMemo, type ReactNode } from 'react'
import { useStore, valueOf } from '../../app/store'
import { LinksProvider } from '../../chat/links/LinksContext'
import { useOrgModel } from '../context'

/**
 * Gives the chips of a New workspace form the workspaces of its org, with
 * the archived ones, as the list of the org has them now. The form watches
 * the list while it shows, so a rename shows in a chip at once.
 */
export function OrgLinks(props: { orgId: string; children: ReactNode }) {
  const list = valueOf(useStore(useOrgModel(props.orgId).workspaces))
  const workspaces = list ?? null
  const value = useMemo(
    () => ({ links: { orgId: props.orgId, workspaces } }),
    [props.orgId, workspaces],
  )
  return <LinksProvider value={value}>{props.children}</LinksProvider>
}
