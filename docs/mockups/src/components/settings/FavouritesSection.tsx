import { effortLabels } from '../../../../../src/shared/agents'
import { CircleAlert, GripVertical, Plus, X } from 'lucide-react'
import {
  favouriteLimit,
  favourites,
  noFavourites,
} from '../../fixtures/favourites'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { Section, SectionText } from './Section'
import styles from './FavouritesSection.module.css'

/** The error of a change whose save failed. The list keeps its saved value. */
const changeNotSaved = "The change wasn't saved. Try again."

/** Why the model menu leaves out a favourite on a model of `hiddenModels`. */
function hiddenLine(model: string): string {
  return `Hidden from the model menu, because your endpoint does not list ${model}.`
}

/**
 * The Favourites section of Preferences: up to five choices that the model
 * menu lists first, in this order. Each row holds the picker of one
 * favourite, so a favourite is a model, an effort, and fast mode. Its menu
 * lists every model at its top, because the row sets one favourite. A drag
 * on the handle moves a row, and × removes it. Add a favourite is off while
 * the list holds five. Each change saves at once.
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
}) {
  const hidden = props.hiddenModels ?? []
  const full = favourites.length >= favouriteLimit
  return (
    <Section
      actions={
        <ActionButton disabled={full} icon={Plus}>
          Add a favourite
        </ActionButton>
      }
      description="The model menu lists these first, in this order."
      title="Favourites"
    >
      <ol className={styles.list}>
        {favourites.map((favourite, index) => {
          const off = hidden.includes(favourite.model)
          return (
            <li className={styles.row} key={index}>
              <GripVertical aria-hidden className={styles.handle} size={14} />
              <div className={styles.choice}>
                <span className={classes(styles.picker, off && styles.off)}>
                  <ModelPicker
                    choice={favourite}
                    favourites={noFavourites}
                    hiddenModels={hidden}
                  />
                </span>
                {off ? (
                  <span className={styles.why}>
                    {hiddenLine(favourite.model)}
                  </span>
                ) : null}
              </div>
              <IconButton
                icon={X}
                label={`Remove ${favourite.model} ${effortLabels[favourite.effort]}${favourite.fast ? ' Fast' : ''}`}
                quiet
              />
            </li>
          )
        })}
      </ol>
      {props.saveFailed ? (
        <span className={styles.error} role="alert">
          <CircleAlert aria-hidden className={styles.icon} size={13} />
          <span>{changeNotSaved}</span>
        </span>
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
