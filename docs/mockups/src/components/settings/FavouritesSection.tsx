import { GripVertical, Plus, X } from 'lucide-react'
import { favouriteLimit, favourites } from '../../fixtures/favourites'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { Section, SectionText } from './Section'
import styles from './FavouritesSection.module.css'

/**
 * The Favourites section of Preferences: up to five choices that the model
 * menu lists first, in this order. Each row holds the model picker of
 * today, so a favourite is a model, an effort, and fast mode. A drag on
 * the handle moves a row, and × removes it. Add a favourite is off while
 * the list holds five. Each change saves at once.
 */
export function FavouritesSection() {
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
        {favourites.map((favourite, index) => (
          <li className={styles.row} key={index}>
            <GripVertical aria-hidden className={styles.handle} size={14} />
            <ModelPicker choice={favourite} />
            <span className={styles.spacer} />
            <IconButton icon={X} label="Remove the favourite" quiet />
          </li>
        ))}
      </ol>
      {full ? (
        <SectionText muted>
          The menu shows {favouriteLimit} favourites at most. Remove one to add
          another.
        </SectionText>
      ) : null}
    </Section>
  )
}
