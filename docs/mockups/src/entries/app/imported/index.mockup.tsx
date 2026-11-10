import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  importedWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const imported = defineScreen({
  title: 'Imported workspace',
  description:
    'Coupon totals at checkout, which Cal imported from Conductor in the Mac app, opened from the section Import from Conductor. The header shows the flag From Conductor and the state Not active. In place of an empty chat, its three old sessions are links, each with its agent, its messages, and its day. The question Activate this workspace takes the place of the composer. The files and the tools wait for the activation, and the pull request bar reads the branch from GitHub. On a phone the same question sits under the links. The child pages show the list after the import, an old session, the files, the activation, a failed activation, and the activated workspace.',
  rationale:
    'The user chose on 9 November 2026 that the import creates each workspace at once, with the flag From Conductor, its name, and its sessions, and with no cloud computer, and that opening it asks to activate it. The user chose on 10 November 2026 that each old session is one Markdown file, which a link opens in the Markdown view of the app. The question is a bar in place of the composer, where a stopped sandbox offers Resume, so the person can read the old sessions first. The new state Not active has its own mark, the four corners, because the workspace has never had a cloud computer, and Stopped would say otherwise. The web app and the Mac app both show the workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: importedWorkspace,
  useCasePaths: ['user-flows/import-from-conductor'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
