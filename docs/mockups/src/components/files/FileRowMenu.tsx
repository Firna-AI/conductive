import type { ReactNode } from 'react'
import { iconKeyOf } from '../../entries/components/common/icons'
import { menu as menuPart } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { sheet } from '../../entries/components/common/Sheet.mockup'
import { PointMenu } from '../common/PointMenu'
import {
  addToChatItem,
  copyPathItem,
} from '../../../../../src/ui/components/files/rowMenuCopy'
import styles from './FileRowMenu.module.css'

/**
 * The open menu of a row of All files or Changes, from the file row menu
 * change: the path of the row from the root of the repository, the name
 * that the row shows, and the items. A right click opens it at the pointer
 * on desktop. A phone draws it as a sheet over the screen, and the row
 * keeps its mark under the sheet. The items are JSON, with the key of each
 * icon, as the registered menu takes them.
 */
export type FileRowMenu = {
  path: string
  name: string
  entries: readonly MenuEntryData[]
  at: 'pointer' | 'sheet'
}

/** An item of a row menu, with the key of its icon. */
function item(copy: typeof copyPathItem): MenuEntryData {
  return { kind: 'item', label: copy.label, icon: iconKeyOf(copy.icon) }
}

/**
 * The items of a row menu: Add to chat, a line, then Copy path. An action
 * comes before a copy item, as Rename session comes before Copy link in
 * the menu of a session tab. A row whose chip no message field can take
 * now, such as a deleted file of Changes or a row while the bar of the
 * cloud computer takes the place of the message field, has only Copy path.
 */
export function rowMenuEntries(addToChat: boolean): MenuEntryData[] {
  const copy = item(copyPathItem)
  if (!addToChat) return [copy]
  return [item(addToChatItem), { kind: 'divider' }, copy]
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
    <sheet.Component moklyInstance="file-row-menu-sheet" title={menu.name}>
      <menuPart.Component
        entries={menu.entries}
        label={menu.name}
        moklyInstance="file-row-menu"
        placement="sheet"
      />
    </sheet.Component>
  )
}
