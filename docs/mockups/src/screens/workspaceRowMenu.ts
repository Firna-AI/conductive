import type { Viewport } from '@mokly/mokly'
import {
  rowMenuEntries,
  type FileRowMenu,
} from '../components/files/FileRowMenu'
import type { FileList } from '../components/files/FilesPanel'
import { replacesComposer } from '../../../../src/ui/components/workspace/sandboxNoticeState'
import { mentionEntries } from '../fixtures/fileMentions'
import { splitPath } from '../fixtures/files'
import { listsShow, sandboxNotice } from './workspaceSandbox'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

type MenuRow = {
  /** The path of the row from the root of the repository. */
  path: string
  /** The lists that show the row. */
  lists: readonly FileList[]
}

/**
 * The row of each state of `rowMenu`: AddressForm.tsx, which All files and
 * Changes both list, the folder of the checkout, and postcodeLookup.ts,
 * which the branch deletes, so only Changes lists it.
 */
const menuRows: Readonly<
  Record<Exclude<WorkspaceState['rowMenu'], 'none'>, MenuRow>
> = {
  file: { path: 'src/app/checkout/AddressForm.tsx', lists: ['all', 'changes'] },
  folder: { path: 'src/app/checkout', lists: ['all'] },
  deleted: { path: 'src/app/checkout/postcodeLookup.ts', lists: ['changes'] },
}

/**
 * The open menu of a row of All files or Changes, when the state opens one
 * and the list of `files` shows its row. A new workspace has no changes
 * yet. Add to chat shows for a path that the list of `@` offers, which
 * leaves out a file that the branch deletes, and only while the message
 * field shows. A bar of the cloud computer that takes the place of the
 * field, such as the bar of a stopped one, leaves it out. A phone draws the
 * menu as a sheet, and the screen checks that its Files tab shows the list.
 */
export function rowMenuOf(
  state: WorkspaceState,
  viewport: Viewport,
): FileRowMenu | undefined {
  if (state.rowMenu === 'none') return undefined
  const row = menuRows[state.rowMenu]
  if (!row.lists.includes(state.files) || !listsShow(state)) return undefined
  if (state.files === 'changes' && isNew(state)) return undefined
  const notice = sandboxNotice(state)
  const field = notice === undefined || !replacesComposer(notice)
  const offered = mentionEntries.some((entry) => entry.path === row.path)
  return {
    path: row.path,
    name: splitPath(row.path).name,
    entries: rowMenuEntries(field && offered),
    at: viewport === 'mobile' ? 'sheet' : 'pointer',
  }
}
