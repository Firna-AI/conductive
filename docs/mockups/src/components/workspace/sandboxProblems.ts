import type { ArchiveDays } from '../../fixtures/archive'
import { iconKeyOf, type IconKey } from '../../entries/components/common/icons'
import { removedComputerArchiveWords } from '../own-computers/computerChoiceCopy'
import { refusedIcon } from '../orgs/suspension'
import type { BarNotice } from './SandboxNotice'
import {
  archiveStage,
  type SandboxNoticeState,
  type SandboxProblem,
} from './sandboxNoticeState'

type ArchivedNotice = Extract<SandboxNoticeState, { problem: 'archived' }>

/** The words, the icon, and the one way forward of a sandbox that is down. */
export type Problem = {
  icon: IconKey
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

/**
 * A failed first start leaves a new workspace with no files yet, so its
 * notice promises only the chat, with its queued messages.
 */
const chatSaved = 'Your chat is saved.'

const problems: Readonly<Record<Exclude<SandboxProblem, 'archived'>, Problem>> =
  {
    stopped: {
      icon: 'circle-pause',
      title: 'Sandbox stopped',
      body: saved,
      panelBody: saved,
      action: 'Resume',
      tone: 'neutral',
    },
    error: {
      icon: 'circle-alert',
      title: "The sandbox couldn't start",
      body: saved,
      panelBody: saved,
      action: 'Try again',
      tone: 'danger',
    },
    refused: {
      icon: iconKeyOf(refusedIcon),
      title: "The sandbox can't start",
      body: history,
      panelBody: history,
      tone: 'neutral',
    },
  }

/** The files and the tools of a cloud computer that the app deleted. */
const wentWith = 'The files and the tools went with the cloud computer.'

/** Whether an archived workspace left the list, as `archiveStage` says. */
export function leftTheList(notice: ArchivedNotice): boolean {
  const stage = archiveStage(notice)
  return stage === 'deleting' || stage === 'removed'
}

/**
 * The words of an archived workspace whose own computer an admin removed.
 * The app deletes no file there, so the words say that the files stay on
 * that server, and they give no day of a delete. Nothing offers Restore.
 */
function removedComputerProblem(
  notice: ArchivedNotice & { days: ArchiveDays },
  name: string,
): Problem {
  const { archivedOn, removedOn } = notice.days
  const words = removedComputerArchiveWords
  const left = leftTheList(notice)
  return {
    icon: 'archive',
    title: left ? `Removed on ${removedOn}` : `Archived on ${archivedOn}`,
    body: left ? words.removed(name) : words.archived(name, removedOn),
    panelBody: words.panel(name),
    tone: 'neutral',
  }
}

/**
 * The words of an archived workspace, for its stage. Until its 14 days end,
 * the title gives the day of the Archive, and the body the day when the
 * workspace leaves the list, also without Restore. A cloud computer that
 * can still exist without Restore gets the words of a refused start, which
 * promise only the chat history. After the 14 days, the title gives the day
 * of the removal, and the body says that the workspace left the list, what
 * happens to its cloud computer, and that the chat is read-only. The words
 * say "removed" for the workspace, because the app keeps its data.
 */
function archivedProblem(
  notice: ArchivedNotice & { days: ArchiveDays },
): Problem {
  if (notice.removedComputer !== undefined) {
    return removedComputerProblem(notice, notice.removedComputer)
  }
  const { archivedOn, removedOn } = notice.days
  const leaves = `It leaves the list on ${removedOn}.`
  const left = 'It left the list.'
  const icon: IconKey = 'archive'
  const listed = { icon, title: `Archived on ${archivedOn}` }
  const removed = { icon, title: `Removed on ${removedOn}` }
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

/** The words and the action of a sandbox that is not running. */
export function problemOf(state: BarNotice): Problem {
  if (state.problem !== 'archived') return problems[state.problem]
  return archivedProblem(state)
}

/** What stays of the workspace: a failed first start keeps only its chat. */
export function keptBody(state: SandboxNoticeState, body: string): string {
  return state.problem === 'error' && state.firstStart ? chatSaved : body
}

/**
 * The text of the bar: the refusal, or the saved message before the body.
 * A failed start and a stop can carry a saved message.
 */
export function barBody(state: SandboxNoticeState, body: string): string {
  switch (state.problem) {
    case 'refused':
      return state.reason
    case 'error':
    case 'stopped':
      return state.message ? `${state.message} ${body}` : body
    case 'archived':
      return body
  }
}
