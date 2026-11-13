import { useContext, useMemo } from 'react'
import { useNavigation } from '../../app/navigation'
import { parseRoute } from '../../app/router'
import { useServices } from '../../app/services'
import { PanelContext } from '../layout/panels'
import type { LinkOpening } from '../ui/text-links'
import type { WorkspaceContext } from './features'
import { previewPortHref } from './tools/tool-address'

/** Whether the router reads a page of the app at an address. */
function isAppPage(url: URL): boolean {
  return parseRoute(url.pathname, url.search).screen !== 'not-found'
}

/**
 * How the links of untrusted text open in the screen of a workspace. An
 * address at the origin of the app host that names a page of the app opens
 * that page in the same window, through the navigation of the app. A local
 * address opens the preview of its port in the Preview tool of the
 * workspace: on desktop in the right column, which then shows, and on a
 * phone on the page of the tool. A read-only workspace, such as an
 * archived one, runs no server, so a local address stays text there.
 */
export function useLinkOpening(context: WorkspaceContext): LinkOpening {
  const { appOrigin } = useServices()
  const navigation = useNavigation()
  const panels = useContext(PanelContext)
  const { org, workspace, readOnly } = context
  const phone = context.viewport === 'phone'
  return useMemo(() => {
    const href = (port: number) => previewPortHref(org.id, workspace.id, port)
    return {
      appOrigin,
      isAppPage,
      open: (to) => navigation.push(to),
      ports: readOnly
        ? null
        : {
            href,
            open: (port) => {
              if (!phone) panels?.rightShown.set(true)
              navigation.push(href(port))
            },
          },
    }
  }, [appOrigin, navigation, panels, org.id, workspace.id, readOnly, phone])
}
