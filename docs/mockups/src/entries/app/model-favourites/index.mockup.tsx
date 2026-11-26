import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const modelFavourites = defineScreen({
  title: 'Model favourites',
  description:
    'The model menu of a session starts with the five favourites of the member. Each favourite is a full choice, and it shows what it runs: the model, then its effort and Fast in the muted colour, such as "Opus 5.5 Max Fast". A favourite has no name of its own, and the favourites have no heading. The menu marks the favourite that is the current choice, here Opus 5.5 High. This session runs Claude, so GPT-6.1 Sol High ends with the external link icon, because it opens a new session with the draft. A line follows, then All models, which opens a submenu with every model. The efforts of the current model and the Fast switch follow, and they change the current choice. Every model picker shows this menu: the composer of a session, New workspace, the default of new workspaces in Preferences, and the prompt of an automation. The child pages show the submenu, a changed effort, a favourite that an own endpoint leaves out, a menu with no favourites, the favourites of a new account, and the Favourites section of Preferences.',
  rationale:
    'The user chose favourites on 16 November 2026, in place of six other ideas: modes in place of the model and the effort, a depth ladder, commands in the message, Auto, a compare panel, and layered defaults. A favourite is one of up to five set choices, which show the real model names, the effort, and Fast, and have no names of their own. The member can still change the effort and Fast after a pick, and can still choose any model in All models. A member uses a few choices most of the time, so one press picks a full choice, and the rare model stays one level down. The efforts stay rows of the menu, not a submenu. A favourite of the other agent opens a new session with the draft, as a model of that agent does (decision 51). On 20 November 2026 the user chose A of decision 1, so a new account starts with five favourites, A of decision 2, so a member adds, orders, and removes favourites only in Preferences, and A of decision 3, so a deployment setting gives the starting favourites. So the menu has no row that adds a favourite. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
