import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { threeRequestsWalk } from '../../../../../screens/stackWalks'
import { placeVariants } from '../../../../../screens/walkPages'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const requestStack = defineScreen({
  title: 'A stack of three requests',
  description:
    'Nobody answered in time for the preview deploy, which needs PROD_DATABASE_URL and VERCEL_TOKEN, or for the Mapbox comparison, which needs MAPBOX_TOKEN. So both requests turned late when their turns ended. Then Cal asked for the count of the saved addresses, and the tool call of the agent waits for PROD_DATABASE_URL. The three requests wait just above the composer as a stack, and one card shows at a time. The request whose call waits is on top, though it is the newest. The edges of the two cards behind it show above it. Above the stack, "1 of 3" with Previous and Next moves through it. Previous is off on the first card, and Next shows the next card. A phone shows the same stack, with larger buttons. The tab of the session shows the needs-input mark. Allow for this session on the card on top leads on to app/secret-requests/several/answered.',
  rationale:
    'The user chose option A of decision 1 of the needs-input change on 20 November 2026: each open request waits above the composer, also a late one. On the same day Cal asked to stack the requests, so that only one is visible at a time. Design calls of 20 November 2026: the requests whose calls wait come first, because a waiting call has a time limit and a late request has none, and each group keeps the oldest first. The card on top is the first in that order, and an answer shows the next card. The UI agent made these calls on the same day: the edges of at most two cards show, so a stack of many requests is as high as a stack of three. "1 of 3", Previous, and Next sit above the card, so the keyboard reaches them before the actions of the card, and the place is a polite live region. Previous is off on the first card and Next on the last, so the place never jumps from the end to the start. The stack keeps at most 40% of the window, also on a phone. The pages of this stack show one walk through its answers, so each answer that the walk does not take draws no link, and no answer drops the other requests.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...threeRequestsWalk.states.start.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: placeVariants(threeRequestsWalk, 'start', [
    {
      title: 'The next request',
      description:
        'After Next, the late request of the preview deploy is on top, with its late line: PROD_DATABASE_URL and VERCEL_TOKEN, each with its description, the reason, and the command. The place says "2 of 3", and Previous and Next are both on. The edges of the two other cards still show. On a phone the card needs more room than the stack has, so it scrolls inside its outline, which fades where it cuts the card. The place, the buttons, and the outline stay in view.',
      rationale:
        'One card keeps the cap of 40% of the window and its inner scroll, for a long card (a design call of 20 November 2026). Design calls of the UI agent of 20 November 2026: the outline of the card stays in view while its content scrolls, so the card still reads as the front of the stack. The edges show the other cards of the stack, not only the cards after the one on top, so the stack keeps its height while the member moves through it.',
    },
    {
      title: 'The last request',
      description:
        'After Next again, the late request for MAPBOX_TOKEN is on top, with its late line. On a computer the card asks for the value and how long it lasts. On a phone the card shows Deny and Give a value. The place says "3 of 3", and Next is off.',
    },
  ]),
})
