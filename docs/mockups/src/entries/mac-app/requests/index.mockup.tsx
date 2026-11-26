import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macRequests = defineScreen({
  title: 'Many requests',
  description:
    'An agent asked to run four commands on this Mac, and the first is a long script. The requests wait just above the composer as a stack, and one card shows at a time. The edges of two of the other cards show above it, and "1 of 4" with Previous and Next moves through the stack. The stack takes at most 40% of the window, so the long script scrolls inside its card, which fades where it cuts the command, and the transcript and the composer stay in view. The arrow beside Allow opens its menu in the top layer, so the card never cuts it.',
  rationale:
    'A long command or many requests must never push the composer out of view, and the menu of Allow must never be cut (7 November 2026). Each request keeps its own Deny and Allow, as decision 62 says. On 20 November 2026 Cal asked to stack the requests, so that only one is visible at a time. A design call of the same day: one card keeps the cap of 40% of the window and its inner scroll, for a long command, and the keyboard scrolls the card from any of its controls.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'many',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
    shownRequest: 1,
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'next',
      title: 'The next request',
      description:
        'After Next, sw_vers is on top: a short command, with the time limit, Details, Deny, and Allow. The place says "2 of 4", and Previous and Next are both on.',
      props: { shownRequest: 2 },
    },
    {
      slug: 'with-secret',
      title: 'With a secret request',
      description:
        'Nobody answered PROD_DATABASE_URL in time, so its request turned late. Then Cal asked for the checkout test in Safari. The command on this Mac is on top of the stack, with Deny and Allow, because its call waits. "1 of 2" and the edge of the late request say that one more request waits behind it.',
      rationale:
        'Cal chose option B of decision 4 of the needs-input change on 22 November 2026: the cards that this view cannot answer go after the cards that it can answer. The Mac app on this Mac answers the command and the request for the secret, so the stack keeps its order. A browser cannot answer the command, so it puts the late request on top and the command second, as app/secret-requests/several/mac-command shows.',
      props: { command: 'with-secret' },
    },
  ],
})
