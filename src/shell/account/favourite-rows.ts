import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { fastFor } from '../../chat/state/format'
import {
  effortLabels,
  findModel,
  modelLabel,
  sameChoice,
} from '../../shared/agents'

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
    if (at < 0) return { id: `favourite-${number++}`, choice }
    const [row] = free.splice(at, 1)
    return { id: row.id, choice }
  })
  return { rows, next: number }
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
