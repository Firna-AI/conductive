import type { WorkspaceState } from './workspaceState'

/**
 * The view that draws a walk: a browser, or the Mac app on the Mac of the
 * sender, which answers the commands of the chat.
 */
export type WalkView = 'browser' | 'mac'

/**
 * Where the answers of the card of one request lead: the state of the walk
 * that each answer opens. Give a value opens the sheet of the values on a
 * phone.
 */
export type WalkAnswer<K extends string> = {
  /** The ID of the chat item of the request that the card shows. */
  request: string
  allow?: K
  deny?: K
  value?: K
}

/** One state of a walk: the screen that draws it, and where it leads. */
export type WalkState<K extends string> = {
  /** The catalogue path of the page that draws the state. */
  page: string
  /** The saved state of the page that draws it, if not the page itself. */
  slug?: string
  /**
   * What the state sets in the workspace state. A screen whose state holds
   * each of these values draws this state. A page of the walk takes them as
   * its props, and the Mac app takes them from its command.
   */
  props: Partial<WorkspaceState>
  /**
   * The answers of its stack that open another state of the walk. Each
   * other answer of the stack draws no link, so no answer leaves the
   * example. Without them, each card keeps the links of its own result.
   */
  answers?: readonly WalkAnswer<K>[]
}

/**
 * A walk of the catalogue: the states of one example, each on its own
 * screen, and the links between them, so that each link keeps the open
 * requests of the example. Previous and Next of a stack open the page of
 * each place of the stack of the state, one for each card of its chat. An
 * answer opens the state that `answers` names. While a walk names `tabs`,
 * each tab opens the state that it names, and a tab that it does not name
 * draws no link.
 */
export type Walk<K extends string = string> = {
  view: WalkView
  states: Readonly<Record<K, WalkState<K>>>
  /** The state that each tab of a state opens, by the key of the tab. */
  tabs?: Readonly<Partial<Record<string, K>>>
}

/**
 * A walk. The names of its states come from `states`, and each answer and
 * tab must name one of them.
 */
export function defineWalk<K extends string>(walk: {
  view: WalkView
  states: Readonly<Record<K, WalkState<NoInfer<K>>>>
  tabs?: Readonly<Partial<Record<string, NoInfer<K>>>>
}): Walk<K> {
  return walk
}

/** The words of the places between the second and the last. */
const middlePlaces: Partial<Record<number, string>> = {
  3: 'third',
  4: 'fourth',
}

/**
 * The word of a place after the first: `next` for the second card, `last`
 * for the last card of three or more, and the words of the middle places.
 */
function placeWord(place: number, count: number): string {
  if (place === 2) return 'next'
  if (place === count) return 'last'
  return middlePlaces[place] ?? `place-${place}`
}

/**
 * The slug of the page of one place of the stack of a state, from 1: the
 * slug of the state for its first card, then the word of each later place
 * after it. The page itself draws the first place of a state without a
 * slug, and the words alone name its later places.
 */
export function placeSlug(
  slug: string | undefined,
  place: number,
  count: number,
): string | undefined {
  if (place === 1) return slug
  const word = placeWord(place, count)
  return slug === undefined ? word : `${slug}-${word}`
}

/** The catalogue path of one place of the stack of a state, from 1. */
export function placePath(
  state: WalkState<string>,
  place: number,
  count: number,
): string {
  const slug = placeSlug(state.slug, place, count)
  return slug === undefined ? state.page : `${state.page}/${slug}`
}

/** The catalogue path of a state: the page of the first card of its stack. */
export function statePath(state: WalkState<string>): string {
  return placePath(state, 1, 1)
}

/** Whether an object holds each value of a set of its props. */
function holds<T extends object>(value: T, props: Partial<T>): boolean {
  for (const key in props) {
    if (props[key] !== value[key]) return false
  }
  return true
}

/** The state of a walk that a screen in a view draws, if any. */
export function walkStateOf(
  walks: readonly Walk[],
  state: WorkspaceState,
  view: WalkView,
): { walk: Walk; walkState: WalkState<string> } | undefined {
  for (const walk of walks) {
    if (walk.view !== view) continue
    const walkState = Object.values(walk.states).find((each) =>
      holds(state, each.props),
    )
    if (walkState) return { walk, walkState }
  }
  return undefined
}
