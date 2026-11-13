import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { AllowButton } from '../components/chat/RequestActions'
import { asksValue } from '../components/chat/requests'
import { secretRunWords } from '../components/chat/secretRunCopy'
import { ValueAnswer } from '../components/chat/ValueAnswer'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { conversations } from '../fixtures/conversations'
import { orgs } from '../fixtures/orgs'
import type { WorkspaceState } from './workspaceState'

/**
 * The sheet that Give a value opens on a phone, for the open request of
 * the chat that asks for a value (item 4 C of the mockups): a field for
 * each name that the org does not have, the choice of how long the values
 * last, and Allow. Deny stays on the card. A computer shows the same parts
 * in the card, so it draws no sheet.
 */
export function valueSheet(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  if (viewport !== 'mobile') return null
  const item = conversations[state.conversation].find(
    (entry) =>
      entry.kind === 'secret-run' &&
      (entry.state === 'waiting' || entry.state === 'late') &&
      asksValue(entry),
  )
  if (item?.kind !== 'secret-run') return null
  return (
    <ConfirmDialog
      actions={<AllowButton item={item} label={secretRunWords.allow} />}
      title={secretRunWords.giveValue}
      viewport={viewport}
    >
      <ValueAnswer item={item} labelled org={orgs.acme.name} sheet />
    </ConfirmDialog>
  )
}
