import { Spinner } from '@firna/ui/spinner'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  FilePen,
  FilePlus,
  FileText,
  Search,
  SquareTerminal,
} from 'lucide-react'
import type { ToolCallStatus, ToolKind } from '../../fixtures/conversations'
import styles from './ToolCall.module.css'

const tools: Readonly<
  Record<ToolKind, { icon: LucideIcon; done: string; running: string }>
> = {
  read: { icon: FileText, done: 'Read', running: 'Reading' },
  search: { icon: Search, done: 'Searched', running: 'Searching' },
  create: { icon: FilePlus, done: 'Created', running: 'Creating' },
  edit: { icon: FilePen, done: 'Edited', running: 'Editing' },
  run: { icon: SquareTerminal, done: 'Ran', running: 'Running' },
}

function StatusMark(props: { status: ToolCallStatus }) {
  switch (props.status) {
    case 'done':
      return (
        <Check aria-label="Done" className={styles.done} role="img" size={15} />
      )
    case 'running':
      return <Spinner accessibilityLabel="Running" size={14} />
    case 'stopped':
      return <span className={styles.detail}>Stopped</span>
  }
}

/** One tool call of an agent turn, in a bordered row. */
export function ToolCall(props: {
  tool: ToolKind
  target: string
  detail?: string
  status: ToolCallStatus
}) {
  const tool = tools[props.tool]
  const Icon = tool.icon
  return (
    <div className={styles.call}>
      <Icon className={styles.icon} size={15} />
      <span className={styles.verb}>
        {props.status === 'running' ? tool.running : tool.done}
      </span>
      <span className={styles.target}>{props.target}</span>
      {props.detail ? (
        <span className={styles.detail}>{props.detail}</span>
      ) : null}
      <StatusMark status={props.status} />
    </div>
  )
}
