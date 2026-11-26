import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { pendingCommand } from '../../entries/components/chat/PendingCommand.mockup'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import { instanceKey } from '../../instanceKey'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { DrawnChoices } from '../mac/CommandActions'
import { isPendingCommand } from './PendingCommand'
import { requestStackWords } from '../../../../../src/ui/components/chat/requestStackCopy'
import { RequestStackFrame } from '../../../../../src/ui/components/chat/RequestStackFrame'
import type { StackEntry } from '../../../../../src/ui/components/chat/requestStackOrder'
import { SecretRequest } from './SecretRequest'

/**
 * Previous or Next. It is off at the end of the stack. A view runs no
 * script, so it links to the page of the card that it shows, and a stack
 * without that page draws it as a plain button.
 */
function StepButton(props: {
  label: string
  icon: LucideIcon
  off: boolean
  to?: string
}) {
  const button = (
    <IconButton disabled={props.off} icon={props.icon} label={props.label} />
  )
  if (props.off || props.to === undefined) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}

/** The card of one entry of the stack, without its own outline. */
function StackCard(props: {
  entry: StackEntry<ChatItem>
  viewer: PersonKey
  choicesOpen: boolean
}) {
  const { item, hidden } = props.entry
  if (item.kind === 'secret-run') {
    return (
      <SecretRequest
        hides={hidden.length}
        inStack
        item={item}
        viewer={props.viewer}
      />
    )
  }
  if (!isPendingCommand(item)) return null
  return (
    <pendingCommand.Component
      id={item.id}
      inStack
      moklyInstance={`pending-${instanceKey(item.id)}`}
      open={props.choicesOpen}
      request={item.request}
    />
  )
}

/**
 * The open requests of a session, just above the composer, in the stack
 * of the shared UI, with the cards of the mockups. A view runs no script,
 * so `place` is the place of the card on top, from 1, and `pages` gives the
 * page of each place, which Previous and Next open. `choicesOpen` draws the
 * other ways to allow of a Mac command on top open: the stack draws them
 * outside the card, at its actions, so the card never cuts them.
 */
export function RequestStack(props: {
  entries: readonly StackEntry<ChatItem>[]
  place: number
  pages?: readonly string[]
  viewer: PersonKey
  choicesOpen?: boolean
}) {
  const { place, pages } = props
  const count = props.entries.length
  const entry = props.entries.at(place - 1)
  if (entry === undefined) return null
  const drawn = props.choicesOpen === true && isPendingCommand(entry.item)
  return (
    <RequestStackFrame
      after={drawn ? <DrawnChoices /> : null}
      count={count}
      next={
        <StepButton
          icon={ChevronRight}
          label={requestStackWords.next}
          off={place === count}
          to={pages?.[place]}
        />
      }
      place={place}
      previous={
        <StepButton
          icon={ChevronLeft}
          label={requestStackWords.previous}
          off={place === 1}
          to={pages?.[place - 2]}
        />
      }
    >
      <StackCard choicesOpen={drawn} entry={entry} viewer={props.viewer} />
    </RequestStackFrame>
  )
}
