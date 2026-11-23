import { nameLabel } from '../../../../src/shared/name-label'
import {
  checkoutAutocomplete,
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

/** A notice of the phone app: its workspace, its kind, and its age. */
export type PhoneNotice = {
  kind: NoticeKind
  /** The title of the notice: the name of the workspace, or Untitled. */
  title: string
  /** The age of the notice, as the lock screen shows it. */
  time: string
}

function listed(key: string): Workspace {
  const found = workspaceList.find((item) => item.key === key)
  if (found === undefined) throw new Error(`No workspace ${key} in the list`)
  return found
}

function notice(kind: NoticeKind, workspace: Workspace, time: string) {
  return { kind, title: nameLabel(workspace.name), time }
}

/**
 * One notice for each kind of event, newest first, each from another
 * workspace of Acme. Cal sent the turn of each one. The secret request of
 * Checkout address autocomplete is the one that the phone can answer.
 */
export const lockScreenNotices: readonly PhoneNotice[] = [
  notice('secret', checkoutAutocomplete, 'now'),
  notice('approval', listed('fix-cart-flake'), '4m ago'),
  notice('question', savedCarts, '12m ago'),
  notice('finished', webhookRetries, '26m ago'),
  notice('failed', listed('apple-pay'), '1h ago'),
]

/** The time and the date that the lock screen shows. */
export const lockScreenTime = { time: '10:24', date: 'Tuesday 24 November' }
