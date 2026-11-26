import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const newWorkspaceFast = defineScreen({
  title: 'Fast mode',
  description:
    'New workspace with the model menu open and Fast on. The menu lists the favourites first, then All models, Effort, and the Fast switch, as in a session. No favourite is marked, because none is Opus 5.5 High with Fast on. The workspace has no session yet, so no favourite opens a new session, and none shows the external link icon. The first message then runs fast, and so does the session that it starts. The Fast row shows no key here.',
  rationale:
    'Every composer uses the same picker, so the first message of a new workspace can turn fast on, as app/fast-mode shows for a session (fast mode decision 255). The key of Fast mode runs only where a session tab is shown (fast mode decision 258), so the row shows no key. Each model picker shows the favourites menu, New workspace too, as the design calls of 16 November 2026 of the model favourites say. So a pick of a favourite sets the model, the effort, and Fast of the first message at once.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, modelMenu: 'open-fast' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
