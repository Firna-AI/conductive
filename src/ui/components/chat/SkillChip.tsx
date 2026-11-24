import type { ReactNode } from 'react'
import { SquareSlash } from 'lucide-react'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { ChipCopyText } from './ChipCopyText'
import {
  ChipEndRemove,
  ChipIconCell,
  useNoHover,
  type ChipRemoval,
} from './ChipRemove'
import base from './InlineChip.module.css'
import { useChipClass, type ChipOpener } from './WorkspaceChip'
import styles from './FileChip.module.css'

/** What a skill chip shows: the name and the description of the skill. */
export type ChipSkill = {
  name: string
  description: string
}

/**
 * The icon of a skill: a `/` in a square, as `/` opens the list of skills.
 * The list, the chips, the skill tabs, and the app share it.
 */
export function SkillIcon(props: { size: number; className?: string }) {
  return (
    <SquareSlash aria-hidden className={props.className} size={props.size} />
  )
}

/**
 * A skill in a line of text: a small rounded pill with the skill icon and
 * the name of the skill. It has the size of a file chip. Its title is the
 * description of the skill, and screen readers hear "Skill" before the
 * name.
 *
 * In a sent message, `opener` makes the chip the element that opens the
 * skill tab. In a message box, `removal` gives the chip the cell of its
 * icon, which a pointer turns into a × that removes the chip, and
 * `onOpen` makes the name a button that opens the skill tab, as the name of
 * a file chip opens its file. The press takes no focus, so the caret stays
 * in the text and the chip stays one unit of the text. Where no pointer
 * hovers, as on a phone, the icon stays and a × ends the chip. A view has
 * no pointer, so `namePointer` draws the pointer over the name, which is
 * then underlined. `mention` marks the chip with its text, such as
 * `/plans`, and a copy of the chip gives that text, as `ChipCopyText`
 * says. It takes no fixtures, so the app can use it.
 */
export function SkillChip(props: {
  skill: ChipSkill
  mention?: string
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
  /** In a message box, a press on the name opens the skill tab. */
  onOpen?: () => void
  namePointer?: boolean
}) {
  const { skill, removal } = props
  const noHover = useNoHover()
  const icon = (
    <span className={styles.icon}>
      <SkillIcon size={12} />
    </span>
  )
  const name = <span className={base.name}>{skill.name}</span>
  const chip: ChipOpener = {
    className: useChipClass(removal),
    'data-mention': props.mention,
    title: skill.description,
    children: (
      <>
        {removal ? <ChipIconCell icon={icon} removal={removal} /> : icon}
        <span className={base.text}>
          <span className={a11y.hidden}>Skill </span>
          {props.onOpen ? (
            <button
              className={classes(
                styles.open,
                props.namePointer === true && !noHover && styles.pointer,
              )}
              onClick={props.onOpen}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              {name}
            </button>
          ) : (
            name
          )}
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
        <ChipCopyText text={props.mention} />
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
