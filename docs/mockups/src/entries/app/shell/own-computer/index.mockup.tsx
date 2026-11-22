import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

/**
 * Checkout address autocomplete, the ready workspace of the catalogue, on
 * an own computer. A variant replaces the props of Saved carts, so each
 * variant gives these first.
 */
const checkout = {
  workspace: readyWorkspace.workspace,
  sandbox: readyWorkspace.sandbox,
  conversation: readyWorkspace.conversation,
  banner: readyWorkspace.banner,
} as const

export const ownComputerWorkspace = defineScreen({
  title: 'On an own computer',
  description:
    'Saved carts, a new workspace on build-01, an own computer of Acme. The first step of the start names build-01 where a workspace on the cloud computer names the cloud computer of Acme, and the message waits until the sandbox is ready. The variants show the menu of the header state, which names build-01, a resume that waits for lab-server, which is offline, the start that failed at the 20-minute limit while lab-server stayed offline, with Try again, and a workspace whose own computer an admin removed.',
  rationale:
    'Each workspace on an own computer runs in its own container there, with the same sandbox software as a cloud computer (own computer decision 1 D). So the workspace looks the same, and each text that names the cloud computer of the workspace names its own computer instead. A workspace never moves between a cloud computer and an own computer.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'no-commits',
    computer: 'own',
  },
  useCasePaths: ['user-flows/create-workspace-on-own-computer'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Header state menu',
      description:
        'Checkout address autocomplete on build-01, with the menu of the header state open. Its first line says that the workspace runs on build-01, an own computer of Acme, and Restart follows with its note. A screen reader names the menu build-01 in place of Cloud computer. A phone shows the same menu in a sheet.',
      rationale:
        'The menu of the header state is the menu of the computer of the workspace, so it names the own computer. The cloud computer is the default, so a workspace on the cloud computer shows no such line.',
      props: { ...checkout, overlay: 'restart' },
      useCasePaths: [],
    },
    {
      slug: 'waiting',
      title: 'Waiting for the computer',
      description:
        'Checkout address autocomplete resumes on lab-server, which is offline. The start shows one step, Waiting for lab-server to connect, with its time. The workspace starts when lab-server connects.',
      rationale:
        'A start on an offline own computer waits for it until the 20-minute limit of a start, as the design calls of the plan say. The stop rule stays.',
      props: { ...checkout, sandbox: 'starting', computer: 'offline' },
      useCasePaths: [],
    },
    {
      slug: 'offline',
      title: 'Offline at the start limit',
      description:
        'lab-server did not connect within the 20-minute limit of a start. The bar of the failed start shows the saved message, which names lab-server and the limit, says that the files and the chat are saved, and offers Try again.',
      rationale:
        'A start on an offline own computer fails at the 20-minute start limit, with Try again, as the design calls of the plan say. The saved message names the computer, so a member knows where the start waited.',
      props: { ...checkout, sandbox: 'error', computer: 'offline' },
      useCasePaths: [],
    },
    {
      slug: 'removed',
      title: 'Computer removed',
      description:
        'An admin removed old-runner, the own computer of this workspace. The start is refused, so the bar says that the sandbox cannot start, because old-runner was removed from Acme, and that the chat history is available. It offers no action.',
      rationale:
        'The design calls of the plan say that the workspaces of a removed computer keep their chat. A workspace never moves to another computer, so the refusal lasts, as for any refused start.',
      props: { ...checkout, sandbox: 'refused', computer: 'removed' },
      useCasePaths: [],
    },
  ],
})
