import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import styles from '../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import { useServices } from '../../app/services'
import { formatDay } from '../../app/time'
import type { Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'

export type SandboxProblem = 'stopped' | 'error' | 'archived'

interface Problem {
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

function problemOf(problem: SandboxProblem, archivedOn: string): Problem {
  switch (problem) {
    case 'stopped':
      return {
        icon: CirclePause,
        title: 'Sandbox stopped',
        body: saved,
        panelBody: saved,
        action: 'Resume',
        tone: 'neutral',
      }
    case 'error':
      return {
        icon: CircleAlert,
        title: "The sandbox couldn't start",
        body: saved,
        panelBody: saved,
        action: 'Try again',
        tone: 'danger',
      }
    case 'archived':
      return {
        icon: Archive,
        title: `Archived on ${archivedOn}`,
        body: 'Its cloud computer is deleted, and the chat is read-only.',
        panelBody: 'The files and the tools went with the cloud computer.',
        tone: 'neutral',
      }
  }
}

function useProblem(problem: SandboxProblem, workspace: Workspace): Problem {
  const { timeZone } = useServices()
  const archivedAt = workspace.archivedAt ?? workspace.updatedAt
  return problemOf(problem, formatDay(archivedAt, timeZone))
}

/** The bar that takes the place of the composer while the sandbox is down. */
export function SandboxBar(props: {
  problem: SandboxProblem
  workspace: Workspace
  resume: Action<[]>
}) {
  const problem = useProblem(props.problem, props.workspace)
  return (
    <Notice
      action={
        problem.action ? (
          <ActionButton
            busy={props.resume.pending}
            onPress={() => props.resume.run()}
            tone="primary"
          >
            {problem.action}
          </ActionButton>
        ) : undefined
      }
      body={problem.body}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/**
 * What a panel shows while the sandbox is not running. Desktop leaves the
 * action to the bar under the chat; a phone shows it in the panel.
 */
export function SandboxPanel(props: {
  state: 'starting' | SandboxProblem
  workspace: Workspace
  resume: Action<[]> | null
}) {
  const theme = useSharedUiTheme()
  const problem = useProblem(
    props.state === 'starting' ? 'stopped' : props.state,
    props.workspace,
  )
  if (props.state === 'starting') {
    return (
      <div className={styles.waiting}>
        <Spinner color={theme.colors.muted} size={13} />
        Waiting for the sandbox
      </div>
    )
  }
  const { resume } = props
  return (
    <EmptyState
      action={
        resume && problem.action ? (
          <ActionButton
            busy={resume.pending}
            onPress={() => resume.run()}
            tone="primary"
          >
            {problem.action}
          </ActionButton>
        ) : undefined
      }
      body={problem.panelBody}
      icon={problem.icon}
      title={props.state === 'archived' ? 'Archived' : problem.title}
    />
  )
}
