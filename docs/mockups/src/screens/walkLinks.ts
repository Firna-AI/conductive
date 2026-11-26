import type { StackView } from '../components/chat/ChatPane'
import type { AnswerLinks } from '../components/chat/RequestActions'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { isPendingRequest, stackReader } from '../components/chat/requests'
import { conversations } from '../fixtures/conversations'
import { stackEntries } from '../../../../src/ui/components/chat/requestStackOrder'
import { stackWalks } from './stackWalks'
import { tabWalks } from './tabWalks'
import {
  placePath,
  statePath,
  walkStateOf,
  type Walk,
  type WalkAnswer,
  type WalkState,
  type WalkView,
} from './walks'
import type { WorkspaceState } from './workspaceState'

/** Every walk of the catalogue. */
const walks: readonly Walk[] = [...stackWalks, ...tabWalks]

/**
 * The number of cards of the stack of a state in a view, from the open
 * requests of its chat, in the order of the shared stack. A state with no
 * card still has one page, the screen of its empty stack.
 */
export function placeCount(walkState: WalkState<string>, view: WalkView) {
  const chat = walkState.props.conversation
  if (chat === undefined) return 1
  const requests = conversations[chat].filter(isPendingRequest)
  const cards = stackEntries(requests, stackReader(view === 'mac'))
  return Math.max(cards.length, 1)
}

/** The page of each place of the stack of a state, from 1. */
function placePaths(walkState: WalkState<string>, view: WalkView) {
  const count = placeCount(walkState, view)
  return Array.from({ length: count }, (_, index) =>
    placePath(walkState, index + 1, count),
  )
}

/** The pages that the answers of one card open, by the states of the walk. */
function answerPages(walk: Walk, answer: WalkAnswer<string>) {
  const page = (key: string | undefined) =>
    key === undefined ? undefined : statePath(walk.states[key])
  return {
    request: answer.request,
    allow: page(answer.allow),
    deny: page(answer.deny),
    value: page(answer.value),
  }
}

/**
 * The stack of the chat of a screen in a view: the place of the card on
 * top, and, in a walk, the page of each place, which Previous and Next
 * open, and the page that each answer of a card opens.
 */
export function stackViewOf(
  state: WorkspaceState,
  view: WalkView,
): StackView | undefined {
  const found = walkStateOf(walks, state, view)
  if (found === undefined) {
    return state.shownRequest > 1 ? { place: state.shownRequest } : undefined
  }
  const { walk, walkState } = found
  return {
    place: state.shownRequest,
    pages: placePaths(walkState, view),
    answers: walkState.answers?.map((answer) => answerPages(walk, answer)),
  }
}

/**
 * The pages that the answers of one request open in a walk, or nothing
 * when the screen is in no walk that names answers, so that the card keeps
 * its own links. A request that the walk does not name opens nothing.
 */
export function answerLinksOf(
  state: WorkspaceState,
  view: WalkView,
  request: string,
): AnswerLinks | undefined {
  const answers = stackViewOf(state, view)?.answers
  if (answers === undefined) return undefined
  const links = answers.find((answer) => answer.request === request)
  return { allow: links?.allow, deny: links?.deny, value: links?.value }
}

/**
 * The tabs of a screen with the pages that they open. In a walk that names
 * tabs, each tab opens the state that the walk names, so the open requests
 * stay, and each other tab draws no link. Outside such a walk, while a
 * session tab shows the needs-input mark, no tab links: its page would
 * drop the open request.
 */
export function tabLinks(
  state: WorkspaceState,
  view: WalkView,
  tabs: readonly WorkspaceTab[],
): WorkspaceTab[] {
  const found = walkStateOf(tabWalks, state, view)
  const named = found?.walk.tabs
  if (found && named) {
    const { walk } = found
    return tabs.map((tab) => {
      const key = named[tab.key]
      const to = key === undefined ? undefined : statePath(walk.states[key])
      return { ...tab, to }
    })
  }
  if (!tabs.some((tab) => tab.needsInput)) return [...tabs]
  return tabs.map((tab) => ({ ...tab, to: undefined }))
}
