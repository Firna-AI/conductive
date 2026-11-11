import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

/** Why a failed update lets the start go on. */
const goesOn =
  'Image job decision 8 B, with its guards: when the update fails, the start goes on with the earlier version and warns, because the Worker still serves the runner protocol versions that live workspaces hold.'

export const updateFailed = defineScreen({
  title: 'Update failed',
  description:
    'The update of the agent and terminal software failed at the resume, and the start went on with the earlier version. The workspace is ready, and the agent works. An amber bar under the header says that the software did not update, and that the workspace keeps the earlier version until its next start. Dismiss hides the bar in this view.',
  rationale: `${goesOn} The warning is a bar under the header, as the other warnings about the data of a workspace are, because the composer and the chat work as before. The bar names no action, because the next start tries the update again by itself.`,
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, software: 'update-failed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'starting',
      title: 'Update failed during the start',
      description:
        'The update step failed during the resume. The step ends with "failed", and the start goes on: the card keeps its moving mark and its time. When the agent starts, the card goes, and the bar under the header shows.',
      rationale: `${goesOn} A start step that fails also ends a start in every other case, so the mark says that this start goes on.`,
      props: { sandbox: 'starting' },
    },
  ],
})
