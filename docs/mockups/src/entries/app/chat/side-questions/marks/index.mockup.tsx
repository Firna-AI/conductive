import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const sideQuestionMarks = defineScreen({
  title: 'Marks',
  description:
    'The parent chat after three side questions. Each quote keeps a mark: the soft amber fill of marked lines, with the state of its side session at its end. "How many saved addresses have no postcode?" waits for a member to allow its run with a secret, so its mark shows the Needs input mark of the header. "Does anything else still import the postcode lookup?" runs, so its mark shows the spinner of a session tab. "Is the places proxy rate limited?", about a phrase of the first message of Cal, has its answer, so its mark shows the icon of Ask about this. The header shows Needs input, because the agent of a side session waits. Each side session has its tab at the end of the row, in the order that they opened. The pointer over a mark shows the title of its session, and a press opens its overlay.',
  rationale:
    'Every member sees the marks, because the members share the sessions. The anchor of a side question lives on its session record, so each tab finds the marks with no new event. The user chose A of mark life on 17 November 2026: a mark never goes away, and a press on it always opens its side session. A mark shows the spinner of a session tab and the Needs input mark of the header, so each state has its own shape. A mark inside a folded part of a turn shows when the fold opens.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    sideMarks: 'states',
    sideSession: 'waiting',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'asked',
      title: 'After the overlay closes',
      description:
        'Cal closed the overlay while his side session runs. Its mark shows the spinner, and its tab stays at the end of the row, after the parent tab. A press on the mark opens the overlay again.',
      rationale:
        'A close of the overlay leaves the side session as it is. The member can read the parent chat while the side agent works, and the mark shows when its turn ends or waits.',
      props: { sideMarks: 'asked', sideSession: 'running' },
      useCasePaths: ['user-flows/ask-a-side-question'],
    },
    {
      slug: 'overlap',
      title: 'Overlapping marks',
      description:
        'Priya asked "What counts as no match?" about a phrase inside the quote of Cal. The overlap has a deeper fill, and each mark ends with the state of its own session. A press on the overlap opens the menu of both side sessions. A press on the rest of the mark of Cal opens its overlay.',
      props: { sideMarks: 'overlap', sideSession: 'idle' },
    },
    {
      slug: 'menu',
      title: 'The menu of overlapping marks',
      description:
        'A press on the overlap opened a short menu below it, with the state and the title of each side session, in the order that they were asked. A row opens the overlay of its session. On a phone the menu is a sheet.',
      props: { sideMarks: 'overlap', sideSession: 'idle', sideOpen: 'menu' },
    },
    {
      slug: 'stale',
      title: 'Text that no longer matches',
      description:
        'The app finds each mark again in the rendered text of its message, from the quote and the text before and after it. Here the quote of Cal no longer matches, so his mark covers the whole answer: the answer takes the fill of a mark, and the state of the side session shows at its top right, where a press opens its overlay.',
      rationale:
        'The anchor stores the rendered text of the selection, with some text before and after it, and the text of a message can render in another way after a change of the app. A mark that no longer finds its text stays, because a mark never goes away.',
      props: { sideMarks: 'stale', sideSession: 'idle' },
    },
  ],
})
