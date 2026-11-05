import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { archivedOn } from '../../fixtures/archive'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'
import styles from './SandboxNotice.module.css'

export type SandboxProblem = 'stopped' | 'error' | 'archived'

type Problem = {
  icon: LucideIcon
  title: string
  /** The text of the bar under the chat. */
  body: string
  /** The text of the files and tools panels. */
  panelBody: string
  /** The one way forward, when the sandbox can come back. */
  action?: string
  tone: 'neutral' | 'danger'
}

const saved = 'Your files and chat are saved.'

const problems: Readonly<Record<SandboxProblem, Problem>> = {
  stopped: {
    icon: CirclePause,
    title: 'Sandbox stopped',
    body: saved,
    panelBody: saved,
    action: 'Resume',
    tone: 'neutral',
  },
  error: {
    icon: CircleAlert,
    title: "The sandbox couldn't start",
    body: saved,
    panelBody: saved,
    action: 'Try again',
    tone: 'danger',
  },
  archived: {
    icon: Archive,
    title: `Archived on ${archivedOn}`,
    body: 'Its cloud computer is deleted, and the chat is read-only.',
    panelBody: 'The files and the tools went with the cloud computer.',
    tone: 'neutral',
  },
}

function RecoveryButton(props: { label: string }) {
  return <ActionButton tone="primary">{props.label}</ActionButton>
}

/** The bar that replaces the composer while the sandbox is not running. */
export function SandboxBar(props: { problem: SandboxProblem }) {
  const problem = problems[props.problem]
  return (
    <Notice
      action={
        problem.action ? <RecoveryButton label={problem.action} /> : undefined
      }
      body={problem.body}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/**
 * What a panel shows while the sandbox is not running. The desktop layout
 * leaves the action to the chat bar beside it.
 */
export function SandboxPanel(props: {
  state: 'starting' | SandboxProblem
  action: boolean
}) {
  const theme = useSharedUiTheme()
  if (props.state === 'starting') {
    return (
      <div className={styles.waiting}>
        <Spinner color={theme.colors.muted} size={13} />
        Waiting for the sandbox
      </div>
    )
  }
  const problem = problems[props.state]
  const archived = props.state === 'archived'
  return (
    <EmptyState
      action={
        props.action && problem.action ? (
          <RecoveryButton label={problem.action} />
        ) : undefined
      }
      body={problem.panelBody}
      icon={problem.icon}
      title={archived ? 'Archived' : problem.title}
    />
  )
}
