import type {
  ComponentProps,
  ComponentPropsWithRef,
  MouseEvent,
  Ref,
} from 'react'
import { X } from 'lucide-react'
import { SkillIcon } from '../../../ui/components/chat/SkillChip'
import { classes } from '../../../ui/components/common/classes'
import { skillTabCopy } from '../../../ui/components/files/skillTabCopy'
import styles from '../../../ui/components/workspace/WorkspaceTabs.module.css'
import { IconButton } from '../../../files/ui/actions'
import { focusClass } from '../../../files/ui/layout'
import type { SkillIdentity } from '../../../shared/skills'
import { isPlainClick } from '../../ui/AppLink'
import type { SkillNavigation } from './skill-navigation'

/** A plain click that no part took, such as the click at the end of a drag. */
function opens(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && isPlainClick(event)
}

/** The skill icon and the name of a tab. The temporary tab shows it in italics. */
function SkillTabLabel(props: { name: string; temporary: boolean }) {
  return (
    <>
      <SkillIcon className={styles.icon} size={13} />
      <span
        className={classes(styles.title, props.temporary && styles.temporary)}
      >
        {props.name}
      </span>
    </>
  )
}

/**
 * The closable tab of an open skill, for the tab row of the centre column
 * on desktop. It is a list item, so the shell puts it in the same list as
 * the session and file tabs, and it takes their styles from the shared UI.
 * Its title is the name of the skill, after the skill icon, and its tooltip
 * also names the agent of the skill, such as "plans, Claude skill". The
 * tab is a link to its own address. A plain click opens the skill, and a
 * double-click keeps the temporary tab, once: its second click opens
 * nothing again and selects no text. The temporary tab shows its title in
 * italics, and a screen reader hears the name, then "temporary". `item`,
 * `link`, and `close` take the props of the row, as for a file tab.
 */
export function SkillTabItem(props: {
  skill: SkillIdentity
  selected: boolean
  /** The temporary tab, which the next look at a file, diff, or skill replaces. */
  temporary: boolean
  navigation: SkillNavigation
  onClose: () => void
  item?: ComponentPropsWithRef<'li'>
  link?: { ref?: Ref<HTMLAnchorElement> }
  close?: ComponentProps<'span'>
}) {
  const { skill, item, navigation, temporary } = props
  return (
    <li
      {...item}
      className={classes(
        styles.tab,
        props.selected && styles.selected,
        item?.className,
      )}
    >
      <a
        aria-current={props.selected ? 'page' : undefined}
        aria-label={temporary ? `${skill.name}, temporary` : undefined}
        className={classes(styles.link, focusClass)}
        href={navigation.href(skill)}
        onClick={(event) => {
          if (!opens(event)) return
          event.preventDefault()
          // A press of Enter counts 0 clicks and a first click 1, so only
          // the second click of a double-click, or a later one, stops here.
          if (event.detail > 1) return
          navigation.open(skill)
        }}
        onDoubleClick={(event) => {
          if (opens(event)) navigation.keep(skill)
        }}
        onMouseDown={(event) => {
          // The second press of a double-click would select a word.
          if (event.detail > 1) event.preventDefault()
        }}
        ref={props.link?.ref}
        title={`${skill.name}, ${skillTabCopy.agent[skill.agent]}`}
      >
        <SkillTabLabel name={skill.name} temporary={temporary} />
      </a>
      <span {...props.close} className={styles.close}>
        <IconButton
          icon={X}
          label={`Close ${skill.name}`}
          onPress={props.onClose}
          quiet
        />
      </span>
    </li>
  )
}

/**
 * The copy of a skill tab that a drag lifts above the page: its icon and
 * its whole name, with no link and no Close. The copy of the temporary tab
 * keeps the italics.
 */
export function LiftedSkillTab(props: { name: string; temporary: boolean }) {
  return (
    <div className={classes(styles.tab, styles.lifted)}>
      <span className={styles.link}>
        <SkillTabLabel name={props.name} temporary={props.temporary} />
      </span>
    </div>
  )
}
