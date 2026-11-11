import { Fragment, useState, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ChevronRight,
  FilePen,
  FilePlus,
  FileText,
  Monitor,
  Search,
  SquareTerminal,
  Wrench,
} from 'lucide-react'
import type { ToolCall } from '../../shared/chat-events'
import {
  foldLabel,
  foldSkillHeading,
  foldSkills,
  toolEnding,
  toolRunOpen,
  toolVerb,
} from '../../shared/transcript/tool-words'
import { LeftOut } from '../../../docs/mockups/src/components/chat/LeftOut'
import {
  leftOutOfCall,
  leftOutOfRun,
} from '../../../docs/mockups/src/components/chat/lostCopy'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useFold, type Fold } from './useFold'

/** The icon of a call: the icon of its kind, or the one of a skill call. */
type CallIcon = ToolCall['kind'] | 'skill'

/**
 * The icon of each kind of tool, and of a call that loads skills: an open
 * book, the instructions that the agent loads.
 */
const icons: Readonly<Record<CallIcon, LucideIcon>> = {
  read: FileText,
  search: Search,
  create: FilePlus,
  edit: FilePen,
  run: SquareTerminal,
  computer: Monitor,
  other: Wrench,
  skill: BookOpen,
}

/**
 * A call that loads skills keeps its kind, but shows the book in place of
 * the icon of its kind.
 */
function iconOf(call: ToolCall): CallIcon {
  return call.skills?.length ? 'skill' : call.kind
}

/**
 * One tool call in an open list: its icon, its verb, its target, and its
 * result. A call that loads skills is a skill line, whose target holds the
 * skill names. The names and the detail then form one text, so an ellipsis
 * cuts a long detail, such as a command, before the names.
 */
export function CallLine(props: { call: ToolCall }) {
  const theme = useSharedUiTheme()
  const { call } = props
  const icon = iconOf(call)
  const Icon = icons[icon]
  const ending = toolEnding(call)
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
      <span className={styles.verb}>{toolVerb(call)}</span>
      {icon === 'skill' ? (
        <span className={styles.skillText}>{text}</span>
      ) : (
        text
      )}
      {call.omittedDetailBytes > 0 ? (
        <LeftOut text={leftOutOfCall(call.omittedDetailBytes)} />
      ) : null}
      {call.state === 'running' ? (
        <Spinner color={theme.colors.muted} size={12} />
      ) : null}
      {ending ? <span className={styles.detail}>{ending}</span> : null}
    </>
  )
}

/**
 * The skills after the counts of a fold line, such as " · Skill: plans" or
 * " · Skills: brainstorming, plans", then the marks of the line. The line
 * wraps only after the dot, after the words before the names, or between
 * two names: a no-break space holds the dot to the counts, a name keeps its
 * comma and never breaks at its hyphen, and the marks stay with the last
 * name.
 */
function FoldSkills(props: { names: readonly string[]; children: ReactNode }) {
  const { names } = props
  const last = names[names.length - 1]
  return (
    <>
      {`\u00a0· ${foldSkillHeading(names.length)} `}
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
 * its tool calls, and the total output that the runner left out of them,
 * from the calls' current counts. It leaves out a zero count. A line whose
 * calls loaded skills names them after its counts, and its text wraps beside
 * the chevron. A run of tool calls and the work of an ended turn share it.
 */
export function FoldLine(props: {
  calls: readonly ToolCall[]
  messages?: number
  line: Fold['line']
}) {
  const { calls } = props
  const kinds = [...new Set(calls.map(iconOf))]
  const names = foldSkills(calls)
  const leftOut = calls.reduce(
    (total, call) => total + call.omittedDetailBytes,
    0,
  )
  const label = foldLabel(calls.length, props.messages)
  const marks = (
    <>
      {kinds.length > 0 ? (
        <span aria-hidden className={styles.kinds}>
          {kinds.map((kind) => {
            const Icon = icons[kind]
            return <Icon key={kind} size={13} />
          })}
        </span>
      ) : null}
      {leftOut > 0 ? <LeftOut text={leftOutOfRun(leftOut)} /> : null}
    </>
  )
  if (names.length > 0) {
    return (
      <summary
        className={classes(styles.summary, styles.named)}
        {...props.line}
      >
        <ChevronRight className={styles.chevron} size={14} />
        <span className={styles.words}>
          {label}
          <FoldSkills names={names}>{marks}</FoldSkills>
        </span>
      </summary>
    )
  }
  return (
    <summary
      className={classes(styles.summary, leftOut > 0 && styles.wraps)}
      {...props.line}
    >
      <ChevronRight className={styles.chevron} size={14} />
      {label}
      {marks}
    </summary>
  )
}

/**
 * A run of consecutive tool calls as one line that folds them. A finished
 * run stays folded, and a run with a call in progress or not done shows each
 * call. Once the user opens or folds it, it keeps that choice, and its line
 * keeps its place.
 */
export function ToolGroup(props: { calls: readonly ToolCall[] }) {
  const { calls } = props
  const live = toolRunOpen(calls)
  const [chosen, setChosen] = useState<boolean | null>(null)
  const fold = useFold(chosen ?? live, setChosen)
  return (
    <details className={styles.group} {...fold.details}>
      <FoldLine calls={calls} line={fold.line} />
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
