import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { askedAgainWalk } from '../../../../../screens/stackWalks'
import { stateVariants } from '../../../../../screens/walkPages'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const askedAgain = defineScreen({
  title: 'Asked 3 times',
  description:
    'Cal asked for the count of the saved addresses without a postcode, then for the count by country, then for the cities with the most of them. Each time the agent asked for PROD_DATABASE_URL, nobody answered within 90 seconds, and the request turned late. The three requests ask for the same secret, so only the newest shows above the composer, with the reason and the command of the cities and its late line. After the name, "Asked 3 times" says that the card holds the two older requests too. The card is one place in the stack, so no place, no buttons, and no edges show. Deny ends the three requests, and Allow for this session allows the three.',
  rationale:
    'Cal asked on 20 November 2026 that several requests for the same key show only the newest, and that its approval approves each of them. A newer open request of the same session hides an older one when the two ask for the same set of secrets, and its Allow covers each of them, under the rule of covered requests (design calls of 20 November 2026). The user chose option B of decision 3 of the needs-input change on 20 November 2026: Deny of a card that hides requests ends the shown request and each request that it hides, and the app sends one Deny for each. A design call of the UI agent of 20 November 2026: the card takes the place of the oldest request that it holds, so a new ask of the agent does not move it in the stack. The answers are saved states of this page.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...askedAgainWalk.states.start.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    ...stateVariants(askedAgainWalk, 'denied', [
      {
        title: 'Denied',
        description:
          'Cal pressed Deny on the card, and the one Deny ended the three requests. Each request takes its place in its own turn, unfolded, as a late request does after its Deny: it says Denied, and its line says that he denied it. No line of the app and no turn follow. The workspace no longer needs input, so the tab of the session shows its chat icon again.',
        rationale:
          'Decision 3 B: a grant covers the session, not the command, so a Deny of each command gives the member no extra control. A design call of the UI agent of 20 November 2026: each request shows the result of its own Deny at its own place, so the chat needs no new form, and each turn keeps its answer. A late Deny sends nothing, because no agent waits.',
      },
    ]),
    ...stateVariants(askedAgainWalk, 'allowed', [
      {
        title: 'Allowed',
        description:
          'Cal pressed Allow for this session, and the one Allow allowed the three requests. Each request takes its place in its own turn, with Allowed for this session, and its line says that he answered and that a new turn told the agent. One line of the app says that he allowed PROD_DATABASE_URL for this session, and it starts one new turn.',
        rationale:
          'Under the rule of covered requests, an Allow also allows each other open request that its grant covers, and one answer sends at most one line for each session.',
      },
    ]),
  ],
})
