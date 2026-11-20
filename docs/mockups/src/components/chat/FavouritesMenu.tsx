import type { CSSProperties } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import { classes } from '../common/classes'
import type { Shortcut } from '../common/KeyChips'
import { Menu, type MenuEntry, type MenuPlacement } from '../common/Menu'
import { useTouch } from '../common/touch'
import {
  divider,
  favouritesMenu,
  modelEntries,
  shownFavourites,
} from './pickers'
import styles from './FavouritesMenu.module.css'

/** Where the model menu opens beside its picker. */
export type PickerPlacement = Exclude<MenuPlacement, 'sheet'>

/**
 * The model menu of a picker, drawn open beside it, with the rows of
 * `favouritesMenu`. `allModels` opens the submenu of every model: beside
 * the menu on a computer, level with its row, and in place of the menu on
 * a phone, with Back at its top. A menu with no favourite to show has no
 * All models row, so it never draws the submenu.
 */
export function FavouritesMenu(props: {
  choice: AgentChoice
  favourites: readonly AgentChoice[]
  placement: PickerPlacement
  allModels?: boolean
  sessionAgent?: AgentKey
  hiddenModels?: readonly string[]
  fastKey?: Shortcut
}) {
  const phone = useTouch()
  const rows = shownFavourites(props.favourites, props.hiddenModels).length
  const submenu = props.allModels === true && rows > 0
  const models = modelEntries(
    props.choice,
    props.sessionAgent,
    props.hiddenModels,
  )
  if (submenu && phone) {
    const back: MenuEntry = { kind: 'item', label: 'Back', icon: ChevronLeft }
    return (
      <Menu
        entries={[back, divider, ...models]}
        label="All models"
        placement={props.placement}
      />
    )
  }
  const entries = favouritesMenu(props.choice, {
    favourites: props.favourites,
    sessionAgent: props.sessionAgent,
    hiddenModels: props.hiddenModels,
    fastKey: props.fastKey,
    allModels: submenu,
  })
  if (!submenu) {
    return (
      <Menu
        entries={entries}
        label="Model and effort"
        placement={props.placement}
      />
    )
  }
  return (
    <div
      className={classes(styles.pair, styles[props.placement])}
      style={{ '--favourite-rows': rows } as CSSProperties}
    >
      <Menu entries={entries} label="Model and effort" placement="point" />
      <div className={styles.submenu}>
        <Menu entries={models} label="All models" placement="point" />
      </div>
    </div>
  )
}
