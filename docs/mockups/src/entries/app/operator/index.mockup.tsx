import { defineScreen } from '@mokly/mokly'
import { OperatorScreen, operatorSchema } from '../../../screens/OperatorScreen'

export const operator = defineScreen({
  title: 'Operator',
  description:
    'The page of the operator, the person who runs Conductive for everyone. Four numbers lead: users, orgs, and workspaces, each with its new ones of the last 7 days, and the cloud computers that run now, for workspaces and for builds. Then come the users and orgs that are suspended now, each with Lift, the workspaces in each state, the new workspaces and the new users of each day for the last 30 days, and the five orgs with the most workspaces. Refresh reads the numbers again. Operator in the rail opens the page, above the account, and only an operator sees it.',
  rationale:
    'The user chose an operator section in the web app on 8 November 2026, in decision 142, and asked for the layout and some numbers first. The numbers are live counts across every org, as decision 144 chose for now, so the page shows no history that the app does not keep. It shows counts and org names only, never a chat, a file, or a secret of an org. Later pages, such as users and orgs or settings, become tabs under the header, as in the org settings.',
  relatedDocs: [],
  propSchema: operatorSchema,
  props: { numbers: 'ready', suspended: 'some', dialog: 'none' },
  render: (props, context) => (
    <OperatorScreen state={props} viewport={context.viewport} />
  ),
})
