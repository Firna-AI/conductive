import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import a11y from '../../ui/components/common/a11y.module.css'
import styles from '../../ui/components/settings/FavouritesSection.module.css'
import order from '../../ui/components/settings/RepositoryOrderList.module.css'
import { Section, SectionText } from '../../ui/components/settings/Section'
import { useStore } from '../../app/store'
import { MODEL_FAVOURITES_LIMIT } from '../../shared/account'
import { useApp, useOfferedModels } from '../context'
import { useAction } from '../ui/useAction'
import { useListOrder } from '../ui/useListOrder'
import { AddFavourite } from './AddFavourite'
import { useFavouriteFocus } from './favourite-focus'
import {
  addedFavourite,
  addedRows,
  favouriteName,
  favouriteWords,
  hiddenLine,
  keptRows,
  movedRows,
  type FavouriteRow,
  type FavouriteRows,
} from './favourite-rows'
import {
  FavouriteDropLine,
  FavouriteItem,
  LiftedFavourite,
  type MovableFavourite,
} from './FavouriteParts'

/** The error of a change whose save failed. The list keeps its saved value. */
const changeNotSaved = "The change wasn't saved. Try again."

/** The line in place of the list while the account has no favourite. */
const emptyLine = 'Add a favourite to show it first in the model menu.'

/** Why a pick of `model` in Add a favourite added nothing. */
function noFreeEffortLine(model: string): string {
  return `${model} is already a favourite at every effort.`
}

/** The rows of the saved favourites, and the saved list that they show. */
type KeptRows = FavouriteRows & { saved: readonly AgentChoice[] }

/**
 * The Favourites section of Preferences, the first section of the tab: up
 * to five choices that the model menu lists first, in this order, as the
 * Favourites section of the model favourites protocol doc says. Each row
 * has a handle, the picker of the favourite, and ×.
 */
export function FavouritesSection() {
  const app = useApp()
  const account = useStore(app.account.account)
  if (!account) return null
  return (
    <Favourites
      defaultEffort={account.defaultChoice.effort}
      saved={account.favourites}
    />
  )
}

/**
 * The favourites of the account. A drag moves a row, as Alt with Up or
 * Down does while the focus is in the row, × removes a favourite, a pick in
 * the picker of a row changes it, and a pick in Add a favourite adds one at
 * the end, as `addedFavourite` says, with the effort of `defaultEffort`, the
 * default of new workspaces. The picker of the new row then takes the
 * focus. Each change saves the whole list at once. The account state queues
 * no save, so the section sends one save at a time: while a save runs, the
 * section shows the list that it sent, and it takes no other change. The
 * controls stay on, so a row that moved by keys keeps the focus. After the
 * reply, the section shows the saved list. A failed save keeps the saved
 * list and shows its error under the list until the next change, which
 * saves again. When a render takes the focused control out of the list, as
 * ×, a reply that drops a copy, or a failed add can, the focus goes back
 * into the section, as `useFavouriteFocus` says.
 *
 * A pick in Add a favourite that adds nothing, because each effort of its
 * model is already a favourite, saves nothing. A muted line under the list
 * then says so until the next pick or change, and a screen reader reads it
 * out. A favourite that the model menu leaves out shows greyed, with the
 * line that says why, as `hiddenLine` says. With no favourite, a muted line
 * takes the place of the list (model favourites decision 6). Add a
 * favourite is off while the list holds five, and a line then says that
 * the menu shows five at most.
 */
function Favourites(props: {
  saved: readonly AgentChoice[]
  defaultEffort: Effort
}) {
  const app = useApp()
  const models = useStore(app.models)
  const listed = useOfferedModels(undefined)
  const [kept, setKept] = useState<KeptRows>(() => ({
    saved: props.saved,
    ...keptRows(props.saved, [], 0),
  }))
  const [sent, setSent] = useState<readonly FavouriteRow[]>([])
  // The label of the model of a pick that added nothing, until the next change.
  const [taken, setTaken] = useState<string | null>(null)
  const save = useAction((list: readonly AgentChoice[]) =>
    app.account.setFavourites(list),
  )
  const shown = save.pending ? sent : kept.rows
  // A new saved list, from the reply of a save or a read of the account:
  // its rows keep the IDs of the rows that show.
  if (kept.saved !== props.saved) {
    setKept({ saved: props.saved, ...keptRows(props.saved, shown, kept.next) })
  }
  const focus = useFavouriteFocus(shown.map((row) => row.id))
  const change = (rows: readonly FavouriteRow[]) => {
    if (save.pending) return
    setTaken(null)
    setSent(rows)
    save.run(rows.map((row) => row.choice))
  }
  const add = (model: AgentModel) => {
    const choices = shown.map((row) => row.choice)
    const choice = addedFavourite(model, choices, props.defaultEffort)
    if (choice === null) {
      setTaken(model.label)
      return
    }
    if (save.pending) return
    const added = addedRows(shown, choice, kept.next)
    const row = added.rows.at(-1)
    setKept((current) => ({ ...current, next: added.next }))
    if (row) focus.focusAdded(row.id)
    change(added.rows)
  }
  const items = shown.map((row): MovableFavourite => {
    const words = favouriteWords(models, row.choice)
    return { ...row, words, name: favouriteName(words) }
  })
  const { drag, moves, status } = useListOrder({
    items,
    move: (id, to) => change(movedRows(shown, id, to)),
  })
  const full = shown.length >= MODEL_FAVOURITES_LIMIT
  return (
    <Section
      actions={
        <AddFavourite
          buttonRef={focus.addRef}
          full={full}
          models={listed}
          pick={add}
        />
      }
      description="The model menu lists your favourites first, in this order."
      title="Favourites"
    >
      {items.length > 0 ? (
        <div className={order.wrap}>
          <ol
            aria-busy={save.pending || undefined}
            aria-label="Favourites"
            className={styles.list}
            onBlur={focus.onBlur}
            onFocus={focus.onFocus}
          >
            {items.map((item, place) => (
              <FavouriteItem
                busy={save.pending}
                drag={drag}
                hidden={hiddenLine(models, listed, item.choice)}
                item={item}
                key={item.id}
                onKeyDown={(event) => {
                  moves.onKeyDown(item, event)
                }}
                pick={(choice) =>
                  change(
                    shown.map((row) =>
                      row.id === item.id ? { ...row, choice } : row,
                    ),
                  )
                }
                pickerRef={focus.controlRef(item.id, 'picker')}
                place={place}
                remove={() => change(shown.filter((row) => row.id !== item.id))}
                removeRef={focus.controlRef(item.id, 'remove')}
              />
            ))}
            {drag.lineAtEnd ? <FavouriteDropLine /> : null}
          </ol>
          <LiftedFavourite drag={drag} />
          <span className={a11y.hidden} role="status">
            {status}
          </span>
        </div>
      ) : (
        <SectionText muted>{emptyLine}</SectionText>
      )}
      {save.error ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{changeNotSaved}</span>
        </span>
      ) : null}
      {taken === null ? null : (
        <SectionText muted status>
          {noFreeEffortLine(taken)}
        </SectionText>
      )}
      {full ? (
        <SectionText muted>
          The menu shows {MODEL_FAVOURITES_LIMIT} favourites at most. Remove one
          to add another.
        </SectionText>
      ) : null}
    </Section>
  )
}
