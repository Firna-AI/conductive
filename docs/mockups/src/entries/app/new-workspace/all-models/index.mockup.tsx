import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceAllModels = defineScreen({
  title: 'All models',
  description:
    'New workspace with the model menu open, and All models open in it. On a computer the submenu stands beside the menu, level with its row, as in a session. A phone shows the list in place of the menu, with Back at its top, in the same box above the picker. Back shows the menu again. The list holds every model in two groups, the Claude models and the Codex models, and it marks Opus 5.5, the model of the first message. The workspace has no session yet, so no model shows the external link icon. Each other model picker opens its menu in the same way on a phone: the default of new workspaces in Preferences, an automation, and each Favourites row.',
  rationale:
    'The user chose B of decision 5 on 22 November 2026: on a phone, the model pickers of New workspace, of the default of new workspaces, of an automation, and of each Favourites row open a menu beside the picker, as the picker of a session does, and not a sheet. So All models works as in a session, as app/model-favourites/all-models shows. A phone has no room for a submenu beside the menu, so the list takes the place of the menu, as the user chose on 16 November 2026. The other menus, such as Restart, stay a sheet. Option A, a sheet in the mockups, option C, both forms, and option D, a sheet for every picker, were not chosen.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, modelMenu: 'all-models' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
