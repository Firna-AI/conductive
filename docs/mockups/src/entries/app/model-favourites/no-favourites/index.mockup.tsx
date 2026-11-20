import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesNone = defineScreen({
  title: 'No favourites',
  description:
    'Cal removed each favourite in Preferences. The menu lists every model at its top, in two groups, the Claude models and the Codex models, and marks Opus 5.5. The efforts of the current model and the Fast switch follow. The menu has no All models row, because every model is already in it. A member whose every favourite the menu leaves out, such as on an own endpoint, gets the same menu.',
  rationale:
    'A design call of 20 November 2026: with no favourite to show, the menu lists every model at its top and has no All models row, so no submenu repeats the menu. The account stores an empty list after the member removes each favourite, so the starting favourites do not come back. The pickers of the Favourites rows in Preferences show the same menu, because each row sets one favourite (16 November 2026).',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', favourites: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
