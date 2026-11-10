import type { LucideIcon } from 'lucide-react'
import { Archive, CircleAlert, CirclePause, Power } from 'lucide-react'
import { refusedIcon } from '../../../docs/mockups/src/components/orgs/suspension'
import type {
  ArchiveRestore,
  SandboxNoticeState,
} from '../../../docs/mockups/src/components/workspace/sandboxNoticeState'

/** The words and the one way forward of a sandbox that does not run. */
export interface Problem {
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

/** The days that the bar of an archived workspace names. */
export interface ArchiveDays {
  archivedOn: string
  /** The last day of Restore, or empty without a kept cloud computer. */
  restoreUntil: string
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
export function keptBody(notice: SandboxNoticeState, body: string): string {
  return notice.problem === 'error' && notice.firstStart ? chatSaved : body
}

/**
 * An archived workspace: Restore until its last day, no Restore in a
 * suspended org, which promises no files, the day when Restore ended while
 * a failed delete can still try again, or a cloud computer that the app
 * deleted.
 */
function archivedProblem(
  restore: ArchiveRestore | undefined,
  days: ArchiveDays,
): Problem {
  const title = `Archived on ${days.archivedOn}`
  const icon = Archive
  switch (restore) {
    case 'available':
      return {
        icon,
        title,
        body: `Restore it until ${days.restoreUntil} to bring back its files and sessions.`,
        panelTitle: 'Archived',
        panelBody: 'The files and the tools come back with Restore.',
        action: 'Restore',
        tone: 'neutral',
      }
    case 'refused':
      return {
        icon,
        title,
        body: history,
        panelTitle: 'Archived',
        panelBody: history,
        tone: 'neutral',
      }
    case 'ended':
      return {
        icon,
        title,
        body: `Restore ended on ${days.restoreUntil}, and the chat is read-only.`,
        panelTitle: 'Archived',
        panelBody: history,
        tone: 'neutral',
      }
    case undefined:
      return {
        icon,
        title,
        body: 'Its cloud computer is deleted, and the chat is read-only.',
        panelTitle: 'Archived',
        panelBody: 'The files and the tools went with the cloud computer.',
        tone: 'neutral',
      }
  }
}

export function problemOf(
  notice: SandboxNoticeState,
  days: ArchiveDays,
): Problem {
  switch (notice.problem) {
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
      return archivedProblem(notice.restore, days)
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

/** The text of the bar: the refusal, or the saved message before the body. */
export function barBody(notice: SandboxNoticeState, body: string): string {
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
