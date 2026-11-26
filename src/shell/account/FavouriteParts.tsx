import type { KeyboardEvent, RefCallback } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, X } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import picker from '../../ui/components/chat/ModelPicker.module.css'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import styles from '../../ui/components/settings/FavouritesSection.module.css'
import order from '../../ui/components/settings/RepositoryOrderList.module.css'
import { ownPress } from '../../app/pointer-drag'
import { useOfferedModels } from '../context'
import { IconButton } from '../ui/actions'
import { ModelPicker } from '../ui/ModelPicker'
import type { ListDrag } from '../ui/useListDrag'
import ui from '../ui/ui.module.css'
import type { FavouriteRow, FavouriteWords } from './favourite-rows'
import local from './favourites.module.css'

/** A favourite as the order of the list moves it, with its spoken name. */
export type MovableFavourite = FavouriteRow & {
  name: string
  words: FavouriteWords
}

/**
 * The line where a dragged favourite lands. It takes no space and no
 * border, so no row moves during the drag. The status of the list tells a
 * screen reader the place.
 */
export function FavouriteDropLine() {
  return (
    <li aria-hidden className={order.drop} style={{ border: 0 }}>
      <span className={order.line} />
    </li>
  )
}

/**
 * The lifted copy of the dragged favourite under the pointer, above the
 * page, with the words of its picker.
 */
export function LiftedFavourite(props: { drag: ListDrag<MovableFavourite> }) {
  const { dragged, lifted } = props.drag
  const control = useControlSizes()
  if (!dragged || !lifted) return null
  const { words } = dragged
  return createPortal(
    <ol
      aria-hidden
      className={styles.list}
      style={{
        position: 'fixed',
        zIndex: 40,
        top: lifted.top - 20,
        left: lifted.left,
        width: lifted.width,
        border: 0,
        pointerEvents: 'none',
      }}
    >
      <li className={classes(styles.row, order.lifted)}>
        <GripVertical aria-hidden className={styles.handle} size={14} />
        <span
          className={picker.trigger}
          style={{ fontSize: control.labelSize, padding: '0 8px' }}
        >
          <span className={picker.model}>{words.model}</span>
          <span className={picker.effort}>{words.effort}</span>
          {words.fast ? <span className={picker.fast}>Fast</span> : null}
        </span>
      </li>
    </ol>,
    document.body,
  )
}

/**
 * The favourites of the menu of the picker of a row: none, because the row
 * sets one favourite. The menu then starts with All models (model
 * favourites decision 6).
 */
const noFavourites: readonly AgentChoice[] = []

/**
 * The row of a favourite: the handle, the picker of the favourite, and ×.
 * A drag of the row moves it, and Alt with Up or Down moves it while the
 * focus is in the row. The picker and × keep their own presses, so a press
 * on them starts no drag. The picker offers the models of the person, and
 * keeps the model of the favourite. Its menu shows no favourites, so it
 * starts with All models. `pickerRef` and `removeRef` take the elements of
 * the picker and of ×, for the owner that moves the focus to them.
 *
 * `hidden` says why the model menu leaves out the favourite. The picker then
 * shows at half strength, the line under it says why, and the handle, the
 * picker, and × still work. While `busy`, a save runs: a press on the row
 * starts no drag, and the owner takes no change.
 */
export function FavouriteItem(props: {
  item: MovableFavourite
  place: number
  drag: ListDrag<MovableFavourite>
  hidden: string | null
  busy: boolean
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  pick: (choice: AgentChoice) => void
  remove: () => void
  pickerRef: RefCallback<unknown>
  removeRef: RefCallback<unknown>
}) {
  const { item, drag, hidden } = props
  const models = useOfferedModels(item.choice)
  return (
    <>
      {drag.lineBefore === item.id ? <FavouriteDropLine /> : null}
      <li
        {...(props.busy ? {} : drag.bind(item, props.place))}
        className={classes(
          styles.row,
          local.dragSurface,
          drag.dragged?.id === item.id && order.placeholder,
        )}
        onKeyDown={props.onKeyDown}
        ref={drag.itemRef(item.id)}
      >
        <GripVertical aria-hidden className={styles.handle} size={14} />
        <div className={styles.choice}>
          <span
            className={classes(styles.picker, hidden !== null && styles.off)}
          >
            <ModelPicker
              buttonRef={props.pickerRef}
              change={props.pick}
              choice={item.choice}
              favourites={noFavourites}
              models={models}
              placement="below-start"
            />
          </span>
          {hidden === null ? null : (
            <span className={styles.why}>{hidden}</span>
          )}
        </div>
        <span {...ownPress} className={ui.anchor}>
          <IconButton
            buttonRef={props.removeRef}
            icon={X}
            label={`Remove ${item.name}`}
            onPress={props.remove}
            quiet
          />
        </span>
      </li>
    </>
  )
}
