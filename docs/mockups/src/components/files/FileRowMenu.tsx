import type { ReactNode } from 'react'
import { Menu, type MenuEntry } from '../common/Menu'
import { PointMenu } from '../common/PointMenu'
import { Sheet } from '../common/Sheet'
import { addToChatItem, copyPathItem } from './rowMenuCopy'
import styles from './FileRowMenu.module.css'

/**
 * The open menu of a row of All files or Changes, from the file row menu
 * change: the path of the row from the root of the repository, the name
 * that the row shows, and the items. A right click opens it at the pointer
 * on desktop. A phone draws it as a sheet over the screen, and the row
 * keeps its mark under the sheet.
 */
export type FileRowMenu = {
  path: string
  name: string
  entries: readonly MenuEntry[]
  at: 'pointer' | 'sheet'
}

/**
 * The items of a row menu: Add to chat, a line, then Copy path. An action
 * comes before a copy item, as Rename session comes before Copy link in
 * the menu of a session tab. A row whose chip no message field can take
 * now, such as a deleted file of Changes or a row while the bar of the
 * cloud computer takes the place of the message field, has only Copy path.
 */
export function rowMenuEntries(addToChat: boolean): MenuEntry[] {
  const copy: MenuEntry = { kind: 'item', ...copyPathItem }
  if (!addToChat) return [copy]
  return [{ kind: 'item', ...addToChatItem }, { kind: 'divider' }, copy]
}

/**
 * The item of a list that holds a row, with the menu of the row at the
 * pointer when it is open there. The item places that menu.
 */
export function RowMenuItem(props: {
  menu?: FileRowMenu
  children: ReactNode
}) {
  const { menu } = props
  return (
    <li className={menu ? styles.anchor : undefined}>
      {props.children}
      {menu?.at === 'pointer' ? (
        <PointMenu entries={menu.entries} label={menu.name} />
      ) : null}
    </li>
  )
}

/** The row menu of a phone: a sheet with the name of the row as its title. */
export function RowMenuSheet(props: { menu: FileRowMenu }) {
  const { menu } = props
  return (
    <Sheet title={menu.name}>
      <Menu entries={menu.entries} label={menu.name} placement="sheet" />
    </Sheet>
  )
}
