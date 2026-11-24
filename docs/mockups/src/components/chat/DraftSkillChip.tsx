import {
  SkillIcon,
  type ChipSkill,
} from '../../../../../src/ui/components/chat/SkillChip'
import {
  ChipEndRemove,
  ChipIconCell,
  useNoHover,
  type ChipRemoval,
} from '../../../../../src/ui/components/chat/ChipRemove'
import { useChipClass } from '../../../../../src/ui/components/chat/WorkspaceChip'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { classes } from '../../../../../src/ui/components/common/classes'
import fileChip from '../../../../../src/ui/components/chat/FileChip.module.css'
import base from '../../../../../src/ui/components/chat/InlineChip.module.css'
import pointerStyles from './ChipPointer.module.css'

/**
 * The chip of a skill in a message box, whose name opens the skill in the
 * temporary tab, as the name of a file chip opens its file. It has the look
 * of the shared `SkillChip`: the cell of the skill icon, which a pointer
 * turns into a × that removes the chip, then the name. Where no pointer
 * hovers, as on a phone, the icon stays and a × ends the chip. The shared
 * chip has no name to press yet, so the mockups draw this one.
 *
 * A view has no pointer, so `namePointer` draws it over the name, which is
 * then underlined. A press on the name takes no focus, so the caret stays
 * in the text, and the chip stays one unit of the text.
 */
export function DraftSkillChip(props: {
  skill: ChipSkill
  removal: ChipRemoval
  namePointer?: boolean
}) {
  const { skill, removal } = props
  const noHover = useNoHover()
  const icon = (
    <span className={fileChip.icon}>
      <SkillIcon size={12} />
    </span>
  )
  return (
    <span className={useChipClass(removal)} title={skill.description}>
      <ChipIconCell icon={icon} removal={removal} />
      <span className={base.text}>
        <span className={a11y.hidden}>Skill </span>
        <button
          className={classes(
            fileChip.open,
            props.namePointer === true && !noHover && pointerStyles.name,
          )}
          tabIndex={-1}
          type="button"
        >
          <span className={base.name}>{skill.name}</span>
        </button>
      </span>
      <ChipEndRemove removal={removal} />
    </span>
  )
}
