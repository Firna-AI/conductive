import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesNewAccount = defineScreen({
  title: 'A new account',
  description:
    'The menu of a member who never changed the favourites. It lists the starting favourites: Opus 5.5 High, the app default, then Opus 5.5 Max, Sonnet 5.5 Medium, GPT-6.1 Sol High, and GPT-6 Astra Medium. Fast is off in each of them. The deployment setting CONDUCTIVE_STARTING_FAVOURITES gives this list, so every account that never changed its favourites gets it, also after a change of the setting. The two Codex favourites open a new session in this Claude session. Preferences lists the same five, and the first change there saves the favourites of the account.',
  rationale:
    'The user chose A of decision 1 on 20 November 2026: a new account starts with five favourites, so the menu is useful before the member sets any. Option B, no favourites until the member adds one, and option C, the default of new workspaces as the only favourite, were not chosen. On the same day the user chose A of decision 3: each deployment sets its starting favourites in CONDUCTIVE_STARTING_FAVOURITES, and the saved default of a member does not join the list. Option E, which put the saved default first, was not chosen. Each agent gets a deep and a quicker choice. Moved here from a saved state of the Model favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', favourites: 'starting' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
