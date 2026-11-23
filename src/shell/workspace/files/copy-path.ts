import { useCallback } from 'react'
import { useToast } from '@firna/ui/toast'
import {
  copyPathItem,
  pathResults,
} from '../../../ui/components/files/rowMenuCopy'
import type { RowMenuItems } from '../../../files/panel/row-menu'
import { useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { useAddToChat } from './add-to-chat'

/**
 * Copies a real path from the root of the repository, during the press of
 * a Copy path item, through the clipboard of the org, so the Mac app copies
 * too. The menu closed at the press, so a toast says "Path copied", or "The
 * path didn't copy. Try again." The copy sends no request and starts no
 * cloud computer, so it works from the lists that a stopped one keeps.
 */
export function useCopyPath(orgId: string): (path: string) => void {
  const services = useOrgServices(orgId)
  const { toast } = useToast()
  return useCallback(
    (path: string) => {
      services.copy(path).then(
        () => toast({ title: pathResults.copied, tone: 'success' }),
        () => toast({ title: pathResults.failed, tone: 'error' }),
      )
    },
    [services, toast],
  )
}

/**
 * The items of the menu of a row of All files or Changes: Add to chat, as
 * `useAddToChat` says, then a line, then Copy path, with the copy icon of
 * the mockups. Copy path copies the path of the row as the list holds it,
 * such as `src/lib` for a folder, with no `./` and no final `/`. A row
 * without Add to chat has only Copy path, with no line. The Files screens
 * leave out each row whose label hides a secret value.
 */
export function useRowMenuItems(context: WorkspaceContext): RowMenuItems {
  const copyPath = useCopyPath(context.org.id)
  const addToChat = useAddToChat(context)
  return useCallback<RowMenuItems>(
    (row) => [
      addToChat(row),
      [
        {
          kind: 'item',
          label: copyPathItem.label,
          icon: copyPathItem.icon,
          onSelect: () => copyPath(row.path),
        },
      ],
    ],
    [addToChat, copyPath],
  )
}
