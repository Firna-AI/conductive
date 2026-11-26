import type { ReactNode } from 'react'
import type { ChipOpener } from '../../../../../../src/ui/components/chat/WorkspaceChip'
import { ScreenLink } from '../../../components/common/ScreenLink'

/** The screen that a press on a chip opens, when the mockups draw it. */
export const chipToSchema = { type: 'string', minLength: 1 } as const

/**
 * The element that opens the page of a chip: a link to the screen `to`. A
 * callback is not data, so a registered chip takes the screen, and its
 * adapter builds the link. A chip without a screen opens nothing.
 */
export function openerTo(
  to: string | undefined,
): ((chip: ChipOpener) => ReactNode) | undefined {
  if (to === undefined) return undefined
  return (chip) => <ScreenLink {...chip} to={to} />
}
