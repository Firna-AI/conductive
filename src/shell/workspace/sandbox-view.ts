import type { ArchivedComputerState } from '../../shared/generated/ArchivedComputerState'
import type { Workspace } from '../../shared/generated/Workspace'
import {
  replacesComposer,
  type ArchiveRestore,
  type SandboxNoticeState,
  type SandboxPanelState,
} from '../../ui/components/workspace/sandboxNoticeState'
import type { ApiError } from '../../app/api/client'

import type { SandboxState, WorkspaceContext } from './features'
import { orgRefusal, refusedStart } from './SandboxNotice'

/** What the screen shows of the sandbox of an open workspace. */
export interface SandboxView {
  /** A refused start: the org is suspended, or the owner of the workspace. */
  refusal: SandboxNoticeState | null
  /**
   * The bar in place of the composer, or null for the composer. The open of
   * the workspace resumes a stopped sandbox, and one whose later start
   * failed, so their bar waits until that open ends.
   */
  bar: SandboxNoticeState | null
  /**
   * What the files and the tools show in place of their content, if
   * anything: the notice of the bar, also a refusal with its words, or the
   * wait of a start.
   */
  panel: SandboxPanelState | null
  /**
   * The open of the workspace resumes its sandbox and has not ended, so the
   * header shows Starting, the composer takes the place of the bar, and the
   * tools wait for the start, as `contentState` says.
   */
  resumingAtOpen: boolean
  /** The notice of a suspended org shows above the bar of an archived workspace. */
  orgNotice: boolean
}

/**
 * What a part shows in place of its content: the wait of a start while the
 * open resumes the sandbox, so that no Resume shows then, or else the panel.
 */
export function contentState(
  panel: SandboxPanelState | null,
  resumingAtOpen: boolean,
): SandboxPanelState | null {
  return resumingAtOpen ? { problem: 'starting' } : panel
}

/**
 * Whether the bar of the sandbox takes the place of the composer now, as a
 * part reads it from its context. The bar of `sandboxView` is the notice of
 * the panel, unless the open of the workspace resumes the sandbox, and the
 * wait of a start is no bar. After a failed first start the composer stays
 * under the bar, as `replacesComposer` says.
 */
export function barReplacesComposer(
  context: Pick<WorkspaceContext, 'panel' | 'resumingAtOpen'>,
): boolean {
  const { panel } = context
  if (context.resumingAtOpen || panel === null) return false
  return panel.problem !== 'starting' && replacesComposer(panel)
}

/**
 * What the bar of an archived workspace offers: Restore until its last day,
 * to every member of an org that is not suspended, or no Restore in a
 * suspended org. After its last day, while a failed delete of the cloud
 * computer can still try again, the bar says that the cloud computer is
 * being deleted, and claims no delete. Without a kept cloud computer,
 * nothing comes back. `ended` says that the clock of the page reached
 * `restoreUntil`.
 */
export function archivedRestore(
  workspace: Workspace,
  suspended: boolean,
  ended: boolean,
): ArchiveRestore | undefined {
  if (workspace.state !== 'archived' || workspace.restoreUntil === null) {
    return undefined
  }
  if (ended) return 'ended'
  return suspended ? 'refused' : 'available'
}

/**
 * The view of the sandbox. A suspended org refuses each start and each new
 * access to the sandbox, also while the stop of its cloud computer runs.
 * Another refused start shows while the sandbox is down, until its cause
 * ends. An archived workspace keeps its bar in a suspended org too. A
 * failed start carries the message that the workspace saved for it. A
 * failed first start marks its bar, which keeps the composer under it, and
 * its panels, which show it in place of the lists. Until the open of the
 * visit ends, the composer shows in place of the bar of a sandbox that the
 * open resumes, and the header shows Starting. The panel keeps its notice
 * meanwhile, so the lists keep their saved copy.
 */
export function sandboxView(input: {
  sandbox: SandboxState
  suspended: boolean
  startError: ApiError | null
  /** The message that the workspace saved for a start that failed. */
  savedError: string | null
  /** The first start of the new workspace failed, as `failedFirstStart` says. */
  firstStart: boolean
  /** What an archived workspace offers, as `archivedRestore` says. */
  restore?: ArchiveRestore
  /**
   * What the app knows of the cloud computer of an archived workspace,
   * apart from Restore, as `archiveStage` reads it. A record of an older
   * Worker has none. Without it, and with `unknown`, the notice keeps the
   * words that it gave from Restore alone, until
   * `plans/follow-ups/archived-computer-unknown-outcome.md` settles them.
   */
  computer?: ArchivedComputerState
  /**
   * The archived workspace left the list: the clock of the page reached
   * the end of its 14 days, as `archiveEnd` says, also without a kept cloud
   * computer.
   */
  removed?: boolean
  /** The open of this visit ended, as `WorkspaceModel.opened` says. */
  opened: boolean
}): SandboxView {
  const { sandbox, suspended } = input
  const refusal =
    suspended && sandbox !== 'archived'
      ? orgRefusal
      : sandbox === 'stopped' || sandbox === 'error'
        ? refusedStart(input.startError)
        : null
  const notice: SandboxNoticeState | null =
    refusal ??
    (sandbox === 'error'
      ? {
          problem: 'error',
          message: input.savedError,
          firstStart: input.firstStart,
        }
      : sandbox === 'ready' || sandbox === 'starting'
        ? null
        : sandbox === 'archived'
          ? {
              problem: 'archived',
              restore: input.restore,
              removed: input.removed,
              computer: input.computer,
            }
          : { problem: sandbox })
  // The cases of `resumesAtOpen`: a stopped sandbox, and a later start that
  // failed. A refusal starts nothing, so it shows at once.
  const resumingAtOpen =
    !input.opened &&
    refusal === null &&
    (sandbox === 'stopped' || (sandbox === 'error' && !input.firstStart))
  return {
    refusal,
    bar: resumingAtOpen ? null : notice,
    resumingAtOpen,
    panel: notice ?? (sandbox === 'starting' ? { problem: 'starting' } : null),
    orgNotice: suspended && sandbox === 'archived',
  }
}
