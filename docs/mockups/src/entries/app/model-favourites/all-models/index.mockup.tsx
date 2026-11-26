import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const modelFavouritesAllModels = defineScreen({
  title: 'All models',
  description:
    'All models is open. On a computer its submenu stands beside the menu, level with its row. It lists every model in two groups, the Claude models and the Codex models, with no brand names, and it marks Opus 5.5, the model of the current choice. This session runs Claude, so each Codex model ends with the external link icon. A phone shows the list in place of the menu, with Back at its top. A pick changes the model. It keeps the effort when the model offers it, and otherwise takes the nearest lower effort.',
  rationale:
    'The user asked on 16 November 2026 that any model stays one level down. The submenu holds the model rows of the picker, so the rule of the other agent and its icon stay as decision 51 sets them. A phone has no room for a submenu beside the menu, so the list takes the place of the menu, and Back returns to it, as the user chose on 16 November 2026. Moved here from a saved state of the Model favourites page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker', allModels: 'open' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
