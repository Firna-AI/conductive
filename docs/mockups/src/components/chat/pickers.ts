import { effortLabels } from '../../../../../src/shared/agents'
import { defined } from '../../defined'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import {
  agentKeys,
  agents,
  effortsFor,
  offersFast,
  type AgentChoice,
  type AgentKey,
} from '../../fixtures/agents'
import { sameChoice } from '../../fixtures/favourites'
import type { Shortcut } from '../../../../../src/ui/components/common/KeyChips'

export const divider: MenuEntryData = { kind: 'divider' }

/**
 * The external link icon of a model that opens a new session, which a
 * screen reader says as "New session".
 */
function newSession(opens: boolean) {
  return opens
    ? ({ trailingIcon: 'external-link', trailingLabel: 'New session' } as const)
    : {}
}

/**
 * The models of each agent as a group under a line, with no brand name,
 * each as the row that `row` gives. The groups leave out each model of
 * `hiddenModels`.
 */
function modelGroups(
  hiddenModels: readonly string[],
  row: (agent: AgentKey, model: string) => MenuEntryData,
): MenuEntryData[] {
  return agentKeys.flatMap((key, index): MenuEntryData[] => {
    const shown = agents[key].models.filter(
      (model) => !hiddenModels.includes(model.name),
    )
    return [
      ...(index > 0 ? [divider] : []),
      ...shown.map((model) => row(key, model.name)),
    ]
  })
}

/**
 * The models of each agent as a group, with no brand name, and the current
 * model marked: the rows of the submenu of All models. In a session with
 * messages, each model of the other agent opens a new session, and the
 * draft moves there (decision 51). The external link icon marks each of
 * those models, and a screen reader says "New session" for it.
 */
export function modelEntries(
  choice: AgentChoice,
  sessionAgent?: AgentKey,
  /** The labels of the models that the menu leaves out. */
  hiddenModels: readonly string[] = [],
): MenuEntryData[] {
  return modelGroups(hiddenModels, (key, model): MenuEntryData => ({
    kind: 'item',
    label: model,
    ...newSession(sessionAgent !== undefined && key !== sessionAgent),
    checked: key === choice.agent && model === choice.model,
  }))
}

/**
 * The list of Add a favourite in the Favourites section: every model in
 * the groups of All models, as model favourites decision 4 D says. The list
 * has no current choice, so it marks no model, and it has no efforts and
 * no Fast row. `pointed` is the model under the pointer.
 */
export function addFavouriteEntries(
  pointed: string,
  /** The labels of the models that the pickers of the member leave out. */
  hiddenModels: readonly string[] = [],
): MenuEntryData[] {
  return modelGroups(hiddenModels, (_agent, model) => ({
    kind: 'item',
    label: model,
    highlighted: model === pointed,
  }))
}

/**
 * A line, then Effort, with the current effort after it in the muted
 * colour. Its submenu holds the efforts of the chosen model, with the
 * current effort marked, as `effortChoices` gives them. The Fast switch of
 * a model that offers fast mode follows it. `fastKey` is the key of Fast
 * mode, which the Fast row shows before its switch where the key runs
 * (fast mode decision 258). `open` draws the submenu of Effort open.
 */
function effortEntries(
  choice: AgentChoice,
  fastKey?: Shortcut,
  open?: boolean,
): MenuEntryData[] {
  const fast: MenuEntryData[] = offersFast(choice)
    ? [
        {
          kind: 'switch',
          label: 'Fast',
          on: choice.fast === true,
          ...defined({ shortcut: fastKey }),
        },
      ]
    : []
  return [
    divider,
    {
      kind: 'item',
      label: 'Effort',
      muted: effortLabels[choice.effort],
      submenu: open ? 'open' : 'closed',
    },
    ...fast,
  ]
}

/**
 * The efforts of the chosen model, with the current effort marked: the
 * rows of the submenu of Effort.
 */
export function effortChoices(choice: AgentChoice): MenuEntryData[] {
  return effortsFor(choice).map((effort): MenuEntryData => ({
    kind: 'item',
    label: effortLabels[effort],
    checked: effort === choice.effort,
  }))
}

/** What the model menu with favourites shows besides the current choice. */
type FavouritesMenuOptions = {
  /** The favourites of the member, in the order of the menu. */
  favourites: readonly AgentChoice[]
  /** The agent of a session with messages, as `modelEntries` says. */
  sessionAgent?: AgentKey
  /** The labels of the models that the menu leaves out. */
  hiddenModels?: readonly string[]
  /** The key of Fast mode, as `effortEntries` says. */
  fastKey?: Shortcut
  /** The submenu of All models is open. */
  allModels?: boolean
  /** The submenu of Effort is open. */
  effort?: boolean
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
 * whose submenu holds the rows of `modelEntries`, then Effort, whose
 * submenu holds the efforts of the current model, and the Fast switch.
 * With no favourite to show, the menu starts with All models (model favourites decision 6), so it stays short
 * however many models the app offers.
 */
export function favouritesMenu(
  choice: AgentChoice,
  options: FavouritesMenuOptions,
): MenuEntryData[] {
  const rows = shownFavourites(options.favourites, options.hiddenModels).map(
    (favourite): MenuEntryData => ({
      kind: 'item',
      label: favourite.model,
      muted: favouriteWords(favourite),
      ...newSession(
        options.sessionAgent !== undefined &&
          favourite.agent !== options.sessionAgent,
      ),
      checked: sameChoice(favourite, choice),
    }),
  )
  return [
    ...rows,
    ...(rows.length > 0 ? [divider] : []),
    {
      kind: 'item',
      label: 'All models',
      submenu: options.allModels ? 'open' : 'closed',
    },
    ...effortEntries(choice, options.fastKey, options.effort),
  ]
}
