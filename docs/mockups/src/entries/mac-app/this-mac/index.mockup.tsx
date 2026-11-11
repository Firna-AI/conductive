import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const thisMac = defineScreen({
  title: 'This Mac',
  description:
    'The account in the Mac app, with the This Mac section: the name of the Mac, its state, and the commands that always run on it without asking, each with Remove. After a Remove, its result shows under the list. The Mac app keeps the sidebar of the org beside the account.',
  rationale:
    'Always allow covers the exact text of one command on this Mac, so the list shows each command as it was allowed (decision 62). The web app in a browser has no This Mac section.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'account',
    command: 'none',
    change: 'none',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'needs-input',
      title: 'A workspace needs input',
      description:
        'An agent asks to run a command on this Mac while the app shows This Mac. The workspace list marks Checkout address autocomplete with Needs input: its green mark pulses. Its row opens the workspace, where the request waits above the composer.',
      rationale:
        'The request no longer opens a dialog over every page, so the user asked for a blue mark on the workspace that asks for help, an approval, or an answer (decision 62). The list mark now shows the GitHub state in its colour (list mark decision 1), so the row pulses in that colour. The header of the workspace keeps the blue column.',
      props: { command: 'prompt' },
    },
    {
      slug: 'removed',
      title: 'Removed',
      description:
        'The user pressed Remove beside npm run lint. The Mac removed the command and saved the change, so the command leaves the list, and the result shows under it.',
      rationale:
        'The user asked for an explicit result of each change: done, done but not saved, or failed (7 November 2026). A result stays until the next Remove of the same command.',
      props: { change: 'removed' },
    },
    {
      slug: 'remove-not-saved',
      title: 'Removed, not saved',
      description:
        'The Mac removed npm run lint, so the command no longer runs without asking, but the Mac could not save the change. The command leaves the list, and the result names the cause that the Mac gave. Try again in the result repeats the Remove through the Mac that is connected now.',
      rationale:
        'The Mac takes a permission away before it saves, so a failed save never leaves the permission active (7 November 2026). The result stays through every read and a reconnect of the Mac, because a later read cannot show what the save lost.',
      props: { change: 'remove-not-saved' },
    },
    {
      slug: 'remove-failed',
      title: 'Not removed',
      description:
        'The Mac could not remove npm run lint. The command stays in the list with Remove, and the result names the cause that the Mac gave until the next Remove of the command.',
      rationale:
        'A change that failed stays in view until the user acts on the same control again, also when the Mac reconnects (7 November 2026). The app does not try again by itself.',
      props: { change: 'remove-failed' },
    },
  ],
})
