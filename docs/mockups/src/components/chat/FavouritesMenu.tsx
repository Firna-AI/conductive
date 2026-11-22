import type { CSSProperties } from 'react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { classes } from '../common/classes'
import type { Shortcut } from '../common/KeyChips'
import type { MenuPlacement } from '../common/Menu'
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
 * a phone, with Back at its top. A menu with no favourite to show starts
 * with All models, so its submenu starts level with the top of the menu.
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
  const submenu = props.allModels === true
  const models = modelEntries(
    props.choice,
    props.sessionAgent,
    props.hiddenModels,
  )
  if (submenu && phone) {
    const back: MenuEntryData = {
      kind: 'item',
      label: 'Back',
      icon: 'chevron-left',
    }
    return (
      <menu.Component
        entries={[back, divider, ...models]}
        label="All models"
        moklyInstance="all-models"
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
      <menu.Component
        entries={entries}
        label="Model and effort"
        moklyInstance="model-menu"
        placement={props.placement}
      />
    )
  }
  return (
    <div
      className={classes(styles.pair, styles[props.placement])}
      style={
        {
          '--favourite-rows': rows,
          '--favourite-line': rows > 0 ? '7px' : '0px',
        } as CSSProperties
      }
    >
      <menu.Component
        entries={entries}
        label="Model and effort"
        moklyInstance="model-menu"
        placement="point"
      />
      <div className={styles.submenu}>
        <menu.Component
          entries={models}
          label="All models"
          moklyInstance="all-models"
          placement="point"
        />
      </div>
    </div>
  )
}
