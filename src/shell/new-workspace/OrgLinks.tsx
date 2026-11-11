import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { useStore, valueOf } from '../../app/store'
import { createChatApi } from '../../chat/api/client'
import { LinksProvider } from '../../chat/links/LinksContext'
import { sessionLinks } from '../../chat/links/session-links'
import { SessionReads } from '../../chat/links/session-reads'
import { useOrgModel } from '../context'

/**
 * Gives the chips of a New workspace form the workspaces of its org, with
 * the archived ones, as the list of the org has them now. The form watches
 * the list while it shows, so a rename shows in a chip at once. A session
 * link finds its session through one read of the sessions of its workspace
 * for each load of the form, as in a chat.
 */
export function OrgLinks(props: { orgId: string; children: ReactNode }) {
  const { orgId } = props
  const model = useOrgModel(orgId)
  const list = valueOf(useStore(model.workspaces))
  const workspaces = list ?? null
  const api = model.services.api
  const reads = useMemo(
    () =>
      new SessionReads((workspaceId) =>
        createChatApi(api, { orgId, workspaceId }).sessions(),
      ),
    [api, orgId],
  )
  const read = useSyncExternalStore(
    reads.subscribe,
    reads.getSnapshot,
    reads.getSnapshot,
  )
  const sessions = useMemo(() => sessionLinks(null, reads, read), [reads, read])
  const value = useMemo(
    () => ({ links: { orgId, workspaces }, sessions }),
    [orgId, workspaces, sessions],
  )
  return <LinksProvider value={value}>{props.children}</LinksProvider>
}
