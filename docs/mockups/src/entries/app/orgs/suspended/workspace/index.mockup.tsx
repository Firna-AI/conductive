import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const suspendedOrgWorkspace = defineScreen({
  title: 'Workspace of a suspended org',
  description:
    "Cal, an admin of Acme, opens a workspace after the operator suspended Acme. The chat history stays. The bar in place of the composer shows the refused start with the words of the org: the org is suspended, and questions go to the abuse address. The files and the tools say that the sandbox can't start. Cal cannot send a message, start or rename a session, change the owner, or archive the workspace.",
  rationale:
    'One notice shows each refused start with its own words. In app/shell/refused the owner of the workspace is suspended, and an admin can assign another member. Here the org is suspended, so the owner picker offers no change, because nothing in the org can change. The session tabs still close and reopen from the history, as in an archived workspace, so every chat stays readable. The notice promises only the chat history, because the disk can expire while the org is suspended, as decision 125 B says.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'refused', org: 'suspended' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'archived',
      title: 'Archived workspace',
      description:
        'An archived workspace of Acme after the operator suspended Acme. The notice of the org, with the abuse address, is above the bar of the archived workspace. The chat history stays read-only, and the files and the tools went with the cloud computer, as in app/archive/archived.',
      rationale:
        'An archived workspace has no sandbox to refuse, so its bar keeps the facts of the archive. The notice of the org shows above it, so every page of a suspended org names the suspension and the abuse address.',
      props: { sandbox: 'archived', banner: 'merged' },
    },
    {
      slug: 'files',
      title: 'Files on a phone',
      description:
        "The Files tab of the workspace on a phone, after the operator suspended Acme. The panel says that the sandbox can't start, with the words of the org: the org is suspended, and questions go to the abuse address. The Terminal and Preview tabs show the same panel.",
      rationale:
        'A phone shows the bar of the chat only on the Chat tab. So each panel of a phone shows the whole refusal with its words, as the bar does. A desktop keeps its short panels, because the bar is beside them.',
      props: { focus: 'files' },
    },
  ],
})
