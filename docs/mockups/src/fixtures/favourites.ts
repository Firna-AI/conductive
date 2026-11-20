import type { AgentChoice } from './agents'

/** The most favourites that a member keeps. */
export const favouriteLimit = 5

/**
 * The favourites of the viewer, in the order of the model menu. Each is a
 * full choice: a model, an effort, and fast mode. A favourite has no name
 * of its own, so the menu shows what it runs. Every viewer of the mockups
 * keeps these five.
 */
export const favourites: readonly AgentChoice[] = [
  { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
  { agent: 'claude', model: 'Opus 5.5', effort: 'max', fast: true },
  { agent: 'claude', model: 'Sonnet 5.5', effort: 'medium' },
  { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'high' },
  { agent: 'claude', model: 'Fable 5.1', effort: 'low' },
]

/**
 * The starting favourites: those of an account that never changed its
 * favourites (decision 1 A of the model favourites, 20 November 2026). The
 * deployment setting `CONDUCTIVE_STARTING_FAVOURITES` gives them (decision
 * 3 A). The first is the app default. Each agent has a deep and a quicker
 * choice.
 */
const startingFavourites: readonly AgentChoice[] = [
  { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
  { agent: 'claude', model: 'Opus 5.5', effort: 'max' },
  { agent: 'claude', model: 'Sonnet 5.5', effort: 'medium' },
  { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'high' },
  { agent: 'codex', model: 'GPT-6 Astra', effort: 'medium' },
]

/**
 * No favourites, after the member removed each one. The model menu then
 * lists every model at its top. The picker of a Favourites row shows the
 * same menu, because the row sets one favourite.
 */
export const noFavourites: readonly AgentChoice[] = []

/**
 * The favourites that a screen state gives the model menu: the saved
 * favourites of the viewer, the first four of them, the starting
 * favourites, or none.
 */
export const favouriteListKeys = ['saved', 'four', 'starting', 'none'] as const

type FavouriteListKey = (typeof favouriteListKeys)[number]

/** The favourites of each key of `favouriteListKeys`. */
export const favouriteLists: Readonly<
  Record<FavouriteListKey, readonly AgentChoice[]>
> = {
  saved: favourites,
  four: favourites.slice(0, 4),
  starting: startingFavourites,
  none: noFavourites,
}

/** Two choices are the same: the same model, effort, and fast mode. */
export function sameChoice(a: AgentChoice, b: AgentChoice): boolean {
  return (
    a.agent === b.agent &&
    a.model === b.model &&
    a.effort === b.effort &&
    (a.fast === true) === (b.fast === true)
  )
}
