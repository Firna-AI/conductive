import { useState } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { LucideIcon } from 'lucide-react'
import {
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
import { LeftOut } from '../../../docs/mockups/src/components/chat/LeftOut'
import {
  leftOutOfCall,
  leftOutOfRun,
} from '../../../docs/mockups/src/components/chat/lostCopy'
import styles from '../../../docs/mockups/src/components/chat/ToolGroup.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useFold, type Fold } from './useFold'

const tools: Readonly<
  Record<ToolCall['kind'], { icon: LucideIcon; done: string; running: string }>
> = {
  read: { icon: FileText, done: 'Read', running: 'Reading' },
  search: { icon: Search, done: 'Searched', running: 'Searching' },
  create: { icon: FilePlus, done: 'Created', running: 'Creating' },
  edit: { icon: FilePen, done: 'Edited', running: 'Editing' },
  run: { icon: SquareTerminal, done: 'Ran', running: 'Running' },
  computer: { icon: Monitor, done: 'Used', running: 'Using' },
  other: { icon: Wrench, done: 'Used', running: 'Using' },
}

const endings: Readonly<Partial<Record<ToolCall['state'], string>>> = {
  stopped: 'Stopped',
  failed: 'Failed',
}

/** One tool call in an open list: its icon, its verb, its target, and its result. */
export function CallLine(props: { call: ToolCall }) {
  const theme = useSharedUiTheme()
  const { call } = props
  const tool = tools[call.kind]
  const Icon = tool.icon
  const ending = endings[call.state]
  return (
    <>
      <Icon className={styles.icon} size={13} />
      <span className={styles.verb}>
        {call.state === 'running' ? tool.running : tool.done}
      </span>
      <span className={styles.target}>{call.target}</span>
      {call.detail ? (
        <span className={styles.detail}>{call.detail}</span>
      ) : null}
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

/** A count for the line of a fold, such as "1 tool call": none for zero. */
function counted(count: number, noun: string): string[] {
  return count === 0 ? [] : [`${count} ${noun}${count === 1 ? '' : 's'}`]
}

/**
 * The line of a fold: a chevron, the count of its tool calls and of its
 * messages, such as "8 tool calls, 7 messages", the icons of the kinds of
 * its tool calls, and the total output that the runner left out of them,
 * from the calls' current counts. It leaves out a zero count. A run of tool
 * calls and the work of an ended turn share it.
 */
export function FoldLine(props: {
  calls: readonly ToolCall[]
  messages?: number
  line: Fold['line']
}) {
  const { calls } = props
  const kinds = [...new Set(calls.map((call) => call.kind))]
  const leftOut = calls.reduce(
    (total, call) => total + call.omittedDetailBytes,
    0,
  )
  const label = [
    ...counted(calls.length, 'tool call'),
    ...counted(props.messages ?? 0, 'message'),
  ].join(', ')
  return (
    <summary
      className={classes(styles.summary, leftOut > 0 && styles.wraps)}
      {...props.line}
    >
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
 * A run of consecutive tool calls as one line that folds them. A finished
 * run stays folded, and a run with a call in progress or not done shows each
 * call. Once the user opens or folds it, it keeps that choice, and its line
 * keeps its place.
 */
export function ToolGroup(props: { calls: readonly ToolCall[] }) {
  const { calls } = props
  const live = calls.some((call) => call.state !== 'done')
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
