import type { CSSProperties } from 'react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import { menu } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { classes } from '../../../../../src/ui/components/common/classes'
import type { Shortcut } from '../../../../../src/ui/components/common/KeyChips'
import type { MenuPlacement } from '../../../../../src/ui/components/common/Menu'
import { useTouch } from '../../../../../src/ui/components/common/touch'
import {
  divider,
  effortChoices,
  favouritesMenu,
  modelEntries,
  shownFavourites,
} from './pickers'
import styles from './FavouritesMenu.module.css'

/** Where the model menu opens beside its picker. */
export type PickerPlacement = Exclude<MenuPlacement, 'sheet'>

/**
 * The model menu of a picker, drawn open beside it, with the rows of
 * `favouritesMenu`. `allModels` opens the submenu of every model, and
 * `effort` opens the submenu of the efforts. A submenu shows beside the
 * menu on a computer, level with its row, and in place of the menu on a
 * phone, with Back at its top. A menu with no favourite to show starts
 * with All models, so its submenu starts level with the top of the menu.
 */
export function FavouritesMenu(props: {
  choice: AgentChoice
  favourites: readonly AgentChoice[]
  placement: PickerPlacement
  allModels?: boolean
  effort?: boolean
  sessionAgent?: AgentKey
  hiddenModels?: readonly string[]
  fastKey?: Shortcut
}) {
  const phone = useTouch()
  const rows = shownFavourites(props.favourites, props.hiddenModels).length
  const efforts = props.effort === true
  const submenu = props.allModels === true || efforts
  const label = efforts ? 'Effort' : 'All models'
  const instance = efforts ? 'effort' : 'all-models'
  const choices = efforts
    ? effortChoices(props.choice)
    : modelEntries(props.choice, props.sessionAgent, props.hiddenModels)
  if (submenu && phone) {
    const back: MenuEntryData = {
      kind: 'item',
      label: 'Back',
      icon: 'chevron-left',
    }
    return (
      <menu.Component
        entries={[back, divider, ...choices]}
        label={label}
        moklyInstance={instance}
        placement={props.placement}
      />
    )
  }
  const entries = favouritesMenu(props.choice, {
    favourites: props.favourites,
    sessionAgent: props.sessionAgent,
    hiddenModels: props.hiddenModels,
    fastKey: props.fastKey,
    allModels: props.allModels === true && !efforts,
    effort: efforts,
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
          '--submenu-rows': rows + (efforts ? 1 : 0),
          '--submenu-lines': (rows > 0 ? 1 : 0) + (efforts ? 1 : 0),
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
          entries={choices}
          label={label}
          moklyInstance={instance}
          placement="point"
        />
      </div>
    </div>
  )
}
