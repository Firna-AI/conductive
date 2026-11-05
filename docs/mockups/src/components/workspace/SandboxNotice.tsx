import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert, CirclePause } from 'lucide-react'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'
import styles from './SandboxNotice.module.css'

export type SandboxProblem = 'stopped' | 'error'

const saved = 'Your files and chat are saved.'

const problems = {
  stopped: {
    icon: CirclePause,
    title: 'Sandbox stopped',
    action: 'Resume',
    tone: 'neutral',
  },
  error: {
    icon: CircleAlert,
    title: "The sandbox couldn't start",
    action: 'Try again',
    tone: 'danger',
  },
} as const

function RecoveryButton(props: { problem: SandboxProblem }) {
  return (
    <ActionButton tone="primary">{problems[props.problem].action}</ActionButton>
  )
}

/** The bar that replaces the composer while the sandbox is not running. */
export function SandboxBar(props: { problem: SandboxProblem }) {
  const problem = problems[props.problem]
  return (
    <Notice
      action={<RecoveryButton problem={props.problem} />}
      body={saved}
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
  return (
    <EmptyState
      action={
        props.action ? <RecoveryButton problem={props.state} /> : undefined
      }
      body={saved}
      icon={problem.icon}
      title={problem.title}
    />
  )
}
