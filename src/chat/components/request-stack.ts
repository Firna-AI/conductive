import type { ReactNode } from 'react'
import {
  stackEntries,
  type StackReader,
} from '../../ui/components/chat/requestStackOrder'

/**
 * An open request of the shown session, as the stack above the composer
 * takes it: a Mac command whose call waits, or a secret request whose call
 * waits or that is late.
 */
export interface WaitingItem {
  /** The ID of the request. */
  id: string
  /** Names the request in the stack, such as `secret:<id>`. */
  key: string
  createdAt: number
  /**
   * Orders the requests that were made at the same time, such as the first
   * event number of a secret request.
   */
  order: number
  /** The tool call of the request waits for the answer. A late one has none. */
  callWaits: boolean
  /**
   * The set of secrets of a secret request, from `secretSetKey`, or null
   * for a Mac command, which never hides another request.
   */
  secrets: string | null
  /** This view can answer the request. */
  answerable: boolean
  /**
   * The card of the request on top of the stack, in its stacked form.
   * `hidden` holds the older open requests for the same set of secrets
   * that the card hides.
   */
  card: (hidden: readonly WaitingItem[]) => ReactNode
}

/** One card of the stack, with a key that stays while the card stays. */
export interface StackCard {
  key: string
  item: WaitingItem
  hidden: readonly WaitingItem[]
}

const reader: StackReader<WaitingItem> = {
  secrets: (item) => item.secrets,
  callWaits: (item) => item.callWaits,
  answers: (item) => item.answerable,
}

/**
 * The cards of the stack in their order, as `stackEntries` says. A card of
 * secrets keeps its key while a newer request for the same secrets joins
 * it, so it stays the same card. A Mac command card takes the key of its
 * request.
 */
export function stackCards(items: readonly WaitingItem[]): StackCard[] {
  const oldest = [...items].sort(
    (a, b) =>
      a.createdAt - b.createdAt ||
      a.order - b.order ||
      a.key.localeCompare(b.key),
  )
  return stackEntries(oldest, reader).map(({ item, hidden }) => ({
    key: item.secrets === null ? item.key : `secrets:${item.secrets}`,
    item,
    hidden,
  }))
}

/**
 * The card on top of the stack, by its key, and the keys of the cards in
 * the order that the stack showed last.
 */
export interface StackPlace {
  top: string | null
  order: readonly string[]
}

export const emptyPlace: StackPlace = { top: null, order: [] }

/**
 * The card that takes the place of a card on top that left: the next card
 * of the last order that is still in the stack, else the last such card
 * before it, else the first card.
 */
function nextCard(place: StackPlace, keys: readonly string[]): string {
  const at = place.order.indexOf(place.top ?? '')
  const kept = (key: string) => keys.includes(key)
  const after = place.order.slice(at + 1).find(kept)
  const before = place.order.slice(0, Math.max(at, 0)).findLast(kept)
  return after ?? before ?? keys[0]
}

/**
 * The card on top after a change of the stack. The stack starts with its
 * first card on top. A card that joins or leaves keeps the card on top,
 * unless that card leaves: then the card after it shows, or the card
 * before it when it was the last. When this view cannot answer the card on
 * top, a new card that it can answer takes its place. An empty stack starts
 * again at its first card.
 */
export function placeAfter(
  place: StackPlace,
  cards: readonly StackCard[],
): StackPlace {
  const keys = cards.map((card) => card.key)
  if (keys.length === 0) return emptyPlace
  const shown =
    place.top === null
      ? keys[0]
      : keys.includes(place.top)
        ? place.top
        : nextCard(place, keys)
  const card = cards.find((item) => item.key === shown)
  const fresh = cards.find(
    (item) => item.item.answerable && !place.order.includes(item.key),
  )
  const top = card?.item.answerable === false && fresh ? fresh.key : shown
  return { top, order: keys }
}

/**
 * One showing of the card on top: the key of the card, the IDs of the
 * requests that it holds, and a count that names the showing. The parts of
 * a card, such as the values that a member types, last for one showing.
 */
export interface CardShowing {
  card: string | null
  holds: readonly string[]
  count: number
}

export const noShowing: CardShowing = { card: null, holds: [], count: 0 }

/**
 * The showing of the card on top after a change of the stack. A request
 * that joins or leaves the card keeps its showing, so a newer request for
 * the same secrets keeps the values that a member typed. A new showing
 * starts when another card shows, or when no request of the card carries
 * over, such as when each of its requests ended and the agent asked again
 * for the same secrets in the same change. An empty stack keeps the last
 * showing, because its card no longer draws.
 */
export function showingAfter(
  showing: CardShowing,
  top: StackCard | undefined,
): CardShowing {
  if (top === undefined) return showing
  const holds = [top.item.id, ...top.hidden.map((item) => item.id)]
  const carries =
    top.key === showing.card && holds.some((id) => showing.holds.includes(id))
  const same =
    holds.length === showing.holds.length &&
    holds.every((id, index) => showing.holds[index] === id)
  if (carries && same) return showing
  return {
    card: top.key,
    holds,
    count: carries ? showing.count : showing.count + 1,
  }
}
