import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const severalSecrets = defineScreen({
  title: 'Two secrets',
  description:
    'The agent deploys a preview that needs PROD_DATABASE_URL and VERCEL_TOKEN. The card names both, then each name with its description, the reason, and the command that the agent says it will run. One answer covers both secrets.',
  rationale:
    'A request names one or more secrets and the reason of the agent, so one task shows one card, as a Mac command request shows its reason.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-waiting-two' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'mixed',
      title: 'A secret and a missing name',
      description:
        'The agent compares Mapbox on addresses from production, so it names PROD_DATABASE_URL, a secret of Acme, and MAPBOX_TOKEN, which Acme does not have. The card names both, says what each is, and gives the reason. On a computer, the field named MAPBOX_TOKEN and one choice of how long the value lasts follow, and a line says that Allow also allows PROD_DATABASE_URL for this session. On a phone the card shows Deny and Give a value.',
      rationale:
        'Item 7 A of the mockups: one answer covers a request with mixed names. Each secret of the org gets the approval of the session, each missing name gets its own value field, and one choice of how long covers every value. One task keeps one card.',
      props: { conversation: 'secret-waiting-mixed' },
    },
    {
      slug: 'mixed-value',
      title: 'A secret and a missing name, with a value',
      description:
        'Cal typed the value of MAPBOX_TOKEN and kept 15 minutes, so Allow is on. On a phone, Give a value opened the sheet with the field, the choice, the line about PROD_DATABASE_URL, and Allow.',
      props: {
        conversation: 'secret-waiting-mixed-value',
        overlay: 'value-sheet',
      },
    },
  ],
})
