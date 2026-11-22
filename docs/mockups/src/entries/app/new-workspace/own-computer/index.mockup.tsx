import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

const flow = ['user-flows/create-workspace-on-own-computer']

export const ownComputerChoice = defineScreen({
  title: 'Computer choice',
  description:
    'New workspace in Acme, which has own computers. The computer choice follows the branch control, in the look and at the size of the repository picker: the cloud icon, Cloud computer, and a chevron. The cloud computer is the default, so the note under the pickers still names the build of the cloud computer of Acme. A press opens the menu of the computers. An org without own computers shows no choice. The variants show the open menu, an own computer with room, an offline own computer, and a full own computer.',
  rationale:
    'Cal chose option A of own computer decision 3 on 22 November 2026: a choice in New workspace, with the cloud computer as the default. Sub-workspaces and workspaces from agent tools take the computer of the calling workspace, so no screen asks for them. The choice shows only while the org has an own computer, because a choice of one computer adds nothing, and most orgs have none. It sits with the repository and the branch, because all three say where the work starts.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, computer: 'cloud' },
  useCasePaths: flow,
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Computer menu',
      description:
        'Cal pressed the computer choice. Its menu hangs below it: Cloud computer first, checked, with the detail default, then the own computers of Acme under their label. build-01 runs 2 of 4 workspaces, build-02 is full, and lab-server is offline. build-03 keeps its place, off, with the note Ready after the build, because its first build runs. A phone opens the menu as a sheet titled Computer.',
      rationale:
        'A computer without a good build cannot start a workspace, so its row is off and says when it is ready, as a repository that waits for its build does. An offline or a full computer stays on, because its start waits for it, and its detail says why the start can take longer.',
      props: { computerMenu: 'open' },
      useCasePaths: flow,
    },
    {
      slug: 'picked',
      title: 'Own computer',
      description:
        'Cal picked build-01. The choice shows the server icon and build-01, and the note under the pickers says that the workspace starts on build-01, an own computer of Acme, built 3 hours ago. Send creates the workspace there.',
      rationale:
        'The note names the build that the workspace starts from, as it names the build of the cloud computer, because each own computer builds its own image of the org.',
      props: { computer: 'own' },
      useCasePaths: flow,
    },
    {
      slug: 'offline',
      title: 'Offline own computer',
      description:
        'Cal picked lab-server, which is offline. A notice over the composer says that lab-server is offline, and that the workspace starts when it connects again. Send stays on.',
      rationale:
        'A start on an offline own computer waits for it, and fails at the 20-minute limit of a start with Try again, as the design calls of the plan say. The notice tells Cal before the send, so Cal can pick another computer.',
      props: { computer: 'offline' },
      useCasePaths: [],
    },
    {
      slug: 'full',
      title: 'Full own computer',
      description:
        'Cal picked build-02, which runs 4 of its 4 workspaces. A notice over the composer says that build-02 is full, and that the workspace starts when one of them stops. Send stays on.',
      rationale:
        'Cal has not chosen yet what a start does on a full own computer. The mockups draw the recommendation: the start waits for a free place within the 20-minute limit of a start, as a start on an offline computer waits for its connection, so one rule covers every start.',
      props: { computer: 'full' },
      useCasePaths: [],
    },
  ],
})
