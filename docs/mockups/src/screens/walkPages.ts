import type { ScreenVariantInput } from '@mokly/mokly'
import { placeCount } from './walkLinks'
import { placeSlug, type Walk } from './walks'
import type { WorkspaceState } from './workspaceState'

/** The words of the screen of one place of the stack of a state. */
export type ScreenWords = {
  title: string
  description: string
  rationale?: string
}

/** The words of a place that the page gives no words for. */
function placeWords(place: number, count: number): ScreenWords {
  return {
    title: `Card ${place} of ${count}`,
    description: `Next shows card ${place} of ${count} on top, and the place says "${place} of ${count}".`,
  }
}

/**
 * The screens of a state that its page draws as saved states: one for each
 * place of its stack, so one for each card of its chat, without the first
 * place of a state that the page itself draws. `words` gives the words of
 * each, in order.
 */
function savedScreens<K extends string>(
  walk: Walk<K>,
  key: K,
  words: readonly ScreenWords[],
) {
  const state = walk.states[key]
  const count = placeCount(state, walk.view)
  const screens: { slug: string; place: number }[] = []
  for (let place = 1; place <= count; place++) {
    const slug = placeSlug(state.slug, place, count)
    if (slug !== undefined) screens.push({ slug, place })
  }
  return screens.map((screen, index) => ({
    ...(words[index] ?? placeWords(screen.place, count)),
    ...screen,
  }))
}

/**
 * The saved states of the later places of the stack of the state that a
 * page draws itself, from its second card: the pages that Previous and Next
 * of the stack open. The Mac app takes them too.
 */
export function placeVariants<K extends string>(
  walk: Walk<K>,
  key: K,
  words: readonly ScreenWords[],
): ScreenVariantInput<{ shownRequest: number }>[] {
  return savedScreens(walk, key, words).map(({ place, ...screen }) => ({
    ...screen,
    props: { shownRequest: place },
  }))
}

/**
 * The saved states of a state that a page draws beside its own: the page
 * of each place of its stack, from its first card, with the props of the
 * state.
 */
export function stateVariants<K extends string>(
  walk: Walk<K>,
  key: K,
  words: readonly ScreenWords[],
): ScreenVariantInput<WorkspaceState>[] {
  const { props } = walk.states[key]
  return savedScreens(walk, key, words).map(({ place, ...screen }) => ({
    ...screen,
    props: { ...props, shownRequest: place },
  }))
}
