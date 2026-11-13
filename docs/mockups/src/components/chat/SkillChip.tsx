import type { ReactNode } from 'react'
import { SquareSlash } from 'lucide-react'
import a11y from '../common/a11y.module.css'
import { ChipEndRemove, ChipIconCell, type ChipRemoval } from './ChipRemove'
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
 * The list, the chips, and the app share it.
 */
export function SkillIcon(props: { size: number }) {
  return <SquareSlash aria-hidden size={props.size} />
}

/**
 * A skill in a line of text: a small rounded pill with the skill icon and
 * the name of the skill. It has the size of a file chip. Its title is the
 * description of the skill, and screen readers hear "Skill" before the
 * name.
 *
 * In a message box, `removal` gives the chip the cell of its icon, which a
 * pointer turns into a × that removes the chip. Where no pointer hovers, as
 * on a phone, the icon stays and a × ends the chip. A chip in a sent
 * message has no ×. `opener` makes the chip an element that opens a page.
 * `mention` marks the chip with its text, such as `/plans`, so a copy of a
 * sent message can give it. It takes no fixtures, so the app can use it.
 */
export function SkillChip(props: {
  skill: ChipSkill
  mention?: string
  opener?: (chip: ChipOpener) => ReactNode
  removal?: ChipRemoval
}) {
  const { skill, removal } = props
  const icon = (
    <span className={styles.icon}>
      <SkillIcon size={12} />
    </span>
  )
  const chip: ChipOpener = {
    className: useChipClass(removal),
    'data-mention': props.mention,
    title: skill.description,
    children: (
      <>
        {removal ? <ChipIconCell icon={icon} removal={removal} /> : icon}
        <span className={base.text}>
          <span className={a11y.hidden}>Skill </span>
          <span className={base.name}>{skill.name}</span>
        </span>
        {removal ? <ChipEndRemove removal={removal} /> : null}
      </>
    ),
  }
  return props.opener ? props.opener(chip) : <span {...chip} />
}
