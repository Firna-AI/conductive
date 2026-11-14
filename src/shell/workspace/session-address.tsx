import { useEffect, useSyncExternalStore } from 'react'
import { useNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import type { ChatController } from '../../chat/state/controller'
import type { WorkspaceContext } from './features'

/**
 * Shows the session of a session address in its workspace, after the load
 * of the chat. A closed session reopens first. Then the address becomes the
 * address of the workspace, in place of the session address, because the
 * address does not follow the shown tab. An unknown session and a failed
 * load keep the shown tab. A move to another address before the lookup ends
 * stops it, and so does a choice of a shown session, as `showAddress` says.
 */
export function OpenSessionAddress(props: {
  chat: ChatController
  context: Pick<WorkspaceContext, 'org' | 'workspace'>
  session: string | undefined
}): null {
  const navigation = useNavigation()
  const { chat, session } = props
  const { org, workspace } = props.context
  const orgId = org.id
  const workspaceId = workspace.id
  const readLoad = () => chat.getSnapshot().load.state
  const load = useSyncExternalStore(chat.subscribe, readLoad, readLoad)
  useEffect(() => {
    if (session === undefined || load === 'loading') return
    const lookup = new AbortController()
    const leave = () => {
      if (lookup.signal.aborted) return
      navigation.replace(routes.workspace(orgId, workspaceId))
    }
    if (load === 'failed') leave()
    else void chat.showAddress(session, lookup.signal).finally(leave)
    return () => lookup.abort()
  }, [chat, navigation, orgId, workspaceId, session, load])
  return null
}
