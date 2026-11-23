import type { AgentModel } from '../../shared/generated/AgentModel'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import { firstFavourites } from '../../shared/account'
import {
  effortLabels,
  findModel,
  modelLabel,
  sameChoice,
} from '../../shared/agents'
import { effortFor, fastFor } from '../state/format'

const agentOrder: readonly Agent[] = ['claude', 'codex']
const effortOrder = Object.keys(effortLabels)

/**
 * A row of the model menu, which each picker draws in the rows of its own
 * menu. A pick of a choice makes its `choice` the current choice.
 */
export type ModelRow =
  | {
      kind: 'choice'
      /** Names the row among the rows of its menu. */
      key: string
      label: string
      /** The words after the label in the muted colour, such as "Max Fast". */
      muted?: string
      checked: boolean
      /**
       * A pick opens a new session with the draft (decision 51). The row
       * ends with the external link icon, and a screen reader says "New
       * session" for it.
       */
      opensSession: boolean
      choice: AgentChoice
    }
  /** The Fast switch of a model with fast mode. */
  | { kind: 'fast'; label: string; on: boolean }
  | { kind: 'label'; label: string }
  | { kind: 'divider' }

/**
 * A row of the menu that opens a submenu of `rows`: All models, or Effort.
 * `muted` follows the label in the muted colour, such as the current
 * effort after Effort.
 */
type ModelSubmenuRow = {
  kind: 'submenu'
  key: 'all-models' | 'effort'
  label: string
  muted?: string
  rows: readonly ModelRow[]
}

/** A row of the menu: a `ModelRow`, or a row with its submenu. */
export type ModelMenuRow = ModelRow | ModelSubmenuRow

/** What the menu shows besides the models and the current choice. */
export interface ModelMenuOptions {
  /** The favourites of the account, in the order of the menu. */
  favourites: readonly AgentChoice[]
  /** The agent of a session with messages (decision 51). */
  sessionAgent?: Agent
}

const divider: ModelRow = { kind: 'divider' }

/** The efforts of the chosen model, in the order of the menu. */
export function effortsOf(
  models: readonly AgentModel[],
  choice: AgentChoice,
): Effort[] {
  const efforts = findModel(models, choice)?.efforts ?? [choice.effort]
  return [...efforts].sort(
    (left, right) => effortOrder.indexOf(left) - effortOrder.indexOf(right),
  )
}

function opensSession(agent: Agent, sessionAgent: Agent | undefined): boolean {
  return sessionAgent !== undefined && agent !== sessionAgent
}

/**
 * The models of each agent as a group, Claude first, in the order of the
 * model list, as All models lists them. An agent with no model has no
 * group.
 */
export function agentGroups(models: readonly AgentModel[]): AgentModel[][] {
  return agentOrder
    .map((agent) => models.filter((model) => model.agent === agent))
    .filter((group) => group.length > 0)
}

/**
 * The models of each agent as a group, with no brand name, and the current
 * model marked. A pick keeps the effort when the model offers it, else it
 * takes the nearest lower one, and it keeps fast mode only for a model with
 * fast mode.
 */
function modelChoices(
  models: readonly AgentModel[],
  choice: AgentChoice,
  sessionAgent: Agent | undefined,
): ModelRow[] {
  return agentGroups(models).flatMap((group, index) => [
    ...(index > 0 ? [divider] : []),
    ...group.map((model): ModelRow => ({
      kind: 'choice',
      key: `${model.agent}:${model.model}`,
      label: model.label,
      checked: model.agent === choice.agent && model.model === choice.model,
      opensSession: opensSession(model.agent, sessionAgent),
      choice: {
        agent: model.agent,
        model: model.model,
        effort: effortFor(model, choice.effort),
        fast: fastFor(model, choice.fast),
      },
    })),
  ])
}

/**
 * The favourites that the menu shows, in their order: each one whose model
 * the picker offers. The models that a picker offers leave out each model
 * that the model list does not hold, and each one that the list of an own
 * endpoint or of the org endpoint does not name, so the menu leaves out a
 * favourite on such a model. It stays saved. A favourite keeps fast mode
 * only for a model with fast mode, so its row shows what a pick runs, and
 * of two favourites that are then the same, the menu shows the first.
 */
function shownFavourites(
  models: readonly AgentModel[],
  favourites: readonly AgentChoice[],
): AgentChoice[] {
  return firstFavourites(
    favourites.flatMap((favourite) => {
      const model = findModel(models, favourite)
      if (!model) return []
      return [{ ...favourite, fast: fastFor(model, favourite.fast) }]
    }),
  )
}

/**
 * Each shown favourite as its model, with its effort and Fast in the muted
 * colour. Only the favourite that is the current choice exactly, with its
 * fast mode, is marked.
 */
function favouriteChoices(
  models: readonly AgentModel[],
  choice: AgentChoice,
  options: ModelMenuOptions,
): ModelRow[] {
  return shownFavourites(models, options.favourites).map(
    (favourite, index): ModelRow => ({
      kind: 'choice',
      key: `favourite:${index}`,
      label: modelLabel(models, favourite),
      muted: `${effortLabels[favourite.effort]}${favourite.fast ? ' Fast' : ''}`,
      checked: sameChoice(favourite, choice),
      opensSession: opensSession(favourite.agent, options.sessionAgent),
      choice: favourite,
    }),
  )
}

/**
 * Effort, with the current effort after it in the muted colour, whose
 * submenu holds the efforts of the current model with the current effort
 * marked. The Fast switch of a model with fast mode follows it.
 */
function effortRows(
  models: readonly AgentModel[],
  choice: AgentChoice,
): ModelMenuRow[] {
  const effort: ModelMenuRow = {
    kind: 'submenu',
    key: 'effort',
    label: 'Effort',
    muted: effortLabels[choice.effort],
    rows: effortsOf(models, choice).map((effort): ModelRow => ({
      kind: 'choice',
      key: `effort:${effort}`,
      label: effortLabels[effort],
      checked: effort === choice.effort,
      opensSession: false,
      choice: { ...choice, effort },
    })),
  }
  if (findModel(models, choice)?.fast !== true) return [effort]
  return [effort, { kind: 'fast', label: 'Fast', on: choice.fast }]
}

/**
 * The rows of the model menu of a picker that offers `models`, for the
 * current choice. The favourites that the menu shows come first, with no
 * heading. A line and All models follow, whose submenu holds the models of
 * each agent. Then come a line, Effort, whose submenu holds the efforts of
 * the current model, and the Fast switch of a model with fast mode. In a session with messages, a pick
 * of a favourite or of a model of the other agent opens a new session. With
 * no favourite to show, the menu starts with All models (model favourites
 * decision 6), so it keeps the same short shape however many models the app
 * offers.
 */
export function modelMenuRows(
  models: readonly AgentModel[],
  choice: AgentChoice,
  options: ModelMenuOptions,
): ModelMenuRow[] {
  const favourites = favouriteChoices(models, choice, options)
  return [
    ...favourites,
    ...(favourites.length > 0 ? [divider] : []),
    {
      kind: 'submenu',
      key: 'all-models',
      label: 'All models',
      rows: modelChoices(models, choice, options.sessionAgent),
    },
    divider,
    ...effortRows(models, choice),
  ]
}
