import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

const flow = ['user-flows/ask-a-side-question']

export const sideQuestionOverlay = defineScreen({
  title: 'Side session overlay',
  description:
    'Cal pressed his mark after the side session answered: 1,284 of the 41,902 saved addresses in production have no postcode. The work of the turn folds into one line, as in each chat, and the run with the secret folds with it. The composer of the overlay sends a follow-up to the side session, and Open as tab shows its tab. The close button goes back to the parent chat, where the mark stays. On a phone the overlay is a sheet under the tab row.',
  rationale:
    'The overlay shows the side session as its tab does, with the same chat, the same composer, and the same requests, because a side question is a normal session. The first message keeps the session chip of the parent, so a press on it shows the parent session.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    sideMarks: 'asked',
    sideSession: 'idle',
    sideOpen: 'overlay',
  },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'waiting',
      title: 'Waiting for a member',
      description:
        'The side agent asked to run its count with PROD_DATABASE_URL. The request waits above the composer of the overlay, as in its tab, with Deny and Allow. Until a member answers, the mark in the parent chat shows Needs input, and the header shows it too. Stop ends the turn.',
      props: { sideSession: 'waiting' },
      useCasePaths: flow,
    },
    {
      slug: 'closed',
      title: 'A closed side session',
      description:
        'Cal closed the tab of the side session, so it is in the session history and the row has no tab for it. Its mark stays, and a press opens the overlay to read its chat. The notice over the composer says that a message reopens the session. Open as tab reopens it too, and its tab opens at the end of the row.',
      rationale:
        'A press on the mark of a closed side session opens the overlay to read its chat. A send or Open as tab there reopens the session, as a session link does, and a reopen shows the tab again to every member.',
      props: { sideSession: 'closed' },
    },
  ],
})
