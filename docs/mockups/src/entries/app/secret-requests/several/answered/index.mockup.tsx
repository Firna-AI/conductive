import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { threeRequestsWalk } from '../../../../../screens/stackWalks'
import { placeVariants, stateVariants } from '../../../../../screens/walkPages'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const stackAnswers = defineScreen({
  title: 'After an answer',
  description:
    'Cal pressed Allow for this session on the card on top of app/secret-requests/several/waiting-and-late. The request of the count left the stack and takes its place in the chat as its run, and its tool call runs. The next card, the late request of the preview deploy, is on top. The place says "1 of 2", and one edge shows behind it. Deny on this card leads on through the stack, and the saved states of this page go on to the end of the stack.',
  rationale:
    'An answer shows the next card (a design call of 20 November 2026). The answer allows only PROD_DATABASE_URL, so it does not cover the request of the preview deploy, which also asks for VERCEL_TOKEN. The pages of the stack show one walk through its answers, so each answer that the walk does not take draws no link, and no answer drops the other requests.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...threeRequestsWalk.states.answered.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    ...placeVariants(threeRequestsWalk, 'answered', [
      {
        title: 'The next request',
        description:
          'After Next, the late request for MAPBOX_TOKEN is on top, with its late line. The place says "2 of 2", Next is off, and the edge of the preview deploy shows behind it. On a computer the card asks for the value and how long it lasts. On a phone it shows Deny and Give a value.',
      },
    ]),
    ...stateVariants(threeRequestsWalk, 'oneLeft', [
      {
        title: 'One request left',
        description:
          'The count ran, and its turn ended. Then Cal denied the late request of the preview deploy. It took its place in its turn, unfolded, with Denied, and its line says that he denied it. The late request for MAPBOX_TOKEN is the one card left above the composer, so no place, no buttons, and no edges show. On a computer it asks for the value, and Allow stays off until a value is typed. On a phone it shows Deny and Give a value. No turn runs, so the composer shows no Stop.',
        rationale:
          'A late Deny sends nothing, because no agent waits. One card shows no place, no buttons, and no edges (a design call of the UI agent of 20 November 2026). The walk denies the preview deploy after the turn of the count: a late Allow while that turn ran would join it, and these pages draw a late Allow that starts a turn.',
      },
    ]),
    ...stateVariants(threeRequestsWalk, 'value', [
      {
        title: 'A value',
        description:
          'Cal typed a value of MAPBOX_TOKEN, which shows as dots, and kept 15 minutes. On a computer the card holds them, and Allow is on. On a phone, Give a value opened the sheet with the field, the choice, and Allow. Deny stays on the card under the sheet.',
      },
    ]),
    ...stateVariants(threeRequestsWalk, 'done', [
      {
        title: 'No request left',
        description:
          'Cal allowed the value. The request left the stack and took its place in its turn, unfolded, with Value for 15 minutes, and its line says that he answered and that a new turn told the agent. A line of the app follows in the chat: "You gave MAPBOX_TOKEN for 15 minutes." The new turn runs for Cal, so the composer shows Stop. No request waits, so the stack is gone, the header shows that the agent works, and the tab of the session shows its spinner.',
        rationale:
          'A late answer starts a turn that acts for the sender of the turn that asked (secrets decision 10 B). An answered request leaves the stack at once and takes its place in its turn (a design call of 20 November 2026).',
      },
    ]),
  ],
})
