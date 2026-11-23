import type { ReactNode } from 'react'
import { effortLabels } from '../../../../../src/shared/agents'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import { type AgentChoice, type AgentKey } from '../../fixtures/agents'
import { favourites as savedFavourites } from '../../fixtures/favourites'
import { noop } from '../../../../../src/ui/noop'
import { useShortcutHint } from '../common/ShortcutTip'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { FavouritesMenu, type PickerPlacement } from './FavouritesMenu'
import { pickerButtonStyle } from '../../../../../src/ui/components/chat/pickerButton'
import styles from '../../../../../src/ui/components/chat/ModelPicker.module.css'

/**
 * One picker for the model and the effort of the next message, such as
 * "Opus 5.5 High". The effort shows in a muted colour, and so does "Fast"
 * after it while fast mode is on. `open` draws its menu open: the
 * favourites first, then All models, then Effort and the Fast switch, as
 * `FavouritesMenu` says.
 *
 * `favourites` holds the favourites of the menu, by default those of the
 * viewer. With none, the menu starts with All models, as the picker of a
 * Favourites row does, because the row sets one favourite.
 * `allModels` opens the submenu of every model, and `effort` opens the
 * submenu of the efforts. `sessionAgent` is the
 * agent of a session with messages, whose other agent's models and
 * favourites open a new session. `hiddenModels` holds the models that its
 * menu leaves out, with each favourite on one of them. `fastKey` marks the
 * picker of a session tab, where the key of Fast mode runs, so its Fast row
 * shows that key on desktop. `menu` takes the place of the open menu, such
 * as nothing where the screen draws the menu above the page.
 */
export function ModelPicker(props: {
  choice: AgentChoice
  open?: boolean
  placement?: PickerPlacement
  sessionAgent?: AgentKey
  hiddenModels?: readonly string[]
  fastKey?: boolean
  favourites?: readonly AgentChoice[]
  allModels?: boolean
  effort?: boolean
  menu?: ReactNode
}) {
  const control = useControlSizes()
  const fastHint = useShortcutHint('fast-mode')
  const { choice } = props
  const effort = effortLabels[choice.effort]
  const speed = choice.fast ? ', Fast' : ''
  return (
    <span className={styles.anchor}>
      <Button
        accessibilityLabel={`Model and effort: ${choice.model}, ${effort}${speed}`}
        content={
          <span
            className={styles.trigger}
            style={{ fontSize: control.labelSize }}
          >
            <span className={styles.model}>{choice.model}</span>
            <span className={styles.effort}>{effort}</span>
            {choice.fast ? <span className={styles.fast}>Fast</span> : null}
            <ChevronDown aria-hidden className={styles.chevron} size={12} />
          </span>
        }
        expanded={props.open ?? false}
        hasPopup="menu"
        onPress={noop}
        size="sm"
        style={pickerButtonStyle(control.height)}
        tone="plain"
      />
      {props.open
        ? (props.menu ?? (
            <FavouritesMenu
              allModels={props.allModels}
              choice={choice}
              effort={props.effort}
              fastKey={props.fastKey ? fastHint : undefined}
              favourites={props.favourites ?? savedFavourites}
              hiddenModels={props.hiddenModels}
              placement={props.placement ?? 'above-start'}
              sessionAgent={props.sessionAgent}
            />
          ))
        : null}
    </span>
  )
}
