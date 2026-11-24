import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { deletionSection } from '../entries/components/settings/AccountSections.mockup'
import { accountDeletionDialog } from '../entries/components/settings/AccountDeletionDialog.mockup'
import type { DeletionQuestion } from '../components/settings/AccountDeletionDialog'
import { accountRequest } from '../fixtures/deletionRequests'
import type { DeletionPages } from '../deletionPaths'
import { defined } from '../defined'
import type { AccountView } from './accountState'

/**
 * The request of an account deletion at the end of General. Every account
 * has it: the section with its button, or the day of the request after it.
 * The button opens the question only when the page supplies `pages`.
 */
export function GeneralDeletion(props: {
  state: AccountView['deletion']
  pages?: DeletionPages
}) {
  return (
    <deletionSection.Component
      moklyInstance="deletion"
      {...defined({
        requested: props.state === 'requested' ? accountRequest.day : undefined,
        requestTo: props.pages?.question,
      })}
    />
  )
}

/** The state of the question that each state of the request draws, if any. */
function questionOf(state: AccountView['deletion']): DeletionQuestion | null {
  switch (state) {
    case 'confirm':
      return 'ask'
    case 'sending':
    case 'failed':
      return state
    default:
      return null
  }
}

/**
 * The question before the request, over General: a dialog on desktop, and
 * a sheet on a phone. Its actions open the pages that the page supplies.
 */
export function deletionDialog(
  state: AccountView,
  viewport: Viewport,
  pages?: DeletionPages,
): ReactNode {
  const question = state.tab === 'general' ? questionOf(state.deletion) : null
  if (question === null) return undefined
  return (
    <accountDeletionDialog.Component
      moklyInstance="account-deletion-dialog"
      state={question}
      viewport={viewport}
      {...defined({ cancelTo: pages?.cancel, requestedTo: pages?.requested })}
    />
  )
}
