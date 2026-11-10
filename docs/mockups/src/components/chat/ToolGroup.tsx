import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronRight,
  FilePen,
  FilePlus,
  FileText,
  Search,
  SquareTerminal,
} from 'lucide-react'
import type { ToolCallItem, ToolKind } from '../../fixtures/conversations'
import { classes } from '../common/classes'
import { LeftOut } from './LeftOut'
import { leftOutOfCall, leftOutOfRun } from './lostCopy'
import styles from './ToolGroup.module.css'

const tools: Readonly<
  Record<ToolKind, { icon: LucideIcon; done: string; running: string }>
> = {
  read: { icon: FileText, done: 'Read', running: 'Reading' },
  search: { icon: Search, done: 'Searched', running: 'Searching' },
  create: { icon: FilePlus, done: 'Created', running: 'Creating' },
  edit: { icon: FilePen, done: 'Edited', running: 'Editing' },
  run: { icon: SquareTerminal, done: 'Ran', running: 'Running' },
}

/** One tool call in an open list: its icon, its verb, its target, and its result. */
export function CallLine(props: { call: ToolCallItem }) {
  const theme = useSharedUiTheme()
  const { call } = props
  const tool = tools[call.tool]
  const Icon = tool.icon
  return (
    <>
      <Icon className={styles.icon} size={13} />
      <span className={styles.verb}>
        {call.status === 'running' ? tool.running : tool.done}
      </span>
      <span className={styles.target}>{call.target}</span>
      {call.detail ? (
        <span className={styles.detail}>{call.detail}</span>
      ) : null}
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

/**
 * The line of a fold: a chevron, the count of its tool calls and of its
 * messages, such as "8 tool calls, 7 messages", the icons of the kinds of
 * its tool calls, and the total output that the runner left out of them.
 * It leaves out a zero count. A run of tool calls and the work of an ended
 * turn share it.
 */
export function FoldLine(props: {
  calls: readonly ToolCallItem[]
  messages?: number
}) {
  const { calls } = props
  const kinds = [...new Set(calls.map((call) => call.tool))]
  const leftOut = calls.reduce(
    (total, call) => total + (call.omittedDetailBytes ?? 0),
    0,
  )
  const label = [
    ...counted(calls.length, 'tool call'),
    ...counted(props.messages ?? 0, 'message'),
  ].join(', ')
  return (
    <summary className={classes(styles.summary, leftOut > 0 && styles.wraps)}>
      <ChevronRight className={styles.chevron} size={14} />
      {label}
      {kinds.length > 0 ? (
        <span aria-hidden className={styles.kinds}>
          {kinds.map((kind) => {
            const Icon = tools[kind].icon
            return <Icon key={kind} size={13} />
          })}
        </span>
      ) : null}
      {leftOut > 0 ? <LeftOut text={leftOutOfRun(leftOut)} /> : null}
    </summary>
  )
}

/**
 * A run of tool calls as one line that folds them. A run shows each call
 * while it grows, also between two calls, and while a call is in progress
 * or stopped. Otherwise it stays folded. When the runner left out output of
 * a call, the folded line gives the total, and the call gives its own part.
 */
export function ToolGroup(props: {
  calls: readonly ToolCallItem[]
  /** The agent can still add calls to the run: the working line follows it. */
  growing: boolean
}) {
  const { calls } = props
  const live = props.growing || calls.some((call) => call.status !== 'done')
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
