import { defineScreen } from '@mokly/mokly'
import { OperatorScreen, operatorSchema } from '../../../screens/OperatorScreen'

export const operator = defineScreen({
  title: 'Operator',
  description:
    'The page of the operator, the person who runs Conductive for everyone. Four numbers lead: users, orgs, and workspaces, each with its new ones of the last 7 days, and the cloud computers that run now, for workspaces and for builds. A line under the users counts the people on the waitlist and opens the Waitlist tab. Then come the workspaces in each state, the new workspaces and the new users of each day for the last 30 days, and the five orgs with the most workspaces. Refresh reads the numbers again. The tabs Orgs and Users search every org and every user, the Waitlist tab lists the people who wait, and the Invite codes tab holds the codes and the pause of sign-ups. Operator in the rail opens the section, above the account, and only an operator sees it.',
  rationale:
    'The user chose an operator section in the web app on 8 November 2026, in decision 142, and asked for the layout and some numbers first. The numbers are live counts across every org, as decision 144 chose for now, so the page shows no history that the app does not keep. It shows counts and org names only, never a chat, a file, or a secret of an org. The user asked for the Orgs and Users tabs on the same day, in decision 147, and found a suspended user or org there, so the overview lists none, as decision 148 says. The users stay every account by join day, as decision 144 chose, and the line of the waitlist shows how many of them still wait for app access, from decision 160.',
  relatedDocs: [],
  propSchema: operatorSchema,
  props: { numbers: 'ready', signUps: 'open' },
  render: (props, context) => (
    <OperatorScreen state={props} viewport={context.viewport} />
  ),
})
