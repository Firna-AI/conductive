import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { effortLabels } from '../../../../../src/shared/agents'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import { favourites, sameChoice } from '../../fixtures/favourites'
import { Menu, type MenuEntry } from '../common/Menu'
import type { Shortcut } from '../common/KeyChips'
import { useShortcutHint } from '../common/ShortcutTip'
import { effortEntries, modelEntries } from './pickers'
import styles from './FavouritesMenu.module.css'

/** The words after the model of a favourite: its effort, and Fast if on. */
function favouriteWords(choice: AgentChoice): string {
  return `${effortLabels[choice.effort]}${choice.fast ? ' Fast' : ''}`
}

/**
 * The rows of the menu: each favourite as the model, with its effort and
 * Fast in the muted colour, then All models, then the efforts of the
 * current model and the Fast switch, which change the current choice. The
 * menu marks the favourite that is the current choice. A favourite of the
 * other agent opens a new session, as a model of that agent does today.
 */
function favouriteEntries(
  list: readonly AgentChoice[],
  choice: AgentChoice,
  allModels: 'closed' | 'open',
  sessionAgent?: AgentKey,
  fastKey?: Shortcut,
): MenuEntry[] {
  return [
    ...list.map((favourite): MenuEntry => {
      const opensSession =
        sessionAgent !== undefined && favourite.agent !== sessionAgent
      return {
        kind: 'item',
        label: favourite.model,
        muted: favouriteWords(favourite),
        trailingIcon: opensSession ? ExternalLink : undefined,
        trailingLabel: opensSession ? 'New session' : undefined,
        checked: sameChoice(favourite, choice),
      }
    }),
    { kind: 'divider' },
    { kind: 'item', label: 'All models', submenu: allModels },
    ...effortEntries(choice, fastKey),
  ]
}

/**
 * The model menu with favourites, drawn open. `allModels` opens the
 * submenu of every model: beside the menu on a computer, and in place of
 * the menu on a phone, with Back at its top. `fastKey` marks the menu of
 * a session tab, where the key of Fast mode runs, so its Fast row shows
 * that key on desktop. `list` holds the favourites, by default those of
 * Cal.
 */
export function FavouritesMenu(props: {
  choice: AgentChoice
  viewport: Viewport
  allModels?: boolean
  sessionAgent?: AgentKey
  fastKey?: boolean
  list?: readonly AgentChoice[]
}) {
  const fastHint = useShortcutHint('fast-mode')
  const models = modelEntries(props.choice, props.sessionAgent)
  if (props.allModels && props.viewport === 'mobile') {
    const back: MenuEntry = { kind: 'item', label: 'Back', icon: ChevronLeft }
    return (
      <Menu
        entries={[back, { kind: 'divider' }, ...models]}
        label="All models"
        placement="above-start"
      />
    )
  }
  const menu = (
    <Menu
      entries={favouriteEntries(
        props.list ?? favourites,
        props.choice,
        props.allModels ? 'open' : 'closed',
        props.sessionAgent,
        props.fastKey ? fastHint : undefined,
      )}
      label="Model and effort"
      placement="point"
    />
  )
  return (
    <div className={styles.pair}>
      {menu}
      {props.allModels ? (
        <div className={styles.submenu}>
          <Menu entries={models} label="All models" placement="point" />
        </div>
      ) : null}
    </div>
  )
}
