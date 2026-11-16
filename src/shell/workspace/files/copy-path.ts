import { useCallback } from 'react'
import { useToast } from '@firna/ui/toast'
import {
  copyPathItem,
  pathResults,
} from '../../../../docs/mockups/src/components/files/rowMenuCopy'
import type { RowMenuItems } from '../../../files/panel/row-menu'
import { useOrgServices } from '../../context'

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
 * The items of the menu of a row of All files or Changes: Copy path, with
 * the copy icon of the mockups. It copies the path of the row as the list
 * holds it, such as `src/lib` for a folder, with no `./` and no final `/`.
 * The Files screens leave out each row whose label hides a secret value.
 */
export function useRowMenuItems(orgId: string): RowMenuItems {
  const copyPath = useCopyPath(orgId)
  return useCallback<RowMenuItems>(
    (row) => [
      [
        {
          kind: 'item',
          label: copyPathItem.label,
          icon: copyPathItem.icon,
          onSelect: () => copyPath(row.path),
        },
      ],
    ],
    [copyPath],
  )
}
