import type { LucideIcon } from 'lucide-react'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { refusedIcon } from '../../../docs/mockups/src/components/orgs/suspension'
import type { SandboxNoticeState } from '../../../docs/mockups/src/components/workspace/sandboxNoticeState'

type ArchivedNotice = Extract<SandboxNoticeState, { problem: 'archived' }>

/** The words and the one way forward of a sandbox that does not run. */
export interface Problem {
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

/** The days that the bar of an archived workspace names. */
export interface ArchiveDays {
  archivedOn: string
  /**
   * The day 14 days after the Archive: the last day of Restore, and the day
   * when the workspace leaves the list, also without a kept cloud computer.
   */
  removedOn: string
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

/** The files and the tools of a cloud computer that the app deleted. */
const wentWith = 'The files and the tools went with the cloud computer.'

/**
 * How far an archived workspace is. In its 14 days: Restore until its last
 * day, no Restore in a suspended org, which promises no files, or no cloud
 * computer to bring back. After them it is removed: while a failed delete
 * of the cloud computer still tries again, or after the delete. Restore
 * ends with the 14 days, so a removed workspace has none.
 */
type ArchiveStage = 'available' | 'refused' | 'none' | 'deleting' | 'removed'

function stageOf(notice: ArchivedNotice): ArchiveStage {
  if (notice.restore === 'ended') return 'deleting'
  if (notice.removed === true) return 'removed'
  return notice.restore ?? 'none'
}

/** Whether an archived workspace left the list, as `stageOf` says. */
export function leftTheList(notice: SandboxNoticeState): boolean {
  if (notice.problem !== 'archived') return false
  const stage = stageOf(notice)
  return stage === 'deleting' || stage === 'removed'
}

/**
 * The words of an archived workspace, as the mockups give them. Until its
 * 14 days end, the title gives the day of the Archive, and the body the
 * day when the workspace leaves the list, also without Restore. After
 * them, the title gives the day of the removal, and the body says that the
 * workspace left the list, what happens to its cloud computer, and that
 * the chat is read-only. The words say "removed" for the workspace,
 * because the app keeps its data. Only the cloud computer is deleted.
 */
function archivedProblem(notice: ArchivedNotice, days: ArchiveDays): Problem {
  const { archivedOn, removedOn } = days
  const leaves = `It leaves the list on ${removedOn}.`
  const left = 'It left the list.'
  const listed = { icon: Archive, title: `Archived on ${archivedOn}` }
  const removed = { icon: Archive, title: `Removed on ${removedOn}` }
  const tone = 'neutral'
  switch (stageOf(notice)) {
    case 'available':
      return {
        ...listed,
        body: `Restore it until ${removedOn} to bring back its files and sessions. It leaves the list on that day.`,
        panelBody: 'The files and the tools come back with Restore.',
        action: 'Restore',
        tone,
      }
    case 'refused':
      return {
        ...listed,
        body: `${history} ${leaves}`,
        panelBody: history,
        tone,
      }
    case 'none':
      return {
        ...listed,
        body: `Its cloud computer is deleted, and the chat is read-only. ${leaves}`,
        panelBody: wentWith,
        tone,
      }
    case 'deleting':
      return {
        ...removed,
        body: `${left} Its cloud computer is being deleted, and the chat is read-only.`,
        panelBody: 'The files and the tools go with the cloud computer.',
        tone,
      }
    case 'removed':
      return {
        ...removed,
        body: `${left} Its cloud computer is deleted, and the chat is read-only.`,
        panelBody: wentWith,
        tone,
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
      return archivedProblem(notice, days)
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
      return body
  }
}
