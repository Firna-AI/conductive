import type { Workspace } from '../../shared/generated/Workspace'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { EmptyState } from '../../ui/components/common/EmptyState'
import { Notice } from '../../ui/components/common/Notice'
import { orgSuspendedReason } from '../../ui/components/orgs/suspension'
import styles from '../../ui/components/workspace/SandboxNotice.module.css'
import type {
  SandboxNoticeState,
  SandboxPanelState,
} from '../../ui/components/workspace/sandboxNoticeState'
import type { ApiError } from '../../app/api/client'
import { useServices } from '../../app/services'
import { formatDay } from '../../app/time'
import { WORKSPACE_RESTORE_MS } from '../../shared/workspaces'
import { ActionButton } from '../ui/actions'
import type { Action } from '../ui/useAction'
import { archiveEnd } from './archive-ends'
import {
  barBody,
  keptBody,
  leftTheList,
  problemOf,
  type Problem,
} from './notice-copy'

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

/**
 * The words of a notice. An archived workspace names the day of its
 * Archive and the end of its 14 days, as `archiveEnd` says, when its
 * Restore ends and it leaves the list. That day does not depend on a kept
 * cloud computer. A record without either time counts from `updatedAt`.
 */
function useProblem(notice: SandboxNoticeState, workspace: Workspace) {
  const { timeZone } = useServices()
  const archivedAt = workspace.archivedAt ?? workspace.updatedAt
  const end = archiveEnd(workspace) ?? archivedAt + WORKSPACE_RESTORE_MS
  return problemOf(notice, {
    archivedOn: formatDay(archivedAt, timeZone),
    removedOn: formatDay(end, timeZone),
  })
}

/**
 * The bar of a refused start, with the words of its cause and no action.
 * New workspace shows it too, before a workspace exists.
 */
export function RefusedBar(props: { reason: string }) {
  const problem = problemOf(
    { problem: 'refused', reason: props.reason },
    { archivedOn: '', removedOn: '' },
  )
  return (
    <Notice
      body={props.reason}
      icon={problem.icon}
      title={problem.title}
      tone={problem.tone}
    />
  )
}

/** The one way forward of a bar: Resume, Try again, or Restore. */
export interface BarAction {
  run: () => void
  pending: boolean
}

/**
 * The bar under the chat while the sandbox is down. It takes the place of
 * the composer, except after a failed first start, whose composer stays
 * under it. A refused start shows the words of the refusal, and no action,
 * because the start stays refused until its cause changes. A start that
 * failed shows the message that the workspace saved for it, such as its
 * time limit, before the body. An archived workspace offers Restore until
 * its last day, and gives the day when it leaves the list. A removed
 * workspace gives the day of its removal.
 */
export function SandboxBar(props: {
  notice: SandboxNoticeState
  workspace: Workspace
  resume: Action<[]>
  /** Restore of an archived workspace, while it offers one. */
  restore: BarAction | null
}) {
  const { notice } = props
  const problem = useProblem(notice, props.workspace)
  const forward: BarAction | null =
    notice.problem === 'archived'
      ? props.restore
      : { run: () => props.resume.run(), pending: props.resume.pending }
  return (
    <Notice
      action={
        problem.action && forward ? (
          <ActionButton
            busy={forward.pending}
            onPress={forward.run}
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
 * shows the bar only on the Chat tab, so its panels show them too. The
 * panel of an archived workspace has the title Archived, or Removed after
 * the workspace left the list.
 */
export function SandboxPanel(props: {
  state: SandboxPanelState
  workspace: Workspace
  /**
   * Resume, or Try again, which a phone shows. Null where the panel shows
   * only a start or a refusal, which have no action.
   */
  resume: Action<[]> | null
  phone: boolean
}) {
  const theme = useSharedUiTheme()
  const { state, resume, phone } = props
  const problem = useProblem(
    state.problem === 'starting' ? { problem: 'stopped' } : state,
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
        phone && problem.action && resume && state.problem !== 'archived' ? (
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
      title={panelTitle(state, problem)}
    />
  )
}

/** The title of a panel: the state of an archived workspace, in one word. */
function panelTitle(state: SandboxNoticeState, problem: Problem): string {
  if (state.problem !== 'archived') return problem.title
  return leftTheList(state) ? 'Removed' : 'Archived'
}
