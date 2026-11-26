import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { explainWaitsWalk } from '../../../../../screens/tabWalks'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainMarks = defineScreen({
  title: 'Marks',
  description:
    'The parent chat after four explanations, with no popover open. Each quote keeps a mark: the soft amber fill of marked lines, with the state of its explanation at its end. The explanation of Cal about the manual entry waits for a member to allow a run with a secret, so its mark shows the Needs input mark of the header. The explanation of "Removed the old postcode lookup" runs, so its mark shows the spinner of a session tab. The explanation of a phrase in the first message of Cal has its answer, so its mark shows the icon of Explain. The explanation of "checkout end-to-end tests" failed, so its mark shows the alert of a failed turn. The header shows Needs input. Each open explanation has its tab at the end of the row, and the tab of the explanation of Cal shows the needs-input mark. A press on that tab shows its chat with the request, as the waiting state of app/chat/explain/tab shows. The pointer over a mark shows the title of its explanation, and a press opens its popover.',
  rationale:
    'Every member sees the marks, because the members share the sessions. The anchor of an explanation lives on its session record, so each tab finds the marks with no new event. The user chose A of mark life on 17 November 2026: a mark never goes away, and a press on it always opens the popover of its explanation. Each state has its own shape, so no state depends on colour alone. A mark inside a folded part of a turn shows when the fold opens.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...explainWaitsWalk.states.marks.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'After the popover closes',
      description:
        'Cal closed the popover while the agent writes its answer. The mark shows the spinner, and the tab of the explanation stays at the end of the row, after the parent tab. A press on the mark shows the popover again.',
      rationale:
        'A close of the popover leaves the explanation as it is. The member reads on in the parent chat while the agent works, and the mark shows when the turn ends, waits, or fails.',
      props: { explainMarks: 'asked', explainSession: 'answering' },
      useCasePaths: ['user-flows/explain-chat-text'],
    },
    {
      slug: 'overlap',
      title: 'Overlapping marks',
      description:
        'Priya explained "when there is no match", a phrase inside the quote of Cal. The overlap has a deeper fill, and each mark ends with the state of its own explanation. A press on the overlap opens the menu of both explanations. A press on the rest of the mark of Cal opens its popover.',
      props: { explainMarks: 'overlap', explainSession: 'answered' },
    },
    {
      slug: 'menu',
      title: 'The menu of overlapping marks',
      description:
        'A press on the overlap opened a short menu below it, with the state and the title of each explanation, in the order that they started. A row opens the popover of its explanation. On a phone the menu is a sheet.',
      props: {
        explainMarks: 'overlap',
        explainSession: 'answered',
        explainOpen: 'menu',
      },
    },
    {
      slug: 'stale',
      title: 'Text that no longer matches',
      description:
        'The app finds each mark again in the rendered text of its message, from the quote and the text before and after it. Here the quote of Cal no longer matches, so his mark covers the whole answer: the answer takes the fill of a mark, and the state of the explanation shows at its top right, where a press opens its popover.',
      rationale:
        'The anchor stores the rendered text of the selection, with some text before and after it, and the text of a message can render in another way after a change of the app. A mark that no longer finds its text stays, because a mark never goes away.',
      props: { explainMarks: 'stale', explainSession: 'answered' },
    },
  ],
})
