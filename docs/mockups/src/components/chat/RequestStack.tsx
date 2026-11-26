import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { pendingCommand } from '../../entries/components/chat/PendingCommand.mockup'
import type { PersonKey } from '../../fixtures/members'
import { instanceKey } from '../../instanceKey'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { DrawnChoices } from '../mac/CommandActions'
import { isPendingCommand } from './PendingCommand'
import { requestStackWords, stackPlace } from './requestStackCopy'
import type { StackEntry } from './requests'
import { SecretRequest } from './SecretRequest'
import { secretRunWords } from '../../../../../src/ui/components/chat/secretRunCopy'
import styles from './RequestStack.module.css'

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

/**
 * The place of the card on top, such as "1 of 3", then Previous and Next.
 * The place is a polite live region, so a screen reader hears the new
 * place after a press.
 */
function StackSteps(props: {
  place: number
  count: number
  pages?: readonly string[]
}) {
  const { place, count, pages } = props
  return (
    <div className={styles.steps}>
      <span aria-atomic aria-live="polite" className={styles.place}>
        {stackPlace(place, count)}
      </span>
      <StepButton
        icon={ChevronLeft}
        label={requestStackWords.previous}
        off={place === 1}
        to={pages?.[place - 2]}
      />
      <StepButton
        icon={ChevronRight}
        label={requestStackWords.next}
        off={place === count}
        to={pages?.[place]}
      />
    </div>
  )
}

/** The card of one entry of the stack, without its own outline. */
function StackCard(props: {
  entry: StackEntry
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
 * The open requests of a session, just above the composer, as a stack. One
 * card shows at a time, and the edges of at most two cards show behind it.
 * The stack keeps at most 40% of the window, so a long command scrolls
 * inside its card, and the outline of the card and the steps stay in view.
 * With more than one card, the place of the card on top, Previous, and
 * Next move through the stack. One card shows no steps and no edges.
 * `place` is the place of the card on top, from 1, and `pages` gives the
 * page of each place. `choicesOpen` draws the other ways to allow of a
 * Mac command on top open: the stack draws them outside the card, at its
 * actions, so the card never cuts them.
 */
export function RequestStack(props: {
  entries: readonly StackEntry[]
  place: number
  pages?: readonly string[]
  viewer: PersonKey
  choicesOpen?: boolean
}) {
  const count = props.entries.length
  const entry = props.entries.at(props.place - 1)
  if (entry === undefined) return null
  const behind = Math.min(count - 1, 2)
  const drawn = props.choicesOpen === true && isPendingCommand(entry.item)
  return (
    <div
      aria-label={secretRunWords.region}
      className={styles.stack}
      role="group"
    >
      {count > 1 ? (
        <StackSteps count={count} pages={props.pages} place={props.place} />
      ) : null}
      <div
        className={classes(
          styles.deck,
          behind === 1 && styles.oneBehind,
          behind === 2 && styles.twoBehind,
        )}
      >
        {behind === 2 ? <span aria-hidden className={styles.far} /> : null}
        {behind > 0 ? <span aria-hidden className={styles.near} /> : null}
        <div className={styles.card}>
          <div className={styles.scroll}>
            <StackCard
              choicesOpen={drawn}
              entry={entry}
              viewer={props.viewer}
            />
          </div>
        </div>
      </div>
      {drawn ? <DrawnChoices /> : null}
    </div>
  )
}
