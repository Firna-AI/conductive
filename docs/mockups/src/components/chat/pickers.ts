import { ExternalLink } from 'lucide-react'
import { effortLabels } from '../../../../../src/shared/agents'
import {
  agentKeys,
  agents,
  effortsFor,
  offersFast,
  type AgentChoice,
  type AgentKey,
} from '../../fixtures/agents'
import { sameChoice } from '../../fixtures/favourites'
import type { Shortcut } from '../common/KeyChips'
import type { MenuEntry } from '../common/Menu'

export const divider: MenuEntry = { kind: 'divider' }

/**
 * The models of each agent as a group, with no brand name, and the current
 * model marked. In a session with messages, each model of the other agent
 * opens a new session, which the external link icon marks.
 */
export function modelEntries(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  /** The labels of the models that the menu leaves out. */
  hiddenModels: readonly string[] = [],
): MenuEntry[] {
  return agentKeys.flatMap((key, index): MenuEntry[] => {
    const opensSession = sessionAgent !== undefined && key !== sessionAgent
    const shown = agents[key].models.filter(
      (model) => !hiddenModels.includes(model.name),
    )
    return [
      ...(index > 0 ? [divider] : []),
      ...shown.map((model): MenuEntry => ({
        kind: 'item',
        label: model.name,
        trailingIcon: opensSession ? ExternalLink : undefined,
        trailingLabel: opensSession ? 'New session' : undefined,
        checked: key === choice.agent && model.name === choice.model,
      })),
    ]
  })
}

/**
 * The effort levels of the chosen model under a line, with the current
 * effort marked, then the Fast switch of a model that offers fast mode.
 * `fastKey` is the key of Fast mode, which the Fast row shows before its
 * switch where the key runs (fast mode decision 258).
 */
function effortEntries(choice: AgentChoice, fastKey?: Shortcut): MenuEntry[] {
  const fast: MenuEntry[] = offersFast(choice)
    ? [
        divider,
        {
          kind: 'switch',
          label: 'Fast',
          on: choice.fast === true,
          shortcut: fastKey,
        },
      ]
    : []
  return [
    divider,
    { kind: 'label', label: 'Effort' },
    ...effortsFor(choice).map((effort): MenuEntry => ({
      kind: 'item',
      label: effortLabels[effort],
      checked: effort === choice.effort,
    })),
    ...fast,
  ]
}

/**
 * The model menu with no favourite to show: the models of each agent as a
 * group, with no brand name, then the effort levels of the chosen model,
 * then the Fast switch of a model that offers fast mode. The menu marks the
 * current model and the current effort. In a session with messages,
 * each model of the other agent opens a new session, and the draft moves
 * there (decision 51). The external link icon marks each of those models,
 * and a screen reader says "New session" for it. A model of the session's
 * own agent stays in it.
 */
function pickerMenu(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  /** The labels of the models that the menu leaves out. */
  hiddenModels: readonly string[] = [],
  fastKey?: Shortcut,
): MenuEntry[] {
  return [
    ...modelEntries(choice, sessionAgent, hiddenModels),
    ...effortEntries(choice, fastKey),
  ]
}

/** What the model menu with favourites shows besides the current choice. */
type FavouritesMenuOptions = {
  /** The favourites of the member, in the order of the menu. */
  favourites: readonly AgentChoice[]
  /** The agent of a session with messages, as `pickerMenu` says. */
  sessionAgent?: AgentKey
  /** The labels of the models that the menu leaves out. */
  hiddenModels?: readonly string[]
  /** The key of Fast mode, as `effortEntries` says. */
  fastKey?: Shortcut
  /** The submenu of All models is open. */
  allModels?: boolean
}

/**
 * The favourites that the menu shows: each one whose model the menu does
 * not leave out, such as a model that the list of an own endpoint does not
 * name. The others stay saved.
 */
export function shownFavourites(
  favourites: readonly AgentChoice[],
  hiddenModels: readonly string[] = [],
): readonly AgentChoice[] {
  return favourites.filter(
    (favourite) => !hiddenModels.includes(favourite.model),
  )
}

/** The words after the model of a favourite: its effort, and Fast if on. */
function favouriteWords(choice: AgentChoice): string {
  return `${effortLabels[choice.effort]}${choice.fast ? ' Fast' : ''}`
}

/**
 * The model menu with favourites. Each favourite shows as its model, with
 * its effort and Fast in the muted colour, and the menu marks the one that
 * is the current choice exactly. A favourite of the other agent opens a new
 * session, as a model of that agent does. A line follows, then All models,
 * whose submenu holds the rows of `modelEntries`, then the efforts of the
 * current model and the Fast switch. With no favourite to show, the menu is
 * `pickerMenu`: every model at its top, and no All models row.
 */
export function favouritesMenu(
  choice: AgentChoice,
  options: FavouritesMenuOptions,
): MenuEntry[] {
  const shown = shownFavourites(options.favourites, options.hiddenModels)
  if (shown.length === 0) {
    return pickerMenu(
      choice,
      options.sessionAgent,
      options.hiddenModels,
      options.fastKey,
    )
  }
  return [
    ...shown.map((favourite): MenuEntry => {
      const opensSession =
        options.sessionAgent !== undefined &&
        favourite.agent !== options.sessionAgent
      return {
        kind: 'item',
        label: favourite.model,
        muted: favouriteWords(favourite),
        trailingIcon: opensSession ? ExternalLink : undefined,
        trailingLabel: opensSession ? 'New session' : undefined,
        checked: sameChoice(favourite, choice),
      }
    }),
    divider,
    {
      kind: 'item',
      label: 'All models',
      submenu: options.allModels ? 'open' : 'closed',
    },
    ...effortEntries(choice, options.fastKey),
  ]
}
