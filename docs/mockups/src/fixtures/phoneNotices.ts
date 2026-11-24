import { nameLabel } from '../../../../src/shared/name-label'
import {
  savedCarts,
  webhookRetries,
  workspaceList,
  type Workspace,
} from './workspaces'

/**
 * The kinds of event that send a notice to a phone: work that waits for a
 * person, and the end of a turn that the member started.
 */
export type NoticeKind =
  'approval' | 'secret' | 'question' | 'finished' | 'failed'

/** A notice of the phone app: its kind, its title, its age, and its page. */
export type PhoneNotice = {
  kind: NoticeKind
  /** The title of the notice: the name of the workspace, or Untitled. */
  title: string
  /** The age of the notice, as the lock screen shows it. */
  time: string
  /** The page of the catalogue that a press opens, where one exists. */
  to?: string
}

/** The title and the page of a notice that opens the page of its work. */
export type NoticePage = { title: string; to: string }

function listed(key: string): Workspace {
  const found = workspaceList.find((item) => item.key === key)
  if (found === undefined) throw new Error(`No workspace ${key} in the list`)
  return found
}

function notice(kind: NoticeKind, workspace: Workspace, time: string) {
  return { kind, title: nameLabel(workspace.name), time }
}

/**
 * One notice for each kind of event, newest first. Cal sent the turn of
 * each one. The secret request and the command that wait open the pages
 * of the catalogue that show them, and `waiting` gives the title and the
 * page of each. Both pages show Checkout address autocomplete, so two
 * notices name it, and the phone can answer only the secret request. The
 * other notices have no page, and each names another workspace of Acme.
 */
export function lockScreenNotices(
  waiting: Readonly<Record<'secret' | 'approval', NoticePage>>,
): readonly PhoneNotice[] {
  return [
    { kind: 'secret', time: 'now', ...waiting.secret },
    { kind: 'approval', time: '4m ago', ...waiting.approval },
    notice('question', savedCarts, '12m ago'),
    notice('finished', webhookRetries, '26m ago'),
    notice('failed', listed('apple-pay'), '1h ago'),
  ]
}

/** The time and the date that the lock screen shows. */
export const lockScreenTime = { time: '10:24', date: 'Tuesday 24 November' }
