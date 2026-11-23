import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesNone = defineScreen({
  title: 'No favourites',
  description:
    'Cal removed each favourite in Preferences. The menu starts with All models, which opens the submenu of every model. The efforts of the current model and the Fast switch follow, as in a menu with favourites. No row of the menu is a favourite, so none is marked. A member whose every favourite the menu leaves out, such as on an own endpoint, gets the same menu. The picker of each Favourites row in Preferences shows it too, because the row sets one favourite.',
  rationale:
    'On 22 November 2026 the user answered decision 6: the menu with no favourite shows only All models, the efforts, and Fast, because more models will come, and a flat list of every model does not scale. So the menu keeps the same short shape with and without favourites. It replaces the design call of 20 November 2026, which listed every model at the top of the menu with no All models row. The account stores an empty list after the member removes each favourite, so the starting favourites do not come back.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', favourites: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'all-models',
      title: 'No favourites, All models open',
      description:
        'The same menu with All models open. On a computer the submenu stands beside the menu, level with its first row, because All models is the first row. A phone shows the list in place of the menu, with Back at its top. The list holds every model in two groups, the Claude models and the Codex models, and marks Opus 5.5. This session runs Claude, so each Codex model ends with the external link icon.',
      rationale:
        'Decision 6: with no favourite, All models is the only way to change the model in the menu, so its submenu works as in a menu with favourites, as app/model-favourites/all-models shows.',
      props: { allModels: 'open' },
    },
  ],
})
