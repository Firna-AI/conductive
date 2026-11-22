import { effortLabels } from '../../../../../src/shared/agents'
import { CircleAlert, GripVertical, Plus, X } from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import {
  favouriteLimit,
  favouritesInSection,
  noFavourites,
  pickedModel,
  takenModel,
  type FavouriteSectionState,
} from '../../fixtures/favourites'
import { ModelPicker } from '../chat/ModelPicker'
import { addFavouriteEntries } from '../chat/pickers'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { Menu } from '../common/Menu'
import { Sheet } from '../common/Sheet'
import { useTouch } from '../common/touch'
import { Section, SectionText } from './Section'
import styles from './FavouritesSection.module.css'

/** The error of a change whose save failed. The list keeps its saved value. */
const changeNotSaved = "The change wasn't saved. Try again."

/** The label of the button that adds a favourite, and the name of its list. */
const addLabel = 'Add a favourite'

/** The line in place of the list while the account has no favourite. */
const emptyLine = 'Add a favourite to show it first in the model menu.'

/** Why the model menu leaves out a favourite on a model of `hiddenModels`. */
function hiddenLine(model: string): string {
  return `Hidden from the model menu, because your endpoint does not list ${model}.`
}

/**
 * Why a pick in the list of Add a favourite added nothing: the favourites
 * hold the model at each of its efforts.
 */
function noFreeEffortLine(model: string): string {
  return `${model} is already a favourite at every effort.`
}

/**
 * The list of Add a favourite in a sheet, as a phone opens it. The list is
 * a menu of the section, not a model picker, so it stays a sheet on a
 * phone, as the other menus of the shell do (model favourites decision
 * 5 B). The row of `pickedModel` is under the finger.
 */
export function AddFavouriteSheet(props: { hiddenModels?: readonly string[] }) {
  return (
    <Sheet title={addLabel}>
      <Menu
        entries={addFavouriteEntries(pickedModel, props.hiddenModels)}
        label={addLabel}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * The row of one favourite: the handle, the picker of the favourite, and ×,
 * which is named after the favourite. The picker shows the menu with no
 * favourites, because the row sets one favourite. A favourite on a model of
 * `hidden` shows its picker greyed, with the line that says why.
 */
function FavouriteRow(props: {
  favourite: AgentChoice
  hidden: readonly string[]
}) {
  const { favourite } = props
  const off = props.hidden.includes(favourite.model)
  return (
    <li className={styles.row}>
      <GripVertical aria-hidden className={styles.handle} size={14} />
      <div className={styles.choice}>
        <span className={classes(styles.picker, off && styles.off)}>
          <ModelPicker
            choice={favourite}
            favourites={noFavourites}
            hiddenModels={props.hidden}
          />
        </span>
        {off ? (
          <span className={styles.why}>{hiddenLine(favourite.model)}</span>
        ) : null}
      </div>
      <IconButton
        icon={X}
        label={`Remove ${favourite.model} ${effortLabels[favourite.effort]}${favourite.fast ? ' Fast' : ''}`}
        quiet
      />
    </li>
  )
}

/**
 * The Favourites section of Preferences: up to five choices that the model
 * menu lists first, in this order. Each row holds the picker of one
 * favourite, so a favourite is a model, an effort, and fast mode. Its menu
 * has no favourites, because the row sets one favourite, so it starts with
 * All models. A drag on the handle moves a row, and × removes it. Each
 * change saves at once. With no favourite, a muted line takes the place of
 * the list (model favourites decision 6).
 *
 * Add a favourite opens the list of every model, in the groups of All
 * models, below the button on a computer. A phone opens the list in
 * `AddFavouriteSheet`, which the screen draws. A pick adds the model at the
 * end of the list, as model favourites decision 4 D says, and the list
 * saves at once. A pick that adds nothing leaves a line under the list that
 * says why. Add a favourite is off while the list holds five. `favourites`
 * gives the state of the section, and with it the favourites of the list.
 *
 * `hiddenModels` holds the models that the pickers of the member leave out,
 * because the model list of an own endpoint does not name them. A favourite
 * on one of them stays in the list, with its picker greyed and a line that
 * says why. Its handle, its picker, and × still work. `saveFailed` shows the
 * error of a change that the app did not save under the list, which keeps
 * the saved favourites.
 */
export function FavouritesSection(props: {
  hiddenModels?: readonly string[]
  saveFailed?: boolean
  favourites?: FavouriteSectionState
}) {
  const phone = useTouch()
  const hidden = props.hiddenModels ?? []
  const state = props.favourites ?? 'saved'
  const list = favouritesInSection[state]
  const full = list.length >= favouriteLimit
  const open = state === 'add-open'
  return (
    <Section
      actions={
        <span className={styles.add}>
          <ActionButton disabled={full} expanded={open} icon={Plus} menu>
            {addLabel}
          </ActionButton>
          {open && !phone ? (
            <Menu
              entries={addFavouriteEntries(pickedModel, hidden)}
              label={addLabel}
              placement="below-start"
            />
          ) : null}
        </span>
      }
      description="The model menu lists your favourites first, in this order."
      title="Favourites"
    >
      {list.length === 0 ? (
        <SectionText muted>{emptyLine}</SectionText>
      ) : (
        <ol className={styles.list}>
          {list.map((favourite, index) => (
            <FavouriteRow favourite={favourite} hidden={hidden} key={index} />
          ))}
        </ol>
      )}
      {props.saveFailed ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{changeNotSaved}</span>
        </span>
      ) : null}
      {state === 'no-free-effort' ? (
        <SectionText muted status>
          {noFreeEffortLine(takenModel)}
        </SectionText>
      ) : null}
      {full ? (
        <SectionText muted>
          The menu shows {favouriteLimit} favourites at most. Remove one to add
          another.
        </SectionText>
      ) : null}
    </Section>
  )
}
