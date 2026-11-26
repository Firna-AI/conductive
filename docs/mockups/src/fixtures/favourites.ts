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
 * starts with All models, then Effort and Fast (model favourites
 * decision 6). The picker of a Favourites row shows the same menu, because
 * the row sets one favourite.
 */
export const noFavourites: readonly AgentChoice[] = []

/**
 * The model that the viewer picks in the list of Add a favourite, over the
 * first four favourites.
 */
export const pickedModel = 'Opus 5.5'

/**
 * The favourite that the pick of `pickedModel` adds at the end of the first
 * four (model favourites decision 4 D). The default of new workspaces is
 * Opus 5.5 High, which the list already holds, so the pick takes Medium:
 * the nearest effort of Opus 5.5 that no favourite holds, lower efforts
 * first. Fast is off.
 */
const addedFavourite: AgentChoice = {
  agent: 'claude',
  model: pickedModel,
  effort: 'medium',
}

/**
 * The model of a pick that adds nothing: the list of
 * `everyEffortFavourites` holds it at each of its efforts.
 */
export const takenModel = 'Fable 5.1'

/**
 * Four favourites that hold `takenModel` at each of its efforts. Fable 5.1
 * has no fast mode, so a pick of it in Add a favourite adds nothing
 * (model favourites decision 4 D).
 */
const everyEffortFavourites: readonly AgentChoice[] = [
  { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
  { agent: 'claude', model: takenModel, effort: 'low' },
  { agent: 'claude', model: takenModel, effort: 'medium' },
  { agent: 'claude', model: takenModel, effort: 'high' },
]

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

/**
 * The states of the Favourites section of Preferences: the five favourites
 * of the viewer, so Add a favourite is off; the list of Add a favourite
 * open over the first four (model favourites decision 4 D); the list after
 * the pick of `pickedModel`, with the new favourite at its end; a pick of
 * `takenModel` that added nothing; or no favourite, after the member
 * removed each one (decision 6).
 */
export const favouriteSectionStates = [
  'saved',
  'add-open',
  'added',
  'no-free-effort',
  'empty',
] as const

export type FavouriteSectionState = (typeof favouriteSectionStates)[number]

/** The favourites that the section lists in each of its states. */
export const favouritesInSection: Readonly<
  Record<FavouriteSectionState, readonly AgentChoice[]>
> = {
  saved: favourites,
  'add-open': favouriteLists.four,
  added: [...favouriteLists.four, addedFavourite],
  'no-free-effort': everyEffortFavourites,
  empty: noFavourites,
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
