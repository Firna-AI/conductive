import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macNewWorkspace = defineScreen({
  title: 'New workspace',
  description:
    'Cal turned Mac access on in the Capabilities of New workspace, in the Mac app. Under the switch, the line Allow all commands on this Mac is checked, and its hint says that commands from the new workspace run without asking, until Cal stops. An uncheck keeps Mac access on for the new workspace, with no grant on this Mac. The create saves Mac access, then this Mac starts the grant until Stop for the new workspace. A browser shows a note in place of the line, as app/new-workspace/capabilities/mac-access-on shows.',
  rationale:
    'Mac access decision 1 C (20 November 2026): turning Mac access on in the Mac app also starts a grant until Stop on the Mac of the member who turned it on. The design of the same day: New workspace with Mac access on, in the Mac app, starts the grant after the create gives the ID of the new workspace, because a grant covers one workspace that exists.',
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
        'Mac access is off, as in each new workspace, so the control shows no line. In the Mac app, the hint of the switch adds that turning it on also allows all commands on this Mac, until Cal stops.',
      rationale:
        'Mac access is off in each new workspace (secrets decision 18 A). The member learns what the switch does on this Mac before turning it on (Mac access decision 1 C).',
      props: { capabilities: 'open' },
    },
    {
      slug: 'created',
      title: 'Created with the grant',
      description:
        'Cal sent the first message with Mac access on and the line checked. Saved carts opened while its cloud computer starts, and this Mac started the grant until Stop for it. So the bar says that every command from this workspace runs on this Mac without asking, with Until you stop and Stop.',
      props: { page: 'created', command: 'allow-until-stop' },
    },
    {
      slug: 'not-started',
      title: 'Not started after the create',
      description:
        'Cal sent the first message with Mac access on and the line checked. The create made Saved carts with Mac access on, but this Mac did not start the grant. The control of New workspace closed at the create, so a notice over the composer of the new workspace says that the app could not allow all commands on this Mac. It gives the cause that the Mac gave, and Try again. Each command asks first on this Mac until a start works.',
      rationale:
        'The design of 20 November 2026: a failed start shows as a notice in the new workspace, because the control of New workspace closes at the create. Try again repeats the start, because the control that asked for it is gone. The line in the Capabilities of the workspace shows the same result until its next change.',
      props: { page: 'created', composer: 'grant-not-started' },
    },
    {
      slug: 'not-reached',
      title: 'Mac not available after the create',
      description:
        'The same create while this Mac had no device connection. The notice says that this Mac is not available, so each command still asks first, and that Try again works once the Mac connects. Mac access of Saved carts stays on.',
      rationale:
        'Mac access decision 3 A (20 November 2026): Mac access still saves, and the app says that the Mac was not reached and still asks before commands.',
      props: { page: 'created', composer: 'grant-not-reached' },
    },
  ],
})
