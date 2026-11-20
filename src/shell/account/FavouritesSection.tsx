import { useState } from 'react'
import { CircleAlert, Plus } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import styles from '../../../docs/mockups/src/components/settings/FavouritesSection.module.css'
import order from '../../../docs/mockups/src/components/settings/RepositoryOrderList.module.css'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import { useStore } from '../../app/store'
import { MODEL_FAVOURITES_LIMIT } from '../../shared/account'
import { useApp, useOfferedModels } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useListOrder } from '../ui/useListOrder'
import {
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

/** The press of Add a favourite, which stays off, so it adds nothing. */
const addFavourite = () => undefined

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
  return <Favourites saved={account.favourites} />
}

/**
 * The favourites of the account. A drag moves a row, as Alt with Up or
 * Down does while the focus is in the row, × removes a favourite, and a
 * pick in the picker of a row changes it. Each change saves the whole list
 * at once. The account state queues no save, so the section sends one save
 * at a time: while a save runs, the section shows the list that it sent,
 * and it takes no other change. The controls stay on, so a row that moved
 * by keys keeps the focus. After the reply, the section shows the saved
 * list. A failed save keeps the saved list and shows its error under the
 * list until the next change, which saves again.
 *
 * A favourite that the model menu leaves out shows greyed, with the line
 * that says why, as `hiddenLine` says. Add a favourite is off, and while the
 * list holds five, a line says that the menu shows five at most.
 */
function Favourites(props: { saved: readonly AgentChoice[] }) {
  const app = useApp()
  const models = useStore(app.models)
  const listed = useOfferedModels(undefined)
  const [kept, setKept] = useState<KeptRows>(() => ({
    saved: props.saved,
    ...keptRows(props.saved, [], 0),
  }))
  const [sent, setSent] = useState<readonly FavouriteRow[]>([])
  const save = useAction((list: readonly AgentChoice[]) =>
    app.account.setFavourites(list),
  )
  const shown = save.pending ? sent : kept.rows
  // A new saved list, from the reply of a save or a read of the account:
  // its rows keep the IDs of the rows that show.
  if (kept.saved !== props.saved) {
    setKept({ saved: props.saved, ...keptRows(props.saved, shown, kept.next) })
  }
  const change = (rows: readonly FavouriteRow[]) => {
    if (save.pending) return
    setSent(rows)
    save.run(rows.map((row) => row.choice))
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
        <ActionButton
          // Off at five, as the protocol says, and below five until model
          // favourites decision 4 says what Add a favourite adds.
          disabled
          icon={Plus}
          onPress={addFavourite}
        >
          Add a favourite
        </ActionButton>
      }
      description="The model menu lists these first, in this order."
      title="Favourites"
    >
      {items.length > 0 ? (
        <div className={order.wrap}>
          <ol
            aria-busy={save.pending || undefined}
            aria-label="Favourites"
            className={styles.list}
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
                place={place}
                remove={() => change(shown.filter((row) => row.id !== item.id))}
              />
            ))}
            {drag.lineAtEnd ? <FavouriteDropLine /> : null}
          </ol>
          <LiftedFavourite drag={drag} />
          <span className={a11y.hidden} role="status">
            {status}
          </span>
        </div>
      ) : null}
      {save.error ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{changeNotSaved}</span>
        </span>
      ) : null}
      {full ? (
        <SectionText muted>
          The menu shows {MODEL_FAVOURITES_LIMIT} favourites at most. Remove one
          to add another.
        </SectionText>
      ) : null}
    </Section>
  )
}
