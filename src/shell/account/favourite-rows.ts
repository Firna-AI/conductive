import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import { effortFor, fastFor } from '../../chat/state/format'
import {
  effortLabels,
  findModel,
  modelLabel,
  sameChoice,
} from '../../shared/agents'

const effortOrder = Object.keys(effortLabels)

/**
 * A favourite as a row of the Favourites section. Its ID names the row for
 * React and for the moves of the list. A move, a pick, and the save that
 * gives the list back keep it, so the row keeps its elements, and with them
 * the keyboard focus.
 */
export interface FavouriteRow {
  id: string
  choice: AgentChoice
}

/** The rows of a list, with the number of the next new ID. */
export interface FavouriteRows {
  rows: readonly FavouriteRow[]
  next: number
}

/** The ID of the new row with the number `number`. */
function rowId(number: number): string {
  return `favourite-${number}`
}

/**
 * The rows of `list`. Each favourite takes the ID of the first row of
 * `shown` with the same choice that no other favourite took, such as the
 * row that a save sent. Each other favourite takes a new ID, from `next`.
 */
export function keptRows(
  list: readonly AgentChoice[],
  shown: readonly FavouriteRow[],
  next: number,
): FavouriteRows {
  const free = [...shown]
  let number = next
  const rows = list.map((choice): FavouriteRow => {
    const at = free.findIndex((row) => sameChoice(row.choice, choice))
    if (at < 0) return { id: rowId(number++), choice }
    const [row] = free.splice(at, 1)
    return { id: row.id, choice }
  })
  return { rows, next: number }
}

/** The rows with a row for `choice` at their end, with a new ID from `next`. */
export function addedRows(
  rows: readonly FavouriteRow[],
  choice: AgentChoice,
  next: number,
): FavouriteRows {
  return { rows: [...rows, { id: rowId(next), choice }], next: next + 1 }
}

/**
 * The favourite that a pick of `model` in the list of Add a favourite adds
 * to `favourites`, as model favourites decision 4 D says, or null when each
 * effort of the model is already a favourite. Its fast mode is off. Its
 * effort is `effort`, the effort of the default of new workspaces, or else
 * the nearest lower effort of the model, or its lowest one. When that
 * effort is not free, it takes the free efforts below it, nearest first,
 * then the free efforts above it, nearest first. An effort is free when no
 * favourite is the model at that effort with fast mode off, as its picker
 * shows it, because the pick adds no exact copy.
 */
export function addedFavourite(
  model: AgentModel,
  favourites: readonly AgentChoice[],
  effort: Effort,
): AgentChoice | null {
  const taken = (wanted: Effort) =>
    favourites.some(
      (favourite) =>
        favourite.agent === model.agent &&
        favourite.model === model.model &&
        favourite.effort === wanted &&
        !fastFor(model, favourite.fast),
    )
  const efforts = [...model.efforts].sort(
    (left, right) => effortOrder.indexOf(left) - effortOrder.indexOf(right),
  )
  const first = effortFor(model, effort)
  const at = efforts.indexOf(first)
  const tries = [
    first,
    ...efforts.slice(0, Math.max(at, 0)).reverse(),
    ...efforts.slice(at + 1),
  ]
  const free = tries.find((item) => !taken(item))
  if (free === undefined) return null
  return { agent: model.agent, model: model.model, effort: free, fast: false }
}

/** The rows after a move of the row `id` to the place `to`. */
export function movedRows(
  rows: readonly FavouriteRow[],
  id: string,
  to: number,
): FavouriteRow[] {
  const moved = rows.find((row) => row.id === id)
  if (!moved) return [...rows]
  const others = rows.filter((row) => row !== moved)
  return [...others.slice(0, to), moved, ...others.slice(to)]
}

/**
 * What a favourite runs, as its picker shows it: the label of its model,
 * its effort, and Fast while fast mode is on. A model that the model list
 * does not hold shows its ID, and no Fast.
 */
export interface FavouriteWords {
  model: string
  effort: string
  fast: boolean
}

export function favouriteWords(
  models: readonly AgentModel[],
  choice: AgentChoice,
): FavouriteWords {
  return {
    model: modelLabel(models, choice),
    effort: effortLabels[choice.effort],
    fast: fastFor(findModel(models, choice), choice.fast),
  }
}

/** The words of a favourite as one name, such as "Opus 5.5 Max Fast". */
export function favouriteName(words: FavouriteWords): string {
  return `${words.model} ${words.effort}${words.fast ? ' Fast' : ''}`
}

/**
 * Why the model menu leaves out a favourite, or null when the menu shows
 * it. `models` is the model list of the app. `listed` holds the models
 * that the pickers of the person offer outside an org, which leave out each
 * model that the model list of an own endpoint does not name. The list of
 * an org endpoint greys no favourite here, because it applies only to the
 * sessions on the org login.
 */
export function hiddenLine(
  models: readonly AgentModel[],
  listed: readonly AgentModel[],
  choice: AgentChoice,
): string | null {
  const model = findModel(models, choice)
  if (!model) {
    return `Hidden from the model menu, because ${choice.model} is no longer available.`
  }
  if (!findModel(listed, choice)) {
    return `Hidden from the model menu, because your endpoint does not list ${model.label}.`
  }
  return null
}
