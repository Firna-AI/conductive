import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const lostUpdates = defineScreen({
  title: 'Failed repair of a lost update',
  description:
    'Two updates without a session were lost, and the fresh full reports that the workspace asked for were lost too. Only then does a notice show, beside the data that stays unavailable: under the file lists for the list of changes, and under the header for the workspace name. A phone shows the header notice on every tab, and the Files notice in the Files tab.',
  rationale:
    'The user chose E of decision 96 on 6 November 2026. After a lost update without a session, the workspace asks the runner for a fresh full report, and the browser shows nothing, as on every other screen of the catalogue. A notice shows beside the data only when that report is lost too. Each notice names the data that is unavailable, not the cause.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, lostUpdate: 'failed-repair', focus: 'files' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
