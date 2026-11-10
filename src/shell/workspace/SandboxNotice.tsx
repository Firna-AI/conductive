import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Archive, CircleAlert, CirclePause, Power } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  orgSuspendedReason,
  refusedIcon,
} from '../../../docs/mockups/src/components/orgs/suspension'
import styles from '../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import type {
  SandboxNoticeState,
  SandboxPanelState,
  SandboxProblem,
} from '../../../docs/mockups/src/components/workspace/sandboxNoticeState'
import type { ApiError } from '../../app/api/client'
import { useServices } from '../../app/services'
import { formatDay } from '../../app/time'
import type { Workspace } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'

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
  /** The title of the files and tools panels, when it is not the title. */
  panelTitle?: string
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

/**
 * A failed first start leaves a new workspace with no files yet, so its
 * notice promises only the chat, with its queued messages.
 */
const chatSaved = 'Your chat is saved.'

/** What stays of the workspace: a failed first start keeps only its chat. */
function keptBody(notice: SandboxNoticeState, body: string): string {
  return notice.problem === 'error' && notice.firstStart ? chatSaved : body
}

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
        panelTitle: 'Archived',
        panelBody: 'The files and the tools went with the cloud computer.',
        tone: 'neutral',
      }
    case 'inactive':
      return {
        icon: Power,
        title: 'Activate this workspace',
        body: 'A cloud computer starts with your work from Conductor.',
        panelTitle: 'Not active',
        panelBody: 'Activate the workspace to open its files and tools.',
        action: 'Activate',
        tone: 'neutral',
      }
  }
}

function useProblem(problem: SandboxProblem, workspace: Workspace): Problem {
  const { timeZone } = useServices()
  const archivedAt = workspace.archivedAt ?? workspace.updatedAt
  return problemOf(problem, formatDay(archivedAt, timeZone))
}

/** The text of the bar: the refusal, or the saved message before the body. */
function barBody(notice: SandboxNoticeState, body: string): string {
  switch (notice.problem) {
    case 'refused':
      return notice.reason
    case 'error':
      return notice.message ? `${notice.message} ${body}` : body
    case 'stopped':
    case 'archived':
    case 'inactive':
      return body
  }
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
 * The bar under the chat while the sandbox is down. It takes the place of
 * the composer, except after a failed first start, whose composer stays
 * under it. A refused start shows the words of the refusal, and no action,
 * because the start stays refused until its cause changes. A start that
 * failed shows the message that the workspace saved for it, such as its
 * time limit, before the body. A workspace from Conductor asks to activate
 * it before its first activation, and its Activate runs `resume`.
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
      body={barBody(notice, keptBody(notice, problem.body))}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/**
 * What a panel shows while the sandbox is not running. Desktop leaves the
 * action and the words of a refusal to the bar under the chat. A phone
 * shows the bar only on the Chat tab, so its panels show them too.
 */
export function SandboxPanel(props: {
  state: SandboxPanelState
  workspace: Workspace
  /**
   * Resume, Try again, or Activate, which a phone shows. Null where the
   * panel shows only a start or a refusal, which have no action.
   */
  resume: Action<[]> | null
  phone: boolean
}) {
  const theme = useSharedUiTheme()
  const { state, resume, phone } = props
  const problem = useProblem(
    state.problem === 'starting' ? 'stopped' : state.problem,
    props.workspace,
  )
  if (state.problem === 'starting') {
    return (
      <div className={styles.waiting}>
        <Spinner color={theme.colors.muted} size={13} />
        Waiting for the sandbox
      </div>
    )
  }
  return (
    <EmptyState
      action={
        phone && problem.action && resume ? (
          <ActionButton
            busy={resume.pending}
            onPress={() => resume.run()}
            tone="primary"
          >
            {problem.action}
          </ActionButton>
        ) : undefined
      }
      body={
        phone && state.problem === 'refused'
          ? state.reason
          : keptBody(state, problem.panelBody)
      }
      icon={problem.icon}
      title={problem.panelTitle ?? problem.title}
    />
  )
}
