import { useMemo } from 'react'
import { useNavigation } from '../../../app/navigation'
import { parseRoute } from '../../../app/router'
import { useServices } from '../../../app/services'
import type { TerminalLinks } from '../../../terminal/terminalLinks'
import { previewPortHref } from './tool-address'

/**
 * What the links of the terminal of a workspace open. A local address
 * opens the Preview tool of the workspace at its port, with the same checks
 * as a typed port. An app page opens in the app, in the same window, as a
 * chip does. Every other link opens in a new tab, or in the default
 * browser from the Mac app.
 */
export function useTerminalLinks(
  orgId: string,
  workspaceId: string,
): TerminalLinks {
  const navigation = useNavigation()
  const { appOrigin, openInNewTab } = useServices()
  return useMemo<TerminalLinks>(
    () => ({
      context: {
        appOrigin,
        isAppPage: (url) =>
          parseRoute(url.pathname, url.search).screen !== 'not-found',
      },
      open: (link) => {
        if (link.kind === 'local') {
          navigation.push(previewPortHref(orgId, workspaceId, link.port))
        } else if (link.kind === 'app') {
          navigation.push(link.to)
        } else {
          openInNewTab(link.href)
        }
      },
    }),
    [navigation, appOrigin, openInNewTab, orgId, workspaceId],
  )
}
