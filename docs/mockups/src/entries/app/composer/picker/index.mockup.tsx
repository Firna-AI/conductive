import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const composerPicker = defineScreen({
  title: 'Model and effort',
  description:
    'The open picker: the five favourites of Cal first, each as its model with its effort and Fast in the muted colour. It marks Opus 5.5 High, the current choice. This session runs Claude, so GPT-6.1 Sol High ends with the external link icon, because it opens a new session with the draft. A screen reader says New session for the icon. All models opens the Claude models and the Codex models in two groups, with no brand names, as app/model-favourites/all-models shows. The effort levels of the chosen model follow, with High marked. Opus 5.5 offers fast mode, so the Fast switch ends the menu, off, after ⇧⌘E, the key of Fast mode, as app/fast-mode shows.',
  rationale:
    'The user chose option B of decision 51: a model of the same agent stays in the session, and a model of the other agent opens a new session with the draft, as in Conductor. A Claude session and a Codex session keep separate memory, so the switch cannot stay in one session. On 10 November 2026 the user asked for a quieter mark than the words New session, such as an icon that opens a new page. So the icon takes the place of those words and of the note about the draft. On 16 November 2026 the user chose favourites at the top of the menu, with every model one level down in All models, as app/model-favourites gives. A favourite of the other agent follows decision 51 too. Moved here from a saved state of the Composer page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'picker' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
