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
import { formatSize, leftOutOfCall, leftOutOfRun } from './lostCopy'
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

function CallLine(props: { call: ToolCallItem }) {
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
        <LeftOut text={leftOutOfCall(formatSize(call.omittedDetailBytes))} />
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

/**
 * A run of tool calls as one line that folds them. A finished run stays
 * folded; a run with a call in progress or stopped shows each call. When the
 * runner left out output of a call, the folded line gives the total, and
 * the call gives its own part.
 */
export function ToolGroup(props: { calls: readonly ToolCallItem[] }) {
  const { calls } = props
  const live = calls.some((call) => call.status !== 'done')
  const kinds = [...new Set(calls.map((call) => call.tool))]
  const count = `${calls.length} tool ${calls.length === 1 ? 'call' : 'calls'}`
  const leftOut = calls.reduce(
    (total, call) => total + (call.omittedDetailBytes ?? 0),
    0,
  )
  return (
    <details className={styles.group} open={live}>
      <summary className={classes(styles.summary, leftOut > 0 && styles.wraps)}>
        <ChevronRight className={styles.chevron} size={14} />
        {count}
        <span aria-hidden className={styles.kinds}>
          {kinds.map((kind) => {
            const Icon = tools[kind].icon
            return <Icon key={kind} size={13} />
          })}
        </span>
        {leftOut > 0 ? (
          <LeftOut text={leftOutOfRun(formatSize(leftOut))} />
        ) : null}
      </summary>
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
