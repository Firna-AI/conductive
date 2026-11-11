import { Fragment, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ChevronRight,
  FilePen,
  FilePlus,
  FileText,
  Search,
  SquareTerminal,
  Wrench,
} from 'lucide-react'
import type { ToolCallItem, ToolKind } from '../../fixtures/conversations'
import { classes } from '../common/classes'
import { LeftOut } from './LeftOut'
import { leftOutOfCall, leftOutOfRun } from './lostCopy'
import styles from './ToolGroup.module.css'

type ToolWords = { icon: LucideIcon; done: string; running: string }

const tools: Readonly<Record<ToolKind, ToolWords>> = {
  read: { icon: FileText, done: 'Read', running: 'Reading' },
  search: { icon: Search, done: 'Searched', running: 'Searching' },
  create: { icon: FilePlus, done: 'Created', running: 'Creating' },
  edit: { icon: FilePen, done: 'Edited', running: 'Editing' },
  run: { icon: SquareTerminal, done: 'Ran', running: 'Running' },
  other: { icon: Wrench, done: 'Used', running: 'Using' },
}

/** The icon of a skill: an open book, the instructions that the agent loads. */
const SkillIcon = BookOpen

/**
 * The words of a skill line, which take the place of the words of its kind:
 * "Used skill" after one skill loads, and "Used skills" after a command
 * loads more than one.
 */
function skillWords(count: number): ToolWords {
  const noun = count === 1 ? 'skill' : 'skills'
  return { icon: SkillIcon, done: `Used ${noun}`, running: `Using ${noun}` }
}

/** The skills that a call loads. A call that loads none is a plain call. */
function skillsOf(call: ToolCallItem): readonly string[] {
  return call.skills ?? []
}

/**
 * One tool call in an open list: its icon, its verb, its target, and its
 * result. A call that loads skills is a skill line, whose target holds the
 * skill names. The names and the detail then form one text, so an ellipsis
 * cuts a long detail, such as a command, before the names.
 */
export function CallLine(props: { call: ToolCallItem }) {
  const theme = useSharedUiTheme()
  const { call } = props
  const skillCount = skillsOf(call).length
  const tool = skillCount > 0 ? skillWords(skillCount) : tools[call.tool]
  const Icon = tool.icon
  const text = (
    <>
      <span className={styles.target}>{call.target}</span>
      {call.detail ? (
        <span className={styles.detail}>{call.detail}</span>
      ) : null}
    </>
  )
  return (
    <>
      <Icon className={styles.icon} size={13} />
      <span className={styles.verb}>
        {call.status === 'running' ? tool.running : tool.done}
      </span>
      {skillCount > 0 ? <span className={styles.skillText}>{text}</span> : text}
      {call.omittedDetailBytes ? (
        <LeftOut text={leftOutOfCall(call.omittedDetailBytes)} />
      ) : null}
      {call.status === 'running' ? (
        <Spinner color={theme.colors.muted} size={12} />
      ) : null}
      {call.status === 'stopped' ? (
        <span className={styles.detail}>Stopped</span>
      ) : null}
    </>
  )
}

/** A count for the line of a fold, such as "1 tool call": none for zero. */
function counted(count: number, noun: string): string[] {
  return count === 0 ? [] : [`${count} ${noun}${count === 1 ? '' : 's'}`]
}

/** The icon of a call on the line of a fold: a skill call shows the book. */
function iconKey(call: ToolCallItem): ToolKind | 'skill' {
  return skillsOf(call).length > 0 ? 'skill' : call.tool
}

/**
 * The skills that the line of a fold names: each skill of its calls once,
 * in the order of first use. A stopped call loaded no skill.
 */
function foldSkills(calls: readonly ToolCallItem[]): string[] {
  const loaded = calls.filter((call) => call.status !== 'stopped')
  return [...new Set(loaded.flatMap(skillsOf))]
}

/**
 * The skills after the counts of a fold line, such as " · Skill: plans" or
 * " · Skills: brainstorming, plans", then the marks of the line. The line
 * wraps only after the dot, after the noun, or between two names: a
 * no-break space holds the dot to the counts, a name keeps its comma and
 * never breaks at its hyphen, and the marks stay with the last name.
 */
function FoldSkills(props: { names: readonly string[]; children: ReactNode }) {
  const { names } = props
  const last = names[names.length - 1]
  return (
    <>
      {names.length === 1 ? '\u00a0· Skill: ' : '\u00a0· Skills: '}
      {names.slice(0, -1).map((name) => (
        <Fragment key={name}>
          <span className={styles.skillName}>{name},</span>{' '}
        </Fragment>
      ))}
      <span className={styles.lastSkill}>
        <span className={styles.skillName}>{last}</span>
        {props.children}
      </span>
    </>
  )
}

/**
 * The line of a fold: a chevron, the count of its tool calls and of its
 * messages, such as "8 tool calls, 7 messages", the icons of the kinds of
 * its tool calls, and the total output that the runner left out of them.
 * It leaves out a zero count. A line whose calls load skills names them
 * after its counts, and its text wraps beside the chevron. A run of tool
 * calls and the work of an ended turn share it.
 */
export function FoldLine(props: {
  calls: readonly ToolCallItem[]
  messages?: number
}) {
  const { calls } = props
  const kinds = [...new Set(calls.map(iconKey))]
  const names = foldSkills(calls)
  const leftOut = calls.reduce(
    (total, call) => total + (call.omittedDetailBytes ?? 0),
    0,
  )
  const label = [
    ...counted(calls.length, 'tool call'),
    ...counted(props.messages ?? 0, 'message'),
  ].join(', ')
  const marks = (
    <>
      {kinds.length > 0 ? (
        <span aria-hidden className={styles.kinds}>
          {kinds.map((kind) => {
            const Icon = kind === 'skill' ? SkillIcon : tools[kind].icon
            return <Icon key={kind} size={13} />
          })}
        </span>
      ) : null}
      {leftOut > 0 ? <LeftOut text={leftOutOfRun(leftOut)} /> : null}
    </>
  )
  if (names.length > 0) {
    return (
      <summary className={classes(styles.summary, styles.named)}>
        <ChevronRight className={styles.chevron} size={14} />
        <span className={styles.words}>
          {label}
          <FoldSkills names={names}>{marks}</FoldSkills>
        </span>
      </summary>
    )
  }
  return (
    <summary className={classes(styles.summary, leftOut > 0 && styles.wraps)}>
      <ChevronRight className={styles.chevron} size={14} />
      {label}
      {marks}
    </summary>
  )
}

/**
 * A run of tool calls as one line that folds them. A finished run stays
 * folded; a run with a call in progress or stopped shows each call. When the
 * runner left out output of a call, the folded line gives the total, and
 * the call gives its own part.
 */
export function ToolGroup(props: { calls: readonly ToolCallItem[] }) {
  const { calls } = props
  const live = calls.some((call) => call.status !== 'done')
  return (
    <details className={styles.group} open={live}>
      <FoldLine calls={calls} />
      <ul className={styles.calls}>
        {calls.map((call) => (
          <li className={styles.call} key={call.id}>
            <CallLine call={call} />
          </li>
        ))}
      </ul>
    </details>
  )
}
