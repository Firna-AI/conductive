import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  orgSuspendedReason,
  refusedIcon,
} from '../../../docs/mockups/src/components/orgs/suspension'
import styles from '../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import type { ApiError } from '../../app/api/client'
import { useServices } from '../../app/services'
import { formatDay } from '../../app/time'
import type { Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'

/**
 * Why the sandbox is not running. `refused` is a start that the app
 * refuses, such as while the owner of the workspace or its org is
 * suspended.
 */
export type SandboxProblem = 'stopped' | 'error' | 'refused' | 'archived'

/**
 * What the bar in place of the composer shows. A refused start carries the
 * words of the app's refusal, so one notice serves every reason.
 */
export type SandboxNoticeState =
  | { problem: Exclude<SandboxProblem, 'refused'> }
  | { problem: 'refused'; reason: string }

/**
 * The notice of a start in a suspended org. The org's metadata and the
 * `org_suspended` refusal give the same words, so a page whose metadata is
 * old shows the same notice.
 */
export const orgRefusal = {
  problem: 'refused',
  reason: orgSuspendedReason,
} as const satisfies SandboxNoticeState

/**
 * The codes of the API for a start that the app refuses: while the owner of
 * the workspace is suspended, or its org. The refusal lasts until its cause
 * changes, so its notice offers no action.
 */
const refusalCodes: ReadonlySet<string> = new Set([
  'user_suspended',
  'org_suspended',
])

/**
 * The notice of a start that the app refused, from the start error. An
 * owner's refusal shows the words of the API. An org's refusal shows the
 * words of `orgRefusal`.
 */
export function refusedStart(
  error: ApiError | null,
): SandboxNoticeState | null {
  if (!error || !refusalCodes.has(error.code)) return null
  if (error.code === 'org_suspended') return orgRefusal
  return { problem: 'refused', reason: error.message }
}

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

/**
 * A refused start can last until the disk of the sandbox is gone, so its
 * notice promises only the chat history.
 */
const history = 'Your chat history is available.'

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
    case 'refused':
      return {
        icon: refusedIcon,
        title: "The sandbox can't start",
        body: history,
        panelBody: history,
        tone: 'neutral',
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

/**
 * The bar of a refused start, with the words of its cause and no action.
 * New workspace shows it too, before a workspace exists.
 */
export function RefusedBar(props: { reason: string }) {
  const problem = problemOf('refused', '')
  return (
    <Notice
      body={props.reason}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/**
 * The bar that takes the place of the composer while the sandbox is down. A
 * refused start shows the words of the refusal, and no action, because the
 * start stays refused until its cause changes.
 */
export function SandboxBar(props: {
  notice: SandboxNoticeState
  workspace: Workspace
  resume: Action<[]>
}) {
  const { notice } = props
  const problem = useProblem(notice.problem, props.workspace)
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
      body={notice.problem === 'refused' ? notice.reason : problem.body}
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
