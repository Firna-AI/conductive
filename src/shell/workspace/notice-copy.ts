import type { LucideIcon } from 'lucide-react'
import { Archive, CircleAlert, CirclePause } from 'lucide-react'
import { refusedIcon } from '../../ui/components/orgs/suspension'
import {
  archiveStage,
  type SandboxNoticeState,
} from '../../ui/components/workspace/sandboxNoticeState'

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

/** Whether an archived workspace left the list, as `archiveStage` says. */
export function leftTheList(notice: SandboxNoticeState): boolean {
  if (notice.problem !== 'archived') return false
  const stage = archiveStage(notice)
  return stage === 'deleting' || stage === 'removed'
}

/**
 * The words of an archived workspace, as the mockups give them for each
 * stage of `archiveStage`. Until its 14 days end, the title gives the day
 * of the Archive, and the body the day when the workspace leaves the list,
 * also without Restore. A cloud computer that can still exist without
 * Restore gets the words of a refused start, which promise only the chat
 * history. After the 14 days, the title gives the day of the removal, and
 * the body says that the workspace left the list, what happens to its
 * cloud computer, and that the chat is read-only. The words say "removed"
 * for the workspace, because the app keeps its data. Only the cloud
 * computer is deleted.
 */
function archivedProblem(notice: ArchivedNotice, days: ArchiveDays): Problem {
  const { archivedOn, removedOn } = days
  const leaves = `It leaves the list on ${removedOn}.`
  const left = 'It left the list.'
  const listed = { icon: Archive, title: `Archived on ${archivedOn}` }
  const removed = { icon: Archive, title: `Removed on ${removedOn}` }
  const tone = 'neutral'
  switch (archiveStage(notice)) {
    case 'available':
      return {
        ...listed,
        body: `Restore it until ${removedOn} to bring back its files and sessions. It leaves the list on that day.`,
        panelBody: 'The files and the tools come back with Restore.',
        action: 'Restore',
        tone,
      }
    case 'history':
      return {
        ...listed,
        body: `${history} ${leaves}`,
        panelBody: history,
        tone,
      }
    case 'deleted':
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
