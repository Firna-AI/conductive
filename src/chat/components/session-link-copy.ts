import { useCallback } from 'react'
import { useToast } from '@firna/ui/toast'
import { linkResults } from '../../../docs/mockups/src/components/workspace/linkCopy'
import { sessionLink } from '../../shared/session-link'
import type { CopyServices } from '../transcript-copy'

/**
 * The copy of the link of a session from its tab menu, and a toast with its
 * result, in the words of Copy link in the workspace header. The link has
 * the origin of the link of the workspace, so the Mac app copies a link of
 * the app domain too. Without that origin, as before the workspace loads,
 * it gives no copy, so the menu leaves out Copy link. The press of the item
 * calls it, so that the clipboard write starts during the press.
 */
export function useSessionLinkCopy(
  target: { orgId: string; workspaceId: string },
  origin: string | undefined,
  services: CopyServices,
): ((sessionId: string) => void) | undefined {
  const { toast } = useToast()
  const { orgId, workspaceId } = target
  const copy = useCallback(
    (sessionId: string) => {
      if (origin === undefined) return
      const link = sessionLink(origin, orgId, workspaceId, sessionId)
      services.copy(link).then(
        () => toast({ title: linkResults.copied, tone: 'success' }),
        () => toast({ title: linkResults.failed, tone: 'error' }),
      )
    },
    [origin, orgId, workspaceId, services, toast],
  )
  return origin === undefined ? undefined : copy
}
