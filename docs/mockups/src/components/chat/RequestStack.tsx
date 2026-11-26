import { pendingCommand } from '../../entries/components/chat/PendingCommand.mockup'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import { instanceKey } from '../../instanceKey'
import { iconButton } from '../../entries/components/common/actions.mockup'
import type { IconKey } from '../../entries/components/common/icons'
import { Linked, StillLinks } from '../common/ScreenLink'
import { DrawnChoices } from '../mac/CommandActions'
import { isPendingCommand } from './PendingCommand'
import type { AnswerLinks } from './RequestActions'
import { requestStackWords } from '../../../../../src/ui/components/chat/requestStackCopy'
import { RequestStackFrame } from '../../../../../src/ui/components/chat/RequestStackFrame'
import type { StackEntry } from '../../../../../src/ui/components/chat/requestStackOrder'
import { SecretRequest } from './SecretRequest'

/** The pages that the answers of the card of one request open in a walk. */
export type StackAnswer = AnswerLinks & {
  /** The ID of the chat item of the request that the card shows. */
  request: string
}

/**
 * Previous or Next, as the registered Icon button. It is off at the end of
 * the stack. A view runs no script, so it links to the page of the card
 * that it shows, which the walk of the stack gives.
 */
function StepButton(props: {
  label: string
  icon: IconKey
  instance: string
  off: boolean
  to?: string
}) {
  return (
    <Linked to={props.off ? undefined : props.to}>
      <iconButton.Component
        disabled={props.off}
        icon={props.icon}
        label={props.label}
        moklyInstance={props.instance}
      />
    </Linked>
  )
}

/**
 * The pages of the answers of a card: the pages that the walk gives for
 * its request, or none, so that each answer draws no link. Outside a walk,
 * the card keeps its own links.
 */
function linksOf(
  answers: readonly StackAnswer[] | undefined,
  request: string,
): AnswerLinks | undefined {
  if (answers === undefined) return undefined
  return answers.find((answer) => answer.request === request) ?? {}
}

/**
 * The card of one entry of the stack, without its own outline. In a walk
 * that names the answers of its stack, a command keeps no link, because a
 * walk never names a page for an answer of a command.
 */
function StackCard(props: {
  entry: StackEntry<ChatItem>
  viewer: PersonKey
  choicesOpen: boolean
  answers?: readonly StackAnswer[]
}) {
  const { item, hidden } = props.entry
  if (item.kind === 'secret-run') {
    return (
      <SecretRequest
        hides={hidden.length}
        inStack
        item={item}
        links={linksOf(props.answers, item.id)}
        viewer={props.viewer}
      />
    )
  }
  if (!isPendingCommand(item)) return null
  const card = (
    <pendingCommand.Component
      id={item.id}
      inStack
      moklyInstance={`pending-${instanceKey(item.id)}`}
      open={props.choicesOpen}
      request={item.request}
    />
  )
  return props.answers === undefined ? card : <StillLinks>{card}</StillLinks>
}

/**
 * The open requests of a session, just above the composer, in the stack
 * of the shared UI, with the cards of the mockups. A view runs no script,
 * so `place` is the place of the card on top, from 1, and `pages` gives the
 * page of each place, which Previous and Next open. In a walk, `answers`
 * gives the page of each answer that keeps the example, and each other
 * answer draws no link. `choicesOpen` draws the other ways to allow of a
 * Mac command on top open: the stack draws them outside the card, at its
 * actions, so the card never cuts them.
 */
export function RequestStack(props: {
  entries: readonly StackEntry<ChatItem>[]
  place: number
  pages?: readonly string[]
  answers?: readonly StackAnswer[]
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
          icon="chevron-right"
          instance="request-stack-next"
          label={requestStackWords.next}
          off={place === count}
          to={pages?.[place]}
        />
      }
      place={place}
      previous={
        <StepButton
          icon="chevron-left"
          instance="request-stack-previous"
          label={requestStackWords.previous}
          off={place === 1}
          to={pages?.[place - 2]}
        />
      }
    >
      <StackCard
        answers={props.answers}
        choicesOpen={drawn}
        entry={entry}
        viewer={props.viewer}
      />
    </RequestStackFrame>
  )
}
