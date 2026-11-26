import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'
import { commandAndSecretWalk } from '../../../screens/stackWalks'
import { placeVariants } from '../../../screens/walkPages'

export const macCommandAndSecret = defineScreen({
  title: 'A command and a secret request',
  description:
    'Nobody answered PROD_DATABASE_URL in time, so its request turned late. Then Cal asked for the checkout test in Safari. The command on this Mac is on top of the stack, with Deny and Allow, because its call waits. "1 of 2" and the edge of the late request say that one more request waits behind it. Next shows the late request.',
  rationale:
    'Cal chose option B of decision 4 of the needs-input change on 22 November 2026: the cards that this view cannot answer go after the cards that it can answer. The Mac app on this Mac answers the command and the request for the secret, so the stack keeps its order. A browser cannot answer the command, so it puts the late request on top and the command second, as app/secret-requests/several/mac-command shows. The pages of this stack walk through its places only, so the answers of its cards draw no link, and no answer drops the other request.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'with-secret',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
    shownRequest: 1,
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: placeVariants(commandAndSecretWalk, 'start', [
    {
      title: 'The late request behind it',
      description:
        'After Next, the late request for PROD_DATABASE_URL is on top: its description, the reason, the command, Deny, Allow for this session, and its late line. The place says "2 of 2", Next is off, and the edge of the command shows behind it.',
    },
  ]),
})
