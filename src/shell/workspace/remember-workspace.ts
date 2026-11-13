import { useEffect } from 'react'
import { workspaceAddress } from '../../app/last-workspaces'
import { parseRoute } from '../../app/router'
import type { Loadable } from '../../app/store'
import { useApp } from '../context'

/**
 * Keeps the workspace of the page as the last workspace of its org, while
 * the page shows it. When the page shows that the workspace is not
 * available, the org forgets it, so a switch to the org does not open the
 * missing workspace again.
 */
export function useRememberWorkspace(
  page: {
    orgId: string
    workspaceId: string
    view: readonly string[]
    session?: string
  },
  detail: Loadable<unknown>,
): void {
  const last = useApp().lastWorkspaces
  // The address holds the view, so a new array with the same parts
  // remembers nothing again.
  const address = workspaceAddress({ screen: 'workspace', ...page })
  const missing = detail.state === 'failed' && detail.error.status === 404
  const shown = detail.state === 'ready'
  useEffect(() => {
    const route = parseRoute(address, '')
    if (route.screen !== 'workspace') return
    if (missing) last.forget(route.orgId, route.workspaceId)
    else if (shown) last.remember(route)
  }, [last, address, shown, missing])
}
