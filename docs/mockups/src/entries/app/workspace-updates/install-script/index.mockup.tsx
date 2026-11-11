import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const flow = ['user-flows/update-old-workspace']

/** The decision of the notice and its action. */
const choice =
  'The user chose option C of image job decision 11 on 10 November 2026: a notice with an action, so that the member keeps control of the files of the workspace. A run at each workspace start was rejected. The script runs from the folder of the repository of the workspace.'

export const installScript = defineScreen({
  title: 'Install script changed',
  description:
    'Cal added ffmpeg to the install script of Acme and built the computer after Checkout address autocomplete started. New workspaces start with the new setup, and this workspace started before it. A notice over the composer says that the install script changed, with Run install script. The member can keep working and run it later.',
  rationale: `${choice} The notice compares the install script of the org image of the workspace with that of the current org image. A refresh runs the same install script, so a refresh alone shows no notice.`,
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, setup: 'changed' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Install script runs',
      description:
        'The member chose Run install script. The notice shows a spinner and "Running the install script", and the output of the script streams in a box under it. The composer stays, so the member can still send messages.',
      rationale: choice,
      props: { setup: 'running' },
      useCasePaths: flow,
    },
    {
      slug: 'finished',
      title: 'Install script finished',
      description:
        'The script finished. The notice says that this workspace has the new setup, and the end of the output stays under it. Dismiss closes the notice, which does not come back for this setup.',
      rationale: `${choice} The output stays until Dismiss, so the member can read what the script did.`,
      props: { setup: 'finished' },
      useCasePaths: flow,
    },
    {
      slug: 'failed',
      title: 'Install script failed',
      description:
        'The script stopped: the branch of the workspace added react-places-autocomplete to package.json without its lockfile, so npm ci stopped. The notice turns rose, says that the install script failed, and shows the end of the output with Try again.',
      rationale: `${choice} The workspace keeps what the script did before it stopped, so the member fixes the cause, such as with the agent, and tries again.`,
      props: { setup: 'failed' },
    },
  ],
})
