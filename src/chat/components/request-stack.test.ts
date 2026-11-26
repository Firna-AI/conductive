import { describe, expect, test } from 'vitest'
import { secretSetKey } from '../../ui/components/chat/requestStackOrder'
import {
  emptyPlace,
  noShowing,
  placeAfter,
  showingAfter,
  stackCards,
  type StackCard,
  type StackPlace,
  type WaitingItem,
} from './request-stack'

/** A secret request of the stack, made at `at`, for the named secrets. */
function secret(
  id: string,
  at: number,
  names: readonly string[],
  late = true,
): WaitingItem {
  return {
    id,
    key: `secret:${id}`,
    createdAt: at,
    order: at,
    callWaits: !late,
    secrets: secretSetKey(names),
    answerable: true,
    card: () => null,
  }
}

/** A Mac command whose call waits, made at `at`. */
function command(id: string, at: number, answerable: boolean): WaitingItem {
  return {
    id,
    key: `command:${id}`,
    createdAt: at,
    order: 0,
    callWaits: true,
    secrets: null,
    answerable,
    card: () => null,
  }
}

/** A card as its shown request and the requests that it hides. */
function named({ item, hidden }: StackCard): string {
  return [item.id, ...hidden.map((request) => request.id)].join(' hides ')
}

/** Each card of the stack, in its order. */
function shown(cards: readonly StackCard[]): string[] {
  return cards.map(named)
}

/** Moves the stack to the card that shows the request `id`, as Next does. */
function moveTo(id: string, items: readonly WaitingItem[]) {
  return (place: StackPlace): StackPlace => ({
    ...place,
    top: stackCards(items).find((card) => card.item.id === id)?.key ?? null,
  })
}

/** A step of the stack: a list of the open requests, or a move of the member. */
type Step = readonly WaitingItem[] | ((place: StackPlace) => StackPlace)

/**
 * The card on top after each step, from a fresh stack, and the count of its
 * showing.
 */
function walk(steps: readonly Step[]) {
  let place = emptyPlace
  let cards: StackCard[] = []
  let showing = noShowing
  return steps.map((step) => {
    if (typeof step === 'function') place = step(place)
    else {
      cards = stackCards(step)
      place = placeAfter(place, cards)
    }
    const top = cards.find((card) => card.key === place.top)
    showing = showingAfter(showing, top)
    return { top: top ? named(top) : null, showing: showing.count }
  })
}

/** The card on top after each step, from a fresh stack. */
function tops(...steps: Step[]): (string | null)[] {
  return walk(steps).map(({ top }) => top)
}

describe('the stack of requests above the composer', () => {
  test('puts the requests whose calls wait first, then the late requests, each oldest first, and the cards that this view cannot answer last', () => {
    const cards = stackCards([
      secret('late-new', 30, ['VERCEL_TOKEN']),
      command('mac', 20, false),
      secret('waits', 40, ['MAPBOX_TOKEN'], false),
      secret('late-old', 10, ['PROD_DATABASE_URL']),
    ])
    expect(shown(cards)).toEqual(['waits', 'late-old', 'late-new', 'mac'])
  })

  test('keeps the order of the region in the Mac app on the Mac that got the command', () => {
    const cards = stackCards([
      secret('late', 10, ['PROD_DATABASE_URL']),
      command('mac', 20, true),
    ])
    expect(shown(cards)).toEqual(['mac', 'late'])
  })

  test('shows the newest request for the same set of secrets in the place of the oldest, and hides the others', () => {
    const cards = stackCards([
      secret('first', 10, ['PROD_DATABASE_URL', 'VERCEL_TOKEN']),
      secret('other', 15, ['PROD_DATABASE_URL']),
      secret('second', 20, ['VERCEL_TOKEN', 'PROD_DATABASE_URL']),
      secret('third', 30, ['PROD_DATABASE_URL', 'VERCEL_TOKEN']),
    ])
    expect(shown(cards)).toEqual(['third hides first hides second', 'other'])
  })

  test('puts a card whose newest request waits with the requests whose calls wait', () => {
    const cards = stackCards([
      secret('mapbox', 5, ['MAPBOX_TOKEN']),
      secret('late', 10, ['PROD_DATABASE_URL']),
      secret('asks-again', 40, ['PROD_DATABASE_URL'], false),
    ])
    expect(shown(cards)).toEqual(['asks-again hides late', 'mapbox'])
  })

  test('keeps the card on top while a request joins or leaves, and shows the next card when that card leaves', () => {
    const a = secret('a', 10, ['A'])
    const b = secret('b', 20, ['B'])
    const c = secret('c', 30, ['C'])
    const d = secret('d', 40, ['D'])
    expect(
      tops(
        [a, b, c],
        moveTo('b', [a, b, c]),
        [b, c],
        [b, c, d],
        [c, d],
        [a, d],
        [a],
      ),
    ).toEqual(['a', 'b', 'b', 'b', 'c', 'd', 'a'])
  })

  test('keeps a card of secrets on top when a newer request for the same secrets joins it, and shows the newer request', () => {
    const late = secret('late', 10, ['PROD_DATABASE_URL'])
    const other = secret('other', 20, ['VERCEL_TOKEN'])
    const again = secret('again', 30, ['PROD_DATABASE_URL'])
    expect(tops([late, other], [late, other, again])).toEqual([
      'late',
      'again hides late',
    ])
  })

  test('keeps the showing of the card on top while a request of it carries over, and starts a new one when another card shows or when none carries over', () => {
    const late = secret('late', 10, ['PROD_DATABASE_URL'])
    const again = secret('again', 20, ['PROD_DATABASE_URL'])
    const anew = secret('anew', 30, ['PROD_DATABASE_URL'])
    const other = secret('other', 40, ['VERCEL_TOKEN'])
    expect(
      walk([
        [late, other],
        [late, again, other],
        [again, other],
        [anew, other],
        moveTo('other', [anew, other]),
        moveTo('anew', [anew, other]),
      ]),
    ).toEqual([
      { top: 'late', showing: 1 },
      { top: 'again hides late', showing: 1 },
      { top: 'again', showing: 1 },
      { top: 'anew', showing: 2 },
      { top: 'other', showing: 3 },
      { top: 'anew', showing: 4 },
    ])
  })

  test('puts a new request that this view can answer on top of a card that it cannot answer', () => {
    const mac = command('mac', 10, false)
    const late = secret('late', 20, ['PROD_DATABASE_URL'])
    const other = secret('other', 30, ['VERCEL_TOKEN'])
    expect(
      tops([mac], [mac, late], moveTo('mac', [mac, late]), [mac, late, other]),
    ).toEqual(['mac', 'late', 'mac', 'other'])
  })

  test('starts again at the first card after the stack was empty', () => {
    const a = secret('a', 10, ['A'])
    const b = secret('b', 20, ['B'])
    expect(tops([a, b], moveTo('b', [a, b]), [], [a, b])).toEqual([
      'a',
      'b',
      null,
      'a',
    ])
  })
})
