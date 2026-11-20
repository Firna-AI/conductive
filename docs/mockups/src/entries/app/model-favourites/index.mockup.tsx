import { defineScreen } from '@mokly/mokly'
import { FavouritesMenu } from '../../../components/chat/FavouritesMenu'
import { ModelPicker } from '../../../components/chat/ModelPicker'
import { FavouritesSection } from '../../../components/settings/FavouritesSection'
import { DefaultsSection } from '../../../components/settings/PreferencesSections'
import type { AgentChoice } from '../../../fixtures/agents'
import { startingFavourites } from '../../../fixtures/favourites'
import { AccountScreen } from '../../../screens/AccountScreen'
import { accountGeneral } from '../../../screens/accountState'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import { readyWorkspace } from '../../../screens/workspaceState'

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['view'],
  properties: {
    /**
     * The menu with the first favourite as the choice, the submenu of all
     * models, the menu after a change of the effort, the favourites in
     * Preferences, or the menu of a new account.
     */
    view: {
      enum: ['menu', 'all-models', 'changed', 'preferences', 'new-account'],
    },
  },
} as const

const favourite: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
}

/** The first favourite with its effort changed to Max in the menu. */
const changed: AgentChoice = { ...favourite, effort: 'max' }

export const modelFavourites = defineScreen({
  title: 'Model favourites',
  description:
    'The model menu of a session starts with the five favourites of the member. Each favourite shows what it runs: the model, then its effort and Fast in the muted colour, such as "Opus 5.5 Max Fast". A favourite has no name of its own. The menu marks the favourite that is the current choice, here Opus 5.5 High. GPT-6.1 Sol High ends with the icon of a new page, because it opens a new session with the draft. All models opens a submenu with every model. The efforts of the current model and the Fast switch follow, as today, and they change the current choice.',
  rationale:
    'The user chose favourites on 16 November 2026, in place of six other ideas: up to five set choices, which show the real model names, the effort, and Fast, and have no names of their own. The user can still change the effort and Fast after a pick, and can still choose any model in a submenu. A member uses a few choices most of the time, so one press picks a full choice, and the rare model stays one level down. On 20 November 2026 the user chose A of decision 1, so a new account starts with five favourites, and A of decision 2, so a member adds, orders, and removes favourites only in Preferences. The menu has no row that adds a favourite.',
  relatedDocs: [],
  propSchema: schema,
  props: { view: 'menu' },
  render: (props, context) => {
    if (props.view === 'preferences') {
      return (
        <AccountScreen
          content={
            <>
              <FavouritesSection />
              <DefaultsSection saveFailed={false} view="page" />
            </>
          }
          state={{ ...accountGeneral, tab: 'preferences' }}
          viewport={context.viewport}
        />
      )
    }
    const choice = props.view === 'changed' ? changed : favourite
    return (
      <WorkspaceScreen
        picker={
          <ModelPicker
            choice={choice}
            menu={
              <FavouritesMenu
                allModels={props.view === 'all-models'}
                choice={choice}
                fastKey
                list={
                  props.view === 'new-account' ? startingFavourites : undefined
                }
                sessionAgent="claude"
                viewport={context.viewport}
              />
            }
            open
          />
        }
        state={{ ...readyWorkspace, composer: 'draft' }}
        viewport={context.viewport}
      />
    )
  },
  variants: [
    {
      slug: 'all-models',
      title: 'All models',
      description:
        'All models is open. On a computer its submenu stands beside the menu, level with its row, and lists every model in two groups, as the menu of today does. It marks Opus 5.5, the model of the current choice. A phone shows the list in place of the menu, with Back at its top. A pick changes the model as the menu of today does.',
      rationale:
        'The user asked that any model stays one level down. The submenu reuses the model list of today, so the other-agent rule and its icon do not change.',
      props: { view: 'all-models' },
    },
    {
      slug: 'changed',
      title: 'A changed effort',
      description:
        'The member picked Opus 5.5 High, then chose Max in the efforts. The trigger reads "Opus 5.5 Max". No favourite is marked, because none is Opus 5.5 Max with Fast off. Max is marked in the efforts.',
      rationale:
        'The user asked that the effort and Fast stay open to change after a pick. A favourite marks only an exact match, so the menu never claims that a changed choice is a favourite.',
      props: { view: 'changed' },
    },
    {
      slug: 'preferences',
      title: 'Edit the favourites',
      description:
        'The Favourites section of Preferences lists the five favourites in the order of the menu. Each row has a handle, the model picker of today, and × to remove it. Add a favourite is off, and a line says that the menu shows five favourites at most. The New workspaces section follows, as today.',
      rationale:
        'A favourite is a full choice, so its row uses the picker that already sets a model, an effort, and Fast. The order of the list is the order of the menu, so a drag sets it. The user chose A of decision 2 on 20 November 2026: this section is the only place that adds a favourite, so the menu stays the same for each choice.',
      props: { view: 'preferences' },
    },
    {
      slug: 'new-account',
      title: 'A new account',
      description:
        'The menu of a member who has not changed the favourites. It lists the five favourites that a new account starts with: Opus 5.5 High, the default of new workspaces, then Opus 5.5 Max, Sonnet 5.5 Medium, GPT-6.1 Sol High, and GPT-6 Astra Medium. The two Codex favourites open a new session in this Claude session. Fast is off in each of them. Preferences lists the same five, and the member changes them there.',
      rationale:
        'The user chose A of decision 1 on 20 November 2026: a new account starts with five favourites, so the menu is useful before the member sets any. Each agent gets a deep and a quick choice, and the first favourite is the default of new workspaces. Option B, no favourites until the member adds one, and option C, the default of new workspaces as the only favourite, were not chosen.',
      props: { view: 'new-account' },
    },
  ],
})
