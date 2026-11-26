import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macNewWorkspace = defineScreen({
  title: 'New workspace',
  description:
    'Cal turned the Mac access switch on in the Capabilities of New workspace, in the Mac app. The switch is a choice of the draft, with no hint. The create makes the workspace, and then this Mac starts the grant until Stop for it. A switch-off before the create starts no grant, and agents of the new workspace can still ask, with a question on this Mac first. A browser shows no Mac access part, as app/new-workspace/capabilities shows.',
  rationale:
    'Mac access decision 7 (21 November 2026): the switch gives access, and it is personal. The design of 20 November 2026: in New workspace, the switch is a choice of the draft, and the create starts the grant only while it is on. The grant starts after the create gives the ID of the new workspace, because a grant covers one workspace that exists.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'new-workspace',
    command: 'none',
    change: 'none',
    capabilities: 'mac-access-on',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'mac-access-off',
      title: 'Mac access off',
      description:
        'The switch is off, as in each new workspace, and the part has no hint. The create starts no grant. Agents of the new workspace can still ask to run commands on this Mac, and this Mac asks first.',
      rationale:
        'Mac access decision 7 (21 November 2026): Cal asked to remove the verbose copy, so the switch has no hint, also while it is off. Agents can always ask, because the member can deny each question on the Mac.',
      props: { capabilities: 'open' },
    },
    {
      slug: 'created',
      title: 'Created with the grant',
      description:
        'Cal sent the first message with the switch on. Saved carts opened while its cloud computer starts, and this Mac started the grant until Stop for it. So the bar says that every command from this workspace runs on this Mac without asking, with Until you stop and Stop.',
      props: { page: 'created', command: 'allow-until-stop' },
    },
    {
      slug: 'not-started',
      title: 'Not started after the create',
      description:
        'Cal sent the first message with the switch on. The create made Saved carts, but this Mac did not start the grant. The control of New workspace closed at the create, so a notice over the composer of the new workspace says that the app could not allow all commands on this Mac. It gives the cause that the Mac gave, and Try again. Each command asks first on this Mac until a start works.',
      rationale:
        'The design of 20 November 2026: a failed start shows as a notice in the new workspace, because the control of New workspace closes at the create. Try again repeats the start, because the control that asked for it is gone. The switch in the Capabilities of the workspace shows off, with the same result, until the next start or Stop.',
      props: { page: 'created', composer: 'grant-not-started' },
    },
    {
      slug: 'not-reached',
      title: 'Mac not available after the create',
      description:
        'The same create while this Mac had no device connection. The notice says that this Mac is not available, so each command still asks first, and that Try again works once the Mac connects.',
      rationale:
        'Mac access decision 3 A (20 November 2026): the app says that the Mac was not reached and still asks before commands.',
      props: { page: 'created', composer: 'grant-not-reached' },
    },
  ],
})
